"""Public OOPS! REST client."""

import httpx

ENDPOINTS = (
    "https://oops.linkeddata.es/rest",
    "http://oops.linkeddata.es/rest",
)


def assess(ontology_text):
    safe = ontology_text.replace("]]>", "]]]]><![CDATA[>")
    request_xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<OOPSRequest>"
        "<OntologyUrl></OntologyUrl>"
        f"<OntologyContent><![CDATA[{safe}]]></OntologyContent>"
        "<Pitfalls></Pitfalls>"
        "<OutputFormat>XML</OutputFormat>"
        "</OOPSRequest>"
    )
    attempts = []
    try:
        with httpx.Client(timeout=25.0, follow_redirects=True) as client:
            for endpoint in ENDPOINTS:
                response = client.post(
                    endpoint,
                    content=request_xml.encode("utf-8"),
                    headers={"Content-Type": "application/xml"},
                )
                attempts.append(
                    {"endpoint": endpoint, "status_code": response.status_code}
                )
                if response.status_code < 400 and response.text.strip():
                    error = _service_error(response.text)
                    if error:
                        attempts[-1]["error"] = error
                        continue
                    return {
                        "ok": True,
                        "endpoint": endpoint,
                        "status_code": response.status_code,
                        "pitfalls": _parse_pitfalls(response.text),
                        "excerpt": response.text[:1500],
                    }
    except httpx.HTTPError as exc:
        return {
            "ok": False,
            "detail": f"Public OOPS service could not be reached: {exc}",
            "attempts": attempts,
        }
    last = attempts[-1]["status_code"] if attempts else "no response"
    error = next((item.get("error") for item in attempts if item.get("error")), None)
    if error:
        return {
            "ok": False,
            "detail": error,
            "attempts": attempts,
        }
    return {
        "ok": False,
        "detail": f"Public OOPS service returned HTTP {last}.",
        "attempts": attempts,
    }


def _service_error(xml_text):
    if "unexpected_error" not in xml_text and "something went wrong" not in xml_text.lower():
        return None
    message = _parse_message(xml_text)
    return message or "Public OOPS service reported an error for this upload."


def _parse_message(xml_text):
    import xml.etree.ElementTree as ET

    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return ""
    for node in root.iter():
        if _local(node.tag) == "hasmessage" and node.text:
            return " ".join(node.text.split())
    return ""


def _parse_pitfalls(xml_text):
    import xml.etree.ElementTree as ET

    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return []
    pitfalls = []
    for node in root.iter():
        if _local(node.tag) != "pitfall":
            continue
        record = {
            "code": _child_text(node, ("name", "code", "id")),
            "title": _child_text(node, ("title", "name")),
            "importance": _child_text(node, ("importance", "importanceLevel")),
            "description": _child_text(node, ("description", "explanation")),
        }
        if any(record.values()):
            pitfalls.append(record)
    return pitfalls


def _local(tag):
    if not isinstance(tag, str):
        return ""
    return tag.rsplit("}", 1)[-1].lower()


def _child_text(node, names):
    wanted = {name.lower() for name in names}
    for child in list(node):
        if _local(child.tag) in wanted and child.text:
            return " ".join(child.text.split())
    return ""
