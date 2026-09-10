from datetime import datetime, timedelta, timezone

from sports_desk_pipeline import (
    football_story_priority,
    rank_homepage_stories,
    story_quality,
)


def story(*, desk, state, title, published, starts, url):
    return {
        "id": url,
        "desk": desk,
        "title": title,
        "summary": title,
        "url": url,
        "canonical_url": url,
        "publisher": "ESPN" if state else "CBS Sports",
        "source_group": "official" if state else "national",
        "published_at": published.isoformat(),
        "starts_at": starts.isoformat(),
        "event_state": state,
        "lanes": [],
    }


def test_live_nfl_game_leads_desk_and_homepage():
    now = datetime.now(timezone.utc)
    live = story(
        desk="nfl",
        state="in",
        title="New England Patriots 10, Seattle Seahawks 13 — Q4 1:22",
        published=now,
        starts=now - timedelta(hours=2),
        url="https://www.espn.com/nfl/game/_/gameId/401872656",
    )
    article = story(
        desk="nfl",
        state="",
        title="NFL club provides routine injury update before Sunday",
        published=now,
        starts=now,
        url="https://www.cbssports.com/nfl/news/routine-injury-update/",
    )
    desk = {
        "id": "nfl",
        "preferred_publishers": ["ESPN", "CBS Sports"],
    }

    assert football_story_priority(live, now) == 2
    assert story_quality(live, desk) > story_quality(article, desk)
    assert rank_homepage_stories([article, live], now)[0]["id"] == live["id"]


def test_recent_college_football_final_beats_ordinary_news():
    now = datetime.now(timezone.utc)
    final = story(
        desk="college-football",
        state="post",
        title="Michigan 13, Western Michigan 12 — Final",
        published=now,
        starts=now - timedelta(hours=4),
        url="https://www.espn.com/college-football/game/_/gameId/123",
    )
    article = story(
        desk="college-football",
        state="",
        title="College football analyst discusses future rankings",
        published=now,
        starts=now,
        url="https://www.cbssports.com/college-football/news/future-rankings/",
    )
    desk = {
        "id": "college-football",
        "preferred_publishers": ["ESPN", "CBS Sports"],
    }

    assert football_story_priority(final, now) == 1
    assert story_quality(final, desk) > story_quality(article, desk)
