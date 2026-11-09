// Runs OntoCheck in a worker, so the page stays responsive while it works.
// The page sends {id, kind, text, suffix, ...}: an evaluation (checks, sparql,
// prefixes) or, with kind "score", query scoring (items, prefixes). It gets
// back status messages, then a result or an error.
importScripts("https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js");

const NLTK_DATA = "https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/corpora/";
// Repository files the evaluator imports, written at the same paths.
const FILES = [
  "backend/__init__.py",
  "backend/evaluators/__init__.py",
  "backend/evaluators/ontocheck_runner.py",
  "backend/evaluators/report.py",
  "backend/evaluators/oquare.py",
  "browser/evaluate.py",
];

let ready = null;
let py = null;
let evaluator = null;

const status = (text) => postMessage({ type: "status", text });

async function text(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url} (${response.status}).`);
  return response.text();
}

async function start(base) {
  status("Loading Python for OntoCheck…");
  py = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/" });
  status("Installing OntoCheck…");
  await py.loadPackage(["micropip", "networkx", "pyparsing", "requests"]);
  const wheel = new URL("browser/py/ontocheck-0.1.3-py3-none-any.whl", base).href;
  await py.runPythonAsync(
    `import micropip\nawait micropip.install(["rdflib==7.1.4", "nltk", "pyspellchecker"])\nawait micropip.install("${wheel}", deps=False)`,
  );
  const sources = await Promise.all(FILES.map((file) => text(new URL(file, base).href)));
  FILES.forEach((file, index) => {
    const path = `/home/pyodide/${file}`;
    py.FS.mkdirTree(path.split("/").slice(0, -1).join("/"));
    py.FS.writeFile(path, sources[index]);
  });
  status("Downloading the stopword list and WordNet (about 11 MB, once)…");
  py.FS.mkdirTree("/home/pyodide/nltk_data/corpora");
  for (const name of ["stopwords", "wordnet"]) {
    const response = await fetch(`${NLTK_DATA}${name}.zip`);
    if (!response.ok) throw new Error(`Could not download the NLTK ${name} data (${response.status}).`);
    py.FS.writeFile(`/home/pyodide/nltk_data/corpora/${name}.zip`, new Uint8Array(await response.arrayBuffer()));
  }
  // NLTK reads WordNet from its zip; the stopword list must be unpacked.
  py.runPython(`import sys, zipfile, nltk
sys.path.insert(0, "/home/pyodide")
sys.path.insert(0, "/home/pyodide/browser")
zipfile.ZipFile("/home/pyodide/nltk_data/corpora/stopwords.zip").extractall("/home/pyodide/nltk_data/corpora")
nltk.data.path.insert(0, "/home/pyodide/nltk_data")`);
  evaluator = py.pyimport("evaluate");
}

// A Python traceback ends with the line worth showing.
function shortError(error) {
  const lines = String(error.message || error).trim().split("\n");
  return lines[lines.length - 1].slice(0, 300);
}

onmessage = async ({ data }) => {
  try {
    if (!ready) {
      ready = start(data.base);
      ready.catch(() => {
        ready = null;
      });
    }
    await ready;
    status(data.kind === "score" ? "Scoring the query…" : "Running OntoCheck…");
    const result =
      data.kind === "score"
        ? evaluator.score_text(data.text, data.suffix, JSON.stringify(data.items), JSON.stringify(data.prefixes))
        : evaluator.evaluate_text(
            data.text,
            data.suffix,
            JSON.stringify(data.checks),
            JSON.stringify(data.sparql),
            JSON.stringify(data.prefixes),
          );
    postMessage({ type: "result", id: data.id, result: JSON.parse(result) });
  } catch (error) {
    postMessage({ type: "error", id: data.id, message: shortError(error) });
  }
};
