"""Stands in for nl2sparql.llm in the browser, where JavaScript calls the model."""


def complete(prompt):
    raise RuntimeError("In the browser, the page calls the model, not nl2sparql.")
