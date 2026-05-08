from __future__ import annotations

import re
from typing import Any


LEAGUES = {
    "mlb": "MLB",
    "nba": "NBA",
    "nhl": "NHL",
    "nfl": "NFL",
    "ncaafb": "College Football",
    "soccer": "Soccer",
    "fantasy": "Fantasy",
}

TEAM_WORDS = {
    "Red Sox", "Orioles", "Mariners", "Cardinals", "Blue Jays", "Guardians", "Giants", "Marlins",
    "Rays", "Twins", "Rockies", "Mets", "Nationals", "White Sox", "Padres", "Diamondbacks",
    "Rangers", "Athletics", "Pirates", "Brewers", "Royals", "Angels", "Yankees", "Astros",
    "Dodgers", "Cubs", "Reds", "Tigers", "Phillies", "Braves", "Magic", "Pistons", "Thunder",
    "Suns", "Knicks", "Hawks", "Timberwolves", "Nuggets", "Lakers", "Celtics", "Warriors",
}

MOJIBAKE = {
    "\ufeff": "",
    "\u2018": "'",
    "\u2019": "'",
    "\u201c": '"',
    "\u201d": '"',
    "\u2014": "-",
    "\u2013": "-",
    "\xa0": " ",
    "â€™": "'",
    "â€˜": "'",
    "â€œ": '"',
    "â€\x9d": '"',
    "â€": '"',
    "â€“": "-",
    "â€”": "-",
    "Ã¢â‚¬â„¢": "'",
    "Ã¢â‚¬Ëœ": "'",
    "Ã¢â‚¬Å“": '"',
    "Ã¢â‚¬Â": '"',
    "Ã¢â‚¬": '"',
    "Ã¢â‚¬â€œ": "-",
    "Ã¢â‚¬â€": "-",
    "Donât": "Don't",
    "donât": "don't",
    "Canât": "Can't",
    "canât": "can't",
    "Wonât": "Won't",
    "wonât": "won't",
    "RenÃ©e": "Renee",
    "Ã©": "e",
    "Ã¡": "a",
    "Ã³": "o",
    "Ãº": "u",
    "Ã±": "n",
    "Ã¼": "u",
    "ÃƒÂ©": "e",
    "ÃƒÂ¡": "a",
    "ÃƒÂ³": "o",
    "ÃƒÂº": "u",
    "ÃƒÂ±": "n",
    "ÃƒÂ¼": "u",
}


def clean_text(value: Any, fallback: str = "") -> str:
    text = "" if value is None else str(value)
    for old, new in MOJIBAKE.items():
        text = text.replace(old, new)
    text = re.sub(r"\s+", " ", text).strip(" -")
    return text or fallback


def _dedupe(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        item = clean_text(item)
        key = item.lower()
        if item and key not in seen:
            seen.add(key)
            out.append(item)
    return out


def _not_headline(lines: list[str], headline: str) -> list[str]:
    headline_key = re.sub(r"[^a-z0-9]+", " ", headline.lower()).strip()
    out: list[str] = []
    for line in _dedupe(lines):
        value_key = re.sub(r"[^a-z0-9]+", " ", line.lower()).strip()
        if value_key and value_key != headline_key:
            out.append(line)
    return out


def _source(item: dict[str, Any]) -> str:
    return clean_text(item.get("source_label") or item.get("source_name") or item.get("source_file") or item.get("source"))


def _extract_teams(text: str) -> list[str]:
    teams = [team for team in TEAM_WORDS if re.search(rf"\b{re.escape(team)}\b", text, re.I)]
    matchup = re.search(r"\b([A-Z][A-Za-z .]+?)\s+(?:at|vs\.?|versus)\s+([A-Z][A-Za-z .]+?)(?:\s+-|\s+\d|$)", text)
    if matchup:
        teams.extend([matchup.group(1), matchup.group(2)])
    return _dedupe([clean_text(team) for team in teams])[:4]


def _extract_people(text: str) -> list[str]:
    names = re.findall(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b", text)
    blocked = {"New York", "Los Angeles", "College Football", "Major League", "West Coast"}
    return [name for name in _dedupe(names) if name not in blocked and name not in TEAM_WORDS][:4]


def build_key_data(item: dict[str, Any], vertical: str = "sports") -> list[str]:
    key = clean_text(item.get("key") or item.get("league") or item.get("title")).lower()
    league = LEAGUES.get(key, clean_text(item.get("league") or item.get("title")))
    headline = clean_text(item.get("headline") or item.get("title"))
    snapshot = clean_text(item.get("snapshot") or item.get("summary"))
    content = clean_text(item.get("content"))
    text = f"{headline}. {snapshot}. {content}"
    lines: list[str] = []

    if league:
        lines.append(f"League: {league}")

    teams = _extract_teams(text)
    if teams:
        lines.append(f"Teams: {', '.join(teams)}")

    score = re.search(r"\b([A-Z][A-Za-z .]+?)\s+(?:beat|defeated)\s+([A-Z][A-Za-z .]+?),\s+([0-9]{1,3})-([0-9]{1,3})", text)
    if score:
        lines.append(f"Score / status: {clean_text(score.group(1))} beat {clean_text(score.group(2))}, {score.group(3)}-{score.group(4)}")
    else:
        status = re.search(r"\b(final|live|upcoming|postponed|questionable|out|probable)\b", text, re.I)
        if status:
            lines.append(f"Score / status: {status.group(1).title()}")

    time_match = re.search(r"\b(?:[0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}:[0-9]{2}\s?(?:AM|PM)\s?ET|[A-Z][a-z]+day)\b", text, re.I)
    if time_match:
        lines.append(f"Game time / date: {time_match.group(0)}")

    people = _extract_people(text)
    if people:
        lines.append(f"Players / people: {', '.join(people)}")

    if re.search(r"\b(injury|injured|IL|questionable|doubtful|out|status|probable starters?)\b", text, re.I):
        lines.append("Injury / status note: availability or probable-starter context is part of the coverage")
    if re.search(r"\b(playoff|standings|record|seed|race|title|relegation|net rating|pace)\b", text, re.I):
        lines.append("Records / standings context: playoff, efficiency, record or race implications are present")
    if re.search(r"\b(odds|line|spread|bet|favorite|underdog|fantasy)\b", text, re.I):
        lines.append("Betting / fantasy signal: market or fantasy language appears in the source context")

    source = _source(item)
    if source:
        lines.append(f"Source: {source}")

    return _not_headline(lines, headline)[:6]


def build_why_it_matters(item: dict[str, Any], vertical: str = "sports") -> list[str]:
    text = clean_text(f"{item.get('headline', '')} {item.get('snapshot', '')} {item.get('content', '')}").lower()
    if any(w in text for w in ["playoff", "seed", "standings", "race", "record"]):
        return ["This changes the standings frame and helps editors decide whether the card is a race, seeding or next-matchup story."]
    if any(w in text for w in ["injury", "il", "questionable", "out", "probable"]):
        return ["Availability and starter context can reshape lineup decisions, roster coverage, betting value and fantasy relevance."]
    if any(w in text for w in ["odds", "bet", "line", "spread", "fantasy"]):
        return ["The market signal is useful when it is paired with verified team, injury and matchup context."]
    return ["The card gives the desk quick score, roster, matchup or schedule context without forcing editors through a full report blob."]


def build_what_to_watch(item: dict[str, Any], vertical: str = "sports") -> list[str]:
    return [
        "Monitor final scores, lineup confirmations, injury/status notes and coach/player comments.",
        "Track the next game or matchup context before elevating standings, betting or fantasy implications.",
    ]


def normalize_card(item: dict[str, Any], vertical: str = "sports") -> dict[str, Any]:
    card = dict(item)
    key = clean_text(card.get("key"))
    if key == "betting_odds":
        return card
    for field in ["headline", "title", "snapshot", "summary", "content", "source_label", "source_name", "source_file", "url", "published_at"]:
        if field in card:
            card[field] = clean_text(card.get(field))
    headline = clean_text(card.get("headline") or card.get("title"))
    key_data = build_key_data(card, vertical)
    if not key_data:
        source = _source(card)
        fallback = [f"League: {clean_text(card.get('title'), 'Sports')}"]
        if clean_text(card.get("updated_at")):
            fallback.append(f"Published: {clean_text(card.get('updated_at'))}")
        if source:
            fallback.append(f"Source: {source}")
        key_data = fallback
    card["key_data"] = _not_headline(key_data, headline)[:6]
    card["why_it_matters"] = _dedupe(build_why_it_matters(card, vertical))[:4]
    card["what_to_watch"] = _dedupe(build_what_to_watch(card, vertical))[:4]
    return card


def normalize_payload(payload: dict[str, Any], vertical: str = "sports") -> dict[str, Any]:
    payload = dict(payload)
    for field in ["title", "headline", "snapshot", "updated_at", "generated_at", "published_at"]:
        if field in payload:
            payload[field] = clean_text(payload.get(field))
    for key in ["live_newsroom", "editor_signals", "homepage_cards"]:
        if isinstance(payload.get(key), list):
            payload[key] = [normalize_card(x, vertical) if isinstance(x, dict) else x for x in payload[key]]
            payload[key] = [x for x in payload[key] if not isinstance(x, dict) or clean_text(x.get("headline") or x.get("title"))]
    if isinstance(payload.get("sections"), dict):
        payload["sections"] = {
            k: (v if k == "betting_odds" else normalize_card({**v, "key": k}, vertical)) if isinstance(v, dict) else v
            for k, v in payload["sections"].items()
        }
        payload["sections"] = {k: v for k, v in payload["sections"].items() if not isinstance(v, dict) or clean_text(v.get("headline") or v.get("title"))}
    elif isinstance(payload.get("sections"), list):
        payload["sections"] = [normalize_card(x, vertical) if isinstance(x, dict) else x for x in payload["sections"]]
        payload["sections"] = [x for x in payload["sections"] if not isinstance(x, dict) or clean_text(x.get("headline") or x.get("title"))]
    return payload
