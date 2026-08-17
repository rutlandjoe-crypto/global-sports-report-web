from __future__ import annotations

import argparse
import hashlib
import io
import json
import re
import subprocess
import unicodedata
from pathlib import Path
from typing import Iterable
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REPORT = ROOT / "public" / "sports_desks.json"
DEFAULT_ARCHIVE = ROOT / "public" / "sports_editorial_archive.json"
PUBLISHED_DESKS = {"nfl", "college-football", "mlb", "nba", "soccer", "fantasy"}
RAW_DATA_MODULES = {"scores", "schedule", "standings", "rankings"}
REMOVED_QUERY_KEYS = {"oc", "guccounter", "guce_referrer", "guce_referrer_sig"}


def clean_text(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def normalize_url(value: object) -> str:
    try:
        parsed = urlsplit(clean_text(value))
    except ValueError:
        return ""
    if parsed.scheme.lower() not in {"http", "https"} or not parsed.hostname:
        return ""
    query = urlencode([
        (key, item)
        for key, item in parse_qsl(parsed.query, keep_blank_values=True)
        if not key.lower().startswith("utm_") and key.lower() not in REMOVED_QUERY_KEYS
    ])
    path = parsed.path.rstrip("/") or "/"
    return urlunsplit(("https", parsed.netloc.lower(), path, query, ""))


def slugify(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9\s-]", "", ascii_value.lower())
    slug = re.sub(r"[\s_]+", "-", slug)
    return re.sub(r"-+", "-", slug).strip("-")[:82]


def story_slug(title: str, source_url: str) -> str:
    digest = hashlib.sha256(source_url.encode()).hexdigest()[:12]
    return f"{slugify(title) or 'sports-story'}-{digest}"


def displayed_editorial(payload: dict) -> Iterable[tuple[str, dict]]:
    for desk_id, desk in (payload.get("desks") or {}).items():
        if desk_id not in PUBLISHED_DESKS or not isinstance(desk, dict):
            continue
        displayed: dict[str, dict] = {}
        for module_id, module in (desk.get("modules") or {}).items():
            if module_id in RAW_DATA_MODULES or not isinstance(module, dict):
                continue
            for story in module.get("items") or []:
                if isinstance(story, dict):
                    key = clean_text(story.get("id")) or normalize_url(
                        story.get("canonical_url") or story.get("url")
                    )
                    if key:
                        displayed[key] = story
        for story in displayed.values():
            yield desk_id, story


def is_durable_editorial(story: dict) -> bool:
    title = clean_text(story.get("title"))
    summary = clean_text(story.get("summary"))
    publisher = clean_text(story.get("publisher"))
    source_url = normalize_url(story.get("canonical_url") or story.get("url"))
    published_at = clean_text(story.get("published_at"))
    if not title or not source_url or not published_at:
        return False
    if (urlsplit(source_url).hostname or "").lower() == "news.google.com":
        return False
    if len(summary) < 80:
        return False
    feed_echo = f"{title} {publisher}".casefold()
    if summary.casefold().startswith(feed_echo):
        return False
    return True


def normalize_story(story: dict, desk_id: str, generated_at: str, existing_slug: str = "") -> dict:
    title = clean_text(story.get("title"))
    source_url = normalize_url(story.get("canonical_url") or story.get("url"))
    return {
        "slug": existing_slug or story_slug(title, source_url),
        "desk": desk_id,
        "title": title,
        "summary": clean_text(story.get("summary")),
        "sourceUrl": source_url,
        "publisher": clean_text(story.get("publisher")) or "Original source",
        "sourceGroup": clean_text(story.get("source_group")),
        "feed": clean_text(story.get("feed")),
        "publishedAt": clean_text(story.get("published_at")),
        "firstSeenAt": generated_at,
        "lastSeenAt": generated_at,
        "teams": [clean_text(item) for item in story.get("teams") or [] if clean_text(item)],
        "players": [clean_text(item) for item in story.get("players") or [] if clean_text(item)],
        "sport": clean_text(story.get("sport")),
        "competitions": [clean_text(item) for item in story.get("competitions") or [] if clean_text(item)],
        "lanes": [clean_text(item) for item in story.get("lanes") or [] if clean_text(item)],
    }


def read_archive(path: Path) -> list[dict]:
    if not path.exists():
        return []
    payload = json.loads(path.read_text(encoding="utf-8-sig"))
    return payload.get("stories", []) if isinstance(payload, dict) else []


def build_archive(reports: Iterable[dict], existing: Iterable[dict] = ()) -> list[dict]:
    by_url = {
        clean_text(story.get("sourceUrl")): dict(story)
        for story in existing
        if isinstance(story, dict) and clean_text(story.get("sourceUrl"))
    }
    for report in reports:
        generated_at = clean_text(report.get("generated_at") or report.get("verified_at"))
        for desk_id, story in displayed_editorial(report):
            if not is_durable_editorial(story):
                continue
            source_url = normalize_url(story.get("canonical_url") or story.get("url"))
            previous = by_url.get(source_url)
            normalized = normalize_story(
                story,
                desk_id,
                generated_at,
                clean_text(previous.get("slug")) if previous else "",
            )
            if previous:
                normalized["firstSeenAt"] = min(
                    filter(None, [clean_text(previous.get("firstSeenAt")), generated_at]),
                    default=generated_at,
                )
                normalized["lastSeenAt"] = max(
                    filter(None, [clean_text(previous.get("lastSeenAt")), generated_at]),
                    default=generated_at,
                )
                if len(clean_text(previous.get("summary"))) > len(normalized["summary"]):
                    normalized["summary"] = clean_text(previous.get("summary"))
            by_url[source_url] = normalized
    return sorted(
        by_url.values(),
        key=lambda story: (clean_text(story.get("publishedAt")), clean_text(story.get("slug"))),
        reverse=True,
    )


def report_history() -> Iterable[dict]:
    listing = subprocess.run(
        ["git", "rev-list", "--objects", "--all", "--", "public/sports_desks.json"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    ).stdout.splitlines()
    hashes = list(
        dict.fromkeys(
            line.split(" ", 1)[0]
            for line in listing
            if line.endswith(" public/sports_desks.json")
        )
    )
    batch = subprocess.run(
        ["git", "cat-file", "--batch"],
        cwd=ROOT,
        input=("\n".join(hashes) + "\n").encode(),
        check=True,
        capture_output=True,
    )
    stream = io.BytesIO(batch.stdout)
    for _ in hashes:
        header = stream.readline().decode().strip().split()
        size = int(header[2])
        raw = stream.read(size)
        stream.read(1)
        try:
            yield json.loads(raw.decode("utf-8-sig"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            continue


def main() -> int:
    parser = argparse.ArgumentParser(description="Retain displayed, substantive Sports Desk editorial.")
    parser.add_argument("--history", action="store_true")
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--archive", type=Path, default=DEFAULT_ARCHIVE)
    args = parser.parse_args()

    reports = list(report_history()) if args.history else []
    reports.append(json.loads(args.report.read_text(encoding="utf-8-sig")))
    stories = build_archive(reports, read_archive(args.archive))
    payload = {
        "site": "Global Sports Report",
        "generatedAt": max((clean_text(story.get("lastSeenAt")) for story in stories), default=""),
        "storyCount": len(stories),
        "stories": stories,
    }
    args.archive.parent.mkdir(parents=True, exist_ok=True)
    args.archive.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Retained {len(stories)} durable Sports editorial stories in {args.archive}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
