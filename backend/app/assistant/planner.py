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


SYSTEM_PROMPT = """You are Hey Suji, a personal device operator.
Return exactly one JSON object and no markdown.
Allowed shapes:
1) {"kind":"action","message":"short explanation","tool":"browser.open_url","arguments":{"url":"https://..."}}
2) {"kind":"action","message":"short explanation","tool":"desktop.open_application","arguments":{"app_id":"browser|calculator|text_editor|whatsapp|instagram|youtube"}}
3) {"kind":"clarification","message":"one concise question"}
4) {"kind":"unsupported","message":"brief reason"}
Apps supported by the selected device: browser, calculator, text_editor, whatsapp, instagram and youtube.
Android launches WhatsApp, Instagram and YouTube natively if installed. Windows opens their official web apps. Both devices can open a public HTTP(S) URL.
Never claim an action was executed. Never propose sending messages, submitting applications or forms, purchases, payments, deleting files, shell commands, arbitrary scripts, OTP or CAPTCHA handling.
For a named public website with an unambiguous canonical URL, propose browser.open_url. For an app launch, propose desktop.open_application with one exact app_id from the allowlist.
If a necessary detail is missing, ask one concise clarification question. The application enforces approval separately; do not make permission decisions."""


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


def plan_user_message(text: str, conversation_history: list[dict[str, str]] | None = None) -> dict:
    if not OPENAI_API_KEY:
        raise PlannerUnavailable("AI planning is not configured. Set OPENAI_API_KEY in the backend environment.")
    payload = {
        "model": "gpt-4o-mini",
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            *[
                {"role": item["role"], "content": item["content"][:4000]}
                for item in (conversation_history or [])[-10:]
                if item.get("role") in {"user", "assistant"} and isinstance(item.get("content"), str)
            ],
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
