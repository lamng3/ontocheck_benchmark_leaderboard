"""Prefix trie of SPARQL predicate paths.

Phase 1 keeps historical queries in SQLite and searches them lexically.
This module is the place a later phase will collapse redundant queries
(for example many geospatial event questions) into shared path prefixes
and precompute those answers when a new ontology is uploaded.
"""


class PrefixTrie:
    """Most-common predicate-path index. Not implemented in this phase."""

    def insert(self, predicate_path, query_id):
        raise NotImplementedError(
            "Query-containment trie indexing is reserved for a later phase."
        )

    def most_common(self, min_count=2):
        raise NotImplementedError(
            "Common path extraction is reserved for a later phase."
        )


def precompute(ontology_path, patterns):
    """Precompute answers for frequent path patterns. Not implemented."""
    raise NotImplementedError(
        "Answer precompute is reserved for a later phase."
    )
