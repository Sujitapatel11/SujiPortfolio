"""Explicit registry of tools available to the personal assistant."""
from dataclasses import dataclass

@dataclass(frozen=True)
class ToolDefinition:
    name: str
    description: str
    required_arguments: tuple[str, ...]
    approval_required: bool = True

TOOLS = {
    "browser.open_url": ToolDefinition("browser.open_url", "Open a public URL in the default browser.", ("url",)),
    "browser.navigate": ToolDefinition("browser.navigate", "Navigate controlled browser within explicit domain scope.", ("url", "allowed_domains")),
    "browser.inspect": ToolDefinition("browser.inspect", "Read visible page text.", ("allowed_domains",)),
    "browser.click_text": ToolDefinition("browser.click_text", "Click one unique exact visible text.", ("text", "allowed_domains")),
    "browser.fill_label": ToolDefinition("browser.fill_label", "Fill one uniquely labelled field.", ("label", "value", "allowed_domains")),
    "browser.scroll": ToolDefinition("browser.scroll", "Scroll page up or down.", ("direction", "allowed_domains")),
    "browser.wait": ToolDefinition("browser.wait", "Wait a bounded time for page changes.", ("milliseconds", "allowed_domains")),
    "desktop.open_application": ToolDefinition("desktop.open_application", "Open one allowlisted desktop application.", ("app_id",)),
}

def get_tool(name: str) -> ToolDefinition:
    try:
        return TOOLS[name]
    except KeyError as exc:
        raise ValueError(f"Unknown assistant tool: {name}") from exc
