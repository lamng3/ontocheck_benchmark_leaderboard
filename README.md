# OntoCheck Benchmark Leaderboard

An interactive leaderboard for the competency-question evaluation results
reported with [OntoCheck](https://github.com/cwru-sdle/OntoCheck).

## Website

**[Open the OntoCheck Benchmark Leaderboard](https://lamng3.github.io/ontocheck_benchmark_leaderboard/)**

The site presents:

- comparative coverage for MDS-Onto, PMDCo, AM-Ontology, EMMO, and CHAMEO;
- category-level competency-question coverage;
- task-based recall and precision for six applied scientific domains.

## Data source

All displayed results are transcribed from Tables SC, SE, and SF of the
[OntoCheck supplementary material](https://github.com/cwru-sdle/OntoCheck/blob/main/SupplementaryMaterials/2605-KunduMehdiTran-OntoCheck-SupplementaryMaterial.pdf).

## Local development

The website has no build dependencies. Serve the repository with any static
HTTP server:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Deployment

The `master` branch is published through GitHub Pages.
