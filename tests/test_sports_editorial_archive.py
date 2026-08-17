from __future__ import annotations

import unittest

from scripts.build_sports_editorial_archive import (
    build_archive,
    displayed_editorial,
    is_durable_editorial,
)


def story(url: str = "https://example.com/original-story", summary: str | None = None) -> dict:
    return {
        "id": url,
        "title": "Original Source Headline Remains Unchanged",
        "summary": summary
        or "This substantive source summary provides verified context about a legitimate team and player development.",
        "url": url,
        "canonical_url": url,
        "publisher": "Example Sports",
        "source_group": "national",
        "feed": "Example feed",
        "published_at": "2026-08-15T12:00:00+00:00",
        "teams": ["Example Team"],
        "players": ["Example Player"],
        "sport": "football",
        "competitions": ["NFL"],
        "lanes": ["injuries"],
    }


def payload(item: dict, generated: str = "2026-08-15T13:00:00+00:00") -> dict:
    return {
        "generated_at": generated,
        "desks": {
            "nfl": {
                "modules": {
                    "top-stories": {"items": [item]},
                    "scores": {"items": [story("https://example.com/score-row")]},
                }
            }
        },
    }


class SportsEditorialArchiveTests(unittest.TestCase):
    def test_only_displayed_editorial_modules_are_candidates(self):
        candidates = list(displayed_editorial(payload(story())))
        self.assertEqual(1, len(candidates))
        self.assertEqual("https://example.com/original-story", candidates[0][1]["url"])

    def test_google_redirects_and_thin_feed_echoes_are_excluded(self):
        self.assertFalse(is_durable_editorial(story("https://news.google.com/rss/articles/abc")))
        thin = story(summary="Short feed item")
        self.assertFalse(is_durable_editorial(thin))

    def test_canonical_source_url_deduplicates_repeated_publication(self):
        first = payload(story(), "2026-08-15T13:00:00+00:00")
        second_story = story(summary="This later and more detailed substantive source summary provides verified context about a legitimate team and player development for readers.")
        second = payload(second_story, "2026-08-15T14:00:00+00:00")

        stories = build_archive([first, second])

        self.assertEqual(1, len(stories))
        self.assertEqual("Original Source Headline Remains Unchanged", stories[0]["title"])
        self.assertEqual("2026-08-15T13:00:00+00:00", stories[0]["firstSeenAt"])
        self.assertEqual("2026-08-15T14:00:00+00:00", stories[0]["lastSeenAt"])
        self.assertEqual("https://example.com/original-story", stories[0]["sourceUrl"])


if __name__ == "__main__":
    unittest.main()
