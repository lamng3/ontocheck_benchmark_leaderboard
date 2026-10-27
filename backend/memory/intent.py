"""Rule-based intent labels for competency questions.

The label is stored with each question so saved questions can be filtered
by intent, and later grouped before SPARQL is parsed or generated.
"""

import re

# Checked in order; the first rule whose pattern matches wins.
RULES = [
    ("count", r"^\s*how many\b|\bnumber of\b|\bcount\b"),
    ("comparison", r"\bdifference between\b|\bcompare\b|\bversus\b|\bvs\.?\b|\bdiffer\b"),
    ("provenance", r"\bwho (created|made|authored|performed|measured)\b|\bprovenance\b|\bsource of\b|\bwhen was\b|\bderived from\b"),
    ("taxonomy", r"\bsub-?class(es)?\b|\bsuper-?class(es)?\b|\b(types|kinds|categories) of\b|\bis an? (type|kind)\b|\bhierarch"),
    ("definition", r"^\s*(what is|what are|define|describe)\b(?!.*\b(of|for|between|relat\w*|connect\w*|link\w*)\b)"),
    ("relation", r"\brelat(ed|ion|ionship)\b|\bconnect(ed|s)?\b|\blink(ed|s)?\b|\bbetween\b|\bhow does\b"),
    ("property", r"\bpropert(y|ies)\b|\battribute|\bvalue of\b|\bunit of\b|\bhas a\b|\bmeasured\b|\bparameter|^\s*what (is|are) the \w+( \w+)? of\b"),
    ("boolean", r"^\s*(is|are|does|do|can|could|has|have|was|were)\b"),
    ("listing", r"^\s*(list|which|what|show|give|find|name)\b"),
]

_COMPILED = [(intent, re.compile(pattern, re.IGNORECASE)) for intent, pattern in RULES]


def classify(text):
    """Return {"intent": ..., "cue": matched words} for a question."""
    for intent, pattern in _COMPILED:
        match = pattern.search(text or "")
        if match:
            return {"intent": intent, "cue": match.group(0).strip()}
    return {"intent": "other", "cue": ""}
