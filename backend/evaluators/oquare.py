"""Group OntoCheck OQuaRE metrics into 1–5 characteristic scores."""

CHARACTERISTICS = (
    ("Structural", ("ANOnto", "RROnto", "LCOMOnto", "TMOnto", "DITOnto")),
    ("Functional adequacy", ("AROnto", "INROnto", "NOMOnto", "CROnto")),
    ("Maintainability", ("WMCOnto", "WMCOnto2", "RFCOnto", "NOCOnto", "NACOnto")),
    ("Reliability", ("LCOMOnto", "TMOnto2")),
    ("Operability", ("ANOnto", "PROnto")),
    ("Compatibility", ("CBOnto",)),
    ("Transferability", ("POnto", "RROnto")),
)


def characteristics_from_metrics(metrics):
    """Average OntoCheck static-scale scores into OQuaRE characteristics."""
    by_abbrev = {}
    for metric in metrics:
        abbrev = (metric.get("source_id") or "").upper()
        scale = metric.get("static_scale")
        if abbrev and isinstance(scale, (int, float)):
            by_abbrev[abbrev] = metric

    characteristics = []
    for name, members in CHARACTERISTICS:
        scores = [
            by_abbrev[member.upper()]["static_scale"]
            for member in members
            if member.upper() in by_abbrev
        ]
        if not scores:
            continue
        characteristics.append(
            {
                "name": name,
                "score": round(sum(scores) / len(scores), 2),
                "metrics": len(scores),
            }
        )
    return characteristics
