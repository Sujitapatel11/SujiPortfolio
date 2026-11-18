"""Deterministic policy checks. The LLM never decides its own permissions."""
from __future__ import annotations
import hashlib, ipaddress, json, socket, uuid
from urllib.parse import urlparse
from app.assistant.schemas import ActionProposal, ActionProposalRequest

class PolicyViolation(ValueError):
    pass

def _is_public_host(hostname: str) -> bool:
    host=hostname.rstrip(".").lower()
    if host in {"localhost","localhost.localdomain"} or host.endswith(".localhost"):
        return False
    try:
        addresses={ipaddress.ip_address(host)}
    except ValueError:
        try:
            addresses={ipaddress.ip_address(x[4][0]) for x in socket.getaddrinfo(host,None,type=socket.SOCK_STREAM)}
        except OSError as exc:
            raise PolicyViolation("Destination hostname could not be safely resolved") from exc
    return bool(addresses) and all(x.is_global for x in addresses)

def _domains(args: dict) -> list[str]:
    values=args.get("allowed_domains")
    if not isinstance(values,list) or not 1 <= len(values) <= 10:
        raise PolicyViolation("An explicit list of 1 to 10 approved domains is required")
    result=[]
    for value in values:
        if not isinstance(value,str) or len(value)>253:
            raise PolicyViolation("Invalid approved domain")
        host=value.strip().rstrip(".").lower()
        if "." not in host or any(ch in host for ch in "/:@"):
            raise PolicyViolation("Approved domains must be plain hostnames")
        if not _is_public_host(host):
            raise PolicyViolation("Private or non-public domains cannot be approved")
        result.append(host)
    if len(set(result)) != len(result):
        raise PolicyViolation("Approved domains must be unique")
    return result

def validate_tool_arguments(tool: str, arguments: dict) -> dict:
    if tool == "browser.open_url":
        if set(arguments)!={"url"} or not isinstance(arguments.get("url"),str):
            raise PolicyViolation("browser.open_url requires exactly url")
        p=urlparse(arguments["url"])
        if p.scheme not in {"https","http"} or not p.hostname or p.username or p.password:
            raise PolicyViolation("Only credential-free absolute HTTP(S) URLs are permitted")
        if not _is_public_host(p.hostname):
            raise PolicyViolation("Local, private and non-public network destinations are blocked")
        return {"url":arguments["url"]}
    if tool == "browser.navigate":
        if set(arguments)!={"url","allowed_domains"} or not isinstance(arguments.get("url"),str):
            raise PolicyViolation("browser.navigate requires url and allowed_domains")
        domains=_domains(arguments)
        p=urlparse(arguments["url"])
        host=(p.hostname or "").rstrip(".").lower()
        if p.scheme!="https" or not host or p.username or p.password or not any(host==d or host.endswith("."+d) for d in domains):
            raise PolicyViolation("Navigation must use HTTPS within the approved domain scope")
        return {"url":arguments["url"],"allowed_domains":domains}
    if tool in {"browser.inspect","browser.screenshot","browser.click_text","browser.fill_label","browser.scroll","browser.wait"}:
        domains=_domains(arguments)
        if tool=="browser.inspect" and set(arguments)=={"allowed_domains"}:
            return {"allowed_domains":domains}
        if tool=="browser.screenshot":
            if set(arguments)=={"allowed_domains"}:
                return {"allowed_domains":domains}
            if set(arguments)=={"name","allowed_domains"} and isinstance(arguments.get("name"),str) and 0<len(arguments["name"].strip())<=60:
                return {"name":arguments["name"].strip(),"allowed_domains":domains}
            raise PolicyViolation("browser.screenshot requires allowed_domains and optional name")
        if tool=="browser.click_text" and set(arguments)=={"text","allowed_domains"} and isinstance(arguments.get("text"),str) and 0<len(arguments["text"].strip())<=200:
            return {"text":arguments["text"].strip(),"allowed_domains":domains}
        if tool=="browser.fill_label" and set(arguments)=={"label","value","allowed_domains"} and isinstance(arguments.get("label"),str) and isinstance(arguments.get("value"),str) and 0<len(arguments["label"].strip())<=160 and len(arguments["value"])<=5000:
            return {"label":arguments["label"].strip(),"value":arguments["value"],"allowed_domains":domains}
        if tool=="browser.scroll" and set(arguments)=={"direction","allowed_domains"} and arguments.get("direction") in {"up","down"}:
            return {"direction":arguments["direction"],"allowed_domains":domains}
        if tool=="browser.wait" and set(arguments)=={"milliseconds","allowed_domains"} and type(arguments.get("milliseconds")) is int and 0<=arguments["milliseconds"]<=5000:
            return {"milliseconds":arguments["milliseconds"],"allowed_domains":domains}
        raise PolicyViolation("Browser arguments do not match the required schema")
    if tool=="desktop.open_application":
        if set(arguments)!={"app_id"} or not isinstance(arguments.get("app_id"),str):
            raise PolicyViolation("desktop.open_application requires app_id")
        app=arguments["app_id"].strip().lower()
        if app not in {"browser","calculator","text_editor"}:
            raise PolicyViolation("Application is not in the initial desktop allowlist")
        return {"app_id":app}
    raise PolicyViolation("Tool is not registered")

def build_action_proposal(request: ActionProposalRequest) -> ActionProposal:
    args = validate_tool_arguments(request.tool, request.arguments)
    canonical = json.dumps({"tool": request.tool, "arguments": args}, sort_keys=True, separators=(",", ":"))
    digest = hashlib.sha256(canonical.encode()).hexdigest()
    if request.tool == "browser.open_url":
        summary = f"Open {args['url']} in default browser"
    elif request.tool == "browser.navigate":
        summary = f"Navigate controlled browser to {args['url']} within approved scope"
    elif request.tool == "browser.inspect":
        summary = "Read visible page text in controlled browser"
    elif request.tool == "browser.screenshot":
        summary = f"Capture screenshot on {args['allowed_domains'][0]}"
    elif request.tool == "browser.click_text":
        summary = f"Click exact visible text: {args['text'][:100]}"
    elif request.tool == "browser.fill_label":
        summary = f"Fill labelled field: {args['label'][:100]}"
    elif request.tool == "browser.scroll":
        summary = f"Scroll controlled browser {args['direction']}"
    elif request.tool == "browser.wait":
        summary = f"Wait {args['milliseconds']} ms in controlled browser"
    elif request.tool == "desktop.open_application":
        summary = f"Open {args['app_id']} application"
    else:
        summary = f"Execute {request.tool}"
    return ActionProposal(
        action_id=uuid.uuid4().hex,
        tool=request.tool,
        arguments=args,
        summary=summary,
        risk="medium" if request.tool.startswith("browser.") and request.tool != "browser.inspect" else "low",
        approval_required=True,
        payload_sha256=digest,
    )
