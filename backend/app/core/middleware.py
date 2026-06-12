import json
import logging
import time
from datetime import datetime, timezone
from uuid import uuid4

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger("formzero.security")
logging.basicConfig(level=logging.INFO)


class SecurityLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid4())
        started_at = time.perf_counter()
        status_code = 500

        try:
            response = await call_next(request)
            status_code = response.status_code
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
            logger.info(
                json.dumps(
                    {
                        "event": "security_request",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "path": request.url.path,
                        "method": request.method,
                        "status_code": status_code,
                        "duration_ms": duration_ms,
                        "request_id": request_id,
                    }
                )
            )
