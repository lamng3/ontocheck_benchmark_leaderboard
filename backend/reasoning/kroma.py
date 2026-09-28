"""KROMA matching for a label the ontology has not seen.

A later phase will place KROMA beside HermiT: HermiT reports entailed
subclass and hop distance, and KROMA proposes an entity or subclass match
for an unseen label.
"""


def match_unseen_label(ontology_path, label):
    raise NotImplementedError(
        "KROMA unseen-label matching is reserved for a later phase."
    )
