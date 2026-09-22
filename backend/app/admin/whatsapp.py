import logging
import os
import re
import threading
import time
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("sujis_world.whatsapp")

ADMIN_DASHBOARD_URL = os.getenv("ADMIN_DASHBOARD_URL", "http://localhost:5173/admin").rstrip("/")
ADMIN_WHATSAPP_NUMBER = os.getenv("ADMIN_WHATSAPP_NUMBER", "+9779815280946")
TWILIO_WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "")

_notification_lock = threading.Lock()
_last_notification_at = 0.0
_pending_job_id: Optional[int] = None


def _whatsapp_address(value: str) -> str:
    value = value.strip()
    return value if value.startswith("whatsapp:") else f"whatsapp:{value}"


def send_whatsapp_notification(message: str) -> bool:
    """Send one admin notification without allowing Twilio failures to affect callers."""
    global _last_notification_at

    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    from_number = os.getenv("TWILIO_WHATSAPP_FROM", TWILIO_WHATSAPP_FROM).strip()
    to_number = os.getenv("ADMIN_WHATSAPP_NUMBER", ADMIN_WHATSAPP_NUMBER).strip()

    if not all((account_sid, auth_token, from_number, to_number)):
        logger.warning(
            "WhatsApp notification skipped: Twilio credentials and phone numbers "
            "must be configured"
        )
        return False

    with _notification_lock:
        elapsed = time.monotonic() - _last_notification_at
        if elapsed < 60:
            logger.warning(
                "WhatsApp notification rate limit active; skipping notification "
                "(%.1fs remaining)",
                60 - elapsed,
            )
            return False
        _last_notification_at = time.monotonic()

    try:
        from twilio.rest import Client

        Client(account_sid, auth_token).messages.create(
            body=message,
            from_=_whatsapp_address(from_number),
            to=_whatsapp_address(to_number),
        )
        logger.info("WhatsApp notification sent to %s", to_number)
        return True
    except Exception:
        logger.exception("WhatsApp notification failed")
        return False


def notify_job_matches(jobs: list) -> bool:
    """Send one batched notification for a discovery run and track its latest job."""
    global _pending_job_id
    if not jobs:
        return False

    lines = [
        "New job matches — reply 'yes' to approve the latest job or 'skip' to reject it:"
    ]
    for job in jobs:
        lines.append(
            f"- {job.title} ({job.platform}, score: {job.match_score}) "
            f"{ADMIN_DASHBOARD_URL}/jobs/{job.id}"
        )
    sent = send_whatsapp_notification("\n".join(lines))
    if sent:
        _pending_job_id = jobs[-1].id
    return sent


def notify_job_match(job) -> bool:
    """Notify about a manually added job using the same notification format."""
    return notify_job_matches([job])


def get_pending_job_id() -> Optional[int]:
    return _pending_job_id


def clear_pending_job() -> None:
    global _pending_job_id
    _pending_job_id = None


def parse_job_reply(message: str) -> Optional[str]:
    """Return an unambiguous status intent, or None when the reply is unclear."""
    normalized = message.strip().lower()
    has_approve = bool(re.search(r"\b(?:yes|approve|approved)\b", normalized))
    has_skip = bool(re.search(r"\b(?:skip|no)\b", normalized))
    if has_approve == has_skip:
        return None
    return "applied" if has_approve else "rejected"
