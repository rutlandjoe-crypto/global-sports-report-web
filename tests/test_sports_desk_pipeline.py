from __future__ import annotations

import copy
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from sports_desk_pipeline import (
    build_modules,
    classify_story,
    deduplicate_stories,
    diversify_stories,
    filter_game_windows,
    fetch_desk_data,
    build_pipeline,
    build_homepage_payload,
    load_config,
    normalize_url,
    meaningful_standings,
    parse_feed,
    rank_homepage_stories,
    story_quality,
    story_relevance,
    validate_payload,
)


def story(title: str, publisher: str, url: str, teams: list[str] | None = None) -> dict:
    return {
        "id": normalize_url(url),
        "desk": "nfl",
        "title": title,
        "summary": "",
        "url": url,
        "canonical_url": normalize_url(url),
        "publisher": publisher,
        "source_group": "national",
        "published_at": datetime.now(timezone.utc).isoformat(),
        "teams": teams or [],
        "players": [],
        "lanes": [],
    }


class SportsDeskPipelineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.config = load_config()
        cls.desks = cls.config["desks"]
        cls.nfl = next(item for item in cls.desks if item["id"] == "nfl")

    def test_source_diversity_limits_primary_module(self) -> None:
        candidates = [
            story(f"Distinct NFL development number {index}", "Publisher A", f"https://a.example/{index}")
            for index in range(5)
        ] + [
            story("A separate NFL transaction", "Publisher B", "https://b.example/1"),
            story("A separate NFL injury", "Publisher C", "https://c.example/1"),
        ]
        selected = diversify_stories(candidates, self.nfl, limit=5, per_publisher=2)
        self.assertEqual(5, len(selected))
        self.assertLessEqual(sum(item["publisher"] == "Publisher A" for item in selected[:4]), 2)
        self.assertGreaterEqual(len({item["publisher"] for item in selected}), 3)

    def test_diversity_gracefully_fills_when_alternatives_do_not_exist(self) -> None:
        candidates = [
            story(f"Distinct NFL item number {index}", "Only Publisher", f"https://only.example/{index}")
            for index in range(4)
        ]
        selected = diversify_stories(candidates, self.nfl, limit=4, per_publisher=2)
        self.assertEqual(4, len(selected))

    def test_deduplicates_same_event_with_different_headlines(self) -> None:
        candidates = [
            story(
                "Seahawks safety has ankle surgery and expects Week 1 return",
                "ESPN",
                "https://espn.example/story",
                ["Seahawks"],
            ),
            story(
                "Seahawks safety expected back Week 1 after ankle surgery",
                "Yahoo Sports",
                "https://yahoo.example/rewrite",
                ["Seahawks"],
            ),
        ]
        self.assertEqual(1, len(deduplicate_stories(candidates, self.nfl)))

    def test_normalized_urls_deduplicate_tracking_variants(self) -> None:
        self.assertEqual(
            normalize_url("http://www.example.com/story/?utm_source=x&id=2"),
            normalize_url("https://example.com/story?id=2"),
        )

    def test_classification_rejects_broad_football_false_positive(self) -> None:
        item = story(
            "Premier League football club completes transfer",
            "BBC Sport",
            "https://bbc.example/football",
        )
        item["desk"] = ""
        self.assertEqual("soccer", classify_story(item, self.desks))

    def test_nba_is_a_first_class_configured_desk(self) -> None:
        nba = next(item for item in self.desks if item["id"] == "nba")
        self.assertEqual("us", nba["geographic_profile"])
        self.assertIn("scores", nba["data_providers"])
        self.assertIn("standings", nba["data_providers"])
        self.assertTrue(any(feed["group"] == "official" for feed in nba["feeds"]))
        self.assertTrue(any(feed["group"] == "local" for feed in nba["feeds"]))

    def test_exclusions_are_whole_word_vetoes(self) -> None:
        fantasy = next(item for item in self.desks if item["id"] == "fantasy")
        nba = next(item for item in self.desks if item["id"] == "nba")
        baseball = story(
            "Fantasy Baseball Waiver Wire Targets for This Week",
            "Yahoo Sports",
            "https://yahoo.example/fantasy-baseball",
        )
        all_star = story(
            "NBA free agency produces a major roster move",
            "NBA",
            "https://nba.example/free-agency",
        )
        self.assertGreater(story_relevance(baseball, fantasy), 0)
        self.assertGreater(story_relevance(all_star, nba), 0)

    def test_fantasy_editorial_modules_do_not_collide_with_raw_league_data(self) -> None:
        fantasy_lane_ids = {lane["id"] for lane in self.config["desk_lanes"]["fantasy"]}
        self.assertFalse(fantasy_lane_ids & {"scores", "schedule", "standings", "rankings"})
        self.assertIn("fantasy-rankings", fantasy_lane_ids)
        self.assertTrue({"fantasy-football", "fantasy-baseball", "fantasy-basketball", "fantasy-hockey", "fantasy-soccer"}.issubset(fantasy_lane_ids))
        fantasy = next(item for item in self.desks if item["id"] == "fantasy")
        self.assertEqual({}, fantasy["data_providers"])

    def test_geographic_sourcing_profiles_have_required_groups(self) -> None:
        profiles = self.config["sourcing_profiles"]
        for desk in self.desks:
            expected = set(profiles[desk["geographic_profile"]]["required_source_groups"])
            actual = {feed["group"] for feed in desk["feeds"]}
            self.assertTrue(expected.issubset(actual), f"{desk['id']} missing {expected - actual}")

    def test_single_story_fallback_renders_while_underfilled_data_stays_hidden(self) -> None:
        one_story = story("A valid but solitary NFL league story", "ESPN", "https://espn.example/one")
        modules = build_modules(
            [one_story],
            {"scores": [], "schedule": [], "standings": [{"team": "A"}]},
            self.config,
        )
        self.assertEqual(1, len(modules["top-stories"]["items"]))
        self.assertNotIn("latest-news", modules)
        self.assertNotIn("standings", modules)
        self.assertNotIn("scores", modules)

    def test_lane_modules_accept_one_story_and_never_duplicate_articles(self) -> None:
        items = [
            story("NFL training camp roster battle opens this week", "NFL", "https://nfl.example/camp"),
            story("Quarterback competition takes shape at NFL camp", "ESPN", "https://espn.example/qb"),
            story("A separate current NFL development", "CBS Sports", "https://cbs.example/news"),
        ]
        items[0]["lanes"] = ["training-camp", "roster-battles"]
        items[1]["lanes"] = ["quarterbacks", "training-camp"]
        modules = build_modules(items, {"scores": [], "schedule": [], "standings": []}, self.config)
        coverage_ids = [
            item["id"]
            for key, module in modules.items()
            if key not in {"scores", "schedule", "standings"}
            for item in module["items"]
        ]
        self.assertEqual(len(coverage_ids), len(set(coverage_ids)))
        self.assertEqual(1, len(modules["training-camp"]["items"]))

    def test_feed_items_without_publication_time_are_rejected(self) -> None:
        payload = b"<rss><channel><item><title>WNBA valid headline without a date</title><link>https://example.com/item</link></item></channel></rss>"
        feed = {"publisher": "Example", "group": "national", "name": "Example feed"}
        self.assertEqual([], parse_feed(payload, feed, "nba"))

    def test_materially_future_dated_story_cannot_rank_as_fresh(self) -> None:
        future = story("NFL future-dated provider item is not yet publishable", "ESPN", "https://espn.example/future")
        future["published_at"] = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()
        current = story("NFL current verified provider item is publishable", "ESPN", "https://espn.example/current")
        self.assertEqual([current["id"]], [item["id"] for item in rank_homepage_stories([future, current])])

    def test_schedule_and_result_classification_enforces_time_and_status(self) -> None:
        now = datetime.now(timezone.utc)
        completed = {"id": "final", "event_state": "post", "starts_at": (now - timedelta(hours=2)).isoformat()}
        future_result = {"id": "bad-final", "event_state": "post", "starts_at": (now + timedelta(hours=2)).isoformat()}
        upcoming = {"id": "next", "event_state": "pre", "starts_at": (now + timedelta(hours=2)).isoformat()}
        past_schedule = {"id": "bad-next", "event_state": "pre", "starts_at": (now - timedelta(hours=2)).isoformat()}
        scores, schedule = filter_game_windows([completed, future_result], [upcoming, past_schedule], now)
        self.assertEqual(["final"], [row["id"] for row in scores])
        self.assertEqual(["next"], [row["id"] for row in schedule])

    def test_zero_zero_preseason_standings_are_suppressed(self) -> None:
        self.assertEqual([], meaningful_standings([{"team": "A", "record": "0-0"}, {"team": "B", "record": "0-0"}]))
        current = [{"team": "A", "record": "1-0"}, {"team": "B", "record": "0-1"}]
        self.assertEqual(current, meaningful_standings(current))

    def test_mlb_provider_request_includes_recent_result_window(self) -> None:
        mlb = copy.deepcopy(next(item for item in self.desks if item["id"] == "mlb"))
        mlb["data_providers"] = {"scores": "https://statsapi.mlb.com/api/v1/schedule?sportId=1"}
        with patch("sports_desk_pipeline.fetch_json", return_value={"dates": []}) as fetch:
            fetch_desk_data(mlb, 5)
        requested = fetch.call_args.args[0]
        self.assertIn("&startDate=", requested)
        self.assertIn("&endDate=", requested)

    def test_fresh_relevant_story_outranks_old_preferred_publisher(self) -> None:
        fresh = story("NFL trade reshapes the Broncos depth chart", "Regional Reporter", "https://fresh.example/nfl")
        old = story("NFL training camp note from two days ago", "NFL", "https://old.example/nfl")
        old["published_at"] = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
        self.assertGreater(story_quality(fresh, self.nfl), story_quality(old, self.nfl))

    def test_nba_secondary_feed_keeps_desk_live_when_primary_fails(self) -> None:
        config = copy.deepcopy(self.config)
        nba = next(item for item in config["desks"] if item["id"] == "nba")
        nba["feeds"] = [
            {"name": "primary", "publisher": "NBA", "group": "official", "url": "https://primary.example"},
            {"name": "secondary", "publisher": "ESPN", "group": "national", "url": "https://secondary.example"},
        ]
        config["desks"] = [nba]

        def fake_feed(feed: dict, desk_id: str, timeout: int):
            if feed["name"] == "primary":
                return [], "primary: simulated outage"
            items = []
            headlines = [
                "NBA Lakers complete a major roster trade",
                "NBA Nuggets announce an injury update",
                "NBA Celtics hire a new assistant coach",
            ]
            for index, headline in enumerate(headlines):
                item = story(
                    headline,
                    "ESPN",
                    f"https://secondary.example/{index}",
                )
                item.update({"desk": desk_id, "feed": "secondary", "source_group": "national"})
                items.append(item)
            return items, None

        data = {
            "scores": [],
            "schedule": [{"id": "1", "away": "A", "home": "B", "event_state": "pre", "starts_at": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(), "source": "ESPN", "source_url": "https://espn.example/1"}],
            "standings": [{"team": "A", "source": "ESPN", "source_url": "https://espn.example/standings"}, {"team": "B", "source": "ESPN", "source_url": "https://espn.example/standings"}],
        }
        with tempfile.TemporaryDirectory() as directory, patch(
            "sports_desk_pipeline.fetch_feed", side_effect=fake_feed
        ), patch(
            "sports_desk_pipeline.fetch_desk_data", return_value=(data, [], {"scores": True, "standings": True})
        ):
            payload = build_pipeline(config, Path(directory) / "desks.json")
        self.assertEqual(3, len(payload["desks"]["nba"]["stories"]))
        self.assertEqual(1, payload["desks"]["nba"]["diagnostics"]["source_success_count"])
        self.assertTrue(payload["desks"]["nba"]["diagnostics"]["source_errors"])

    def test_recent_story_fallback_survives_a_total_feed_outage(self) -> None:
        config = copy.deepcopy(self.config)
        nba = next(item for item in config["desks"] if item["id"] == "nba")
        config["desks"] = [nba]
        current_data = {
            "scores": [],
            "schedule": [{"id": "1", "event_state": "pre", "starts_at": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(), "source": "ESPN", "source_url": "https://espn.example/game"}],
            "standings": [
                {"team": "A", "source": "ESPN", "source_url": "https://espn.example/standings"},
                {"team": "B", "source": "ESPN", "source_url": "https://espn.example/standings"},
            ],
            "rankings": [],
        }

        def current_feed(feed: dict, desk_id: str, timeout: int):
            items = []
            for index, headline in enumerate((
                "NBA Lakers complete a major roster trade",
                "NBA Nuggets announce an injury update",
                "NBA Celtics hire a new assistant coach",
            )):
                item = story(headline, "ESPN", f"https://secondary.example/{index}")
                item.update({"desk": desk_id, "feed": feed["name"], "source_group": feed["group"]})
                items.append(item)
            return items, None

        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "desks.json"
            with patch("sports_desk_pipeline.fetch_feed", side_effect=current_feed), patch(
                "sports_desk_pipeline.fetch_desk_data",
                return_value=(current_data, [], {"scores": True, "standings": True}),
            ):
                first = build_pipeline(config, output)
            with patch(
                "sports_desk_pipeline.fetch_feed",
                return_value=([], "simulated total outage"),
            ), patch(
                "sports_desk_pipeline.fetch_desk_data",
                return_value=(
                    {"scores": [], "schedule": [], "standings": [], "rankings": []},
                    ["simulated total outage"],
                    {"scores": False, "standings": False},
                ),
            ):
                second = build_pipeline(config, output)

        self.assertEqual(first["desks"]["nba"]["stories"], second["desks"]["nba"]["stories"])
        self.assertEqual(first["desks"]["nba"]["data"], second["desks"]["nba"]["data"])
        self.assertEqual(first["generated_at"], second["generated_at"])

    def test_failed_provider_preserves_only_its_last_known_good_data(self) -> None:
        config = copy.deepcopy(self.config)
        nba = next(item for item in config["desks"] if item["id"] == "nba")
        nba["feeds"] = [
            {"name": "secondary", "publisher": "ESPN", "group": "national", "url": "https://secondary.example"}
        ]
        config["desks"] = [nba]
        headlines = [
            "NBA Lakers complete a major roster trade",
            "NBA Nuggets announce an injury update",
            "NBA Celtics hire a new assistant coach",
        ]

        def fake_feed(feed: dict, desk_id: str, timeout: int):
            items = []
            for index, headline in enumerate(headlines):
                item = story(headline, "ESPN", f"https://secondary.example/{index}")
                item.update({"desk": desk_id, "feed": "secondary", "source_group": "national"})
                items.append(item)
            return items, None

        first_data = {
            "scores": [],
            "schedule": [{"id": "old-game", "event_state": "pre", "starts_at": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(), "source": "ESPN", "source_url": "https://espn.example/old"}],
            "standings": [{"team": "A", "source": "ESPN", "source_url": "https://espn.example/standings"}, {"team": "B", "source": "ESPN", "source_url": "https://espn.example/standings"}],
        }
        second_data = {
            "scores": [],
            "schedule": [{"id": "new-game", "event_state": "pre", "starts_at": (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat(), "source": "ESPN", "source_url": "https://espn.example/new"}],
            "standings": [],
        }
        with tempfile.TemporaryDirectory() as directory, patch(
            "sports_desk_pipeline.fetch_feed", side_effect=fake_feed
        ):
            output = Path(directory) / "desks.json"
            with patch(
                "sports_desk_pipeline.fetch_desk_data",
                return_value=(first_data, [], {"scores": True, "standings": True}),
            ):
                first = build_pipeline(config, output)
            with patch(
                "sports_desk_pipeline.fetch_desk_data",
                return_value=(second_data, ["standings: simulated outage"], {"scores": True, "standings": False}),
            ):
                second = build_pipeline(config, output)

        self.assertEqual("new-game", second["desks"]["nba"]["data"]["schedule"][0]["id"])
        self.assertEqual(first["desks"]["nba"]["data"]["standings"], second["desks"]["nba"]["data"]["standings"])
        self.assertEqual(["standings"], second["desks"]["nba"]["diagnostics"]["data_fallbacks"])
        self.assertEqual(
            first["desks"]["nba"]["data_updated_at"]["standings"],
            second["desks"]["nba"]["data_updated_at"]["standings"],
        )
    def test_validation_rejects_timestamp_advance_without_content(self) -> None:
        now = datetime.now(timezone.utc)
        config = {
            "defaults": {
                "minimum_primary_stories": 3,
                "recency_hours": 96,
                "stale_fallback_hours": 24,
            },
            "desks": [{"id": "nfl", "data_providers": {"scores": "x", "standings": "y"}}],
        }
        stories = [story(f"Current NFL story number {index}", "ESPN", f"https://nfl.example/{index}") for index in range(3)]
        desk = {
            "stories": stories,
            "modules": {"top-stories": {"items": stories}},
            "data": {
                "scores": [],
                "schedule": [{"id": "1", "source": "ESPN", "source_url": "https://espn.example/1"}],
                "standings": [{"team": "A", "source": "ESPN", "source_url": "https://espn.example/standings"}, {"team": "B", "source": "ESPN", "source_url": "https://espn.example/standings"}],
            },
            "data_updated_at": {"scores": now.isoformat(), "standings": now.isoformat()},
            "diagnostics": {"source_success_count": 1},
        }
        previous = {"generated_at": now.isoformat(), "desks": {"nfl": copy.deepcopy(desk)}}
        current = copy.deepcopy(previous)
        current["generated_at"] = (now + timedelta(seconds=1)).isoformat()
        with self.assertRaisesRegex(RuntimeError, "advanced without new"):
            validate_payload(current, config, previous=previous, now=now)


    def test_fantasy_template_deduplication_blocks_repetitive_matchup_cards(self) -> None:
        fantasy = next(item for item in self.desks if item["id"] == "fantasy")
        first = story("Fantasy matchup outlook for Broncos running backs", "FantasyPros", "https://fantasy.example/broncos")
        second = story("Fantasy matchup outlook for Raiders running backs", "FantasyPros", "https://fantasy.example/raiders")
        first["desk"] = second["desk"] = "fantasy"
        first["summary"] = second["summary"] = "Availability and role questions shape this fantasy matchup; watch practice notes and lineup decisions."
        self.assertEqual(1, len(deduplicate_stories([first, second], fantasy)))

    def test_homepage_hero_prefers_newer_qualified_major_story(self) -> None:
        now = datetime.now(timezone.utc)
        older = story("NFL team opens routine voluntary practice session", "Regional Reporter", "https://older.example/item")
        older["published_at"] = (now - timedelta(hours=8)).isoformat()
        newer = story("NBA free agency changes after verified major trade", "NBA", "https://newer.example/item")
        newer.update({"desk": "nba", "source_group": "official", "published_at": (now - timedelta(hours=1)).isoformat(), "lanes": ["transactions"]})
        ranked = rank_homepage_stories([older, newer], now)
        self.assertEqual(newer["id"], ranked[0]["id"])

    def test_homepage_hero_is_independent_of_array_order(self) -> None:
        now = datetime.now(timezone.utc)
        items = []
        for index, headline in enumerate((
            "MLB postseason race shifts after verified result",
            "NFL injury update changes roster availability",
            "WNBA playoff picture receives a verified update",
        )):
            item = story(headline, "Associated Press", f"https://order.example/{index}")
            item["published_at"] = (now - timedelta(hours=index + 1)).isoformat()
            items.append(item)
        forward = rank_homepage_stories(items, now)[0]["id"]
        reverse = rank_homepage_stories(list(reversed(items)), now)[0]["id"]
        self.assertEqual(forward, reverse)

    def test_homepage_material_timestamp_does_not_advance_on_noop(self) -> None:
        now = datetime.now(timezone.utc)
        item = story("NFL playoff race receives a verified league update", "NFL", "https://timestamp.example/item")
        item["published_at"] = (now - timedelta(hours=1)).isoformat()
        desks = {"nfl": {"stories": [item]}}
        first = build_homepage_payload(desks, {}, now)
        previous = {"homepage": first}
        second = build_homepage_payload(desks, previous, now + timedelta(minutes=30))
        self.assertEqual(first["updated_at"], second["updated_at"])
        self.assertEqual(first["hero"]["id"], second["hero"]["id"])

if __name__ == "__main__":
    unittest.main()
