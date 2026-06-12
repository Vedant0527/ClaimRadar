import re

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

AADHAAR_PATTERN = re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b")
PAN_PATTERN = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b", re.IGNORECASE)
SSN_PATTERN = re.compile(r"\b\d{3}-?\d{2}-?\d{4}\b")
EMAIL_PATTERN = re.compile(
    r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b",
    re.IGNORECASE,
)
PHONE_PATTERN = re.compile(
    r"(?<!\d)(?:\+?\d[\d\s().-]{8,}\d)(?!\d)"
)


def scrub_pii(text: str) -> str:
    scrubbed = AADHAAR_PATTERN.sub("[REDACTED]", text)
    scrubbed = PAN_PATTERN.sub("[REDACTED]", scrubbed)
    scrubbed = SSN_PATTERN.sub("[REDACTED]", scrubbed)
    scrubbed = EMAIL_PATTERN.sub("[REDACTED]", scrubbed)
    return PHONE_PATTERN.sub(_replace_phone_match, scrubbed)


def _replace_phone_match(match: re.Match[str]) -> str:
    value = match.group(0)
    digit_count = len(re.sub(r"\D", "", value))
    if 10 <= digit_count <= 14:
        return "[REDACTED]"
    return value
