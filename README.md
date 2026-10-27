# OntoCheck Benchmark Leaderboard

An interactive leaderboard for the competency-question evaluation results
reported with [OntoCheck](https://github.com/cwru-sdle/OntoCheck).

## Website

**[Open the OntoCheck Benchmark Leaderboard](https://lamng3.github.io/ontocheck_benchmark_leaderboard/)**

The site presents:

- a sortable leaderboard of coverage for MDS-Onto, PMDCo, AM-Ontology, EMMO,
  and CHAMEO, with each of the seven categories as a shaded column;
- a category profile that highlights one ontology against the others;
- task-based recall and precision for six applied domains, next to local
  FOOPS and OOPS results for the same files;
- an assessment tab ranking the domains on every OOPS, FOOPS, OQuaRE, and
  OntoCheck metric, original and weighted by competency questions;
- a searchable explorer containing all 176 published competency questions and
  their SPARQL queries.

## Data source

All displayed results are transcribed from Tables SC, SE, and SF of the
[OntoCheck supplementary material](https://github.com/cwru-sdle/OntoCheck/blob/main/SupplementaryMaterials/2605-KunduMehdiTran-OntoCheck-SupplementaryMaterial.pdf).

## Ontology assessment results

The **Assessment** tab reports each domain's four-level fitness profile as
defined in the OntoCheck-Bench whitepaper: conceptual fitness (Level I),
structural and logical fitness (Level II-A and II-B), retrieval fitness
(Level III), and downstream reasoning fitness (Level IV, shown as answer
accuracy and reasoning-path match). OOPS, FOOPS, OQuaRE, and OntoCheck's own
checks and term recall appear as ontology-quality baselines, not as a level.
Fitness is a profile, so the table ranks by one coordinate at a time. A
coordinate that has not run shows why (for example, no retriever is
configured yet). The tab reads `ontocheck-results.json`.

To regenerate it after the ontologies change, with the OntoCheck repository
checked out next to this one (or `ONTOCHECK_DIR` pointing at it):

```bash
pip install -r requirements.txt
python scripts/ontocheck_results.py
```

The domains, their question files, and benchmark suites are listed in
OntoCheck's `SupplementaryMaterials/leaderboard-domains.json`. The same file
can be written from OntoCheck directly:

```bash
ontocheck-leaderboard --manifest SupplementaryMaterials/leaderboard-domains.json \
    --out ../ontocheck_benchmark_leaderboard/ontocheck-results.json
```

## Run the evaluation backend

The [GitHub Pages site](https://lamng3.github.io/ontocheck_benchmark_leaderboard/)
only shows the published benchmark. It has no evaluation service. If you open
that link and click **Start evaluation**, the page reports that the request
was rejected. Uploads, FOOPS, OOPS, OQuaRE, OntoCheck, and question memory
run on your machine until the backend is deployed.

Use Python 3.11 or newer. From this repository:

```bash
python3.13 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.app:app --port 8000
```

Then open <http://127.0.0.1:8000>. Leave that terminal running. Stop the
backend with Ctrl+C.

`requirements.txt` installs OntoCheck from GitHub because the current PyPI
release does not yet include the FOOPS, OOPS, and OQuaRE metrics.

Natural-language translation uses
[nl2sparql](https://github.com/lamng3/nl2sparql), a training-free generator.
It reads the uploaded Turtle file, optional context from the Questions tab,
and up to eight saved questions. Start [Ollama](https://ollama.com) and pull
a model if needed (`ollama pull llama3.1`). Model and API settings are
documented in that repository.

## Ask a knowledge graph

The **Ask** tab runs a question through a pipeline with four parts:

1. **Knowledge graph**: any uploaded ontology.
2. **Retriever**: nearest neighbour (character n-grams, the default), pattern
   matching, the SPARQL query in the editor, a Cypher query against Neo4j, or
   your own script.
3. **Reasoner**: path-based (the default), rule-based (RDFS and OWL Horn
   clause rules), or an LLM agent through Ollama. AMIE (rules mined from
   instance facts) and OWL reasoners (HermiT, Pellet, ELK) are listed but not
   wired in yet.
4. **Context**: choose which parts go in (retrieved terms, reasoner output,
   saved questions, only those with the same intent, a schema summary, your
   notes) and a character budget. **Translate to SPARQL** sends this context to
   nl2sparql.

Every question asked, translated, or scored is saved with a rule-based intent
(taxonomy, definition, property, relation, count, yes/no, provenance,
comparison, listing, other) and the pipeline settings used. The question log
filters by intent and exports JSON. `GET /api/questions?intent=taxonomy`
returns the same filter from the API. The options themselves live in
`pipeline-options.json`.

Optional settings:

- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` turn on the Cypher retriever
  (`pip install neo4j`).
- `ONTOCHECK_ALLOW_SCRIPTS=1` lets uploaded retrievers run. A script defines
  `retrieve(question, graph, k)`, receives an rdflib `Graph`, and returns IRIs
  or `{"iri", "score", "why"}` dicts. It runs as Python on your machine, so
  this is off by default.
- `OLLAMA_HOST` and `OLLAMA_MODEL` set the LLM agent's server and model.

## Deployment

The `master` branch is published through GitHub Pages. The evaluation backend
is not deployed yet.
