"""Deterministic policy checks. The LLM must never decide its own permissions."""
from __future__ import annotations

import hashlib
import ipaddress
import json
import socket
import uuid
from urllib.parse import urlparse

from app.assistant.schemas import ActionProposal, ActionProposalRequest


ALLOWED_BROWSER_HOSTS = {
    "google.com", "www.google.com",
    "linkedin.com", "www.linkedin.com",
    "instagram.com", "www.instagram.com",
    "web.whatsapp.com",
    "github.com", "www.github.com",
}

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
        hostname = parsed.hostname.rstrip(".").lower()
        if hostname not in ALLOWED_BROWSER_HOSTS:
            raise PolicyViolation("Website is not in the paired companion allowlist")
        if not _is_public_host(hostname):
            raise PolicyViolation("Local, private and non-public network destinations are blocked")
        if parsed.port not in (None, 80, 443):
            raise PolicyViolation("Non-standard destination ports are blocked")
        return {"url": arguments["url"]}

    if tool == "browser.inspect_page":
        if arguments:
            raise PolicyViolation("browser.inspect_page takes no arguments")
        return {}

    if tool == "browser.fill_search":
        if set(arguments) != {"query"} or not isinstance(arguments.get("query"), str):
            raise PolicyViolation("browser.fill_search requires exactly one string argument: query")
        query = arguments["query"].strip()
        if not query or len(query) > 300:
            raise PolicyViolation("Search text must contain 1 to 300 characters")
        return {"query": query}
    if tool == "desktop.open_application":
        if set(arguments) != {"app_id"} or not isinstance(arguments.get("app_id"), str):
            raise PolicyViolation("desktop.open_application requires exactly one string argument: app_id")
        app_id = arguments["app_id"].strip().lower()
        if app_id not in {"browser", "calculator", "text_editor"}:
            raise PolicyViolation("Application is not in the initial desktop allowlist")
        return {"app_id": app_id}

    if tool == "desktop.open_folder":
        if set(arguments) != {"folder_id"} or not isinstance(arguments.get("folder_id"), str):
            raise PolicyViolation("desktop.open_folder requires exactly one string argument: folder_id")
        folder_id = arguments["folder_id"].strip().lower()
        if folder_id not in {"desktop", "documents", "downloads", "pictures"}:
            raise PolicyViolation("Folder is not in the safe known-folder allowlist")
        return {"folder_id": folder_id}
    if tool == "desktop.open_file":
        if set(arguments) != {"folder_id", "file_name"}:
            raise PolicyViolation("desktop.open_file requires folder_id and file_name")
        folder_id = arguments.get("folder_id")
        file_name = arguments.get("file_name")
        if not isinstance(folder_id, str) or folder_id.strip().lower() not in {"desktop", "documents", "downloads", "pictures"}:
            raise PolicyViolation("File must be inside an allowlisted known folder")
        if not isinstance(file_name, str) or not file_name.strip() or file_name in {".", ".."}:
            raise PolicyViolation("A single file name is required")
        if "/" in file_name or "\\" in file_name or ":" in file_name or "\x00" in file_name:
            raise PolicyViolation("Paths and alternate streams are not permitted")
        if file_name.startswith(".") or file_name.endswith("."):
            raise PolicyViolation("Hidden or ambiguous file names are not permitted")
        extension = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""
        if extension not in {"pdf", "txt", "md", "csv", "json", "docx", "xlsx", "pptx", "png", "jpg", "jpeg", "gif", "webp", "mp3", "mp4"}:
            raise PolicyViolation("This file type is not supported for opening")
        return {"folder_id": folder_id.strip().lower(), "file_name": file_name}
    raise PolicyViolation("Tool is not registered")


def build_action_proposal(request: ActionProposalRequest) -> ActionProposal:
    arguments = validate_tool_arguments(request.tool, request.arguments)
    canonical = json.dumps(
        {"tool": request.tool, "arguments": arguments},
        sort_keys=True,
        separators=(",", ":"),
    )
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    if request.tool == "browser.open_url":
        summary = f"Open {arguments['url']} in the paired browser"
    elif request.tool == "browser.inspect_page":
        summary = "Inspect the current page in the paired browser (read-only)"
    elif request.tool == "browser.fill_search":
        summary = "Fill the current page search box without submitting"
    elif request.tool == "desktop.open_application":
        summary = f"Open the {arguments['app_id']} application on the paired device"
    elif request.tool == "desktop.open_folder":
        summary = f"Open the {arguments['folder_id']} folder on the paired device"
    else:
        summary = f"Open {arguments['file_name']} from {arguments['folder_id']} on the paired device"
    return ActionProposal(
        action_id=uuid.uuid4().hex,
        tool=request.tool,
        arguments=arguments,
        summary=summary,
        risk="medium" if request.tool in {"desktop.open_file", "browser.fill_search"} else "low",
        approval_required=True,
        payload_sha256=digest,
    )
