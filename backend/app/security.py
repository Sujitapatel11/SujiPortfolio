"""
In-memory rate limiter for public-facing endpoints.
No external dependencies — uses a sliding window per client IP.
"""
import time
import logging
from collections import defaultdict
from typing import Dict, List
from fastapi import HTTPException, Request, status

logger = logging.getLogger("sujis_world.security")


class RateLimiter:
    """
    Sliding-window rate limiter keyed by client IP address.
    Thread-safe for FastAPI's synchronous dependency injection.
    """

    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: Dict[str, List[float]] = defaultdict(list)

    def check(self, request: Request) -> None:
        """
        Raise HTTP 429 if the client has exceeded the rate limit.
        Call this as a FastAPI dependency: `Depends(limiter.check)`.
        """
        client_ip = "unknown"
        if request.client:
            client_ip = request.client.host
        # Also check X-Forwarded-For for proxied deployments
        forwarded = request.headers.get("x-forwarded-for", "")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()

        now = time.monotonic()
        window_start = now - self.window_seconds

        # Prune expired entries
        self._requests[client_ip] = [
            t for t in self._requests[client_ip] if t > window_start
        ]

        if len(self._requests[client_ip]) >= self.max_requests:
            logger.warning(
                "Rate limit exceeded for %s: %d requests in %ds window",
                client_ip, len(self._requests[client_ip]), self.window_seconds,
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Too many requests. Limit is {self.max_requests} "
                    f"per {self.window_seconds} seconds."
                ),
                headers={"Retry-After": str(self.window_seconds)},
            )

        self._requests[client_ip].append(now)


# Pre-configured limiters for different endpoint types
chat_limiter = RateLimiter(max_requests=15, window_seconds=60)
inquiry_limiter = RateLimiter(max_requests=10, window_seconds=60)
login_limiter = RateLimiter(max_requests=5, window_seconds=60)
