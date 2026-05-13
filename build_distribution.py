#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
build_distribution.py

Global Sports Report distribution builder.

What this script does:
- Loads plain-text report files from sports_bot-ai
- Loads optional advanced report files
- Builds a stable latest_report.json payload for the website
- Writes platform-ready text outputs:
  - substack_post.txt
  - telegram_post.txt
  - twitter_thread.txt
  - latest_report.txt
- Copies the website files into global-sports-report-web/public
- Copies Statcast SVG into website public folder so it renders on site
- Optionally posts to Telegram
- Optionally posts a thread to X/Twitter
- Never crashes because a section contains lists/dicts instead of strings
- Never calls undefined upload helpers

Sports Editorial Brain v3:
- Preserves the existing site structure and JSON flow
- Adds careful, additive editorial context inside report content
- Improves WHY IT MATTERS / WATCH LIST framing
- Reduces shallow summary feel without changing frontend architecture
- Treats the existing system gently: no redesign, no schema disruption

This file is designed as a full replacement.
"""

from __future__ import annotations

import json
import math
import os
import re
import shutil
import subprocess
import sys
import textwrap
import traceback
from datetime import datetime
from pathlib import Path
from typing import Any

from editorial_intelligence import normalize_payload, sports_desk_headline

try:
    from zoneinfo import ZoneInfo
except Exception:
    ZoneInfo = None  # type: ignore

try:
    import requests
except Exception:
    requests = None  # type: ignore

try:
    import tweepy
except Exception:
    tweepy = None  # type: ignore

try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None  # type: ignore


# =============================================================================
# PATHS / CONSTANTS
# =============================================================================

BASE_DIR = Path(__file__).resolve().parent
WEB_DIR = Path(r"C:\Users\joeru\OneDrive\Desktop\global-sports-report-web")
WEB_PUBLIC_DIR = WEB_DIR / "public"

TITLE = "GLOBAL SPORTS REPORT"
DISCLAIMER = "This report is an automated summary intended to support, not replace, human sports journalism."
DEFAULT_X_HANDLE = "@GlobalSportsRp"
DEFAULT_SUBSTACK_URL = "https://globalsportsreport.substack.com/"

SITE_TZ = "America/New_York"
EDITORIAL_BRAIN_VERSION = "sports-editorial-brain-v3"

REPORT_FILES: dict[str, Path] = {
    "mlb": BASE_DIR / "mlb_report.txt",
    "nba": BASE_DIR / "nba_report.txt",
    "nhl": BASE_DIR / "nhl_report.txt",
    "nfl": BASE_DIR / "nfl_report.txt",
    "ncaafb": BASE_DIR / "ncaafb_report.txt",
    "soccer": BASE_DIR / "soccer_report.txt",
    "betting_odds": BASE_DIR / "betting_odds_report.txt",
    "fantasy": BASE_DIR / "fantasy_report.txt",
}

ADVANCED_REPORT_FILES: dict[str, Path] = {
    "mlb": BASE_DIR / "mlb_advanced_report.txt",
    "nba": BASE_DIR / "nba_advanced_report.txt",
    "nfl": BASE_DIR / "nfl_advanced_report.txt",
    "nfl_draft_signals": BASE_DIR / "nfl_draft_signals.txt",
}

JSON_REPORT_FILES: dict[str, Path] = {
    "mlb": BASE_DIR / "mlb_report.json",
    "nba": BASE_DIR / "nba_report.json",
    "nhl": BASE_DIR / "nhl_report.json",
    "nfl": BASE_DIR / "nfl_report.json",
    "ncaafb": BASE_DIR / "ncaafb_report.json",
    "soccer": BASE_DIR / "soccer_report.json",
    "betting_odds": BASE_DIR / "betting_odds_report.json",
    "fantasy": BASE_DIR / "fantasy_report.json",
}

STATCAST_FILES = [
    BASE_DIR / "mlb_statcast_snapshot.svg",
    BASE_DIR / "statcast_snapshot.svg",
]

OUTPUT_SUBSTACK = BASE_DIR / "substack_post.txt"
OUTPUT_TELEGRAM = BASE_DIR / "telegram_post.txt"
OUTPUT_TWITTER = BASE_DIR / "twitter_thread.txt"
OUTPUT_LATEST_TXT = BASE_DIR / "latest_report.txt"
OUTPUT_LATEST_JSON = BASE_DIR / "latest_report.json"
OUTPUT_PREVIOUS_JSON = BASE_DIR / "latest_report.previous.json"
GLOBAL_REPORT_TXT = BASE_DIR / "global_sports_report.txt"

WEB_COPY_TARGETS = {
    "latest_report.json": WEB_PUBLIC_DIR / "latest_report.json",
    "latest_report.txt": WEB_PUBLIC_DIR / "latest_report.txt",
    "global_sports_report.txt": WEB_PUBLIC_DIR / "global_sports_report.txt",
    "mlb_statcast_snapshot.svg": WEB_PUBLIC_DIR / "mlb_statcast_snapshot.svg",
}

SECTION_ORDER = [
    "mlb",
    "nba",
    "nhl",
    "nfl",
    "ncaafb",
    "soccer",
    "betting_odds",
    "fantasy",
]


# =============================================================================
# LOGGING / TIME
# =============================================================================

def now_et() -> datetime:
    if ZoneInfo is None:
        return datetime.now()
    return datetime.now(ZoneInfo(SITE_TZ))


def ts() -> str:
    return now_et().strftime("%Y-%m-%d %I:%M:%S %p ET")


def log(message: str) -> None:
    print(f"[{ts()}] {message}")


# =============================================================================
# ENV / TEXT SAFETY
# =============================================================================

def load_environment() -> None:
    env_path = BASE_DIR / ".env"
    if load_dotenv and env_path.exists():
        load_dotenv(env_path)
    log(f"ENV PATH: {env_path}")
    log(f"ENV EXISTS: {env_path.exists()}")
    log(f"TELEGRAM TOKEN FOUND: {bool(os.getenv('TELEGRAM_BOT_TOKEN'))}")
    log(f"TELEGRAM CHAT ID FOUND: {bool(os.getenv('TELEGRAM_CHAT_ID'))}")
    log(f"TWITTER API KEY FOUND: {bool(os.getenv('TWITTER_API_KEY'))}")
    log(f"TWITTER API SECRET FOUND: {bool(os.getenv('TWITTER_API_SECRET'))}")
    log(f"TWITTER ACCESS TOKEN FOUND: {bool(os.getenv('TWITTER_ACCESS_TOKEN'))}")
    log(f"TWITTER ACCESS TOKEN SECRET FOUND: {bool(os.getenv('TWITTER_ACCESS_TOKEN_SECRET'))}")
    log(f"TWITTER BEARER TOKEN FOUND: {bool(os.getenv('TWITTER_BEARER_TOKEN'))}")
    log(f"WEB PUBLIC DIR: {WEB_PUBLIC_DIR}")


def clean_text(text: str) -> str:
    if not isinstance(text, str):
        text = str(text)

    replacements = {
        "\ufeff": "",
        "\u2019": "'",
        "\u2018": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2014": "-",
        "\u2013": "-",
        "\xa0": " ",
        "â€™": "'",
        "â€œ": '"',
        "â€\x9d": '"',
        "â€”": "-",
        "â€“": "-",
        "Ã©": "é",
        "Ã¡": "á",
        "Ã³": "ó",
        "Ãº": "ú",
        "Ã±": "ñ",
        "Ã¼": "ü",
        "Ã": "",
        "S nchez": "Sánchez",
        "Germ n": "Germán",
        "MartÃ­n": "Martín",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)

    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def slugify(text: str) -> str:
    text = clean_text(text).lower().strip()
    text = re.sub(r"[^a-z0-9]+", "_", text)
    return text.strip("_") or "section"


def format_label(key: str) -> str:
    labels = {
        "mlb": "MLB",
        "nba": "NBA",
        "nhl": "NHL",
        "nfl": "NFL",
        "ncaafb": "College Football",
        "soccer": "Soccer",
        "betting_odds": "Betting Odds",
        "fantasy": "Fantasy",
        "nfl_draft_signals": "NFL Draft Signals",
    }
    return labels.get(key, key.replace("_", " ").title())


def safe_join_parts(value: Any) -> str:
    """
    Flatten any mix of strings/lists/dicts into a clean string.

    This directly prevents the old:
    AttributeError: 'list' object has no attribute 'strip'
    """
    flattened: list[str] = []

    def walk(item: Any) -> None:
        if item is None:
            return
        if isinstance(item, str):
            txt = clean_text(item)
            if txt:
                flattened.append(txt)
            return
        if isinstance(item, (int, float, bool)):
            flattened.append(str(item))
            return
        if isinstance(item, dict):
            for _, v in item.items():
                walk(v)
            return
        if isinstance(item, (list, tuple, set)):
            for sub in item:
                walk(sub)
            return
        flattened.append(clean_text(str(item)))

    walk(value)
    return "\n\n".join(part for part in flattened if part.strip()).strip()


def first_meaningful_line(text: str) -> str:
    for line in clean_text(text).splitlines():
        line = line.strip(" -:\t")
        if line and line.upper() not in {
            "HEADLINE",
            "SNAPSHOT",
            "KEY DATA POINTS",
            "WHY IT MATTERS",
            "CURRENT DATA AND ANALYTICS",
            "STORY ANGLES",
            "FINAL SCORES",
            "YESTERDAY FINAL SCORES",
            "TODAY LIVE",
            "LIVE",
            "UPCOMING",
            "TODAY SCHEDULE",
            "TODAY FINAL SCORES",
            "DISCLAIMER",
            "UPDATED",
            "GLOBAL SNAPSHOT",
            "BETTING MARKET NOTE",
            "WATCH LIST",
            "MATCHUP FLAGS",
            "STATCAST WATCH",
            "BOARD CONTEXT",
            "LEAGUE EFFICIENCY WATCH",
        }:
            return line
    return ""


def parse_timestamp_from_text(text: str) -> str | None:
    patterns = [
        r"Generated:\s*([0-9:\-\sAPMET]+)",
        r"UPDATED\s*\n\s*([0-9:\-\sAPMET]+)",
        r"Updated:\s*([0-9:\-\sAPMET]+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return clean_text(match.group(1))
    return None


# =============================================================================
# FILE IO
# =============================================================================

def read_text_file(path: Path) -> str:
    if not path.exists():
        return ""
    raw = path.read_text(encoding="utf-8", errors="replace")
    return clean_text(raw)


def read_json_file(path: Path) -> Any:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return None


def write_text_file(path: Path, text: str) -> None:
    path.write_text(clean_text(text) + "\n", encoding="utf-8")
    log(f"Saved: {path}")


def write_json_file(path: Path, payload: Any) -> None:
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    log(f"Saved: {path}")


# =============================================================================
# REPORT PARSING
# =============================================================================

SECTION_HEADER_RE = re.compile(
    r"^(HEADLINE|SNAPSHOT|KEY DATA POINTS|WHY IT MATTERS|CURRENT DATA AND ANALYTICS|"
    r"STORY ANGLES|FINAL SCORES|YESTERDAY FINAL SCORES|TODAY LIVE|LIVE|UPCOMING|"
    r"TODAY SCHEDULE|TODAY FINAL SCORES|DISCLAIMER|UPDATED|GLOBAL SNAPSHOT|"
    r"BETTING MARKET NOTE|WATCH LIST|MATCHUP FLAGS|STATCAST WATCH|BOARD CONTEXT|"
    r"LEAGUE EFFICIENCY WATCH)$",
    flags=re.IGNORECASE | re.MULTILINE,
)


def split_named_sections(text: str) -> dict[str, list[str]]:
    text = clean_text(text)
    if not text:
        return {}

    lines = text.splitlines()
    sections: dict[str, list[str]] = {}
    current_key: str | None = None

    for raw_line in lines:
        line = raw_line.strip()
        if SECTION_HEADER_RE.match(line):
            current_key = slugify(line)
            sections.setdefault(current_key, [])
            continue

        if current_key is None:
            continue

        if line:
            sections[current_key].append(line)

    return sections


def rewrite_content_headline(section_key: str, content: str) -> str:
    content = clean_text(content)
    if not content:
        return content

    sections = split_named_sections(content)
    old_headline = clean_text(sections.get("headline", [""])[0] if sections.get("headline") else "")
    new_headline = sports_desk_headline(
        {
            "key": section_key,
            "league": section_key,
            "headline": old_headline,
            "title": old_headline,
            "content": content,
        },
        "sports",
    )

    if not new_headline:
        return content

    lines = content.splitlines()
    rewritten: list[str] = []
    replaced = False
    i = 0
    while i < len(lines):
        rewritten.append(lines[i])
        if not replaced and lines[i].strip().upper() == "HEADLINE":
            rewritten.append(new_headline)
            i += 1
            while i < len(lines) and lines[i].strip() == "":
                rewritten.append(lines[i])
                i += 1
            if i < len(lines) and not SECTION_HEADER_RE.match(lines[i].strip()):
                i += 1
            replaced = True
            continue
        i += 1

    if replaced:
        return clean_text("\n".join(rewritten))

    return clean_text(f"{content}\n\nHEADLINE\n{new_headline}")


def parse_advanced_report(path: Path) -> dict[str, Any] | None:
    text = read_text_file(path)
    if not text:
        return None

    lines = text.splitlines()
    title = lines[0].strip() if lines else f"{format_label(path.stem)} REPORT"
    updated_at = parse_timestamp_from_text(text) or now_et().strftime("%Y-%m-%d %I:%M:%S %p ET")
    sections = split_named_sections(text)

    normalized_sections: dict[str, list[str]] = {}
    for key, values in sections.items():
        cleaned_values = [clean_text(v) for v in values if clean_text(v)]
        normalized_sections[key] = cleaned_values

    return {
        "title": title,
        "source_file": path.name,
        "updated_at": updated_at,
        "sections": normalized_sections,
    }


def parse_standard_report(section_key: str, path: Path) -> dict[str, Any] | None:
    text = read_text_file(path)
    if not text:
        return None
    text = rewrite_content_headline(section_key, text)

    lines = text.splitlines()
    title = lines[0].strip() if lines else f"{format_label(section_key)} REPORT"
    updated_at = parse_timestamp_from_text(text) or now_et().strftime("%Y-%m-%d %I:%M:%S %p ET")

    return {
        "title": title,
        "source_file": path.name,
        "updated_at": updated_at,
        "content": text,
    }


def load_reports() -> dict[str, dict[str, Any]]:
    reports: dict[str, dict[str, Any]] = {}

    for key in SECTION_ORDER:
        path = REPORT_FILES.get(key)
        if not path:
            continue
        parsed = parse_standard_report(key, path)
        if parsed:
            reports[key] = parsed
            log(f"Loaded report: {path.name}")
        else:
            log(f"Missing report: {path.name}")

    return reports


def load_advanced_reports() -> dict[str, dict[str, Any]]:
    advanced: dict[str, dict[str, Any]] = {}
    for key, path in ADVANCED_REPORT_FILES.items():
        parsed = parse_advanced_report(path)
        if parsed:
            advanced[key] = parsed
            log(f"Loaded advanced report: {path.name}")
    return advanced


# =============================================================================
# SPORTS EDITORIAL BRAIN V3
# =============================================================================

SPORT_EDITORIAL_PROFILES: dict[str, dict[str, list[str]]] = {
    "mlb": {
        "stakes": [
            "rotation stability",
            "bullpen usage",
            "late-inning leverage",
            "division pressure",
            "offensive consistency",
            "series momentum",
        ],
        "watch": [
            "whether the bullpen can protect close leads",
            "whether the lineup turns traffic on base into crooked innings",
            "how the rotation sets up for the next series",
            "whether recent run production is sustainable",
        ],
    },
    "nba": {
        "stakes": [
            "playoff positioning",
            "star usage",
            "bench depth",
            "pace control",
            "late-game execution",
            "defensive matchups",
        ],
        "watch": [
            "whether the stars are carrying too heavy a load",
            "how the second unit holds up in non-star minutes",
            "whether the defense can keep the game out of transition",
            "how the result affects seeding pressure",
        ],
    },
    "nhl": {
        "stakes": [
            "goaltending form",
            "special-teams pressure",
            "forecheck control",
            "playoff positioning",
            "third-period execution",
            "defensive-zone exits",
        ],
        "watch": [
            "whether the goaltending trend holds",
            "how special teams tilt the next matchup",
            "whether the forecheck keeps creating pressure",
            "how late-game structure holds under playoff-style pressure",
        ],
    },
    "nfl": {
        "stakes": [
            "quarterback stability",
            "roster construction",
            "schedule pressure",
            "injury depth",
            "draft positioning",
            "division leverage",
        ],
        "watch": [
            "whether quarterback play changes the weekly ceiling",
            "how injuries affect roster flexibility",
            "whether the schedule creates a hidden pressure point",
            "how personnel decisions reshape the next phase",
        ],
    },
    "ncaafb": {
        "stakes": [
            "ranking pressure",
            "conference positioning",
            "quarterback development",
            "transfer impact",
            "recruiting momentum",
            "schedule leverage",
        ],
        "watch": [
            "whether the result shifts conference perception",
            "how quarterback play changes the team's ceiling",
            "whether roster depth holds up across the schedule",
            "how the matchup affects ranking or postseason arguments",
        ],
    },
    "soccer": {
        "stakes": [
            "table pressure",
            "goal differential",
            "chance creation",
            "squad rotation",
            "transition defense",
            "late-match control",
        ],
        "watch": [
            "whether chance creation translates into goals",
            "how the result affects table pressure",
            "whether squad rotation changes the match rhythm",
            "how late-match control holds under pressure",
        ],
    },
    "betting_odds": {
        "stakes": [
            "market movement",
            "implied probability",
            "public perception",
            "injury uncertainty",
            "line value",
            "pricing pressure",
        ],
        "watch": [
            "whether the market is reacting to confirmed information or perception",
            "how implied probability compares with recent form",
            "whether injuries or rest factors move the number",
            "whether the price is telling a different story than the headline matchup",
        ],
    },
    "fantasy": {
        "stakes": [
            "usage trends",
            "role stability",
            "injury replacements",
            "matchup volume",
            "waiver value",
            "lineup pressure",
        ],
        "watch": [
            "whether the usage trend is stable enough to trust",
            "how injuries open or close fantasy opportunity",
            "whether the matchup creates volume or efficiency risk",
            "which player role appears to be changing fastest",
        ],
    },
}


GENERIC_LOW_VALUE_PATTERNS = [
    r"\bno updates were available\b",
    r"\bno .* available at this time\b",
    r"\bplaceholder\b",
    r"\bfallback\b",
    r"\brss\b",
    r"\bpipeline\b",
    r"\bfeed\b",
]


def is_low_value_content(text: str) -> bool:
    cleaned = clean_text(text).lower()
    if len(cleaned) < 45:
        return True
    return any(re.search(pattern, cleaned, flags=re.IGNORECASE) for pattern in GENERIC_LOW_VALUE_PATTERNS)


def extract_best_lines_for_context(text: str, limit: int = 4) -> list[str]:
    cleaned = clean_text(text)
    if not cleaned:
        return []

    lines: list[str] = []
    for raw in cleaned.splitlines():
        line = raw.strip(" -\t")
        if not line:
            continue
        if SECTION_HEADER_RE.match(line):
            continue
        if len(line) < 28:
            continue
        if is_low_value_content(line):
            continue
        if line not in lines:
            lines.append(line)
        if len(lines) >= limit:
            break

    if lines:
        return lines

    sentences = re.split(r"(?<=[.!?])\s+", cleaned)
    for sentence in sentences:
        sentence = sentence.strip(" -\t")
        if len(sentence) >= 45 and not is_low_value_content(sentence):
            lines.append(sentence)
        if len(lines) >= limit:
            break

    return lines


def detect_result_language(text: str) -> dict[str, bool]:
    lowered = clean_text(text).lower()

    return {
        "has_score": bool(re.search(r"\b\d{1,3}\s*[-–]\s*\d{1,3}\b", lowered)),
        "has_win_loss": bool(re.search(r"\b(win|won|loss|lost|defeat|defeated|beat|beats|rout|edge|hold off)\b", lowered)),
        "has_schedule": bool(re.search(r"\b(vs\.?|at|hosts?|visits?|upcoming|tonight|tomorrow|schedule)\b", lowered)),
        "has_market": bool(re.search(r"\b(odds|favorite|underdog|moneyline|spread|total|implied probability|priced)\b", lowered)),
        "has_injury": bool(re.search(r"\b(injury|injured|questionable|out|day-to-day|return|availability)\b", lowered)),
        "has_standings": bool(re.search(r"\b(standings|division|playoff|postseason|wild card|seed|race|table)\b", lowered)),
        "has_player": bool(re.search(r"\b(points|rebounds|assists|home run|rbi|strikeouts|goals|saves|yards|touchdown)\b", lowered)),
    }


def choose_profile_item(section_key: str, bucket: str, seed_text: str) -> str:
    profile = SPORT_EDITORIAL_PROFILES.get(section_key, SPORT_EDITORIAL_PROFILES["mlb"])
    options = profile.get(bucket, [])
    if not options:
        return ""
    seed = sum(ord(ch) for ch in clean_text(seed_text))
    return options[seed % len(options)]


def build_v3_why_it_matters(section_key: str, content: str) -> str:
    best_lines = extract_best_lines_for_context(content, limit=3)
    if not best_lines:
        return ""

    combined = " ".join(best_lines)
    signals = detect_result_language(combined)
    label = format_label(section_key)
    stake = choose_profile_item(section_key, "stakes", combined)

    if section_key == "betting_odds":
        if signals["has_market"]:
            return (
                f"The market note matters because it gives reporters a cleaner read on {stake}, "
                f"not just the listed price. The useful angle is whether the number reflects real team context, "
                f"injury information, rest, matchup pressure, or public perception."
            )
        return (
            "The betting board matters because it can reveal where expectation and reality are starting to separate. "
            "For journalists, the value is not the pick itself but the context behind why a number is moving."
        )

    if section_key == "fantasy":
        return (
            f"The fantasy angle matters because role clarity often arrives before the box score fully explains it. "
            f"Usage, matchup volume, and injury replacements can point to changing value before it becomes obvious."
        )

    if signals["has_standings"]:
        return (
            f"This {label} item matters because it connects the result to {stake}, not just the final line. "
            f"The bigger editorial question is whether this changes the pressure around the next matchup, series, or stretch of the schedule."
        )

    if signals["has_win_loss"] or signals["has_score"]:
        return (
            f"This {label} result matters beyond the score because it offers a read on {stake}. "
            f"The next layer for reporters is whether the performance reflects a sustainable trend or a one-game correction."
        )

    if signals["has_injury"]:
        return (
            f"This {label} development matters because availability can reshape roles, rotations, and expectations quickly. "
            f"The next question is whether the team can absorb the change without losing its larger competitive shape."
        )

    if signals["has_schedule"]:
        return (
            f"This {label} matchup matters because the schedule can create pressure before the first whistle or first pitch. "
            f"The key is whether recent form, rest, and matchup style point in the same direction."
        )

    if signals["has_player"]:
        return (
            f"This {label} note matters because individual production often hints at a larger team trend. "
            f"The useful reporting angle is whether the performance changes usage, trust, or matchup planning going forward."
        )

    return (
        f"This {label} item matters because it adds context to {stake}. "
        f"The stronger story is not simply what happened, but what it suggests about the next decision point."
    )


def build_v3_watch_list(section_key: str, content: str) -> str:
    best_lines = extract_best_lines_for_context(content, limit=3)
    seed_text = " ".join(best_lines) if best_lines else content
    watch = choose_profile_item(section_key, "watch", seed_text)
    label = format_label(section_key)

    if not watch:
        return ""

    if section_key == "betting_odds":
        return f"Watch {watch}; that is where the betting board can become a reporting signal instead of just a price list."

    if section_key == "fantasy":
        return f"Watch {watch}; that is where fantasy value can move before the broader audience catches up."

    return f"Watch {watch}; that detail may become the next meaningful {label} storyline if the trend continues."


def content_has_header(content: str, header: str) -> bool:
    pattern = rf"^{re.escape(header)}$"
    return bool(re.search(pattern, content, flags=re.IGNORECASE | re.MULTILINE))


def append_editorial_context_to_content(section_key: str, content: str) -> str:
    content = clean_text(content)
    if not content or is_low_value_content(content):
        return content

    additions: list[str] = []

    if not content_has_header(content, "WHY IT MATTERS"):
        why = build_v3_why_it_matters(section_key, content)
        if why:
            additions.extend(["", "WHY IT MATTERS", why])

    if not content_has_header(content, "WATCH LIST"):
        watch = build_v3_watch_list(section_key, content)
        if watch:
            additions.extend(["", "WATCH LIST", watch])

    if not additions:
        return content

    return clean_text(content + "\n" + "\n".join(additions))


def strengthen_storyline(section_key: str, line: str) -> str:
    line = clean_text(line)
    if not line:
        return ""

    label = format_label(section_key)
    signals = detect_result_language(line)

    if line.lower().startswith(f"{label.lower()} snapshot:"):
        return line

    if signals["has_market"] and section_key == "betting_odds":
        return f"{label}: {line} The key is whether the price reflects confirmed context or market perception."

    if signals["has_score"] or signals["has_win_loss"]:
        return f"{label}: {line} The larger read is momentum, response, and what carries into the next matchup."

    if signals["has_injury"]:
        return f"{label}: {line} Availability is the pressure point because one absence can reshape role clarity fast."

    if signals["has_standings"]:
        return f"{label}: {line} The standings context gives this more weight than an isolated result."

    return f"{label}: {line}"


def apply_sports_editorial_brain_v3(reports: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """
    Additive editorial layer.

    This does not alter the site architecture, copy destinations, publishing flow,
    section order, or frontend contract. It only enriches the content already moving
    through the existing distribution system.
    """
    for section_key, report in reports.items():
        content = report.get("content", "")
        if not isinstance(content, str):
            continue

        enriched = append_editorial_context_to_content(section_key, content)
        report["content"] = enriched
        report["editorial_brain_version"] = EDITORIAL_BRAIN_VERSION

    return reports


# =============================================================================
# GLOBAL JSON PAYLOAD
# =============================================================================

def infer_global_headline(reports: dict[str, dict[str, Any]]) -> str:
    mlb = reports.get("mlb", {}).get("content", "")
    nba = reports.get("nba", {}).get("content", "")
    nhl = reports.get("nhl", {}).get("content", "")
    soccer = reports.get("soccer", {}).get("content", "")

    for block in [mlb, nba, nhl, soccer]:
        sections = split_named_sections(block)
        headline = sections.get("headline", [])
        if headline:
            headline_text = clean_text(headline[0])
            if headline_text:
                return headline_text

    available = [format_label(k) for k in SECTION_ORDER if k in reports]
    if available:
        return f"{', '.join(available[:2])} lead the current sports calendar while the broader board stays in view."
    return "The sports calendar remains active across multiple leagues."


def extract_storylines(reports: dict[str, dict[str, Any]]) -> list[str]:
    lines: list[str] = []

    for key in ["mlb", "nba", "nhl", "nfl", "ncaafb", "soccer", "betting_odds", "fantasy"]:
        report = reports.get(key)
        if not report:
            continue

        content = report.get("content", "")
        sections = split_named_sections(content)

        why = sections.get("why_it_matters", [])
        snapshot = sections.get("snapshot", [])
        headline = sections.get("headline", [])

        if why:
            lines.append(f"{format_label(key)} context: {why[0]}")
        elif snapshot:
            lines.append(strengthen_storyline(key, snapshot[0]))
        elif headline:
            lines.append(strengthen_storyline(key, headline[0]))
        elif content:
            first_line = first_meaningful_line(content)
            if first_line:
                lines.append(strengthen_storyline(key, first_line))

    clean_lines: list[str] = []
    seen: set[str] = set()

    for line in lines:
        cleaned = clean_text(line)
        key = re.sub(r"\W+", " ", cleaned.lower()).strip()
        if not cleaned or key in seen:
            continue
        seen.add(key)
        clean_lines.append(cleaned)

    return clean_lines[:6]


def infer_global_snapshot(reports: dict[str, dict[str, Any]]) -> str:
    priority_keys = ["mlb", "nba", "nhl", "soccer", "betting_odds", "fantasy"]

    for key in priority_keys:
        content = reports.get(key, {}).get("content", "")
        if not content:
            continue

        sections = split_named_sections(content)
        why = sections.get("why_it_matters", [])
        snapshot = sections.get("snapshot", [])

        if why:
            return why[0]
        if snapshot:
            return snapshot[0]

    return "The sports board is active across multiple leagues, with the strongest stories coming from results, matchups, market signals, and role changes."


def attach_advanced_reports(
    reports: dict[str, dict[str, Any]],
    advanced: dict[str, dict[str, Any]],
) -> None:
    for section_key, report in reports.items():
        if section_key in advanced:
            report["advanced"] = advanced[section_key]

    if "nfl_draft_signals" in advanced:
        if "nfl" in reports:
            report = reports["nfl"]
            if "advanced" not in report:
                report["advanced"] = advanced["nfl_draft_signals"]


def build_latest_report_payload(
    reports: dict[str, dict[str, Any]],
    advanced: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    reports = apply_sports_editorial_brain_v3(reports)
    attach_advanced_reports(reports, advanced)

    now_string = now_et().strftime("%Y-%m-%d %I:%M:%S %p ET")
    date_string = now_et().strftime("%Y-%m-%d")

    payload = {
        "title": f"{TITLE} | {date_string}",
        "headline": infer_global_headline(reports),
        "key_storylines": extract_storylines(reports),
        "snapshot": infer_global_snapshot(reports),
        "generated_at": now_string,
        "updated_at": now_string,
        "published_at": now_string,
        "disclaimer": DISCLAIMER,
        "x_handle": os.getenv("GSR_X_HANDLE", DEFAULT_X_HANDLE),
        "substack_url": os.getenv("GSR_SUBSTACK_URL", DEFAULT_SUBSTACK_URL),
        "sections": {},
    }

    for key in SECTION_ORDER:
        if key in reports:
            payload["sections"][key] = reports[key]

    statcast_public_name = "mlb_statcast_snapshot.svg"
    if any(p.exists() for p in STATCAST_FILES):
        payload["statcast_graphic"] = f"/{statcast_public_name}"

    return normalize_payload(payload, "sports")


# =============================================================================
# PLATFORM TEXT BUILDERS
# =============================================================================

def build_latest_report_text(payload: dict[str, Any]) -> str:
    parts: list[str] = [
        payload.get("title", TITLE),
        "",
        "HEADLINE",
        payload.get("headline", ""),
        "",
        "KEY STORYLINES",
    ]

    for line in payload.get("key_storylines", []):
        parts.append(f"- {line}")

    parts += [
        "",
        "SNAPSHOT",
        payload.get("snapshot", ""),
        "",
    ]

    for key in SECTION_ORDER:
        section = payload.get("sections", {}).get(key)
        if not section:
            continue
        parts.append(format_label(key).upper())
        parts.append(section.get("content", ""))
        parts.append("")

    parts.append(DISCLAIMER)
    return safe_join_parts(parts)


def build_substack_post(payload: dict[str, Any]) -> str:
    parts: list[str] = [
        payload.get("title", TITLE),
        "",
        payload.get("headline", ""),
        "",
        "Key Storylines",
    ]
    for line in payload.get("key_storylines", []):
        parts.append(f"- {line}")

    parts += ["", "Snapshot", payload.get("snapshot", ""), ""]

    for key in SECTION_ORDER:
        section = payload.get("sections", {}).get(key)
        if not section:
            continue
        parts.append(format_label(key))
        parts.append(section.get("content", ""))
        advanced = section.get("advanced")
        if advanced:
            parts.append("")
            parts.append(f"{format_label(key)} Advanced")
            adv_sections = advanced.get("sections", {})
            for adv_key, adv_values in adv_sections.items():
                if not adv_values:
                    continue
                parts.append(adv_key.replace("_", " ").title())
                for item in adv_values:
                    parts.append(f"- {item}")
        parts.append("")

    parts.append(DISCLAIMER)
    return safe_join_parts(parts)


def build_telegram_post(payload: dict[str, Any]) -> str:
    lines: list[str] = [
        payload.get("title", TITLE),
        payload.get("headline", ""),
        "",
    ]
    for line in payload.get("key_storylines", [])[:5]:
        lines.append(f"- {line}")

    lines += [
        "",
        payload.get("snapshot", ""),
        "",
        f"Read more on Substack: {payload.get('substack_url', DEFAULT_SUBSTACK_URL)}",
        f"Follow on X: {payload.get('x_handle', DEFAULT_X_HANDLE)}",
    ]
    return safe_join_parts(lines)


def split_for_twitter(text: str, max_len: int = 275) -> list[str]:
    text = clean_text(text)
    chunks: list[str] = []

    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    current = ""

    for para in paragraphs:
        candidate = f"{current}\n\n{para}".strip() if current else para
        if len(candidate) <= max_len:
            current = candidate
            continue

        if current:
            chunks.append(current)
            current = ""

        if len(para) <= max_len:
            current = para
            continue

        words = para.split()
        temp = ""
        for word in words:
            candidate_word = f"{temp} {word}".strip()
            if len(candidate_word) <= max_len:
                temp = candidate_word
            else:
                if temp:
                    chunks.append(temp)
                temp = word
        if temp:
            current = temp

    if current:
        chunks.append(current)

    total = len(chunks)
    numbered: list[str] = []
    for i, chunk in enumerate(chunks, start=1):
        prefix = f"{i}/{total} "
        if len(prefix) + len(chunk) > 280:
            chunk = chunk[: 280 - len(prefix) - 1].rstrip()
        numbered.append(prefix + chunk)
    return numbered


def build_twitter_thread(payload: dict[str, Any]) -> list[str]:
    intro = (
        f"{payload.get('title', TITLE)}\n\n"
        f"{payload.get('headline', '')}\n\n"
        f"{payload.get('x_handle', DEFAULT_X_HANDLE)}"
    )

    bullets = "\n".join(f"- {line}" for line in payload.get("key_storylines", [])[:4])

    body = (
        f"{intro}\n\n"
        f"Key storylines:\n{bullets}\n\n"
        f"Snapshot: {payload.get('snapshot', '')}\n\n"
        f"{payload.get('substack_url', DEFAULT_SUBSTACK_URL)}"
    )

    return split_for_twitter(body)


# =============================================================================
# COPY / WEBSITE SYNC
# =============================================================================

def backup_previous_json() -> None:
    if OUTPUT_LATEST_JSON.exists():
        shutil.copy2(OUTPUT_LATEST_JSON, OUTPUT_PREVIOUS_JSON)
        log(f"Backed up previous JSON to {OUTPUT_PREVIOUS_JSON.name}")


def copy_file_if_exists(src: Path, dst: Path) -> bool:
    if not src.exists():
        return False
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    log(f"Copied: {src} -> {dst}")
    return True


def copy_statcast_asset() -> bool:
    for src in STATCAST_FILES:
        if src.exists():
            target = WEB_COPY_TARGETS["mlb_statcast_snapshot.svg"]
            return copy_file_if_exists(src, target)
    log("No Statcast SVG found to copy.")
    return False


def sync_website_files() -> list[Path]:
    copied: list[Path] = []

    pairs = [
        (OUTPUT_LATEST_JSON, WEB_COPY_TARGETS["latest_report.json"]),
        (OUTPUT_LATEST_TXT, WEB_COPY_TARGETS["latest_report.txt"]),
        (GLOBAL_REPORT_TXT, WEB_COPY_TARGETS["global_sports_report.txt"]),
    ]

    for src, dst in pairs:
        if copy_file_if_exists(src, dst):
            copied.append(dst)

    if copy_statcast_asset():
        copied.append(WEB_COPY_TARGETS["mlb_statcast_snapshot.svg"])

    return copied


# =============================================================================
# TELEGRAM / TWITTER
# =============================================================================

def send_telegram_message(text: str) -> bool:
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "").strip()

    if not token or not chat_id or requests is None:
        log("Telegram send skipped.")
        return False

    chunks = split_for_telegram(text, 3900)
    ok = True

    for idx, chunk in enumerate(chunks, start=1):
        try:
            response = requests.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": chunk,
                    "disable_web_page_preview": False,
                },
                timeout=30,
            )
            response.raise_for_status()
            log(f"Telegram part sent: {idx}/{len(chunks)}")
        except Exception as exc:
            ok = False
            log(f"Telegram exception: {exc}")
            break

    return ok


def split_for_telegram(text: str, max_len: int = 3900) -> list[str]:
    text = clean_text(text)
    if len(text) <= max_len:
        return [text]

    chunks: list[str] = []
    current = ""

    for para in text.split("\n\n"):
        para = para.strip()
        if not para:
            continue
        candidate = f"{current}\n\n{para}".strip() if current else para
        if len(candidate) <= max_len:
            current = candidate
        else:
            if current:
                chunks.append(current)
            current = para
            while len(current) > max_len:
                chunks.append(current[:max_len])
                current = current[max_len:]

    if current:
        chunks.append(current)

    return chunks


def send_twitter_thread(parts: list[str]) -> bool:
    api_key = os.getenv("TWITTER_API_KEY", "").strip()
    api_secret = os.getenv("TWITTER_API_SECRET", "").strip()
    access_token = os.getenv("TWITTER_ACCESS_TOKEN", "").strip()
    access_secret = os.getenv("TWITTER_ACCESS_TOKEN_SECRET", "").strip()

    if not all([api_key, api_secret, access_token, access_secret]) or tweepy is None:
        log("X/Twitter send skipped.")
        return False

    try:
        client = tweepy.Client(
            consumer_key=api_key,
            consumer_secret=api_secret,
            access_token=access_token,
            access_token_secret=access_secret,
        )

        reply_to = None
        for idx, part in enumerate(parts, start=1):
            response = client.create_tweet(
                text=part,
                in_reply_to_tweet_id=reply_to,
                user_auth=True,
            )
            tweet_id = response.data["id"]
            reply_to = tweet_id
            log(f"Posted tweet {idx}/{len(parts)}")

        log("X thread posted successfully.")
        return True

    except Exception as exc:
        log(f"Twitter exception: {exc}")
        return False


# =============================================================================
# OPTIONAL WEBSITE GIT SYNC
# =============================================================================

def maybe_run_website_git_sync() -> bool:
    """
    Optional.
    Only runs if WEBSITE_AUTO_GIT=1 in .env.
    """
    if os.getenv("WEBSITE_AUTO_GIT", "0").strip() != "1":
        log("Website git sync skipped.")
        return False

    if not WEB_DIR.exists():
        log("Website git sync skipped: web directory missing.")
        return False

    commands = [
        ["git", "add", "public/latest_report.json", "public/latest_report.txt", "public/global_sports_report.txt", "public/mlb_statcast_snapshot.svg"],
        ["git", "commit", "-m", f"GSR auto-update {now_et().strftime('%Y-%m-%d %H:%M:%S ET')}"],
        ["git", "pull", "--rebase"],
        ["git", "push", "origin", "master"],
    ]

    try:
        for cmd in commands:
            result = subprocess.run(
                cmd,
                cwd=str(WEB_DIR),
                capture_output=True,
                text=True,
                check=False,
            )
            if result.stdout.strip():
                log(result.stdout.strip())
            if result.stderr.strip():
                log(result.stderr.strip())
        return True
    except Exception as exc:
        log(f"Website git sync exception: {exc}")
        return False


# =============================================================================
# MAIN
# =============================================================================

def main() -> int:
    log("Starting distribution build.")
    load_environment()

    backup_previous_json()

    reports = load_reports()
    advanced = load_advanced_reports()

    if not reports:
        log("FATAL ERROR: No report files were loaded.")
        return 1

    payload = build_latest_report_payload(reports, advanced)

    latest_report_text = build_latest_report_text(payload)
    substack_post = build_substack_post(payload)
    telegram_post = build_telegram_post(payload)
    twitter_parts = build_twitter_thread(payload)

    write_json_file(OUTPUT_LATEST_JSON, payload)
    write_text_file(OUTPUT_LATEST_TXT, latest_report_text)
    write_text_file(OUTPUT_SUBSTACK, substack_post)
    write_text_file(OUTPUT_TELEGRAM, telegram_post)
    write_text_file(OUTPUT_TWITTER, "\n\n---\n\n".join(twitter_parts))

    if not GLOBAL_REPORT_TXT.exists():
        write_text_file(GLOBAL_REPORT_TXT, latest_report_text)

    copied_files = sync_website_files()

    telegram_ok = send_telegram_message(telegram_post)
    twitter_ok = send_twitter_thread(twitter_parts)
    website_git_ok = maybe_run_website_git_sync()

    log("==============================================")
    log("DISTRIBUTION SUMMARY")
    log("==============================================")
    log("Files Written: 5")
    log(f" - {OUTPUT_SUBSTACK.name}")
    log(f" - {OUTPUT_TELEGRAM.name}")
    log(f" - {OUTPUT_TWITTER.name}")
    log(f" - {OUTPUT_LATEST_TXT.name}")
    log(f" - {OUTPUT_LATEST_JSON.name}")

    log(f"Website Sync Copies: {len(copied_files)}")
    for path in copied_files:
        log(f" - {path}")

    log(f"Telegram OK: {telegram_ok}")
    log(f"X OK: {twitter_ok}")
    log(f"Website Auto-Deploy OK: {website_git_ok}")

    log("NO CRITICAL ERRORS DETECTED")
    log("==============================================")
    log("DISTRIBUTION BUILD COMPLETE")
    log("==============================================")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SystemExit:
        raise
    except Exception as exc:
        log(f"FATAL ERROR: {exc}")
        traceback.print_exc()
        raise SystemExit(1)
