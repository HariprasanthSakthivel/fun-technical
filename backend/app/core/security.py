"""Security and authentication utilities.

Password hashing using standard library pbkdf2_hmac (sha256).
JWT-like secure signed token generation and validation using HMAC-SHA256.
No external native C-extensions or external dependencies required.
"""

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any

from app.core.config import get_settings

settings = get_settings()

ITERATIONS = 100_000


def hash_password(password: str) -> str:
    """Hash password using salt + PBKDF2 HMAC SHA-256."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        ITERATIONS,
    )
    return f"pbkdf2:sha256:{ITERATIONS}${salt}${key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plaintext password against PBKDF2 hash."""
    try:
        method, salt, key_hex = hashed_password.split("$")
        key = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt.encode("utf-8"),
            ITERATIONS,
        )
        return hmac.compare_digest(key.hex(), key_hex)
    except Exception:
        return False


def _b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64_decode(data: str) -> bytes:
    padding = 4 - (len(data) % 4)
    if padding != 4:
        data += "=" * padding
    return base64.urlsafe_b64decode(data.encode("utf-8"))


def create_access_token(payload: dict[str, Any], expires_in_minutes: int | None = None) -> str:
    """Create a secure HMAC-SHA256 signed bearer token."""
    if expires_in_minutes is None:
        expires_in_minutes = settings.access_token_expire_minutes

    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    body = {
        **payload,
        "iat": now,
        "exp": now + (expires_in_minutes * 60),
    }

    header_b64 = _b64_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    body_b64 = _b64_encode(json.dumps(body, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{body_b64}".encode("utf-8")

    signature = hmac.new(
        settings.secret_key.encode("utf-8"), signing_input, hashlib.sha256
    ).digest()
    sig_b64 = _b64_encode(signature)

    return f"{header_b64}.{body_b64}.{sig_b64}"


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Validate token signature and expiration, returning claims if valid."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None

        header_b64, body_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{body_b64}".encode("utf-8")
        expected_sig = hmac.new(
            settings.secret_key.encode("utf-8"), signing_input, hashlib.sha256
        ).digest()

        if not hmac.compare_digest(_b64_encode(expected_sig), sig_b64):
            return None

        body_bytes = _b64_decode(body_b64)
        claims = json.loads(body_bytes.decode("utf-8"))

        # Check expiration
        now = int(time.time())
        if claims.get("exp") and claims["exp"] < now:
            return None

        return claims
    except Exception:
        return None
