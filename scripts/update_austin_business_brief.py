from __future__ import annotations

import argparse
import html
import json
import re
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen
from xml.etree import ElementTree


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = ROOT / "config" / "austin_business_sources.json"
DEFAULT_OUTPUT = ROOT / "public" / "austin_business_brief.json"
USER_AGENT = "GlobalSportsReport/2.0 (+https://globalsportsreport.com)"

LOCATION = re.compile(
    r"\b(Austin|Central Texas|Travis County|Williamson County|Hays County|"
    r"Round Rock|Georgetown|Pflugerville|Cedar Park|San Marcos|Taylor,? Texas)\b",
    re.IGNORECASE,
)
BUSINESS = re.compile(
    r"\b(business|employer|workforce|hiring|jobs?|layoffs?|technology|artificial intelligence|AI|"
    r"semiconductor|chips?|data cent(?:er|re)|commercial real estate|office|industrial|development|"
    r"relocat(?:e|ion)|expan(?:d|sion)|venture capital|funding|financ(?:e|ing)|investment|startup|"
    r"property tax|tax rate|city budget|contract|media|stadium|arena|ownership|sponsor(?:ship)?|"
    r"franchise|convention|conference|economic impact|infrastructure|transit|airport|energy|utility|"
    r"construction|headquarters|campus|tourism|hospitality|hotel|manufacturing|facility|facilities)\b",
    re.IGNORECASE,
)
MATERIAL = re.compile(
    r"\b(highest|lowest|record|major|largest|billion|million|invest(?:s|ed|ment|ing)?|fund(?:ing|ed)?|"
    r"rais(?:e|es|ed|ing)|financ(?:e|ing)|acqui(?:re|res|red|sition)|merger|layoffs?|jobs?|hiring|"
    r"expand(?:s|ed|ing)?|expansion|relocat(?:e|ion)|headquarters|broke ground|construction|"
    r"development|project|property tax|tax rate|budget|contract|data cent(?:er|re)|semiconductor|"
    r"manufacturing|facility|facilities|opens?|closes?|launch(?:es|ed)?)\b",
    re.IGNORECASE,
)
EXCLUDED = re.compile(
    r"\b(crime|murder|shooting|arrest|jail|weather|forecast|storm|traffic|car crash|lifestyle|"
    r"restaurant opening|recipe|concert|celebrity|gossip|box office|drink[- ]spiking|public safety|game recap|final score|"
    r"wins? (?:the |a )?(?:game|match)|defeats?|podcast|webinar|sponsorship opportunities|"
    r"makes? (?:the )?list|award|giveaway)\b",
    re.IGNORECASE,
)
EDUCATION = re.compile(r"\b(school|school district|ISD|teacher|students?|classroom)\b", re.IGNORECASE)
EDUCATION_PROJECT = re.compile(
    r"\b(construction|development|bond|contract|facility|facilities|campus project)\b",
    re.IGNORECASE,
)
MONEY = re.compile(
    r"\$\s?\d[\d,.]*(?:\.\d+)?\s?(?:trillion|billion|million|thousand|tn|bn|m|t|b|k)?\b",
    re.IGNORECASE,
)
TRACKING_KEYS = {"utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"}


class VisibleTextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.hidden = 0
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"figure", "script", "style", "noscript"}:
            self.hidden += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in {"figure", "script", "style", "noscript"} and self.hidden:
            self.hidden -= 1

    def handle_data(self, data: str) -> None:
        if not self.hidden:
            self.parts.append(data)


def clean_text(value: object) -> str:
    cleaned = html.unescape(str(value or ""))
    for _ in range(2):
        if not any(marker in cleaned for marker in ("Ã", "â", "Â")):
            break
        try:
            repaired = cleaned.encode("cp1252").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            break
        if sum(repaired.count(marker) for marker in ("Ã", "â", "Â")) >= sum(
            cleaned.count(marker) for marker in ("Ã", "â", "Â")
        ):
            break
        cleaned = repaired
    return re.sub(r"\s+", " ", cleaned).strip()


def clean_markup(value: object) -> str:
    parser = VisibleTextParser()
    parser.feed(html.unescape(str(value or "")))
    return clean_text(" ".join(parser.parts))


def normalize_url(value: object) -> str:
    raw = clean_text(value)
    try:
        parsed = urlsplit(raw)
    except ValueError:
        return ""
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        return ""
    query = urlencode([
        (key, item) for key, item in parse_qsl(parsed.query, keep_blank_values=True)
        if key.lower() not in TRACKING_KEYS
    ])
    return urlunsplit(("https", parsed.netloc.lower(), parsed.path.rstrip("/") or "/", query, ""))


def parse_datetime(value: object) -> datetime | None:
    raw = clean_text(value)
    if not raw:
        return None
    try:
        parsed = parsedate_to_datetime(raw)
    except (TypeError, ValueError):
        try:
            parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError:
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def child_text(node: ElementTree.Element, names: Iterable[str]) -> str:
    for name in names:
        found = node.find(name)
        if found is not None and clean_text(found.text):
            return clean_text(found.text)
    return ""


def first_sentence(value: object, maximum: int = 260) -> str:
    cleaned = clean_markup(value)
    sentence = re.split(r"(?<=[.!?])\s+", cleaned, maxsplit=1)[0].strip()
    if len(sentence) <= maximum:
        return sentence
    shortened = sentence[: maximum + 1].rsplit(" ", 1)[0].rstrip(" ,;:")
    return f"{shortened}…"


def parse_feed(payload: bytes, source: dict) -> list[dict]:
    root = ElementTree.fromstring(payload)
    entries = root.findall(".//item") or root.findall(".//{http://www.w3.org/2005/Atom}entry")
    stories: list[dict] = []
    for entry in entries:
        title = child_text(entry, ["title", "{http://www.w3.org/2005/Atom}title"])
        link = child_text(entry, ["link"])
        if not link:
            atom_link = entry.find("{http://www.w3.org/2005/Atom}link")
            link = clean_text(atom_link.get("href") if atom_link is not None else "")
        raw_summary = child_text(entry, [
            "{http://purl.org/rss/1.0/modules/content/}encoded",
            "description",
            "summary",
            "{http://www.w3.org/2005/Atom}summary",
        ])
        published = parse_datetime(child_text(entry, [
            "pubDate", "published", "updated",
            "{http://www.w3.org/2005/Atom}published",
            "{http://www.w3.org/2005/Atom}updated",
        ]))
        url = normalize_url(link)
        context = first_sentence(raw_summary)
        if title and url and context and published:
            stories.append({
                "headline": title,
                "context": context,
                "url": url,
                "source": clean_text(source.get("publisher")) or clean_text(source.get("name")),
                "published_at": published.isoformat(),
                "source_priority": int(source.get("priority") or 0),
            })
    return stories


def fetch_source(source: dict, timeout: int) -> tuple[list[dict], str | None]:
    try:
        request = Request(source["url"], headers={"User-Agent": USER_AGENT, "Accept": "application/rss+xml"})
        with urlopen(request, timeout=timeout) as response:
            return parse_feed(response.read(), source), None
    except (HTTPError, URLError, TimeoutError, ElementTree.ParseError, ValueError) as exc:
        return [], f"{source.get('name')}: {type(exc).__name__}: {exc}"


def title_tokens(value: object) -> set[str]:
    stopwords = {"the", "and", "for", "with", "from", "that", "this", "into", "after", "austin", "texas"}
    return {word for word in re.findall(r"[a-z0-9]+", clean_text(value).lower()) if len(word) > 2 and word not in stopwords}


def title_similarity(left: object, right: object) -> float:
    a, b = title_tokens(left), title_tokens(right)
    return len(a & b) / len(a | b) if a and b else 0.0


def qualifies(story: dict) -> bool:
    headline = clean_text(story.get("headline"))
    context = clean_text(story.get("context"))
    text = f"{headline} {context}"
    if not headline or not normalize_url(story.get("url")) or len(context) < 45:
        return False
    if not LOCATION.search(text) or not BUSINESS.search(text) or not (MATERIAL.search(text) or MONEY.search(text)):
        return False
    if EXCLUDED.search(text):
        return False
    if EDUCATION.search(headline) and not EDUCATION_PROJECT.search(headline):
        return False
    return True


def story_score(story: dict, now: datetime, retained: bool = False) -> float:
    text = f"{clean_text(story.get('headline'))} {clean_text(story.get('context'))}"
    published = parse_datetime(story.get("published_at")) or now
    age_hours = max(0.0, (now - published).total_seconds() / 3600)
    score = float(story.get("source_priority") or 0)
    score += 3 if LOCATION.search(clean_text(story.get("headline"))) else 1
    score += min(4, len({match.lower() for match in MATERIAL.findall(text)}))
    score += 2 if MONEY.search(text) else 0
    score += max(0, 2 - age_hours / 24)
    score += 1.5 if retained else 0
    return round(score, 3)


def read_existing(path: Path = DEFAULT_OUTPUT) -> list[dict]:
    if not path.exists():
        return []
    try:
        payload = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError):
        return []
    return payload.get("stories", []) if isinstance(payload, dict) else []


def select_stories(
    candidates: Iterable[dict],
    existing: Iterable[dict],
    now: datetime,
    window_hours: int = 48,
    limit: int = 3,
) -> list[dict]:
    cutoff = now - timedelta(hours=window_hours)
    existing_by_url = {normalize_url(item.get("url")): dict(item) for item in existing if normalize_url(item.get("url"))}
    combined: dict[str, dict] = {}

    for raw in [*existing, *candidates]:
        story = dict(raw)
        url = normalize_url(story.get("url"))
        published = parse_datetime(story.get("published_at"))
        if not url or not published or published < cutoff or published > now + timedelta(hours=2):
            continue
        story["url"] = url
        if not qualifies(story):
            continue
        previous = existing_by_url.get(url)
        if previous:
            story["first_seen_at"] = clean_text(previous.get("first_seen_at")) or now.isoformat()
        else:
            story["first_seen_at"] = clean_text(story.get("first_seen_at")) or now.isoformat()
        story["last_seen_at"] = now.isoformat()
        story["score"] = story_score(story, now, retained=previous is not None)
        combined[url] = story

    ranked = sorted(
        combined.values(),
        key=lambda item: (float(item.get("score") or 0), clean_text(item.get("published_at"))),
        reverse=True,
    )
    selected: list[dict] = []
    for story in ranked:
        if any(title_similarity(story.get("headline"), item.get("headline")) >= 0.5 for item in selected):
            continue
        selected.append({
            key: story[key] for key in (
                "headline", "context", "url", "source", "published_at",
                "first_seen_at", "last_seen_at", "score",
            ) if key in story
        })
        if len(selected) == limit:
            break
    return selected


def update(config_path: Path, output_path: Path, now: datetime | None = None) -> dict:
    config = json.loads(config_path.read_text(encoding="utf-8"))
    current_time = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    timeout = int(config.get("request_timeout_seconds") or 20)
    candidates: list[dict] = []
    errors: list[str] = []
    for source in config.get("sources", []):
        stories, error = fetch_source(source, timeout)
        candidates.extend(stories)
        if error:
            errors.append(error)
    selected = select_stories(
        candidates,
        read_existing(output_path),
        current_time,
        window_hours=int(config.get("window_hours") or 48),
    )
    payload = {
        "generated_at": current_time.isoformat(),
        "window_hours": int(config.get("window_hours") or 48),
        "stories": selected,
        "source_status": {
            "configured": len(config.get("sources", [])),
            "successful": len(config.get("sources", [])) - len(errors),
            "errors": errors,
        },
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return payload


def main() -> None:
    parser = argparse.ArgumentParser(description="Refresh the independent Austin Global Business Brief.")
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    payload = update(args.config, args.output)
    print(
        f"Austin Business Brief: {len(payload['stories'])} selected; "
        f"{payload['source_status']['successful']}/{payload['source_status']['configured']} sources available"
    )
    for story in payload["stories"]:
        print(f"- {story['source']}: {story['headline']}")


if __name__ == "__main__":
    main()
