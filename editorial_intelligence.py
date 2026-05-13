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
    "Sabres", "Bruins", "Avalanche", "Kings", "Lightning", "Canadiens", "Oilers", "Ducks",
    "Wild", "Golden Knights", "Panthers", "Maple Leafs", "Hurricanes", "Rangers", "Stars",
    "Jets", "Canucks", "Kraken", "Predators", "Penguins", "Flyers", "Capitals", "Islanders",
    "Bears", "Lions", "Packers", "Vikings", "Cowboys", "Eagles", "Giants", "Commanders",
    "Chiefs", "Chargers", "Raiders", "Broncos", "Bills", "Dolphins", "Jets", "Patriots",
    "Bengals", "Browns", "Ravens", "Steelers", "Colts", "Texans", "Jaguars", "Titans",
    "Falcons", "Panthers", "Saints", "Buccaneers", "Seahawks", "Rams", "49ers", "Cardinals",
}

BANNED_HEADLINE_PATTERNS = [
    r"\bwhat to watch\b",
    r"\bmarket read\b",
    r"\buseful read\b",
    r"\bwhy it matters\b",
    r"\bstoryline centers on\b",
    r"\breporting path\b",
    r"\bthe matchup carries\b",
    r"\beditorial signal\b",
    r"\bnewsroom signal\b",
    r"\bdata point\b",
    r"\bcontext around\b",
    r"\bthis story reflects\b",
    r"\bsports desk sees\b",
    r"\bpressure builds around\b",
    r"\bboard is shaping\b",
    r"\bslate currently shows\b",
    r"\bwindow is bridging\b",
    r"\bthe lead belongs to\b",
    r"\bcurrent sports calendar\b",
    r"\bbroader board\b",
    r"\bno games were available\b",
    r"\bno .* updates were available\b",
    r"\busable data was unavailable\b",
    r"\bavailable during this report window\b",
    r"\breport\s*\|",
]

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


def _title_case_headline(text: str) -> str:
    text = clean_text(text).rstrip(".")
    if not text:
        return ""
    small = {"a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "of", "on", "or", "the", "to", "vs"}
    words = re.split(r"(\s+)", text)
    out: list[str] = []
    real_index = 0
    real_total = len([w for w in words if w.strip()])
    for word in words:
        if not word.strip():
            out.append(word)
            continue
        bare = word.strip()
        lower = bare.lower()
        real_index += 1
        if bare.isupper() or re.search(r"\d", bare) or "-" in bare or "'" in bare:
            out.append(bare)
        elif 1 < real_index < real_total and lower in small:
            out.append(lower)
        else:
            out.append(lower[:1].upper() + lower[1:])
    return "".join(out)


def _has_banned_headline_language(text: str) -> bool:
    lowered = clean_text(text).lower()
    return any(re.search(pattern, lowered, flags=re.I) for pattern in BANNED_HEADLINE_PATTERNS)


def _score_verb(score_a: str, score_b: str) -> str:
    try:
        margin = abs(int(score_a) - int(score_b))
    except Exception:
        margin = 0
    if margin <= 2:
        return "Edge"
    if margin >= 10:
        return "Rout"
    return "Beat"


def _team_from_fragment(fragment: str) -> str:
    fragment = clean_text(fragment)
    for marker in ["FINAL SCORES", "TODAY FINAL SCORES", "UPCOMING", "LIVE", "SNAPSHOT", "STORY ANGLES"]:
        if marker.lower() in fragment.lower():
            fragment = re.split(re.escape(marker), fragment, flags=re.I)[-1]
    fragment = re.split(r"[.;:]", fragment)[-1]
    teams = [team for team in TEAM_WORDS if re.search(rf"\b{re.escape(team)}\b", fragment, re.I)]
    if teams:
        return sorted(teams, key=len, reverse=True)[0]
    words = fragment.split()
    return " ".join(words[-3:])


def _desk_headline_from_scores(text: str) -> str:
    score = re.search(
        r"\b([A-Z][A-Za-z .]+?)\s+(?:beat|defeated|top(?:ped)?|edge(?:d)?|rout(?:ed)?)\s+"
        r"([A-Z][A-Za-z .]+?),\s+([0-9]{1,3})-([0-9]{1,3})",
        text,
        flags=re.I,
    )
    if not score:
        return ""
    winner = _team_from_fragment(score.group(1))
    loser = _team_from_fragment(score.group(2))
    if not winner or not loser or winner.lower() == loser.lower():
        return ""
    verb = _score_verb(score.group(3), score.group(4))
    return _title_case_headline(f"{winner} {verb} {loser}")


def _desk_headline_from_matchup(text: str, league: str) -> str:
    matchup = re.search(
        r"\b([A-Z][A-Za-z .]+?)\s+(?:at|vs\.?|versus)\s+([A-Z][A-Za-z .]+?)\s*(?:-|,|\.|\n|$)",
        text,
        flags=re.I,
    )
    if not matchup:
        return ""
    away = _team_from_fragment(matchup.group(1))
    home = _team_from_fragment(matchup.group(2))
    if not away or not home:
        return ""
    bad_entity_words = r"\b(available|report|window|updates|games|data|time|during|this|were)\b"
    if re.search(bad_entity_words, away, re.I) or re.search(bad_entity_words, home, re.I):
        return ""
    label = LEAGUES.get(league.lower(), clean_text(league, "Sports"))
    if re.search(r"\b(final|beat|defeated|won|lost)\b", text, re.I):
        return _title_case_headline(f"{away}-{home} Sets Up Next {label} Read")
    if re.search(r"\b(probables?|starter|pitcher|rotation|lineup)\b", text, re.I):
        return _title_case_headline(f"{away}-{home} Turns on Pitching Plans")
    return _title_case_headline(f"{away}-{home} Leads {label} Slate")


def _desk_headline_from_news(text: str, league: str) -> str:
    teams = _extract_teams(text)
    people = _extract_people(text)
    label = LEAGUES.get(league.lower(), clean_text(league, "Sports"))

    if re.search(r"\b(no final scores|no live games|no upcoming games|no games|no .* updates|unavailable)\b", text, re.I):
        if league == "nfl":
            return "NFL Schedule Quiet After Draft Weekend"
        if league == "ncaafb":
            return "College Football Waits on Schedule News"
        if league == "fantasy":
            return "Fantasy Board Waits on Injury News"
        return _title_case_headline(f"{label} Schedule Stays Quiet")
    if re.search(r"\b(injury|injured|questionable|doubtful|out|return|status)\b", text, re.I):
        subject = people[0] if people else (teams[0] if teams else label)
        return _title_case_headline(f"{subject} Injury Status Shapes {label} Board")
    if re.search(r"\b(contract|trade|sign(?:ed|ing)?|deal|waiver|transfer|portal|draft|roster)\b", text, re.I):
        subject = teams[0] if teams else (people[0] if people else label)
        return _title_case_headline(f"{subject} Roster Move Reshapes {label} Picture")
    if re.search(r"\b(schedule|dates?|release|announc(?:ed|es)|camp|training camp)\b", text, re.I):
        return _title_case_headline(f"{label} Schedule Dates Start to Land")
    if re.search(r"\b(playoff|postseason|wild card|seed|standings|race|table)\b", text, re.I):
        subject = teams[0] if teams else label
        return _title_case_headline(f"{subject} Faces Bigger {label} Playoff Test")
    if people and teams:
        return _title_case_headline(f"{people[0]} Leads {teams[0]} Story")
    if teams:
        return _title_case_headline(f"{teams[0]} Draws Top {label} Focus")
    return ""


def sports_desk_headline(item: dict[str, Any], vertical: str = "sports") -> str:
    if vertical != "sports":
        return clean_text(item.get("headline") or item.get("title"))

    key = clean_text(item.get("key") or item.get("league") or item.get("title")).lower()
    current = clean_text(item.get("headline") or item.get("title"))
    text = clean_text(
        f"{current}. {item.get('summary', '')}. {item.get('snapshot', '')}. {item.get('content', '')}"
    )

    result_or_matchup = _desk_headline_from_scores(text) or _desk_headline_from_matchup(text, key)

    if result_or_matchup:
        return result_or_matchup[:90].rstrip(" ,;:-")

    if current and not _has_banned_headline_language(current) and len(current.split()) <= 11:
        return _title_case_headline(current)[:90].rstrip(" ,;:-")

    generated = _desk_headline_from_news(text, key)

    if generated:
        return generated[:90].rstrip(" ,;:-")

    label = LEAGUES.get(key, clean_text(item.get("league") or item.get("label") or "Sports"))
    return _title_case_headline(f"{label} Board Turns on Results and Matchups")


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
    headline = sports_desk_headline(card, vertical)
    if headline:
        card["headline"] = headline
        if "title" in card:
            card["title"] = headline
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
    if vertical == "sports":
        headline = sports_desk_headline(payload, vertical)
        if headline:
            payload["headline"] = headline
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
