"""Download the six domain ontologies as built-in examples.

Writes examples/<id>.ttl and examples/manifest.json. A domain made of several
files (Capacitors, Geospatial) is merged into one Turtle file. The file list
per domain comes from benchmark-frameworks.json, the same files the FOOPS and
OOPS results were computed on.

The ontologies are from OntoCheck's SupplementaryMaterials/Ontologies
(CC BY 4.0, SDLE Research Center, Case Western Reserve University).
"""

import json
import re
import urllib.request
from pathlib import Path

from rdflib import Graph

ROOT = Path(__file__).resolve().parents[1]
SUPPLEMENT = "https://raw.githubusercontent.com/cwru-sdle/OntoCheck/main/SupplementaryMaterials/"
SOURCE = SUPPLEMENT + "Ontologies/"
OUT = ROOT / "examples"


def main():
    domains = json.loads((ROOT / "benchmark-frameworks.json").read_text())["domains"]
    # The prefixes that count as the domain's own terms when scoring recall,
    # as in OntoCheck's leaderboard runs.
    with urllib.request.urlopen(SUPPLEMENT + "leaderboard-domains.json", timeout=60) as response:
        listed = json.load(response)
    prefixes = {item["name"]: item.get("domain_prefixes", []) for item in (listed if isinstance(listed, list) else listed["domains"])}
    OUT.mkdir(exist_ok=True)
    manifest = []
    for domain in domains:
        graph = Graph()
        for name in domain["files"]:
            with urllib.request.urlopen(SOURCE + name, timeout=60) as response:
                graph.parse(data=response.read().decode("utf-8"), format="turtle")
        slug = re.sub(r"[^a-z0-9]+", "-", domain["name"].lower()).strip("-")
        path = OUT / f"{slug}.ttl"
        graph.serialize(path, format="turtle")
        manifest.append(
            {
                "id": f"example-{slug}",
                "name": domain["name"],
                "file": f"examples/{path.name}",
                "sources": domain["files"],
                "triples": len(graph),
                # Matches the question set names in script.js.
                "questions": domain["name"],
                "domain_prefixes": prefixes.get(domain["name"], []),
            }
        )
        print(f"{domain['name']}: {len(graph)} triples from {', '.join(domain['files'])}")
    (OUT / "manifest.json").write_text(json.dumps({"source": SOURCE, "examples": manifest}, indent=2) + "\n")


if __name__ == "__main__":
    main()
