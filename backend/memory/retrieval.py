"""Lexical lookup over saved natural-language questions and SPARQL."""

import re


def tokens(text):
    return set(re.findall(r"[a-z0-9_:-]+", (text or "").lower()))


def jaccard(left, right):
    if not left or not right:
        return 0.0
    return len(left & right) / len(left | right)


def rank_questions(questions, nl_text, sparql):
    """Return questions with a similarity score, highest first."""
    nl_tokens = tokens(nl_text)
    sparql_tokens = tokens(sparql)
    ranked = []
    for question in questions:
        score = (0.6 * jaccard(nl_tokens, tokens(question.get("nl_text")))) + (
            0.4 * jaccard(sparql_tokens, tokens(question.get("sparql")))
        )
        ranked.append((score, question))
    ranked.sort(key=lambda item: item[0], reverse=True)
    return ranked


def select_context(questions, nl_text, sparql, limit=8):
    """Pick stored queries to enrich against a newly chosen ontology."""
    ranked = rank_questions(questions, nl_text, sparql)
    matched = [question for score, question in ranked if score > 0][:limit]
    if matched:
        return matched
    return list(questions)[:5]
