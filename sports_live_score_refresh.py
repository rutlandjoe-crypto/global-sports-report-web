#!/usr/bin/env python3
"""Refresh live scoreboard data without rerunning the full editorial pipeline."""

from __future__ import annotations

import copy
import json
import logging
from datetime import datetime, timezone

from sports_desk_pipeline import (
    OUTPUT_PATH,
    _stable_hash,
    atomic_write,
    build_homepage_payload,
    build_modules,
    deduplicate_stories,
    fetch_desk_data,
    game_status_stories,
    load_config,
    payload_signature,
    story_quality,
    validate_payload,
)

LOG = logging.getLogger("sports-live-scores")


def refresh_live_scores(
    payload: dict,
    config: dict,
    now: datetime | None = None,
) -> tuple[dict, list[str]]:
    now = now or datetime.now(timezone.utc)
    previous = copy.deepcopy(payload)
    previous_signature = payload_signature(previous)
    refreshed: list[str] = []
    timeout = config["defaults"]["request_timeout_seconds"]
    maximum = config["defaults"]["max_stories"]

    for desk_config in config["desks"]:
        desk_id = desk_config["id"]
        score_url = desk_config.get("data_providers", {}).get("scores")
        desk = payload.get("desks", {}).get(desk_id)
        if not score_url or not isinstance(desk, dict):
            continue

        score_config = copy.deepcopy(desk_config)
        score_config["data_providers"] = {"scores": score_url}
        fresh_data, errors, provider_ok = fetch_desk_data(score_config, timeout)
        diagnostics = desk.setdefault("diagnostics", {})
        diagnostics["live_score_errors"] = errors
        if not provider_ok.get("scores"):
            LOG.warning("%s live score refresh failed: %s", desk_id, "; ".join(errors))
            continue

        data = desk.setdefault("data", {})
        for kind in ("scores", "schedule", "standings", "rankings"):
            data.setdefault(kind, [])
        previous_value = {
            "scores": data.get("scores", []),
            "schedule": data.get("schedule", []),
        }
        current_value = {
            "scores": fresh_data.get("scores", []),
            "schedule": fresh_data.get("schedule", []),
        }
        data["scores"] = current_value["scores"]
        data["schedule"] = current_value["schedule"]

        updated_at = desk.setdefault("data_updated_at", {})
        if _stable_hash(current_value) != _stable_hash(previous_value) or not updated_at.get("scores"):
            updated_at["scores"] = now.isoformat()
        desk.setdefault("data_verified_at", {})["scores"] = now.isoformat()
        provider = desk.setdefault("providers", {}).setdefault("scores", {})
        provider.update({"url": score_url, "available": True})

        old_stories = desk.get("stories", [])
        editorial_stories = [
            story for story in old_stories
            if not str(story.get("id", "")).startswith(f"score:{desk_id}:")
        ]
        live_stories = game_status_stories(data["scores"], desk_config, now)
        stories = deduplicate_stories([*live_stories, *editorial_stories], desk_config)
        stories = sorted(
            stories,
            key=lambda story: story_quality(story, desk_config),
            reverse=True,
        )[:maximum]
        desk["stories"] = stories
        desk["modules"] = build_modules(stories, data, config, desk_id)
        if _stable_hash(old_stories) != _stable_hash(stories):
            desk["content_updated_at"] = now.isoformat()
        material_times = [
            desk.get("content_updated_at") or now.isoformat(),
            *updated_at.values(),
        ]
        desk["updated_at"] = max(material_times)
        diagnostics["live_score_refreshed_at"] = now.isoformat()
        diagnostics["data_fallbacks"] = [
            kind for kind in diagnostics.get("data_fallbacks", []) if kind != "scores"
        ]
        refreshed.append(desk_id)

    if not refreshed:
        raise RuntimeError("No configured scoreboard provider returned usable data; publication blocked.")

    payload["homepage"] = build_homepage_payload(payload["desks"], previous, now)
    payload["verified_at"] = now.isoformat()
    signature = payload_signature(payload)
    payload["generated_at"] = (
        previous.get("generated_at", now.isoformat())
        if signature == previous_signature
        else now.isoformat()
    )
    payload["content_hash"] = signature
    validate_payload(
        payload,
        config,
        previous=previous,
        now=now,
        require_live_sources=False,
    )
    return payload, refreshed


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    try:
        payload = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Cannot read current live Sports Desk payload: {exc}") from exc
    result, refreshed = refresh_live_scores(payload, load_config())
    atomic_write(OUTPUT_PATH, result)
    LOG.info("Refreshed and validated live scoreboards: %s", ", ".join(refreshed))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
