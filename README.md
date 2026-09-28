# OntoCheck Benchmark Leaderboard

An interactive leaderboard for the competency-question evaluation results
reported with [OntoCheck](https://github.com/cwru-sdle/OntoCheck).

## Website

**[Open the OntoCheck Benchmark Leaderboard](https://lamng3.github.io/ontocheck_benchmark_leaderboard/)**

The site presents:

- comparative coverage for MDS-Onto, PMDCo, AM-Ontology, EMMO, and CHAMEO;
- category-level competency-question coverage;
- task-based recall and precision for six applied scientific domains;
- a searchable explorer containing all 176 published competency questions and
  their SPARQL queries.

## Data source

All displayed results are transcribed from Tables SC, SE, and SF of the
[OntoCheck supplementary material](https://github.com/cwru-sdle/OntoCheck/blob/main/SupplementaryMaterials/2605-KunduMehdiTran-OntoCheck-SupplementaryMaterial.pdf).

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

## Deployment

The `master` branch is published through GitHub Pages. The evaluation backend
is not deployed yet.
