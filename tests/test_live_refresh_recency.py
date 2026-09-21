from datetime import datetime, timedelta, timezone

from sports_live_score_refresh import current_editorial_stories, refresh_live_scores


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


def test_live_refresh_prunes_stale_story_from_desk_without_score_provider(monkeypatch):
    now = datetime.now(timezone.utc)
    fresh = {
        "id": "fresh-fantasy-story",
        "title": "Fresh fantasy story",
        "published_at": (now - timedelta(hours=2)).isoformat(),
    }
    stale = {
        "id": "stale-fantasy-story",
        "title": "Stale fantasy story",
        "published_at": (now - timedelta(hours=100)).isoformat(),
    }
    payload = {
        "desks": {
            "nfl": {
                "stories": [],
                "data": {},
                "data_updated_at": {},
                "data_verified_at": {},
                "providers": {},
                "diagnostics": {},
            },
            "fantasy": {
                "stories": [fresh, stale],
                "data": {},
                "modules": {},
                "diagnostics": {},
            },
        },
        "generated_at": now.isoformat(),
    }
    config = {
        "defaults": {
            "request_timeout_seconds": 5,
            "max_stories": 10,
            "recency_hours": 96,
        },
        "desks": [
            {"id": "nfl", "data_providers": {"scores": "https://example.test/scores"}},
            {"id": "fantasy", "data_providers": {}},
        ],
    }

    monkeypatch.setattr(
        "sports_live_score_refresh.fetch_desk_data",
        lambda *_: ({"scores": [], "schedule": []}, [], {"scores": True}),
    )
    monkeypatch.setattr("sports_live_score_refresh.game_status_stories", lambda *_: [])
    monkeypatch.setattr("sports_live_score_refresh.deduplicate_stories", lambda stories, *_: stories)
    monkeypatch.setattr("sports_live_score_refresh.build_modules", lambda *_: {})
    monkeypatch.setattr("sports_live_score_refresh.build_homepage_payload", lambda *_: {})
    monkeypatch.setattr("sports_live_score_refresh.payload_signature", lambda *_: "signature")
    monkeypatch.setattr("sports_live_score_refresh.validate_payload", lambda *_args, **_kwargs: None)

    result, refreshed = refresh_live_scores(payload, config, now=now)

    assert refreshed == ["nfl"]
    assert [story["id"] for story in result["desks"]["fantasy"]["stories"]] == [
        "fresh-fantasy-story"
    ]
    assert result["desks"]["fantasy"]["diagnostics"]["stale_story_cleanup_at"] == now.isoformat()
