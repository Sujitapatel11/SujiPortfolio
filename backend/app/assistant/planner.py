"""Constrained natural-language planner.

The model may only propose one registered tool. This module never executes tools.
Every model output is parsed and revalidated by deterministic policy code.
"""
import json

import httpx
from pydantic import ValidationError

from app.config import OPENAI_API_KEY
from app.assistant.schemas import ActionProposalRequest


class PlannerUnavailable(RuntimeError):
    pass


SYSTEM_PROMPT = """You are an intent parser for a personal desktop assistant.
Return exactly one JSON object and no markdown.
Allowed output shapes:
1) {"kind":"action","message":"short explanation","tool":"browser.open_url","arguments":{"url":"https://..."}}
2) {"kind":"action","message":"short explanation","tool":"desktop.open_application","arguments":{"app_id":"browser|calculator|text_editor"}}
3) {"kind":"clarification","message":"one concise question"}
4) {"kind":"unsupported","message":"brief reason"}
Never claim an action was executed. Never propose sending messages, payments, purchases, deleting files, submitting forms, shell commands, arbitrary scripts, or tools not listed above.
If the user asks to open a named website and its canonical public URL is unambiguous, propose browser.open_url. If the user asks to open an application, only use the exact app_id allowlist. If the request is ambiguous, ask one clarification question.
The application enforces approval separately. Do not make permission decisions."""


def _parse_planner_content(content: str) -> dict:
    try:
        result = json.loads(content)
    except (TypeError, json.JSONDecodeError) as exc:
        raise PlannerUnavailable("The AI planner could not produce a valid response.") from exc
    if not isinstance(result, dict) or result.get("kind") not in {"action", "clarification", "unsupported"}:
        raise PlannerUnavailable("The AI planner returned an invalid response shape.")
    message = result.get("message")
    if not isinstance(message, str) or not message.strip():
        raise PlannerUnavailable("The AI planner returned an empty response.")
    if result["kind"] == "action":
        if not isinstance(result.get("tool"), str) or not isinstance(result.get("arguments"), dict):
            raise PlannerUnavailable("The AI planner returned an incomplete action.")
        try:
            request = ActionProposalRequest(tool=result["tool"], arguments=result["arguments"])
        except ValidationError as exc:
            raise PlannerUnavailable("The AI planner proposed an unregistered or malformed tool.") from exc
        return {
            "kind": "action",
            "message": message[:1000],
            "request": request,
        }
    return {"kind": result["kind"], "message": message[:1000]}


def plan_user_message(text: str) -> dict:
    if not OPENAI_API_KEY:
        raise PlannerUnavailable("AI planning is not configured. Set OPENAI_API_KEY in the backend environment.")
    payload = {
        "model": "gpt-4o-mini",
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text},
        ],
    }
    try:
        with httpx.Client(timeout=httpx.Timeout(20.0, connect=5.0)) as client:
            response = client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                json=payload,
            )
            response.raise_for_status()
            body = response.json()
            content = body["choices"][0]["message"]["content"]
    except (httpx.HTTPError, KeyError, IndexError, TypeError) as exc:
        raise PlannerUnavailable("The AI planner could not produce a valid response.") from exc

    return _parse_planner_content(content)
