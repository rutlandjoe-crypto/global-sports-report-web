from __future__ import annotations

import hashlib
import json
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from espn_http import fetch_espn_json

TIMEZONE = ZoneInfo("America/New_York")
BASE_DIR = Path(__file__).resolve().parent
OUTPUT_FILE = BASE_DIR / "soccer_report.txt"
SUCCESS_MARKER = BASE_DIR / ".gsr_soccer_success.json"
SUCCESS_MARKER_TEMP = BASE_DIR / ".gsr_soccer_success.json.tmp"
RUN_TOKEN_ENV = "GSR_RUN_TOKEN"
REQUEST_TIMEOUT = 20
ESPN_SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard"

DISCLAIMER = (
    "This report is an automated summary intended to support, not replace, human sports journalism."
)

LEAGUES = [
    ("all", "Global"),
    ("eng.1", "Premier League"),
    ("esp.1", "LaLiga"),
    ("ger.1", "Bundesliga"),
    ("ita.1", "Serie A"),
    ("fra.1", "Ligue 1"),
]

# =========================
# TEXT CLEANING
# =========================

def fix_encoding(text: str) -> str:
    if not text:
        return ""

    return (
        str(text)
        .replace("â€™", "’")
        .replace("â€˜", "‘")
        .replace("â€œ", '"')
        .replace("â€\x9d", '"')
        .replace("â€\x9c", '"')
        .replace("â€”", "—")
        .replace("â€“", "-")
        .replace("â€¢", "-")
        .replace("\u00a0", " ")
    )


def fix_spacing(text: str) -> str:
    if not text:
        return ""

    text = fix_encoding(text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    fixed_lines: list[str] = []

    for raw_line in text.splitlines():
        line = raw_line.rstrip()

        if not line.strip():
            fixed_lines.append("")
            continue

        line = re.sub(r"[ \t]+", " ", line)
        line = re.sub(r"\s+([.,;:!?])", r"\1", line)
        line = re.sub(r"([.,;:!?])([A-Za-z])", r"\1 \2", line)
        line = re.sub(r"([a-z])([A-Z])", r"\1 \2", line)
        line = re.sub(r"([0-9])([A-Za-z])", r"\1 \2", line)
        line = re.sub(r"([A-Za-z])([0-9])", r"\1 \2", line)

        if line.startswith("-") and not line.startswith("- "):
            line = "- " + line[1:].lstrip()

        fixed_lines.append(line.strip())

    cleaned: list[str] = []
    blank_count = 0

    for line in fixed_lines:
        if line.strip():
            cleaned.append(line)
            blank_count = 0
        else:
            blank_count += 1
            if blank_count <= 1:
                cleaned.append("")

    return "\n".join(cleaned).strip()


# =========================
# TIME
# =========================

def now_et() -> datetime:
    return datetime.now(TIMEZONE)


def report_date_label() -> str:
    return now_et().strftime("%Y-%m-%d")


def generated_timestamp() -> str:
    return now_et().strftime("%Y-%m-%d %I:%M:%S %p ET")


# =========================
# SAFE HELPERS
# =========================

def safe_get_competitors(event: dict) -> tuple[dict, dict]:
    try:
        competition = event.get("competitions", [{}])[0]
        competitors = competition.get("competitors", [])

        home = next((team for team in competitors if team.get("homeAway") == "home"), {})
        away = next((team for team in competitors if team.get("homeAway") == "away"), {})

        return away, home
    except Exception:
        return {}, {}


def safe_team_name(team_obj: dict) -> str:
    try:
        team = team_obj.get("team", {})
        return (
            team.get("displayName")
            or team.get("shortDisplayName")
            or team.get("name")
            or "Unknown Club"
        )
    except Exception:
        return "Unknown Club"


def safe_team_score(team_obj: dict) -> str:
    try:
        return str(team_obj.get("score", "0")).strip()
    except Exception:
        return "0"


def safe_team_record(team_obj: dict) -> str:
    try:
        for record in team_obj.get("records", []):
            summary = record.get("summary")
            if summary:
                return str(summary).strip()
    except Exception:
        pass
    return ""


def safe_status_detail(event: dict) -> str:
    try:
        competition = event.get("competitions", [{}])[0]
        status_type = competition.get("status", {}).get("type", {})
        return (
            status_type.get("shortDetail")
            or status_type.get("detail")
            or "Scheduled"
        )
    except Exception:
        return "Scheduled"


def safe_status_state(event: dict) -> str:
    try:
        competition = event.get("competitions", [{}])[0]
        return str(competition.get("status", {}).get("type", {}).get("state", "")).lower()
    except Exception:
        return ""


# =========================
# FETCH
# =========================

def fetch_events() -> list[dict]:
    payload = fetch_espn_json(
        ESPN_SCOREBOARD_URL,
        timeout=(5, REQUEST_TIMEOUT),
    )
    events = payload.get("events")
    if not isinstance(events, list):
        raise RuntimeError("ESPN Soccer response did not contain an events list")
    return events


def is_valid_sourced_event(event: object) -> bool:
    if not isinstance(event, dict) or not str(event.get("id", "")).strip():
        return False
    competitions = event.get("competitions")
    if not isinstance(competitions, list) or not competitions:
        return False
    competition = competitions[0]
    if not isinstance(competition, dict):
        return False
    competitors = competition.get("competitors")
    if not isinstance(competitors, list) or len(competitors) < 2:
        return False
    if safe_status_state(event) not in {"pre", "in", "post"}:
        return False
    names = [safe_team_name(item) for item in competitors]
    return len([name for name in names if name and name != "Unknown Club"]) >= 2


def resolve_run_token() -> str:
    token = os.getenv(RUN_TOKEN_ENV, "").strip()
    if token:
        return token
    token = f"manual-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}-{uuid.uuid4().hex}"
    print(f"WARNING: {RUN_TOKEN_ENV} was not set; generated a standalone Soccer run token.")
    return token


def remove_success_marker() -> None:
    SUCCESS_MARKER.unlink(missing_ok=True)
    SUCCESS_MARKER_TEMP.unlink(missing_ok=True)


def report_has_valid_sourced_content(report: str, valid_event_count: int) -> bool:
    lowered = report.lower()
    forbidden = (
        "monitoring window",
        "fallback reason",
        "temporarily unavailable",
        "no soccer updates were available",
    )
    event_lines = [line for line in report.splitlines() if line.startswith("- ")]
    return (
        valid_event_count > 0
        and bool(event_lines)
        and not any(phrase in lowered for phrase in forbidden)
    )


def write_success_marker(report: str, events: list[dict], run_token: str) -> None:
    if not report_has_valid_sourced_content(report, len(events)):
        raise RuntimeError("Soccer report failed sourced-content integrity validation")
    marker = {
        "run_token": run_token,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "ESPN",
        "source_url": ESPN_SCOREBOARD_URL,
        "valid_event_count": len(events),
        "event_ids": [str(event["id"]) for event in events],
        "report_file": OUTPUT_FILE.name,
        "report_sha256": hashlib.sha256(OUTPUT_FILE.read_bytes()).hexdigest(),
    }
    SUCCESS_MARKER_TEMP.write_text(
        json.dumps(marker, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    SUCCESS_MARKER_TEMP.replace(SUCCESS_MARKER)


# =========================
# LINE BUILDERS
# =========================

def build_final_line(event: dict) -> str:
    away, home = safe_get_competitors(event)

    away_name = safe_team_name(away)
    home_name = safe_team_name(home)
    away_score = safe_team_score(away)
    home_score = safe_team_score(home)

    if away_name == "Unknown Club" and home_name == "Unknown Club":
        return event.get("name", "Match Final.")

    return f"{home_name} {home_score}, {away_name} {away_score}."


def build_live_line(event: dict) -> str:
    away, home = safe_get_competitors(event)

    away_name = safe_team_name(away)
    home_name = safe_team_name(home)
    away_score = safe_team_score(away)
    home_score = safe_team_score(home)
    detail = safe_status_detail(event)

    if away_name == "Unknown Club" and home_name == "Unknown Club":
        return f"{event.get('name', 'Match')} - {detail}."

    return f"{away_name} {away_score}, {home_name} {home_score} - {detail}."


def build_upcoming_line(event: dict) -> str:
    away, home = safe_get_competitors(event)

    away_name = safe_team_name(away)
    home_name = safe_team_name(home)
    away_record = safe_team_record(away)
    home_record = safe_team_record(home)
    detail = safe_status_detail(event)

    if away_name == "Unknown Club" and home_name == "Unknown Club":
        return f"{event.get('name', 'Match')} - {detail}."

    matchup = f"{away_name} at {home_name} - {detail}."
    notes = []

    if away_record:
        notes.append(f"{away_name} enters at {away_record}")
    if home_record:
        notes.append(f"{home_name} comes in at {home_record}")

    if notes:
        return matchup + " " + ", while ".join(notes) + "."

    return matchup


# =========================
# BUILD REPORT
# =========================

def build_soccer_report(events: list[dict]) -> str:
    finals: list[str] = []
    live: list[str] = []
    upcoming: list[str] = []

    for event in events:
        state = safe_status_state(event)

        if state == "post":
            finals.append(build_final_line(event))
        elif state == "in":
            live.append(build_live_line(event))
        else:
            upcoming.append(build_upcoming_line(event))

    lines: list[str] = [
        f"SOCCER REPORT | {report_date_label()}",
        "",
        "SNAPSHOT",
        f"The soccer slate currently shows {len(finals)} final, {len(live)} live, and {len(upcoming)} upcoming matches.",
        "",
        "FINAL SCORES",
    ]

    if finals:
        for line in finals[:10]:
            lines.append(f"- {fix_spacing(line)}")
    else:
        lines.append("No final scores were available during this report window.")

    lines.extend([
        "",
        "LIVE",
    ])

    if live:
        for line in live[:10]:
            lines.append(f"- {fix_spacing(line)}")
    else:
        lines.append("No live matches were available during this report window.")

    lines.extend([
        "",
        "UPCOMING",
    ])

    if upcoming:
        for line in upcoming[:10]:
            lines.append(f"- {fix_spacing(line)}")
    else:
        lines.append("No upcoming matches were available during this report window.")

    lines.extend([
        "",
        DISCLAIMER,
        f"Generated: {generated_timestamp()}",
    ])

    report = "\n".join(lines)
    return fix_spacing(report) + "\n"


def write_report(report: str) -> None:
    OUTPUT_FILE.write_text(report, encoding="utf-8")
    print("Soccer report written.")


def main() -> int:
    remove_success_marker()
    try:
        events = fetch_events()
        valid_events = [event for event in events if is_valid_sourced_event(event)]
        if not valid_events:
            raise RuntimeError(
                f"ESPN Soccer returned {len(events)} events but zero passed source integrity checks"
            )
        report = build_soccer_report(valid_events)
        run_token = resolve_run_token()
        write_report(report)
        write_success_marker(report, valid_events, run_token)
        print(
            f"Soccer success marker written for run token {run_token} "
            f"with {len(valid_events)} valid ESPN events."
        )
        return 0
    except Exception as exc:
        remove_success_marker()
        print(f"ERROR: Soccer report not published: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
