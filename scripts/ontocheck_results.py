"""Score the domain ontologies with every OntoCheck metric for the site.

Writes ontocheck-results.json, which the "Ontology assessment" section
reads: OOPS, FOOPS and OQuaRE (original and context-weighted) and
OntoCheck's own and query-fitness metrics. The domains, their competency
questions and benchmark suites are listed in the OntoCheck repository's
SupplementaryMaterials/leaderboard-domains.json.

Every metric runs, including those that dereference the ontology IRI, check
prefix registries and test links, so this needs internet access. Pass
--offline to skip those metrics.
"""

import os
import sys
from pathlib import Path

from ontocheck.leaderboard_export import export, load_manifest

ROOT = Path(__file__).resolve().parents[1]


def main():
    manifest = _ontocheck_dir() / "SupplementaryMaterials" / "leaderboard-domains.json"
    if not manifest.is_file():
        raise SystemExit(f"Manifest not found: {manifest}")
    payload = export(
        load_manifest(manifest),
        ROOT / "ontocheck-results.json",
        allow_network="--offline" not in sys.argv[1:],
    )
    failed = [d for d in payload["domains"] if "error" in d]
    for domain in failed:
        print(f"  {domain['name']}: {domain['error']}", file=sys.stderr)
    return 1 if failed else 0


def _ontocheck_dir():
    configured = os.environ.get("ONTOCHECK_DIR", "").strip()
    path = Path(configured) if configured else ROOT.parent / "OntoCheck"
    if not path.is_dir():
        raise SystemExit(f"OntoCheck repository not found: {path}")
    return path


if __name__ == "__main__":
    sys.exit(main())
