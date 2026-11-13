"""Deterministic policy checks. The LLM must never decide its own permissions."""
from __future__ import annotations

import hashlib
import ipaddress
import json
import socket
import uuid
from urllib.parse import urlparse

from app.assistant.schemas import ActionProposal, ActionProposalRequest


class PolicyViolation(ValueError):
    """Raised when a proposed action is not permitted by policy."""


def _is_public_host(hostname: str) -> bool:
    normalized = hostname.rstrip(".").lower()
    if normalized in {"localhost", "localhost.localdomain"} or normalized.endswith(".localhost"):
        return False
    try:
        addresses = {ipaddress.ip_address(normalized)}
    except ValueError:
        try:
            resolved = socket.getaddrinfo(normalized, None, type=socket.SOCK_STREAM)
        except OSError as exc:
            # Fail closed: an unresolved destination must not be approved.
            raise PolicyViolation("Destination hostname could not be safely resolved") from exc
        addresses = {ipaddress.ip_address(item[4][0]) for item in resolved}
    return bool(addresses) and all(address.is_global for address in addresses)


def validate_tool_arguments(tool: str, arguments: dict) -> dict:
    if tool == "browser.open_url":
        if set(arguments) != {"url"} or not isinstance(arguments.get("url"), str):
            raise PolicyViolation("browser.open_url requires exactly one string argument: url")
        parsed = urlparse(arguments["url"])
        if parsed.scheme not in {"https", "http"} or not parsed.hostname:
            raise PolicyViolation("Only absolute HTTP(S) URLs are permitted")
        if parsed.username or parsed.password:
            raise PolicyViolation("URLs containing embedded credentials are not permitted")
        if not _is_public_host(parsed.hostname):
            raise PolicyViolation("Local, private and non-public network destinations are blocked")
        return {"url": arguments["url"]}

    if tool == "desktop.open_application":
        if set(arguments) != {"app_id"} or not isinstance(arguments.get("app_id"), str):
            raise PolicyViolation("desktop.open_application requires exactly one string argument: app_id")
        app_id = arguments["app_id"].strip().lower()
        if app_id not in {"browser", "calculator", "text_editor"}:
            raise PolicyViolation("Application is not in the initial desktop allowlist")
        return {"app_id": app_id}

    raise PolicyViolation("Tool is not registered")


def build_action_proposal(request: ActionProposalRequest) -> ActionProposal:
    arguments = validate_tool_arguments(request.tool, request.arguments)
    canonical = json.dumps(
        {"tool": request.tool, "arguments": arguments},
        sort_keys=True,
        separators=(",", ":"),
    )
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    summaries = {
        "browser.open_url": f"Open {arguments['url']} in the paired browser",
        "desktop.open_application": f"Open the {arguments['app_id']} application on the paired device",
    }
    return ActionProposal(
        action_id=uuid.uuid4().hex,
        tool=request.tool,
        arguments=arguments,
        summary=summaries[request.tool],
        risk="low",
        approval_required=True,
        payload_sha256=digest,
    )
