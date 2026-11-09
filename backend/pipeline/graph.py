"""Load an ontology once and index its named terms for retrieval."""

import re
import threading
from functools import lru_cache

from rdflib import BNode, Graph, Literal, URIRef
from rdflib.namespace import OWL, RDF, RDFS, SKOS

_lock = threading.Lock()

LABELS = (RDFS.label, SKOS.prefLabel, SKOS.altLabel)
DEFINITIONS = (SKOS.definition, RDFS.comment, URIRef("http://purl.obolibrary.org/obo/IAO_0000115"))
CLASS_TYPES = {OWL.Class, RDFS.Class}
PROPERTY_TYPES = {OWL.ObjectProperty, OWL.DatatypeProperty, OWL.AnnotationProperty, RDF.Property}
SCHEMA_NAMESPACES = (str(RDF), str(RDFS), str(OWL), str(SKOS), "http://www.w3.org/2001/XMLSchema#")


def local_name(uri):
    text = str(uri)
    return re.split(r"[#/:]", text.rstrip("/#"))[-1] or text


def is_schema(uri):
    return str(uri).startswith(SCHEMA_NAMESPACES)


@lru_cache(maxsize=8)
def _load(path, mtime_key):
    graph = Graph()
    graph.parse(path, format="turtle")
    return graph, _index(graph)


def load(path):
    """Return (graph, terms) where terms maps IRI string -> term record."""
    from os import stat

    with _lock:
        return _load(str(path), stat(path).st_mtime_ns)


def _index(graph):
    terms = {}
    for subject in set(graph.subjects()):
        if not isinstance(subject, URIRef) or is_schema(subject):
            continue
        types = set(graph.objects(subject, RDF.type))
        if types & CLASS_TYPES:
            kind = "class"
        elif types & PROPERTY_TYPES:
            kind = "property"
        elif types and OWL.Ontology not in types:
            kind = "individual"
        else:
            continue
        labels = [str(value) for p in LABELS for value in graph.objects(subject, p) if isinstance(value, Literal)]
        definition = next(
            (str(value) for p in DEFINITIONS for value in graph.objects(subject, p) if isinstance(value, Literal)),
            "",
        )
        terms[str(subject)] = {
            "iri": str(subject),
            "label": labels[0] if labels else _split_camel(local_name(subject)),
            "labels": labels,
            "local": local_name(subject),
            "kind": kind,
            "definition": definition,
        }
    return terms


def _split_camel(name):
    return re.sub(r"(?<=[a-z0-9])(?=[A-Z])|[_-]+", " ", name).strip()


def label_of(terms, node):
    if isinstance(node, BNode):
        return "_"
    record = terms.get(str(node))
    if record:
        return record["label"]
    if isinstance(node, Literal):
        return str(node)
    return local_name(node)


def schema_summary(graph, terms, limit=40):
    """Short text listing the most connected classes and properties."""
    degree = {}
    for subject, _p, obj in graph:
        for node in (subject, obj):
            key = str(node)
            if key in terms:
                degree[key] = degree.get(key, 0) + 1
    ranked = sorted(terms.values(), key=lambda t: -degree.get(t["iri"], 0))
    classes = [t["label"] for t in ranked if t["kind"] == "class"][:limit]
    properties = [t["label"] for t in ranked if t["kind"] == "property"][: limit // 2]
    counts = {kind: sum(1 for t in terms.values() if t["kind"] == kind) for kind in ("class", "property", "individual")}
    return (
        f"{counts['class']} classes, {counts['property']} properties, {counts['individual']} individuals.\n"
        f"Main classes: {', '.join(classes)}\n"
        f"Main properties: {', '.join(properties)}"
    )
