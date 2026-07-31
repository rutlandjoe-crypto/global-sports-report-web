#!/usr/bin/env python3
"""Configuration-driven content and data pipeline for Global Sports Report desks."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import logging
import re
import tempfile
import time
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any, Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parent
CONFIG_PATH = ROOT / "config" / "sports_desks.json"
OUTPUT_PATH = ROOT / "public" / "sports_desks.json"
LATEST_REPORT_PATH = ROOT / "public" / "latest_report.json"
CACHE_PATH = ROOT / ".cache" / "sports_desks.json"
LOG = logging.getLogger("sports-desks")
USER_AGENT = "GlobalSportsReport/2.0 (+https://globalsportsreport.com)"
TRACKING_QUERY_KEYS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "gclid", "fbclid", "cmpid", "src", "output",
}
TITLE_STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has",
    "have", "in", "into", "is", "it", "of", "on", "or", "that", "the", "their",
    "this", "to", "was", "were", "will", "with", "after", "before", "latest",
}
PLACEHOLDER_SIGNALS = (
    "placeholder", "coming soon", "no current", "unavailable", "refresh needed",
    "news board updates", "coverage starts here", "source refresh", "official site of",
    "who am i? guess",
)


def load_config(path: Path = CONFIG_PATH) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def clean_text(value: Any) -> str:
    text = html.unescape(str(value or ""))
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def normalize_url(value: Any) -> str:
    raw = clean_text(value)
    if not raw.startswith(("http://", "https://")):
        return ""
    parts = urlsplit(raw)
    query = [(k, v) for k, v in parse_qsl(parts.query) if k.lower() not in TRACKING_QUERY_KEYS]
    path = re.sub(r"/+$", "", parts.path) or "/"
    host = (parts.hostname or "").lower()
    if host.startswith("www."):
        host = host[4:]
    return urlunsplit(("https", host, path, urlencode(query), ""))


def title_tokens(value: Any) -> set[str]:
    return {
        token for token in re.findall(r"[a-z0-9]+", clean_text(value).lower())
        if len(token) > 2 and token not in TITLE_STOPWORDS
    }


def title_similarity(left: Any, right: Any) -> float:
    a, b = title_tokens(left), title_tokens(right)
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def parse_datetime(value: Any) -> datetime | None:
    text = clean_text(value)
    if not text:
        return None
    try:
        parsed = parsedate_to_datetime(text)
    except (TypeError, ValueError):
        try:
            parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        except ValueError:
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def xml_text(node: ElementTree.Element, names: Iterable[str]) -> str:
    for name in names:
        found = node.find(name)
        if found is not None and clean_text(found.text):
            return clean_text(found.text)
    return ""


def publisher_from_item(item: ElementTree.Element, fallback: str, title: str) -> tuple[str, str]:
    source = item.find("source")
    publisher = clean_text(source.text if source is not None else "")
    clean_title = title
    if publisher and clean_title.endswith(f" - {publisher}"):
        clean_title = clean_title[: -(len(publisher) + 3)].strip()
    return publisher or fallback, clean_title


def parse_feed(payload: bytes, feed: dict[str, Any], desk_id: str) -> list[dict[str, Any]]:
    root = ElementTree.fromstring(payload)
    entries = root.findall(".//item")
    if not entries:
        entries = root.findall(".//{http://www.w3.org/2005/Atom}entry")
    stories: list[dict[str, Any]] = []
    for entry in entries:
        title = xml_text(entry, ["title", "{http://www.w3.org/2005/Atom}title"])
        link = xml_text(entry, ["link"])
        if not link:
            atom_link = entry.find("{http://www.w3.org/2005/Atom}link")
            link = clean_text(atom_link.get("href") if atom_link is not None else "")
        description = xml_text(entry, [
            "description", "summary", "{http://www.w3.org/2005/Atom}summary",
            "{http://purl.org/rss/1.0/modules/content/}encoded",
        ])
        published_raw = xml_text(entry, [
            "pubDate", "published", "updated",
            "{http://www.w3.org/2005/Atom}published",
            "{http://www.w3.org/2005/Atom}updated",
        ])
        publisher, title = publisher_from_item(entry, feed["publisher"], title)
        published = parse_datetime(published_raw)
        if title and link and published:
            stories.append({
                "id": normalize_url(link) or link,
                "desk": desk_id,
                "title": title,
                "summary": description,
                "url": link,
                "canonical_url": normalize_url(link),
                "publisher": publisher,
                "source_group": feed["group"],
                "feed": feed["name"],
                "published_at": published.isoformat(),
            })
    return stories


def fetch_bytes(url: str, timeout: int) -> bytes:
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/rss+xml, application/json"})
    with urlopen(request, timeout=timeout) as response:
        return response.read()


def fetch_feed(feed: dict[str, Any], desk_id: str, timeout: int) -> tuple[list[dict[str, Any]], str | None]:
    try:
        stories = parse_feed(fetch_bytes(feed["url"], timeout), feed, desk_id)
        if not stories:
            return [], f"{feed['name']}: returned zero usable items with publication timestamps"
        return stories, None
    except (HTTPError, URLError, TimeoutError, ElementTree.ParseError, ValueError) as exc:
        return [], f"{feed['name']}: {type(exc).__name__}: {exc}"


def extract_entities(text: str, desk: dict[str, Any]) -> tuple[list[str], list[str]]:
    lowered = text.lower()
    teams = [team for team in desk.get("teams", []) if re.search(rf"\b{re.escape(team.lower())}\b", lowered)]
    matches = re.findall(r"\b[A-Z][a-z'’-]+(?:\s+[A-Z][a-z'’-]+){1,2}\b", text)
    people: list[str] = []
    for match in matches:
        words = match.split()
        people.extend([match, " ".join(words[:2])])
    people = list(dict.fromkeys(person for person in people if person not in teams))[:8]
    return teams, people

def story_relevance(story: dict[str, Any], desk: dict[str, Any]) -> int:
    # Editorial relevance must be present in the journalism itself. A feed name,
    # source URL or preassigned desk is not evidence that an item belongs here.
    publisher = clean_text(story.get("publisher"))
    summary = clean_text(story.get("summary"))
    if publisher:
        summary = re.sub(re.escape(publisher), " ", summary, flags=re.IGNORECASE)
    text = f"{story.get('title', '')} {summary}"
    lowered = text.lower()
    qualification_signals = desk.get("qualification_signals", [])
    if qualification_signals and not any(
        re.search(rf"\b{re.escape(signal.lower())}\b", lowered)
        for signal in qualification_signals
    ):
        return -100
    if any(
        re.search(rf"\b{re.escape(signal.lower())}\b", lowered)
        for signal in desk.get("excluded_signals", [])
    ):
        return -100
    required = desk.get("required_signals", [])
    teams = desk.get("teams", [])
    positive = sum(3 for signal in required if signal.lower() in lowered)
    positive += sum(2 for team in teams if re.search(rf"\b{re.escape(team.lower())}\b", lowered))
    positive += sum(1 for term in desk.get("search_terms", []) if term.lower() in lowered)
    return positive


def classify_story(story: dict[str, Any], desks: list[dict[str, Any]]) -> str | None:
    scores = {desk["id"]: story_relevance(story, desk) for desk in desks}
    scored = sorted(((score, desk_id) for desk_id, score in scores.items()), reverse=True)
    if not scored or scored[0][0] < 3:
        source_desk = story.get("desk")
        # A configured league feed is useful evidence, but only when the item
        # itself contains a positive team or topic signal for that desk.
        if story.get("feed") != "latest_report.json" and scores.get(source_desk, -100) >= 1:
            return source_desk
        return None
    source_desk = story.get("desk")
    if (
        story.get("feed") != "latest_report.json"
        and scores.get(source_desk, -100) >= 1
        and scored[0][0] - scores[source_desk] <= 2
    ):
        return source_desk
    if len(scored) > 1 and scored[0][0] == scored[1][0]:
        return story.get("desk") if story.get("desk") in {item["id"] for item in desks} else None
    return scored[0][1]


def classify_lanes(story: dict[str, Any], lane_config: list[dict[str, Any]]) -> list[str]:
    text = f"{story.get('title', '')} {story.get('summary', '')}".lower()
    lanes = []
    for lane in lane_config:
        if any(re.search(rf"\b{re.escape(signal.lower())}\b", text) for signal in lane.get("signals", [])):
            if not any(re.search(rf"\b{re.escape(signal.lower())}\b", text) for signal in lane.get("exclude_signals", [])):
                lanes.append(lane["id"])
    return lanes


def is_valid_story(story: dict[str, Any], now: datetime, recency_hours: int) -> bool:
    title = clean_text(story.get("title"))
    if len(title) < 16 or title.endswith(("...", "|")) or any(signal in title.lower() for signal in PLACEHOLDER_SIGNALS):
        return False
    if re.match(r"^[A-Z]{2,5}\s+@\s+[A-Z]{2,5}\s+on\s+\d{4}-\d{2}-\d{2}", title):
        return False
    if not normalize_url(story.get("canonical_url") or story.get("url")):
        return False
    published = parse_datetime(story.get("published_at"))
    return bool(
        published
        and published <= now + timedelta(minutes=5)
        and now - published <= timedelta(hours=recency_hours)
    )


def source_quality(story: dict[str, Any], desk: dict[str, Any]) -> int:
    publisher = clean_text(story.get("publisher"))
    preferred = desk.get("preferred_publishers", [])
    priority = (len(preferred) - preferred.index(publisher)) if publisher in preferred else 0
    if story.get("source_group") == "official":
        priority += 4
    if publisher in desk.get("low_priority_publishers", []):
        priority -= 3
    return priority


def story_quality(story: dict[str, Any], desk: dict[str, Any]) -> tuple[float, int, float]:
    published = parse_datetime(story.get("published_at")) or datetime.min.replace(tzinfo=timezone.utc)
    age_hours = max(0.0, (datetime.now(timezone.utc) - published).total_seconds() / 3600)
    freshness = max(0.0, 120.0 - age_hours)
    relevance = max(0, story_relevance(story, desk))
    # Freshness drives the lead; relevance resolves close stories and source
    # prestige is deliberately only a tie-breaker.
    return freshness + min(relevance, 12) * 2.0, source_quality(story, desk), published.timestamp()


def same_event(left: dict[str, Any], right: dict[str, Any]) -> bool:
    if normalize_url(left.get("canonical_url") or left.get("url")) == normalize_url(right.get("canonical_url") or right.get("url")):
        return True
    similarity = title_similarity(left.get("title"), right.get("title"))
    if similarity >= 0.72:
        return True
    summary_similarity = title_similarity(left.get("summary"), right.get("summary"))
    # Repetitive generated matchup cards often vary only the team/player name.
    # Treat a shared editorial template as a duplicate even when the headline
    # substitutions lower title-token similarity.
    if summary_similarity >= 0.82 or (summary_similarity >= 0.68 and similarity >= 0.45):
        return True
    shared_teams = set(left.get("teams", [])) & set(right.get("teams", []))
    shared_people = set(left.get("players", [])) & set(right.get("players", []))
    left_time = parse_datetime(left.get("published_at"))
    right_time = parse_datetime(right.get("published_at"))
    near_in_time = bool(left_time and right_time and abs((left_time - right_time).total_seconds()) <= 48 * 3600)
    shared_event_terms = (title_tokens(left.get("title")) & title_tokens(right.get("title"))) & {
        "injury", "injured", "surgery", "trade", "traded", "signed", "released",
        "transfer", "final", "playoff", "championship", "mvp", "draft", "record",
    }
    shared_entities = bool(shared_teams or shared_people)
    return near_in_time and shared_entities and (similarity >= 0.48 or (similarity >= 0.35 and bool(shared_event_terms)))

def deduplicate_stories(stories: list[dict[str, Any]], desk: dict[str, Any]) -> list[dict[str, Any]]:
    kept: list[dict[str, Any]] = []
    for story in sorted(stories, key=lambda item: story_quality(item, desk), reverse=True):
        duplicate_index = next((index for index, candidate in enumerate(kept) if same_event(story, candidate)), None)
        if duplicate_index is None:
            kept.append(story)
        elif story_quality(story, desk) > story_quality(kept[duplicate_index], desk):
            kept[duplicate_index] = story
    return kept


def diversify_stories(stories: list[dict[str, Any]], desk: dict[str, Any], limit: int, per_publisher: int) -> list[dict[str, Any]]:
    ordered = sorted(stories, key=lambda item: story_quality(item, desk), reverse=True)
    selected: list[dict[str, Any]] = []
    counts: Counter[str] = Counter()
    required_groups = (
        ["europe", "americas", "africa_asia", "official"]
        if desk.get("geographic_profile") == "international"
        else ["national", "official", "local", "specialist"]
    )
    for group in required_groups:
        candidate = next((
            item for item in ordered
            if item.get("source_group") == group
            and clean_text(item.get("publisher")) not in desk.get("blocked_publishers", [])
            and item not in selected
        ), None)
        if candidate:
            selected.append(candidate)
            counts[clean_text(candidate.get("publisher")) or "Unknown"] += 1
    for story in ordered:
        if story in selected:
            continue
        publisher = clean_text(story.get("publisher")) or "Unknown"
        if publisher in desk.get("blocked_publishers", []):
            continue
        if counts[publisher] < per_publisher:
            selected.append(story)
            counts[publisher] += 1
        if len(selected) >= limit:
            return selected
    # Graceful fallback: fill remaining space only after diverse options are exhausted.
    selected_ids = {item["id"] for item in selected}
    for story in ordered:
        if story["id"] not in selected_ids:
            if clean_text(story.get("publisher")) in desk.get("blocked_publishers", []):
                continue
            selected.append(story)
            selected_ids.add(story["id"])
        if len(selected) >= limit:
            break
    return selected


def parse_existing_report(path: Path, desks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    try:
        payload = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError):
        return []
    raw_items: list[Any] = []
    for key in ("homepage_cards", "live_newsroom", "stories"):
        if isinstance(payload.get(key), list):
            raw_items.extend(payload[key])
    aliases = {alias: desk["id"] for desk in desks for alias in [desk["id"], *desk.get("aliases", [])]}
    output = []
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        source_desk = clean_text(item.get("key") or item.get("section") or item.get("league")).lower().replace(" ", "-")
        desk_id = aliases.get(source_desk, source_desk)
        url = item.get("canonical_url") or item.get("url") or item.get("source_url")
        title = item.get("headline") or item.get("title")
        if not title or not url:
            continue
        output.append({
            "id": normalize_url(url),
            "desk": desk_id,
            "title": clean_text(title),
            "summary": clean_text(item.get("snapshot") or item.get("summary")),
            "url": url,
            "canonical_url": normalize_url(url),
            "publisher": clean_text(item.get("source_label") or item.get("signal") or urlsplit(str(url)).hostname),
            "source_group": "existing",
            "feed": "latest_report.json",
            "published_at": item.get("published_at") or item.get("updated_at") or payload.get("updated_at"),
        })
    return output


def parse_espn_games(payload: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    scores, schedule = [], []
    for event in payload.get("events", []):
        competition = (event.get("competitions") or [{}])[0]
        competitors = competition.get("competitors") or []
        if len(competitors) < 2:
            continue
        teams = {entry.get("homeAway"): entry for entry in competitors}
        away, home = teams.get("away", competitors[0]), teams.get("home", competitors[-1])
        status = competition.get("status", {}).get("type", {})
        event_url = next((link.get("href") for link in event.get("links", []) if link.get("href")), "")
        game = {
            "id": str(event.get("id", "")),
            "name": clean_text(event.get("name")),
            "competition": clean_text(
                event.get("league", {}).get("name")
                or event.get("league", {}).get("abbreviation")
                or competition.get("type", {}).get("abbreviation")
            ),
            "away": clean_text(away.get("team", {}).get("displayName")),
            "home": clean_text(home.get("team", {}).get("displayName")),
            "away_score": clean_text(away.get("score")),
            "home_score": clean_text(home.get("score")),
            "status": clean_text(status.get("shortDetail") or status.get("detail")),
            "event_state": clean_text(status.get("state")).lower(),
            "starts_at": event.get("date"),
            "url": event_url,
            "source": "ESPN",
            "source_url": event_url or "https://www.espn.com/scoreboard",
        }
        if status.get("state") == "post":
            scores.append(game)
        elif status.get("state") == "pre":
            schedule.append(game)
    return scores, schedule


def parse_mlb_games(payload: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    scores, schedule = [], []
    for day in payload.get("dates", []):
        for game in day.get("games", []):
            status = clean_text(game.get("status", {}).get("abstractGameState"))
            game_url = f"https://www.mlb.com/gameday/{game.get('gamePk')}"
            normalized = {
                "id": str(game.get("gamePk", "")),
                "name": f"{game.get('teams', {}).get('away', {}).get('team', {}).get('name', '')} at {game.get('teams', {}).get('home', {}).get('team', {}).get('name', '')}",
                "competition": "Major League Baseball",
                "away": clean_text(game.get("teams", {}).get("away", {}).get("team", {}).get("name")),
                "home": clean_text(game.get("teams", {}).get("home", {}).get("team", {}).get("name")),
                "away_score": clean_text(game.get("teams", {}).get("away", {}).get("score")),
                "home_score": clean_text(game.get("teams", {}).get("home", {}).get("score")),
                "status": status,
                "event_state": "post" if status == "Final" else "in" if status == "Live" else "pre",
                "starts_at": game.get("gameDate"),
                "url": game_url,
                "source": "MLB",
                "source_url": game_url,
            }
            if status == "Final":
                scores.append(normalized)
            elif status not in {"Live"}:
                schedule.append(normalized)
    return scores, schedule


def filter_game_windows(
    scores: list[dict[str, Any]],
    schedule: list[dict[str, Any]],
    now: datetime | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Keep only completed recent results and genuinely future fixtures."""
    now = now or datetime.now(timezone.utc)
    recent_cutoff = now - timedelta(days=3)
    schedule_cutoff = now + timedelta(days=45)
    completed = [
        row for row in scores
        if row.get("event_state") == "post"
        and (starts := parse_datetime(row.get("starts_at")))
        and recent_cutoff <= starts <= now + timedelta(minutes=5)
    ]
    upcoming = [
        row for row in schedule
        if row.get("event_state") == "pre"
        and (starts := parse_datetime(row.get("starts_at")))
        and now - timedelta(minutes=5) <= starts <= schedule_cutoff
    ]
    return completed, upcoming


def meaningful_standings(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Suppress preseason 0-0 tables that look current but contain no competition."""
    records = [clean_text(row.get("record")) for row in rows]
    if records and all(re.fullmatch(r"0(?:-0){1,2}", record) for record in records if record):
        return []
    return rows


def provider_label(url: str) -> str:
    host = (urlsplit(url).hostname or "").lower()
    if "mlb.com" in host:
        return "MLB"
    if "espn.com" in host:
        return "ESPN"
    return host.removeprefix("www.") or "Configured provider"


def parse_standings(payload: dict[str, Any], source_url: str = "") -> list[dict[str, Any]]:
    output = []
    if isinstance(payload.get("children"), list):
        groups = payload["children"]
        for group in groups:
            for entry in group.get("standings", {}).get("entries", []):
                stats = {stat.get("name"): stat.get("displayValue") for stat in entry.get("stats", [])}
                output.append({
                    "team": clean_text(entry.get("team", {}).get("displayName")),
                    "record": stats.get("overall") or stats.get("summary") or "",
                    "win_percentage": stats.get("winPercent") or stats.get("winPercentage") or "",
                    "games_back": stats.get("gamesBehind") or "",
                    "group": clean_text(group.get("name")),
                    "source": "ESPN",
                    "source_url": source_url,
                })
    for record in payload.get("records", []):
        for row in record.get("teamRecords", []):
            output.append({
                "team": clean_text(row.get("team", {}).get("name")),
                "record": f"{row.get('wins', 0)}-{row.get('losses', 0)}",
                "win_percentage": clean_text(row.get("winningPercentage")),
                "games_back": clean_text(row.get("gamesBack")),
                "group": clean_text(record.get("division", {}).get("name")),
                "source": "MLB",
                "source_url": source_url,
            })
    return [row for row in output if row["team"]]


def parse_rankings(payload: dict[str, Any], source_url: str = "") -> list[dict[str, Any]]:
    polls = payload.get("rankings") or []
    poll = next((item for item in polls if item.get("ranks")), None)
    if not poll:
        return []
    output = []
    for row in poll.get("ranks", []):
        team = row.get("team", {})
        output.append({
            "rank": row.get("current"),
            "previous_rank": row.get("previous"),
            "team": clean_text(team.get("location") or team.get("displayName") or team.get("name")),
            "record": clean_text(row.get("recordSummary")),
            "poll": clean_text(poll.get("name") or poll.get("shortName")),
            "source": "ESPN",
            "source_url": source_url,
        })
    return [row for row in output if row["rank"] and row["team"]]

def fetch_json(url: str, timeout: int) -> dict[str, Any]:
    return json.loads(fetch_bytes(url, timeout).decode("utf-8"))


def fetch_desk_data(
    desk: dict[str, Any], timeout: int
) -> tuple[dict[str, Any], list[str], dict[str, bool]]:
    data = {"scores": [], "schedule": [], "standings": [], "rankings": []}
    errors: list[str] = []
    provider_ok: dict[str, bool] = {}
    for kind, url in desk.get("data_providers", {}).items():
        try:
            request_url = url
            if desk["id"] == "mlb" and kind == "scores":
                now = datetime.now(timezone.utc)
                request_url = (
                    f"{url}&startDate={(now - timedelta(days=3)).date().isoformat()}"
                    f"&endDate={(now + timedelta(days=7)).date().isoformat()}"
                )
            payload = fetch_json(request_url, timeout)
            if kind == "scores":
                parser = parse_mlb_games if desk["id"] == "mlb" else parse_espn_games
                data["scores"], data["schedule"] = parser(payload)
                data["scores"], data["schedule"] = filter_game_windows(data["scores"], data["schedule"])
                provider_ok[kind] = bool(data["scores"] or data["schedule"])
            elif kind == "standings":
                data["standings"] = meaningful_standings(parse_standings(payload, url))
                provider_ok[kind] = bool(data["standings"])
            elif kind == "rankings":
                data["rankings"] = parse_rankings(payload, url)
                provider_ok[kind] = bool(data["rankings"])
            else:
                provider_ok[kind] = False
                errors.append(f"{kind}: unsupported data provider kind")
            if kind in provider_ok and not provider_ok[kind]:
                errors.append(f"{kind}: provider returned zero usable records")
        except (HTTPError, URLError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
            provider_ok[kind] = False
            errors.append(f"{kind}: {type(exc).__name__}: {exc}")
    return data, errors, provider_ok

def build_modules(
    stories: list[dict[str, Any]],
    data: dict[str, Any],
    config: dict[str, Any],
    desk_id: str = "nfl",
) -> dict[str, Any]:
    lanes = config["content_lanes"]
    modules: dict[str, Any] = {}
    assigned_ids: set[str] = set()

    # Preserve one strong lead, then give each desk-specific lane first claim on
    # the remaining pool. This keeps articles exclusive to one visible lane.
    hero = stories[:1]
    assigned_ids.update(item["id"] for item in hero)
    desk_lanes = config["desk_lanes"].get(desk_id, [])
    lane_items: dict[str, list[dict[str, Any]]] = defaultdict(list)
    # Fill lanes in rounds so one broad topic cannot consume every multi-tagged
    # story before narrower lanes get a meaningful item.
    for slot in range(max((lane.get("maximum", 5) for lane in desk_lanes), default=0)):
        ordered_lanes = sorted(
            desk_lanes,
            key=lambda lane: sum(
                story["id"] not in assigned_ids and lane["id"] in story.get("lanes", [])
                for story in stories
            ),
        )
        for lane in ordered_lanes:
            if slot >= lane.get("maximum", 5):
                continue
            candidate = next((
                story for story in stories
                if story["id"] not in assigned_ids and lane["id"] in story.get("lanes", [])
            ), None)
            if candidate:
                lane_items[lane["id"]].append(candidate)
                assigned_ids.add(candidate["id"])
    for lane in desk_lanes:
        if lane_items[lane["id"]]:
            modules[lane["id"]] = {"label": lane["label"], "items": lane_items[lane["id"]]}

    unassigned = [story for story in stories if story["id"] not in assigned_ids]
    top_lane = lanes["top-stories"]
    top_items = hero + unassigned[: max(0, top_lane["maximum"] - len(hero))]
    if top_items:
        modules["top-stories"] = {"label": top_lane["label"], "items": top_items}
        assigned_ids.update(item["id"] for item in top_items)

    latest_lane = lanes["latest-news"]
    latest_items = [story for story in stories if story["id"] not in assigned_ids][: latest_lane["maximum"]]
    if latest_items:
        modules["latest-news"] = {"label": latest_lane["label"], "items": latest_items}
        assigned_ids.update(item["id"] for item in latest_items)

    for key, rule in config["visibility"].items():
        if len(data.get(key, [])) >= rule["minimum"]:
            modules[key] = {"label": key.title(), "items": data[key]}
    return modules


HOMEPAGE_SIGNIFICANCE = {
    "championship": 8,
    "world cup": 8,
    "playoff": 7,
    "postseason": 7,
    "title": 6,
    "record": 5,
    "trade": 5,
    "traded": 5,
    "injury": 4,
    "injured": 4,
    "surgery": 4,
    "fired": 4,
    "hired": 4,
    "suspended": 4,
    "expansion": 4,
    "all-star": 3,
    "rankings": 3,
}


def homepage_significance(story: dict[str, Any]) -> int:
    text = f"{story.get('title', '')} {story.get('summary', '')}".lower()
    return min(20, sum(weight for signal, weight in HOMEPAGE_SIGNIFICANCE.items() if signal in text))


def homepage_source_quality(story: dict[str, Any]) -> int:
    group_score = {"official": 4, "national": 3, "specialist": 2, "local": 2, "europe": 3, "americas": 2, "africa_asia": 2}
    publisher = clean_text(story.get("publisher")).lower()
    established = ("associated press", "reuters", "bbc", "espn", "nfl", "mlb", "nba", "ncaa", "fifa", "uefa")
    return group_score.get(story.get("source_group"), 1) + int(any(name in publisher for name in established))


def rank_homepage_stories(stories: list[dict[str, Any]], now: datetime | None = None) -> list[dict[str, Any]]:
    now = now or datetime.now(timezone.utc)
    qualified = [
        story for story in stories
        if normalize_url(story.get("canonical_url") or story.get("url"))
        and parse_datetime(story.get("published_at"))
        and parse_datetime(story.get("published_at")) <= now + timedelta(minutes=5)
        and now - parse_datetime(story.get("published_at")) <= timedelta(hours=96)
    ]
    if not qualified:
        return []

    deduped: list[dict[str, Any]] = []
    for story in sorted(qualified, key=lambda item: normalize_url(item.get("url"))):
        if not any(same_event(story, existing) for existing in deduped):
            deduped.append(story)

    latest = max(parse_datetime(item["published_at"]) for item in deduped)
    eligible = [
        item for item in deduped
        if latest - parse_datetime(item["published_at"]) <= timedelta(hours=36)
    ]

    def ranking_key(story: dict[str, Any]) -> tuple[int, int, int, int, float, str]:
        published = parse_datetime(story["published_at"])
        freshness_band = int((latest - published).total_seconds() // (3 * 3600))
        global_relevance = int(bool(set(story.get("lanes", [])) & {
            "championship-race", "playoff-race", "wild-card-picture", "division-races",
            "international-soccer", "world-cup", "league-business", "trades", "injuries",
        }))
        return (
            -freshness_band,
            homepage_significance(story),
            homepage_source_quality(story),
            global_relevance,
            published.timestamp(),
            normalize_url(story.get("url")),
        )

    return sorted(eligible, key=ranking_key, reverse=True)


def build_homepage_payload(
    desks: dict[str, Any], previous: dict[str, Any], now: datetime
) -> dict[str, Any]:
    ranked = rank_homepage_stories(
        [story for desk in desks.values() for story in desk.get("stories", [])],
        now,
    )
    if not ranked:
        return previous.get("homepage", {})

    selected: list[dict[str, Any]] = []
    desk_counts: Counter[str] = Counter()
    publisher_counts: Counter[str] = Counter()
    for story in ranked:
        desk_id = clean_text(story.get("desk")) or "other"
        publisher = clean_text(story.get("publisher")) or "Unknown"
        if desk_counts[desk_id] >= 3 or publisher_counts[publisher] >= 2:
            continue
        selected.append(story)
        desk_counts[desk_id] += 1
        publisher_counts[publisher] += 1
        if len(selected) >= 12:
            break
    if ranked[0] not in selected:
        selected.insert(0, ranked[0])

    previous_homepage = previous.get("homepage", {})
    semantic = [{key: item.get(key) for key in ("id", "title", "url", "published_at")} for item in selected]
    previous_semantic = [
        {key: item.get(key) for key in ("id", "title", "url", "published_at")}
        for item in previous_homepage.get("stories", [])
    ]
    updated_at = (
        previous_homepage.get("updated_at")
        if previous_semantic and _stable_hash(semantic) == _stable_hash(previous_semantic)
        else now.isoformat()
    )
    return {"hero": ranked[0], "stories": selected, "updated_at": updated_at}

def atomic_write(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
        temporary = Path(handle.name)
    temporary.replace(path)


def _stable_hash(value: Any) -> str:
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def payload_signature(payload: dict[str, Any]) -> str:
    semantic_desks = {
        desk_id: {"stories": desk.get("stories", []), "data": desk.get("data", {})}
        for desk_id, desk in sorted(payload.get("desks", {}).items())
    }
    homepage = payload.get("homepage", {})
    semantic_homepage = [
        {key: item.get(key) for key in ("id", "title", "url", "published_at")}
        for item in homepage.get("stories", [])
    ]
    return _stable_hash({"desks": semantic_desks, "homepage": semantic_homepage})

def validate_payload(
    payload: dict[str, Any],
    config: dict[str, Any],
    previous: dict[str, Any] | None = None,
    now: datetime | None = None,
    require_live_sources: bool = True,
) -> None:
    now = now or datetime.now(timezone.utc)
    defaults = config["defaults"]
    errors: list[str] = []
    expected = {desk["id"]: desk for desk in config["desks"]}
    actual = payload.get("desks", {})
    missing = sorted(set(expected) - set(actual))
    if missing:
        errors.append(f"missing desks: {', '.join(missing)}")
    extra = sorted(set(actual) - set(expected))
    if extra:
        errors.append(f"unexpected desks: {', '.join(extra)}")

    signature = payload_signature(payload)
    if payload.get("content_hash") != signature:
        errors.append("content_hash does not match generated story/data content")

    generated = parse_datetime(payload.get("generated_at"))
    if not generated:
        errors.append("generated_at is missing or invalid")
    verified = parse_datetime(payload.get("verified_at") or payload.get("generated_at"))
    if not verified:
        errors.append("verified_at is missing or invalid")
    elif now - verified > timedelta(hours=defaults["stale_fallback_hours"]):
        errors.append(f"payload verification is stale ({(now - verified).total_seconds() / 3600:.1f}h old)")

    for desk_id, desk_config in expected.items():
        desk = actual.get(desk_id, {})
        stories = desk.get("stories", [])
        if len(stories) < defaults["minimum_primary_stories"]:
            errors.append(f"{desk_id}: zero/underfilled story feed ({len(stories)} stories)")
        elif not desk.get("modules", {}).get("top-stories", {}).get("items"):
            errors.append(f"{desk_id}: top-stories module is empty")
        visible_story_ids = [
            item.get("id")
            for module_id, module in desk.get("modules", {}).items()
            if module_id not in {"scores", "schedule", "standings", "rankings"}
            for item in module.get("items", [])
            if item.get("title")
        ]
        if len(visible_story_ids) != len(set(visible_story_ids)):
            errors.append(f"{desk_id}: duplicate story cards appear across visible modules")
        for story in stories:
            published = parse_datetime(story.get("published_at"))
            if (
                not published
                or published > now + timedelta(minutes=5)
                or now - published > timedelta(hours=defaults["recency_hours"])
            ):
                errors.append(f"{desk_id}: stale/invalid story timestamp: {story.get('title', '<untitled>')}")
                break
            if not normalize_url(story.get("canonical_url") or story.get("url")):
                errors.append(f"{desk_id}: story has no valid original-source URL: {story.get('title', '<untitled>')}")
                break
            if story.get("desk") != desk_id or classify_story(story, list(expected.values())) != desk_id:
                errors.append(f"{desk_id}: wrong-sport or irrelevant story: {story.get('title', '<untitled>')}")
                break

        diagnostics = desk.get("diagnostics", {})
        if (
            require_live_sources
            and diagnostics.get("source_success_count", 0) < 1
            and not diagnostics.get("story_fallback_used")
        ):
            errors.append(f"{desk_id}: source ingestion failed for every configured feed")

        data = desk.get("data", {})
        if desk.get("sport") != desk_config.get("sport"):
            errors.append(f"{desk_id}: generated desk-to-sport mapping is incorrect")
        if desk_id == "fantasy" and any(data.get(kind) for kind in ("scores", "schedule", "standings", "rankings")):
            errors.append("fantasy: raw single-league data must remain suppressed")
        optional_providers = set(desk_config.get("optional_data_providers", []))
        providers = desk.get("providers", {})
        for kind, provider_url in desk_config.get("data_providers", {}).items():
            has_data = bool(data.get("scores") or data.get("schedule")) if kind == "scores" else bool(data.get(kind))
            provider = providers.get(kind, {})
            if provider.get("label") == "" or normalize_url(provider.get("url")) != normalize_url(provider_url):
                errors.append(f"{desk_id}: {kind} provider provenance metadata is missing")
            if not has_data and kind in optional_providers:
                continue
            if not has_data:
                if provider.get("available"):
                    errors.append(f"{desk_id}: {kind} is marked available but has no usable rows")
                continue
            rows = (
                [*data.get("scores", []), *data.get("schedule", [])]
                if kind == "scores"
                else data.get(kind, [])
            )
            if any(not clean_text(row.get("source")) or not normalize_url(row.get("source_url")) for row in rows):
                errors.append(f"{desk_id}: {kind} data is missing verified provider provenance")
            updated = parse_datetime(desk.get("data_updated_at", {}).get(kind))
            if not updated:
                errors.append(f"{desk_id}: {kind} material-change timestamp is missing")
            verified = parse_datetime(
                desk.get("data_verified_at", {}).get(kind)
                or desk.get("data_updated_at", {}).get(kind)
            )
            if not verified:
                errors.append(f"{desk_id}: {kind} verification timestamp is missing")
            elif now - verified > timedelta(hours=defaults["stale_fallback_hours"]):
                errors.append(
                    f"{desk_id}: {kind} verification is stale "
                    f"({(now - verified).total_seconds() / 3600:.1f}h old)"
                )
        for row in data.get("scores", []):
            starts = parse_datetime(row.get("starts_at"))
            if row.get("event_state") != "post" or not starts or starts > now + timedelta(minutes=5):
                errors.append(f"{desk_id}: result is not a completed event: {row.get('name', row.get('id'))}")
        for row in data.get("schedule", []):
            starts = parse_datetime(row.get("starts_at"))
            if row.get("event_state") != "pre" or not starts or starts < now - timedelta(minutes=5):
                errors.append(f"{desk_id}: schedule contains a non-future event: {row.get('name', row.get('id'))}")
        if any("rank" in row for row in data.get("standings", [])):
            errors.append(f"{desk_id}: rankings were mislabeled as standings")
        if any("rank" not in row for row in data.get("rankings", [])):
            errors.append(f"{desk_id}: standings were mislabeled as rankings")

    if previous and payload_signature(payload) == payload_signature(previous):
        if payload.get("generated_at") != previous.get("generated_at"):
            errors.append("generated_at advanced without new story or data content")

    if errors:
        raise RuntimeError("Sports Desk validation failed:\n- " + "\n- ".join(errors))


def build_pipeline(config: dict[str, Any], output_path: Path = OUTPUT_PATH, offline: bool = False) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    defaults = config["defaults"]
    desks = config["desks"]
    existing = parse_existing_report(LATEST_REPORT_PATH, desks)
    previous: dict[str, Any] = {}
    if output_path.exists():
        try:
            previous = json.loads(output_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            LOG.warning("Previous Sports Desk payload is unreadable: %s", exc)

    result: dict[str, Any] = {
        "version": config["version"],
        "generated_at": now.isoformat(),
        "verified_at": now.isoformat(),
        "config": {
            "publisher_limit": defaults["max_per_publisher"],
            "recency_hours": defaults["recency_hours"],
        },
        "desks": {},
    }
    for desk in desks:
        desk_id = desk["id"]
        candidates = [item.copy() for item in existing if item.get("desk") in {desk_id, *desk.get("aliases", [])}]
        source_errors: list[str] = []
        source_counts: dict[str, int] = {}
        if not offline:
            for feed in desk["feeds"]:
                items, error = fetch_feed(feed, desk_id, defaults["request_timeout_seconds"])
                source_counts[feed["name"]] = len(items)
                candidates.extend(items)
                if error:
                    source_errors.append(error)
                    LOG.warning("%s source failure: %s", desk_id, error)

        classified = []
        for candidate in candidates:
            story = candidate.copy()
            story["desk"] = classify_story(story, desks)
            if story["desk"] != desk_id or not is_valid_story(story, now, defaults["recency_hours"]):
                continue
            teams, players = extract_entities(f"{story['title']} {story.get('summary', '')}", desk)
            story["teams"], story["players"] = teams, players
            story["sport"], story["competitions"] = desk["sport"], desk["competitions"]
            story["lanes"] = classify_lanes(story, config["desk_lanes"].get(desk_id, []))
            classified.append(story)

        deduped = deduplicate_stories(classified, desk)
        diversified = diversify_stories(deduped, desk, defaults["max_stories"], defaults["max_per_publisher"])
        diversified = sorted(diversified, key=lambda item: story_quality(item, desk), reverse=True)
        previous_desk = previous.get("desks", {}).get(desk_id, {})
        previous_generated = parse_datetime(
            previous_desk.get("content_updated_at") or previous.get("generated_at")
        )
        story_fallback = False
        if len(diversified) < defaults["minimum_primary_stories"] and previous_desk.get("stories"):
            if previous_generated and now - previous_generated <= timedelta(hours=defaults["stale_fallback_hours"]):
                diversified = previous_desk["stories"]
                story_fallback = True
                LOG.warning("%s using last known good stories after an underfilled refresh", desk_id)

        if offline:
            data = previous_desk.get("data", {"scores": [], "schedule": [], "standings": [], "rankings": []})
            data_errors: list[str] = []
            provider_ok = {
                kind: bool(data.get("scores") or data.get("schedule")) if kind == "scores" else bool(data.get(kind))
                for kind in desk.get("data_providers", {})
            }
        else:
            data, data_errors, provider_ok = fetch_desk_data(desk, defaults["request_timeout_seconds"])
        for error in data_errors:
            LOG.warning("%s data failure: %s", desk_id, error)

        previous_data = previous_desk.get("data", {})
        previous_data_times = previous_desk.get("data_updated_at", {})
        previous_verification_times = previous_desk.get("data_verified_at", {})
        data_updated_at: dict[str, str] = {}
        data_verified_at: dict[str, str] = {}
        data_fallbacks: list[str] = []
        for kind in desk.get("data_providers", {}):
            previous_time = parse_datetime(previous_data_times.get(kind) or previous.get("generated_at"))
            previous_verified = parse_datetime(
                previous_verification_times.get(kind)
                or previous_data_times.get(kind)
                or previous.get("verified_at")
                or previous.get("generated_at")
            )
            current_value = (
                {"scores": data.get("scores", []), "schedule": data.get("schedule", [])}
                if kind == "scores"
                else data.get(kind, [])
            )
            previous_value = (
                {"scores": previous_data.get("scores", []), "schedule": previous_data.get("schedule", [])}
                if kind == "scores"
                else previous_data.get(kind, [])
            )
            if provider_ok.get(kind):
                data_updated_at[kind] = (
                    previous_time.isoformat()
                    if previous_time and _stable_hash(current_value) == _stable_hash(previous_value)
                    else now.isoformat()
                )
                data_verified_at[kind] = now.isoformat()
                continue

            can_restore = bool(
                previous_verified
                and now - previous_verified <= timedelta(hours=defaults["stale_fallback_hours"])
            )
            if kind == "scores" and can_restore and (previous_data.get("scores") or previous_data.get("schedule")):
                data["scores"] = previous_data.get("scores", [])
                data["schedule"] = previous_data.get("schedule", [])
            elif kind != "scores" and can_restore and previous_data.get(kind):
                data[kind] = previous_data[kind]
            else:
                continue
            data_updated_at[kind] = previous_time.isoformat()
            data_verified_at[kind] = previous_verified.isoformat()
            data_fallbacks.append(kind)
            LOG.warning("%s preserving last known good %s data", desk_id, kind)
        old_story_hash = _stable_hash(previous_desk.get("stories", []))
        new_story_hash = _stable_hash(diversified)
        if old_story_hash == new_story_hash:
            content_updated_at = (
                previous_desk.get("content_updated_at") or previous.get("generated_at") or now.isoformat()
            )
        else:
            content_updated_at = now.isoformat()
        result["desks"][desk_id] = {
            "id": desk_id,
            "slug": desk["slug"],
            "label": desk["label"],
            "sport": desk["sport"],
            "competitions": desk["competitions"],
            "geographic_profile": desk["geographic_profile"],
            "stories": diversified,
            "data": data,
            "modules": build_modules(diversified, data, config, desk_id),
            "providers": {
                kind: {
                    "label": provider_label(url),
                    "url": url,
                    "available": bool(provider_ok.get(kind)),
                }
                for kind, url in desk.get("data_providers", {}).items()
            },
            "content_updated_at": content_updated_at,
            "updated_at": max([content_updated_at, *data_updated_at.values()]),
            "data_updated_at": data_updated_at,
            "data_verified_at": data_verified_at,
            "diagnostics": {
                "candidate_count": len(candidates),
                "classified_count": len(classified),
                "deduplicated_count": len(deduped),
                "selected_count": len(diversified),
                "publishers": dict(Counter(item.get("publisher", "Unknown") for item in diversified)),
                "source_counts": source_counts,
                "source_success_count": sum(count > 0 for count in source_counts.values()),
                "source_errors": source_errors,
                "data_errors": data_errors,
                "story_fallback_used": story_fallback,
                "data_fallbacks": data_fallbacks,
            },
        }

    result["homepage"] = build_homepage_payload(result["desks"], previous, now)

    signature = payload_signature(result)
    previous_signature = payload_signature(previous) if previous else ""
    if previous and signature == previous_signature:
        result["generated_at"] = previous.get("generated_at", now.isoformat())
    result["content_hash"] = signature
    validate_payload(result, config, previous=previous or None, now=now, require_live_sources=not offline)

    if previous and signature == previous_signature:
        LOG.info("No semantic Sports Desk changes; only successful verification timestamps were advanced")

    atomic_write(output_path, result)
    if output_path.resolve() == OUTPUT_PATH.resolve():
        CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        atomic_write(CACHE_PATH, result)
    return result

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--offline", action="store_true", help="Use only the current report; skip network providers.")
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH)
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()
    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO, format="%(levelname)s %(message)s")
    started = time.monotonic()
    payload = build_pipeline(load_config(), args.output, args.offline)
    for desk_id, desk in payload["desks"].items():
        LOG.info(
            "%s: %d stories, %d publishers, modules=%s",
            desk_id, len(desk["stories"]), len(desk["diagnostics"]["publishers"]),
            ",".join(desk["modules"]),
        )
    LOG.info("Validated %s in %.1fs", args.output, time.monotonic() - started)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
