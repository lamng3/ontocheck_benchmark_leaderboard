"""Public FOOPS validator client.

Uploads are also scored by OntoCheck's local FOOPS tests. This client
records what the public service returns, including a failure when it is
unreachable, so that result is visible beside the local tests.
"""

import httpx

ENDPOINTS = (
    "https://foops.linkeddata.es/assessOntology",
    "https://foops.linkeddata.es/foops/assessOntology",
)


def assess(ontology_text):
    attempts = []
    payload = {
        "ontologyUri": "",
        "ontologyContent": ontology_text,
    }
    try:
        with httpx.Client(timeout=20.0, follow_redirects=True) as client:
            for endpoint in ENDPOINTS:
                response = client.post(endpoint, json=payload)
                attempts.append(
                    {
                        "endpoint": endpoint,
                        "status_code": response.status_code,
                    }
                )
                if response.status_code < 400:
                    body = _json_or_text(response)
                    return {
                        "ok": True,
                        "endpoint": endpoint,
                        "status_code": response.status_code,
                        "body": body,
                        "summary": _summarize(body),
                    }
    except httpx.HTTPError as exc:
        return {
            "ok": False,
            "detail": f"Public FOOPS service could not be reached: {exc}",
            "attempts": attempts,
        }
    last = attempts[-1]["status_code"] if attempts else "no response"
    return {
        "ok": False,
        "detail": f"Public FOOPS service returned HTTP {last}.",
        "attempts": attempts,
    }


def _json_or_text(response):
    try:
        return response.json()
    except ValueError:
        return {"raw": response.text[:2000]}


def _summarize(body):
    if not isinstance(body, dict):
        return {}
    score = None
    for key in ("overallScore", "score", "globalScore", "totalScore"):
        if isinstance(body.get(key), (int, float)):
            score = body[key]
            break
    checks = []
    for key in ("checks", "tests", "results", "evaluation"):
        value = body.get(key)
        if isinstance(value, list):
            checks = value
            break
    return {"overall": score, "check_count": len(checks)}
