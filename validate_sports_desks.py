#!/usr/bin/env python3
"""Fail-fast validation for the generated six-desk production payload."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from sports_desk_pipeline import load_config, normalize_url, parse_datetime, rank_homepage_stories, story_quality, validate_payload

ROOT = Path(__file__).resolve().parent
DEFAULT_PAYLOAD = ROOT / "public" / "sports_desks.json"


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Cannot read generated Sports Desk payload {path}: {exc}") from exc


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--payload", type=Path, default=DEFAULT_PAYLOAD)
    parser.add_argument("--previous", type=Path)
    args = parser.parse_args()

    config = load_config()
    payload = load_json(args.payload)
    previous = load_json(args.previous) if args.previous else None
    validate_payload(payload, config, previous=previous, now=datetime.now(timezone.utc))

    desk_configs = {desk["id"]: desk for desk in config["desks"]}
    homepage = payload.get("homepage", {})
    hero = homepage.get("hero", {})
    ranked_homepage = rank_homepage_stories(
        [story for desk in payload["desks"].values() for story in desk.get("stories", [])]
    )
    if not ranked_homepage or hero.get("id") != ranked_homepage[0].get("id"):
        raise RuntimeError("Homepage hero does not match deterministic freshness/significance ranking")
    if not normalize_url(hero.get("url")) or not parse_datetime(hero.get("published_at")):
        raise RuntimeError("Homepage hero lacks a verified publication time or valid original URL")
    if not parse_datetime(homepage.get("updated_at")):
        raise RuntimeError("Homepage material-update timestamp is missing or invalid")
    print(
        f"homepage: hero={hero.get('title')} publisher={hero.get('publisher')} "
        f"published_at={hero.get('published_at')} updated_at={homepage.get('updated_at')}"
    )
    for desk_id, desk in payload["desks"].items():
        stories = desk["stories"]
        expected_lead = max(stories, key=lambda item: story_quality(item, desk_configs[desk_id]))
        actual_lead = desk["modules"]["top-stories"]["items"][0]
        if actual_lead["id"] != expected_lead["id"]:
            raise RuntimeError(f"{desk_id}: lead story does not match freshness/relevance ranking")
        data_counts = {key: len(value) for key, value in desk["data"].items()}
        lead_time = parse_datetime(actual_lead.get("published_at"))
        print(
            f"{desk_id}: stories={len(stories)} lead={lead_time.isoformat() if lead_time else 'invalid'} "
            f"scores={data_counts['scores']} schedule={data_counts['schedule']} "
            f"standings={data_counts['standings']} updated_at={desk.get('updated_at')}"
        )
    print(f"Sports Desk validation OK: generated_at={payload['generated_at']} hash={payload['content_hash']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())