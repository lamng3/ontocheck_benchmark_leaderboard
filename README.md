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

## Local development

Published rankings in the Benchmark tab are static and can be opened from
`index.html`. Uploads, FOOPS / OOPS / OQuaRE, OntoCheck, and question memory
need the Python service. Use Python 3.11 or newer. The PyPI release of
OntoCheck does not yet include the FOOPS, OOPS, and OQuaRE metrics, so
`requirements.txt` installs the current GitHub revision.

```bash
python3.13 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.app:app --port 8000
```

Then open <http://localhost:8000>.

Natural-language translation reads `ONTOCHECK_LLM_API_KEY`. Optional
`ONTOCHECK_LLM_BASE_URL` (default `https://api.together.xyz/v1`) and
`ONTOCHECK_LLM_MODEL`. Without a key, paste SPARQL directly and evaluate it.

## Deployment

The `master` branch is published through GitHub Pages.
