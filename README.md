<div align="center">

# 🏆 OntoCheck Benchmark Leaderboard

**How well do ontologies answer the questions they were built for?**

[![Website](https://img.shields.io/badge/site-lamng3.com%2Fontocheck-2a78d6)](https://lamng3.com/ontocheck_benchmark_leaderboard/)
[![OntoCheck](https://img.shields.io/badge/built%20on-OntoCheck-8b5cf6)](https://github.com/cwru-sdle/OntoCheck)
[![Python](https://img.shields.io/badge/python-3.11%2B-3b82f6)](requirements.txt)
[![License: CC BY 4.0](https://img.shields.io/badge/license-CC%20BY%204.0-green.svg)](LICENSE)

[⚡ Quick start](#-quick-start) · [✨ What it is](#-what-it-is) · [🔧 Usage](#-usage) · [📊 Data](#-data) · [📝 License](#-license)

</div>

> [!NOTE]
> **The website shows the published benchmark. The backend runs it on your ontology.**
> [lamng3.com/ontocheck_benchmark_leaderboard](https://lamng3.com/ontocheck_benchmark_leaderboard/)
> is static. Evaluating an upload and asking questions of a knowledge graph need the
> backend running on your machine.

## ⚡ Quick start

```bash
python3.13 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.app:app --port 8000
```

Open <http://127.0.0.1:8000>. Every tab works there, including **Evaluate** and **Ask**.

## ✨ What it is

A leaderboard and workbench for [OntoCheck](https://github.com/cwru-sdle/OntoCheck), the competency-question evaluation of ontologies.

- **Leaderboard.** Coverage for MDS-Onto, PMDCo, AM-Ontology, EMMO, and CHAMEO on 50 general questions, with each of seven categories as a shaded column, and a profile that highlights one ontology against the others.
- **Domains.** Task-based recall and precision for six applied domains, next to local FOOPS and OOPS results for the same files.
- **Assessment.** Each domain's four-level fitness profile from the OntoCheck-Bench whitepaper: conceptual (I), structural and logical (II-A, II-B), retrieval (III), and downstream reasoning (IV). OOPS, FOOPS, OQuaRE, and OntoCheck term recall appear as baselines, original and weighted by the domain's questions. Fitness is a profile, so the table ranks by one coordinate at a time.
- **Questions.** All 176 published competency questions with their SPARQL, searchable by text and question set.
- **Evaluate.** Upload an ontology and run FOOPS, OOPS, OQuaRE, and OntoCheck recall and precision.
- **Ask.** Choose a knowledge graph, a retriever, a reasoner, and what goes into the context. Every question is saved with its intent and the settings used, so the log can be filtered by intent and exported.

## 🔧 Usage

<details>
<summary><b>Ask a knowledge graph</b></summary>

The **Ask** tab runs a question through four stages:

1. **Knowledge graph**: any uploaded ontology.
2. **Retriever**: nearest neighbour (character n-grams, the default), pattern matching, the SPARQL query in the editor, a Cypher query against Neo4j, or your own script.
3. **Reasoner**: path-based (the default), rule-based (RDFS and OWL Horn clause rules), or an LLM agent through Ollama. AMIE rules and OWL reasoners (HermiT, Pellet, ELK) are listed but not wired in yet.
4. **Context**: retrieved terms, reasoner output, saved questions (optionally only those with the same intent), a schema summary, and your notes, within a character budget. **Translate to SPARQL** sends this context to [nl2sparql](https://github.com/lamng3/nl2sparql).

Every question asked, translated, or scored is saved with a rule-based intent (taxonomy, definition, property, relation, count, yes/no, provenance, comparison, listing, other) and the pipeline settings. `GET /api/questions?intent=taxonomy` filters the same way as the question log. The options live in `pipeline-options.json`.

</details>

<details>
<summary><b>Translation and the LLM agent</b></summary>

Both use a local [Ollama](https://ollama.com) model:

```bash
ollama serve
ollama pull llama3.1
```

Translation reads the uploaded Turtle file, the assembled context, and up to eight saved questions. Model and API settings are documented in [nl2sparql](https://github.com/lamng3/nl2sparql).

</details>

<details>
<summary><b>Optional settings</b></summary>

| Variable | Effect |
| --- | --- |
| `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` | Turn on the Cypher retriever (`pip install neo4j`). |
| `ONTOCHECK_ALLOW_SCRIPTS=1` | Let uploaded retrievers run. A script defines `retrieve(question, graph, k)`, receives an rdflib `Graph`, and returns IRIs or `{"iri", "score", "why"}` dicts. It runs as Python on your machine, so it is off by default. |
| `OLLAMA_HOST`, `OLLAMA_MODEL` | The LLM agent's server and model. |
| `ONTOCHECK_DATA` | Where uploads, runs, and saved questions are stored (default `data/`). |

`requirements.txt` installs OntoCheck from GitHub because the PyPI release does not yet include the FOOPS, OOPS, and OQuaRE metrics.

</details>

<details>
<summary><b>Regenerate the assessment results</b></summary>

The **Assessment** tab reads `ontocheck-results.json`. With the OntoCheck repository checked out next to this one (or `ONTOCHECK_DIR` pointing at it):

```bash
python scripts/ontocheck_results.py
```

The domains, their question files, and benchmark suites are listed in OntoCheck's `SupplementaryMaterials/leaderboard-domains.json`. The same file can be written from OntoCheck directly:

```bash
ontocheck-leaderboard --manifest SupplementaryMaterials/leaderboard-domains.json \
    --out ../ontocheck_benchmark_leaderboard/ontocheck-results.json
```

</details>

## 📊 Data

The leaderboard and domain results are transcribed from Tables SC, SE, and SF of the [OntoCheck supplementary material](https://github.com/cwru-sdle/OntoCheck/blob/main/SupplementaryMaterials/2605-KunduMehdiTran-OntoCheck-SupplementaryMaterial.pdf). The competency questions load from the same repository.

The `master` branch is published through GitHub Pages and served at [lamng3.com/ontocheck_benchmark_leaderboard](https://lamng3.com/ontocheck_benchmark_leaderboard/). The backend is not deployed.

## 📝 License

[CC BY 4.0](LICENSE). Benchmark data and competency questions come from [OntoCheck](https://github.com/cwru-sdle/OntoCheck) under its own license.
