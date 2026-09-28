"""HermiT entailment for subclass and hierarchy distance.

A later phase will answer whether one concept is a subclass of another,
including links that are only reachable by transitivity, and report
2-hop and 3-hop ontology distance.
"""


def subclass_entailment(ontology_path, parent_label, child_label):
    raise NotImplementedError(
        "HermiT subclass entailment is reserved for a later phase."
    )


def hierarchy_distance(ontology_path, first_label, second_label):
    raise NotImplementedError(
        "HermiT hierarchy distance is reserved for a later phase."
    )
