from __future__ import annotations

from typing import Any

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


DEFAULT_TIMEOUT = (5, 20)


class EspnFetchError(RuntimeError):
    """Raised when ESPN does not return a usable JSON object."""


def _build_session() -> requests.Session:
    session = requests.Session()
    # Keep Requests' real client User-Agent. ESPN currently rejects the custom
    # pseudo-browser and application User-Agents previously used by these jobs.
    session.headers.update({"Accept": "application/json"})
    retries = Retry(
        total=2,
        connect=2,
        read=2,
        status=2,
        backoff_factor=0.5,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset({"GET"}),
        respect_retry_after_header=True,
        raise_on_status=False,
    )
    session.mount("https://", HTTPAdapter(max_retries=retries))
    return session


_SESSION = _build_session()


def fetch_espn_json(
    url: str,
    *,
    params: dict[str, Any] | None = None,
    timeout: tuple[int, int] = DEFAULT_TIMEOUT,
) -> dict[str, Any]:
    try:
        response = _SESSION.get(
            url,
            params=params,
            timeout=timeout,
            allow_redirects=True,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        status = getattr(getattr(exc, "response", None), "status_code", None)
        detail = f"HTTP {status}" if status is not None else exc.__class__.__name__
        raise EspnFetchError(f"ESPN request failed ({detail}) for {url}: {exc}") from exc

    content_type = response.headers.get("Content-Type", "").lower()
    if "json" not in content_type:
        raise EspnFetchError(
            f"ESPN returned non-JSON content ({content_type or 'unknown content type'}) "
            f"for {response.url}"
        )

    try:
        payload = response.json()
    except ValueError as exc:
        raise EspnFetchError(f"ESPN returned invalid JSON for {response.url}: {exc}") from exc

    if not isinstance(payload, dict):
        raise EspnFetchError(f"ESPN returned {type(payload).__name__}, expected a JSON object")
    return payload
