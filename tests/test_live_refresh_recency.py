from datetime import datetime, timedelta, timezone

from sports_live_score_refresh import current_editorial_stories


def test_stale_supporting_story_is_removed_before_live_score_publication():
    now = datetime.now(timezone.utc)
    stories = [
        {
            "id": "old-mlb-story",
            "published_at": (now - timedelta(hours=100)).isoformat(),
        },
        {
            "id": "current-editorial-story",
            "published_at": (now - timedelta(hours=2)).isoformat(),
        },
        {
            "id": "score:nfl:401872656",
            "published_at": now.isoformat(),
        },
    ]

    retained = current_editorial_stories(
        stories,
        "nfl",
        now,
        recency_hours=96,
    )

    assert [story["id"] for story in retained] == ["current-editorial-story"]
