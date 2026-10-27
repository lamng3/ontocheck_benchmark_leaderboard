// Runs the Ask pipeline in the page when no backend is reachable, the way the
// Hermes demo does: Pyodide runs the same Python modules as the backend, and
// this file makes the model calls and writes the shared question log.
(() => {
  const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/";
  const NL2SPARQL = "https://cdn.jsdelivr.net/gh/lamng3/nl2sparql@04961e3941cc9a9d0ef81d0251afdc9bf55df160/src/nl2sparql/";
  const FIREBASE = "https://www.gstatic.com/firebasejs/10.12.2/";
  const SETTINGS_KEY = "ontocheck-model";

  // Repository files written into Pyodide's file system, at the same paths.
  const LOCAL_FILES = [
    "backend/__init__.py",
    "backend/memory/__init__.py",
    "backend/memory/intent.py",
    "backend/memory/retrieval.py",
    "backend/pipeline/__init__.py",
    "backend/pipeline/graph.py",
    "backend/pipeline/retrievers.py",
    "backend/pipeline/reasoners.py",
    "pipeline-options.json",
    "browser/engine.py",
  ];
  const NL2SPARQL_FILES = ["__init__.py", "generate.py", "ontology.py", "stages.py", "validate.py"];

  let ready = null;
  let py = null;
  let engine = null;
  const graphs = new Map(); // id -> {id, name, path, example}

  async function text(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Could not load ${url} (${response.status}).`);
    return response.text();
  }

  function write(path, contents) {
    const dir = path.split("/").slice(0, -1).join("/");
    if (dir) py.FS.mkdirTree(dir);
    py.FS.writeFile(path, contents);
  }

  function start(onStatus = () => {}) {
    if (ready) return ready;
    ready = (async () => {
      onStatus("Loading Python in the page…");
      if (!window.loadPyodide) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = `${PYODIDE}pyodide.js`;
          script.onload = resolve;
          script.onerror = () => reject(new Error("Could not load Pyodide."));
          document.head.append(script);
        });
      }
      py = await window.loadPyodide({ indexURL: PYODIDE });
      onStatus("Installing rdflib and networkx…");
      await py.loadPackage(["micropip", "networkx", "pyparsing"]);
      await py.runPythonAsync('import micropip\nawait micropip.install("rdflib==7.1.4")');
      onStatus("Loading the pipeline…");
      const home = "/home/pyodide/";
      const [local, remote] = await Promise.all([
        Promise.all(LOCAL_FILES.map((file) => text(file))),
        Promise.all(NL2SPARQL_FILES.map((file) => text(NL2SPARQL + file))),
      ]);
      LOCAL_FILES.forEach((file, index) => write(home + file, local[index]));
      NL2SPARQL_FILES.forEach((file, index) => write(`${home}nl2sparql/${file}`, remote[index]));
      write(`${home}nl2sparql/llm.py`, await text("browser/llm_stub.py"));
      py.runPython(`import sys\nsys.path.insert(0, "${home}")\nsys.path.insert(0, "${home}browser")`);
      engine = py.pyimport("engine");
      onStatus("");
    })();
    ready.catch(() => {
      ready = null;
    });
    return ready;
  }

  function call(name, ...args) {
    return JSON.parse(engine[name](...args));
  }

  async function addGraph(id, name, contents, suffix, example = false) {
    await start();
    const { path, triples } = call("add_graph", id, contents, suffix);
    const record = { id, name, path, triples, example };
    graphs.set(id, record);
    return record;
  }

  async function useExample(example) {
    if (graphs.has(example.id)) return graphs.get(example.id);
    return addGraph(example.id, example.name, await text(example.file), ".ttl", true);
  }

  async function addUpload(file) {
    const suffix = (file.name.match(/\.[^.]+$/) || [".ttl"])[0];
    return addGraph(`upload-${Date.now()}`, file.name, await file.text(), suffix);
  }

  // ---------- model ----------

  const DEFAULT_SETTINGS = { backend: "ollama", url: "http://127.0.0.1:11434", model: "llama3.1", key: "" };

  function settings() {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings(next) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      // Private windows can refuse storage; the settings still apply for this visit.
    }
  }

  async function complete(prompt, system = "") {
    const s = settings();
    const messages = [...(system ? [{ role: "system", content: system }] : []), { role: "user", content: prompt }];
    const base = s.url.replace(/\/$/, "");
    let response;
    try {
      response =
        s.backend === "openai"
          ? await fetch(`${base}/chat/completions`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.key}` },
              body: JSON.stringify({ model: s.model, temperature: 0, messages }),
            })
          : await fetch(`${base}/api/chat`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ model: s.model, stream: false, options: { temperature: 0 }, messages }),
            });
    } catch {
      throw new Error(
        s.backend === "openai"
          ? `Could not reach ${base}.`
          : `Could not reach Ollama at ${base}. Start it with OLLAMA_ORIGINS="${location.origin}" ollama serve.`,
      );
    }
    if (!response.ok) throw new Error(`The model returned HTTP ${response.status}.`);
    const data = await response.json();
    const content = s.backend === "openai" ? data.choices?.[0]?.message?.content : data.message?.content;
    return { content: (content || "").trim(), model: s.model, provider: s.backend };
  }

  // nl2sparql's own system prompt, so browser and server translations match.
  const TRANSLATE_SYSTEM = "You translate competency questions into one SPARQL query. Return only the query.";

  async function translate(graph, question, contextText, examples) {
    await start();
    const examplesJson = JSON.stringify(examples);
    const prompt = engine.translation_prompt(graph.path, question, contextText, examplesJson);
    let reply = await complete(prompt, TRANSLATE_SYSTEM);
    let result = call("finish_translation", graph.path, reply.content, contextText, examplesJson);
    if (result.error) {
      reply = await complete(result.repair_prompt, TRANSLATE_SYSTEM);
      result = call("finish_translation", graph.path, reply.content, contextText, examplesJson);
      if (result.error) throw new Error(`The model returned SPARQL that does not parse: ${result.error}`);
    }
    return { sparql: result.sparql, model: reply.model, provider: reply.provider };
  }

  async function ask(graph, body, saved) {
    await start();
    const result = call(
      "ask",
      graph.path,
      body.nl_text,
      JSON.stringify(saved),
      JSON.stringify(body.retriever),
      JSON.stringify(body.reasoner),
      JSON.stringify(body.context),
      body.query || "",
    );
    if (result.model_prompt) {
      const reply = await complete(result.model_prompt);
      result.reasoning = { kind: "answer", items: [], text: reply.content, model: reply.model };
      delete result.model_prompt;
    }
    return result;
  }

  async function intent(question) {
    await start();
    return call("intent", question);
  }

  async function runQuery(graph, sparql) {
    await start();
    return call("run_query", graph.path, sparql);
  }

  // ---------- shared question log ----------

  let firestore = null;

  async function logQuestion(record) {
    const config = window.ONTOCHECK_FIREBASE;
    if (!config) return false;
    try {
      if (!firestore) {
        const [{ initializeApp }, store] = await Promise.all([
          import(`${FIREBASE}firebase-app.js`),
          import(`${FIREBASE}firebase-firestore.js`),
        ]);
        firestore = { db: store.getFirestore(initializeApp(config)), ...store };
      }
      await firestore.addDoc(firestore.collection(firestore.db, "questions"), {
        ...record,
        created_at: firestore.serverTimestamp(),
      });
      return true;
    } catch (error) {
      console.warn("Could not save the question to the shared log.", error);
      return false;
    }
  }

  window.BrowserEngine = {
    start,
    graphs,
    useExample,
    addUpload,
    ask,
    translate,
    intent,
    runQuery,
    settings,
    saveSettings,
    logQuestion,
    get loaded() {
      return Boolean(engine);
    },
  };
})();
