"""Explicit registry of tools available to the personal assistant.

This registry describes capabilities only. It does not execute them.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class ToolDefinition:
    name: str
    description: str
    required_arguments: tuple[str, ...]
    approval_required: bool = True


TOOLS = {
    "browser.open_url": ToolDefinition(
        name="browser.open_url",
        description="Open a public HTTP(S) URL in the paired browser.",
        required_arguments=("url",),
    ),
    "desktop.open_application": ToolDefinition(
        name="desktop.open_application",
        description="Open one application from the paired desktop allowlist.",
        required_arguments=("app_id",),
    ),
}


def get_tool(name: str) -> ToolDefinition:
    try:
        return TOOLS[name]
    except KeyError as exc:
        raise ValueError(f"Unknown assistant tool: {name}") from exc
