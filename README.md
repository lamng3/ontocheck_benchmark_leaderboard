<h1 align="center">
  OntoCheck Benchmark Leaderboard<br>
  <sub>How well do ontologies answer the questions they were built for?</sub>
</h1>

<p align="center">
  <i>Compare ontologies on competency questions, read each one's four-level fitness profile, and ask a knowledge graph questions in the browser.</i>
</p>

<p align="center">
  <a href="https://lamng3.com/ontocheck_benchmark_leaderboard/"><img src="https://img.shields.io/badge/site-live-0d857a" alt="Site"></a>
  <a href="https://lamng3.com/ontocheck_benchmark_leaderboard/#ask"><img src="https://img.shields.io/badge/demo-in%20your%20browser-2a78d6" alt="Demo"></a>
  <a href="https://github.com/cwru-sdle/OntoCheck"><img src="https://img.shields.io/badge/built%20on-OntoCheck-8b5cf6" alt="Built on OntoCheck"></a>
  <a href="requirements.txt"><img src="https://img.shields.io/badge/python-3.11%2B-3b82f6" alt="Python 3.11+"></a>
  <a href="https://creativecommons.org/licenses/by/4.0/"><img src="https://img.shields.io/badge/license-CC%20BY%204.0-green.svg" alt="License: CC BY 4.0"></a>
</p>

<p align="center">
  <a href="#-quick-start">⚡ Quick start</a> · <a href="#-what-it-is">✨ What it is</a> · <a href="#-what-runs-where">🧭 What runs where</a> · <a href="#-usage">🔧 Usage</a> · <a href="#-data">📊 Data</a> · <a href="#license">📝 License</a>
</p>

> [!NOTE]
> **Nothing to install to try it.** On the [live site](https://lamng3.com/ontocheck_benchmark_leaderboard/#ask),
> Ask runs the retrieval and reasoning pipeline in your browser on six example ontologies.
> Run the backend locally to evaluate your own files with FOOPS, OOPS, OQuaRE, and OntoCheck.

## ⚡ Quick start

Open the [Ask tab](https://lamng3.com/ontocheck_benchmark_leaderboard/#ask), pick an example such as XRD, and click one of the suggested questions.

To run everything locally, including evaluations of your own files:

```bash
git clone https://github.com/lamng3/ontocheck_benchmark_leaderboard.git
cd ontocheck_benchmark_leaderboard
python3.13 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.app:app --port 8000
```

Then open <http://127.0.0.1:8000>.

## ✨ What it is

A leaderboard and workbench for [OntoCheck](https://github.com/cwru-sdle/OntoCheck), the competency-question evaluation of ontologies.

| Tab | What it shows |
|:--|:--|
| **Leaderboard** | Coverage for MDS-Onto, PMDCo, AM-Ontology, EMMO, and CHAMEO on 50 general questions, with each of seven categories as a shaded column, and a profile that highlights one ontology against the others |
| **Domains** | Task-based recall and precision for six applied domains, next to local FOOPS and OOPS results for the same files |
| **Assessment** | Each domain's four-level fitness profile from the OntoCheck-Bench whitepaper: conceptual (I), structural and logical (II-A, II-B), retrieval (III), and downstream reasoning (IV), next to the OOPS, FOOPS, OQuaRE, and term-recall baselines |
| **Questions** | All 176 published competency questions with their SPARQL |
| **Evaluate** | FOOPS, OOPS, OQuaRE, and OntoCheck recall and precision for an example or your own file |
| **Ask** | A question through a pipeline you choose: knowledge graph, retriever, reasoner, and context |

Ask's pipeline:

1. **Knowledge graph**: one of six example domain ontologies, or your own file.
2. **Retriever**: nearest neighbour (character n-grams, the default), pattern matching, the SPARQL query in the editor, a Cypher query against Neo4j, or your own script.
3. **Reasoner**: path-based (the default), rule-based (RDFS and OWL Horn clause rules), or an LLM agent. AMIE rules and OWL reasoners (HermiT, Pellet, ELK) are listed but not wired in yet.
4. **Context**: retrieved terms, reasoner output, saved questions (optionally only those with the same intent), a schema summary, and your notes, within a character budget. **Translate to SPARQL** sends this context to [nl2sparql](https://github.com/lamng3/nl2sparql).

Every question asked, translated, or run is saved with a rule-based intent (taxonomy, definition, property, relation, count, yes/no, provenance, comparison, listing, other) and the pipeline settings, so questions can be filtered by intent later.

## 🧭 What runs where

| | On the live site | With the backend |
|:--|:--|:--|
| Leaderboard, Domains, Assessment, Questions | Static files | Same |
| Ask: retrieval, reasoning, context | In the page, under [Pyodide](https://pyodide.org): the same Python modules as the backend | On the backend |
| Translate and the LLM agent | Your model: Claude or GPT with your own API key, or Ollama on your computer | Ollama, or `ONTOCHECK_LLM_PROVIDER=openai` |
| Run a SPARQL query | In the page | On the backend, with recall and precision |
| Evaluate | FOOPS, OOPS, OQuaRE, and OntoCheck on the public backend (Cloud Run): files up to 5 MB, one evaluation at a time per visitor | Same, on any file up to 25 MB |
| Cypher retriever, uploaded retriever scripts | Not available | Opt-in settings |
| Question log | Your browser, and a shared Firestore log when configured | SQLite under `data/` |

Uploaded files stay in the page on the live site. Under **Model**, paste an Anthropic or OpenAI key and press **Test connection**: it lists the models that key can use, without generating anything. Keys go only to Anthropic or OpenAI, straight from the page, and are forgotten when the tab closes unless you choose to remember them. Claude requests on Opus and Sonnet enable the API's server-side fallback, so a safety decline is retried on another model. To use Ollama from the live site instead, let it accept requests from the page:

```bash
OLLAMA_ORIGINS="https://lamng3.com" ollama serve
```

## 🔧 Usage

<details>
<summary><b>Backend settings</b></summary>

| Variable | Effect |
| --- | --- |
| `OLLAMA_HOST`, `OLLAMA_MODEL` | The LLM agent's server and model. |
| `ONTOCHECK_LLM_PROVIDER=openai`, `ONTOCHECK_LLM_API_KEY`, `ONTOCHECK_LLM_BASE_URL`, `ONTOCHECK_LLM_MODEL` | Translate with an OpenAI-compatible API instead of Ollama (read by nl2sparql). |
| `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` | Turn on the Cypher retriever (`pip install neo4j`). |
| `ONTOCHECK_ALLOW_SCRIPTS=1` | Let uploaded retrievers run. A script defines `retrieve(question, graph, k)`, receives an rdflib `Graph`, and returns IRIs or `{"iri", "score", "why"}` dicts. It runs as Python on your machine, so it is off by default. |
| `ONTOCHECK_DATA` | Where uploads, runs, and saved questions are stored (default `data/`). |

`GET /api/questions?intent=taxonomy` returns saved questions filtered by intent. The pipeline options live in `pipeline-options.json`. `requirements.txt` installs OntoCheck from GitHub because the PyPI release does not yet include the FOOPS, OOPS, and OQuaRE metrics.

</details>

<details>
<summary><b>The public evaluation backend</b></summary>

The live site's Evaluate tab calls a public copy of the backend on Cloud Run, set in `browser/api-config.js`. It runs with `ONTOCHECK_PUBLIC=1`: uploads up to 5 MB, one evaluation at a time and 12 an hour per visitor, at most two evaluations running at once, and no uploaded retriever scripts or Cypher. It keeps uploads and results on the instance's disk, so they last while the instance is awake. The site sends its session in an `X-OntoCheck-Session` header, because browsers block third-party cookies, and the backend only answers origins listed in `ONTOCHECK_CORS_ORIGINS`.

To deploy it, with billing enabled on the Google Cloud project and `gcloud` signed in:

```bash
scripts/deploy_backend.sh   # prints the service URL for browser/api-config.js
```

It runs at most one instance and scales to zero when idle.

</details>

<details>
<summary><b>The shared question log</b></summary>

On the live site, each question is kept in the visitor's browser and, when `browser/firebase-config.js` holds a Firebase web config, also added to the Firestore collection `questions`: the text, intent, any SPARQL, the example graph's name, and the pipeline settings. Uploaded files and notes are never sent. `firestore.rules` lets visitors add a question in that shape and nothing else; read the log in the Firebase console or with the Admin SDK. Deploy the rules with:

```bash
firebase deploy --only firestore:rules --project <project-id>
```

</details>

<details>
<summary><b>Examples</b></summary>

The six domain ontologies are in `examples/`, one Turtle file per domain, with domains made of several files merged. Refresh them from OntoCheck:

```bash
python scripts/fetch_examples.py
```

</details>

<details>
<summary><b>Assessment results</b></summary>

The Assessment tab reads `ontocheck-results.json`. With the OntoCheck repository next to this one (or `ONTOCHECK_DIR` pointing at it):

```bash
python scripts/ontocheck_results.py
```

The domains, their question files, and benchmark suites are listed in OntoCheck's `SupplementaryMaterials/leaderboard-domains.json`. The same file can be written from OntoCheck directly:

```bash
ontocheck-leaderboard --manifest SupplementaryMaterials/leaderboard-domains.json \
    --out ../ontocheck_benchmark_leaderboard/ontocheck-results.json
```

</details>

<details>
<summary><b>Repository layout</b></summary>

```text
index.html, script.js, styles.css   The site
browser/                            Pyodide runtime for Ask, and the Firebase config
backend/                            FastAPI app, evaluators, and the Ask pipeline
examples/                           Built-in example ontologies
scripts/                            Data refresh scripts
*.json                              Benchmark results and pipeline options
```

</details>

## 📊 Data

The leaderboard and domain results are transcribed from Tables SC, SE, and SF of the [OntoCheck supplementary material](https://github.com/cwru-sdle/OntoCheck/blob/main/SupplementaryMaterials/2605-KunduMehdiTran-OntoCheck-SupplementaryMaterial.pdf). The competency questions and example ontologies come from the same repository. `master` is published through GitHub Pages and served at [lamng3.com/ontocheck_benchmark_leaderboard](https://lamng3.com/ontocheck_benchmark_leaderboard/).

## License

Released under the [Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/). The benchmark data, competency questions, and example ontologies come from [OntoCheck](https://github.com/cwru-sdle/OntoCheck), also under CC BY 4.0.
