"""Score the six published domain ontologies with local FOOPS and OOPS.

The Turtle files live in the OntoCheck supplement. Public FOOPS and OOPS
are not called. GitHub Pages reads the JSON this script writes.
"""

import json
import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from ontocheck import run_assessment

from backend.evaluators.ontocheck_runner import _has_abox, _quiet_logging, _split_assessment
from backend.evaluators.report import build_report

DOMAINS = (
    ("EBSD", ("EBSD.ttl",)),
    (
        "Capacitors",
        ("Capacitor-Equipment.ttl", "Capacitor-Sample.ttl", "Capacitor-SampleHolder.ttl"),
    ),
    ("GeoOutage", ("GeoOutage.ttl",)),
    (
        "Geospatial",
        (
            "Geospatial-Rasters.ttl",
            "Geospatial-SatelliteSensorBand.ttl",
            "Geospatial-mdsGeo.ttl",
        ),
    ),
    ("Materials Processing", ("MatProc.ttl",)),
    ("XRD", ("XRD.ttl",)),
)


def main():
    source = _ontology_dir()
    domains = []
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        for name, filenames in DOMAINS:
            paths = [source / filename for filename in filenames]
            missing = [path.name for path in paths if not path.is_file()]
            if missing:
                domains.append(
                    {
                        "name": name,
                        "files": list(filenames),
                        "error": f"Missing {', '.join(missing)} in {source}",
                    }
                )
                continue
            print(f"Scoring {name}…", flush=True)
            domains.append(_score(name, paths, work / name.replace(" ", "-")))
    payload = {"domains": domains}
    destination = ROOT / "benchmark-frameworks.json"
    destination.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {destination}")


def _ontology_dir():
    configured = os.environ.get("ONTOCHECK_ONTOLOGY_DIR", "").strip()
    if configured:
        path = Path(configured)
    else:
        path = ROOT.parent / "OntoCheck" / "SupplementaryMaterials" / "Ontologies"
    if not path.is_dir():
        raise SystemExit(f"Ontology directory not found: {path}")
    return path


def _score(name, paths, output_dir):
    output_dir.mkdir(parents=True, exist_ok=True)
    try:
        result = run_assessment(
            ttl_files=[str(path) for path in paths],
            metrics=None,
            frameworks=["FOOPS!", "OOPS!"],
            allow_network=False,
            has_abox=any(_has_abox(path) for path in paths),
            output_log_file=str(output_dir / "assessment.log"),
            output_csv_file=str(output_dir / "scores.csv"),
            framework_csv_file=str(output_dir / "framework.csv"),
        )
        _quiet_logging()
        _task_based, metrics = _split_assessment(result)
        report = build_report(None, metrics, [], {}, ["foops", "oops"])
    except Exception as exc:
        _quiet_logging()
        return {
            "name": name,
            "files": [path.name for path in paths],
            "error": str(exc),
        }
    return {
        "name": name,
        "files": [path.name for path in paths],
        "foops": report["foops"],
        "oops": report["oops"],
    }


if __name__ == "__main__":
    main()
