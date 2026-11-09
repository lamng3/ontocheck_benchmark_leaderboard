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

  // Evaluate runs OntoCheck in a worker (browser/evaluate-worker.js), with its
  // own Python, so the page stays responsive during a run. It loads on the
  // first evaluation, so Ask does not pay for it.
  let worker = null;
  let nextRun = 0;
  const runs = new Map(); // id -> {resolve, reject, onStatus}

  function evaluate(graph, checks, sparql, prefixes, onStatus = () => {}) {
    return inWorker({ kind: "evaluate", text: graph.text, suffix: graph.suffix, checks, sparql, prefixes }, onStatus);
  }

  // Recall, precision, and bindings for queries, scored as the backend does.
  function score(graph, items, prefixes, onStatus = () => {}) {
    return inWorker({ kind: "score", text: graph.text, suffix: graph.suffix, items, prefixes }, onStatus);
  }

  function inWorker(message, onStatus) {
    if (!worker) {
      worker = new Worker("browser/evaluate-worker.js?v=20261027-7");
      worker.onmessage = ({ data }) => {
        if (data.type === "status") {
          runs.forEach((run) => run.onStatus(data.text));
          return;
        }
        const run = runs.get(data.id);
        if (!run) return;
        runs.delete(data.id);
        if (data.type === "result") run.resolve(data.result);
        else run.reject(new Error(data.message));
      };
      worker.onerror = (event) => {
        runs.forEach((run) => run.reject(new Error(event.message || "The evaluation worker stopped.")));
        runs.clear();
        worker = null;
      };
    }
    const id = ++nextRun;
    return new Promise((resolve, reject) => {
      runs.set(id, { resolve, reject, onStatus });
      worker.postMessage({ id, base: location.href, ...message });
    });
  }

  function call(name, ...args) {
    return JSON.parse(engine[name](...args));
  }

  // A graph keeps its file text; Ask parses it into this page's Python the
  // first time it needs it, and Evaluate sends the text to the worker.
  async function useExample(example) {
    if (!graphs.has(example.id)) {
      graphs.set(example.id, { id: example.id, name: example.name, text: await text(example.file), suffix: ".ttl", example: true });
    }
    return graphs.get(example.id);
  }

  async function addUpload(file) {
    const suffix = (file.name.match(/\.[^.]+$/) || [".ttl"])[0];
    const record = { id: `upload-${Date.now()}`, name: file.name, text: await file.text(), suffix, example: false };
    graphs.set(record.id, record);
    return record;
  }

  async function parsed(graph) {
    if (!graph.path) {
      await start();
      Object.assign(graph, call("add_graph", graph.id, graph.text, graph.suffix));
    }
    return graph;
  }

  // ---------- model ----------

  // Where the LLM agent and Translate send their prompts. Claude goes through
  // the Anthropic SDK, GPT through OpenAI's API, both straight from this page
  // with the visitor's own key; Ollama runs on the visitor's computer.
  const ANTHROPIC_SDK = "https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.130.0/+esm";
  const PROVIDERS = {
    anthropic: { label: "Claude", keyUrl: "https://console.anthropic.com/settings/keys" },
    openai: { label: "GPT", baseUrl: "https://api.openai.com/v1", keyUrl: "https://platform.openai.com/api-keys" },
    ollama: { label: "Ollama" },
  };
  const CLAUDE_MODELS = ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"];
  const DEFAULT_SETTINGS = {
    provider: "anthropic",
    models: { anthropic: "claude-opus-5-5", openai: "", ollama: "llama3.1" },
    ollamaUrl: "http://127.0.0.1:11434",
  };

  function settings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      if (saved.backend) {
        // The earlier single-provider shape could hold a key; drop it with the rest.
        localStorage.removeItem(SETTINGS_KEY);
        return { ...DEFAULT_SETTINGS };
      }
      return { ...DEFAULT_SETTINGS, ...saved, models: { ...DEFAULT_SETTINGS.models, ...saved.models } };
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

  // Keys never go in the settings object. They live in sessionStorage (gone
  // when the tab closes) unless the visitor asks to remember them.
  const keySlot = (provider) => `ontocheck-key-${provider}`;

  function apiKey(provider) {
    try {
      const remembered = localStorage.getItem(keySlot(provider));
      if (remembered) return { key: remembered, remembered: true };
      return { key: sessionStorage.getItem(keySlot(provider)) || "", remembered: false };
    } catch {
      return { key: "", remembered: false };
    }
  }

  function saveApiKey(provider, key, remember) {
    try {
      localStorage.removeItem(keySlot(provider));
      sessionStorage.removeItem(keySlot(provider));
      if (key) (remember ? localStorage : sessionStorage).setItem(keySlot(provider), key);
    } catch {
      // Storage blocked: the key is not kept, and the next call asks for it again.
    }
  }

  let anthropicSdk = null;

  async function claude(prompt, system, model, key) {
    const Anthropic = await loadAnthropic();
    const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
    const base = {
      model,
      max_tokens: 16000,
      ...(system ? { system } : {}),
      messages: [{ role: "user", content: prompt }],
    };
    // On a safety decline, Opus and Sonnet retry on a fallback model chosen
    // by the API; Haiku has no server-side fallback.
    const withFallback = model === "claude-haiku-5-5" ? null : { ...base, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" };
    let message;
    try {
      try {
        message = withFallback ? await client.beta.messages.stream(withFallback).finalMessage() : await client.messages.stream(base).finalMessage();
      } catch (error) {
        // An account without the fallback beta gets a 400; retry plainly once.
        if (!(withFallback && error instanceof Anthropic.BadRequestError)) throw error;
        message = await client.messages.stream(base).finalMessage();
      }
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) throw new Error("Anthropic rejected the API key. Check it under Model.");
      if (error instanceof Anthropic.PermissionDeniedError) throw new Error(`This API key cannot use ${model}.`);
      if (error instanceof Anthropic.RateLimitError) throw new Error("Rate limited by Anthropic. Wait a moment and try again.");
      if (error instanceof Anthropic.APIConnectionError) throw new Error("Could not reach api.anthropic.com.");
      if (error instanceof Anthropic.APIError) throw new Error(`Anthropic API error ${error.status ?? ""}: ${error.message}`);
      throw error;
    }
    if (message.stop_reason === "refusal") {
      throw new Error(`Claude declined this request${message.stop_details?.explanation ? `: ${message.stop_details.explanation}` : "."}`);
    }
    const text = message.content.filter((block) => block.type === "text").map((block) => block.text).join("");
    return { content: text.trim(), model: message.model };
  }

  async function gpt(prompt, system, model, key) {
    const chosen = model || (await defaultGptModel(key));
    let response;
    try {
      response = await fetch(`${PROVIDERS.openai.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: chosen,
          messages: [...(system ? [{ role: "system", content: system }] : []), { role: "user", content: prompt }],
        }),
      });
    } catch {
      // OpenAI's error replies to a POST carry no CORS header, so the browser
      // hides them. The models list does carry one: ask it why.
      await gptModels(key);
      throw new Error("Could not reach api.openai.com.");
    }
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error("OpenAI rejected the API key. Check it under Model.");
    if (!response.ok) throw new Error(`OpenAI API error ${response.status}: ${data.error?.message || ""}`);
    return { content: (data.choices?.[0]?.message?.content || "").trim(), model: data.model };
  }

  // GPT chat models this key can use, newest first, for the model picker.
  async function gptModels(key) {
    let response;
    try {
      response = await fetch(`${PROVIDERS.openai.baseUrl}/models`, { headers: { Authorization: `Bearer ${key}` } });
    } catch {
      throw new Error("Could not reach api.openai.com.");
    }
    if (!response.ok) throw new Error(response.status === 401 ? "OpenAI rejected the API key." : `OpenAI returned HTTP ${response.status}.`);
    const { data = [] } = await response.json();
    return data
      .filter((item) => /^gpt-/.test(item.id) && !/audio|realtime|transcribe|tts|image|search|instruct/.test(item.id))
      .sort((a, b) => (b.created || 0) - (a.created || 0))
      .map((item) => item.id);
  }

  async function defaultGptModel(key) {
    const ids = await gptModels(key);
    const pick = ids.find((id) => /mini$/.test(id)) || ids[0];
    if (!pick) throw new Error("This OpenAI key lists no GPT models.");
    return pick;
  }

  async function ollama(prompt, system, model, url) {
    const base = url.replace(/\/$/, "");
    let response;
    try {
      response = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          options: { temperature: 0 },
          messages: [...(system ? [{ role: "system", content: system }] : []), { role: "user", content: prompt }],
        }),
      });
    } catch {
      throw new Error(`Could not reach Ollama at ${base}. Start it with OLLAMA_ORIGINS="${location.origin}" ollama serve, or use Claude or GPT with an API key.`);
    }
    if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}.`);
    const data = await response.json();
    return { content: (data.message?.content || "").trim(), model };
  }

  async function loadAnthropic() {
    if (!anthropicSdk) anthropicSdk = (await import(ANTHROPIC_SDK)).default;
    return anthropicSdk;
  }

  // The models this provider offers to this key (or this Ollama), without
  // generating anything, so checking a key costs nothing.
  async function listModels(provider, key, ollamaUrl) {
    if (provider === "anthropic") {
      const Anthropic = await loadAnthropic();
      const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
      const ids = [];
      try {
        for await (const model of client.models.list()) ids.push(model.id);
      } catch (error) {
        if (error instanceof Anthropic.AuthenticationError) throw new Error("Anthropic rejected the API key.");
        if (error instanceof Anthropic.APIConnectionError) {
          // A rejected key's reply from the models list has no CORS header, so
          // the browser reports it as a network failure. An empty Messages
          // request is answered readably (401 for a bad key, 400 otherwise)
          // and generates nothing.
          try {
            await client.messages.create({ model: "claude-haiku-5-5", max_tokens: 1, messages: [] });
          } catch (probe) {
            if (probe instanceof Anthropic.AuthenticationError) throw new Error("Anthropic rejected the API key.");
          }
          throw new Error("Could not reach api.anthropic.com.");
        }
        throw new Error(`Anthropic API error ${error.status ?? ""}: ${error.message}`);
      }
      return ids;
    }
    if (provider === "openai") return gptModels(key);
    const base = ollamaUrl.replace(/\/$/, "");
    let response;
    try {
      response = await fetch(`${base}/api/tags`);
    } catch {
      throw new Error(`Could not reach Ollama at ${base}. Start it with OLLAMA_ORIGINS="${location.origin}" ollama serve.`);
    }
    if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}.`);
    return ((await response.json()).models || []).map((item) => item.name);
  }

  async function testConnection() {
    const s = settings();
    const provider = s.provider;
    const key = provider === "ollama" ? "" : apiKey(provider).key;
    if (provider !== "ollama" && !key) throw new Error(`Paste your ${PROVIDERS[provider].label} API key first.`);
    const models = await listModels(provider, key, s.ollamaUrl);
    const chosen = s.models[provider];
    const available = !chosen || models.some((id) => id === chosen || id === `${chosen}:latest`);
    return { provider, models, chosen, available };
  }

  async function complete(prompt, system = "") {
    const s = settings();
    const provider = s.provider;
    const model = s.models[provider];
    let reply;
    if (provider === "ollama") {
      reply = await ollama(prompt, system, model, s.ollamaUrl);
    } else {
      const { key } = apiKey(provider);
      if (!key) throw new Error(`Add your ${PROVIDERS[provider].label} API key under Model to use the LLM agent and Translate.`);
      reply = provider === "anthropic" ? await claude(prompt, system, model, key) : await gpt(prompt, system, model, key);
    }
    return { ...reply, provider };
  }

  // nl2sparql's own system prompt, so browser and server translations match.
  const TRANSLATE_SYSTEM = "You translate competency questions into one SPARQL query. Return only the query.";

  async function translate(graph, question, contextText, examples) {
    await start();
    graph = await parsed(graph);
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
    graph = await parsed(graph);
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
    graph = await parsed(graph);
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
    evaluate,
    score,
    settings,
    saveSettings,
    apiKey,
    saveApiKey,
    gptModels,
    testConnection,
    PROVIDERS,
    CLAUDE_MODELS,
    logQuestion,
    get loaded() {
      return Boolean(engine);
    },
  };
})();
