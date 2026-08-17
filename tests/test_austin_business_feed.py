import unittest
from datetime import datetime, timedelta, timezone

from scripts.update_austin_business_brief import qualifies, select_stories


NOW = datetime(2026, 8, 17, 14, 0, tzinfo=timezone.utc)


def story(headline: str, *, hours_old: int = 2, priority: int = 3, url_suffix: str = "story") -> dict:
    return {
        "headline": headline,
        "context": "Austin employers and investors face a material local business consequence from this major development.",
        "url": f"https://example.com/{url_suffix}",
        "source": "Example News",
        "source_priority": priority,
        "published_at": (NOW - timedelta(hours=hours_old)).isoformat(),
    }


class AustinBusinessFeedTests(unittest.TestCase):
    def test_requires_local_business_and_material_signals(self) -> None:
        self.assertTrue(qualifies(story("Austin company announces $200 million technology expansion")))
        nonlocal_story = story("Company announces $200 million technology expansion in Phoenix")
        nonlocal_story["context"] = "The company plans a major new technology campus and jobs in Phoenix."
        self.assertFalse(qualifies(nonlocal_story))
        routine_story = story("Austin neighborhood hosts a weekend gathering")
        routine_story["context"] = "Residents will gather in an Austin park for a community activity."
        self.assertFalse(qualifies(routine_story))

    def test_rejects_routine_and_promotional_local_items(self) -> None:
        self.assertFalse(qualifies(story("Austin technology podcast makes national list")))
        self.assertFalse(qualifies(story("Austin weather forecast affects morning traffic")))
        self.assertFalse(qualifies(story("City of Austin funds drink-spiking prevention program")))
        self.assertFalse(qualifies(story("Georgetown ISD considers $8M teacher pay vote")))

    def test_selects_up_to_three_and_deduplicates_related_headlines(self) -> None:
        candidates = [
            story("Austin chipmaker announces $2 billion expansion", url_suffix="one"),
            story("Austin chipmaker details $2 billion expansion plan", url_suffix="one-copy"),
            story("Round Rock employer adds 500 jobs at new campus", url_suffix="two"),
            story("Central Texas data center starts major construction", url_suffix="three"),
            story("Austin airport begins $1 billion terminal project", url_suffix="four"),
        ]
        selected = select_stories(candidates, [], NOW)
        self.assertEqual(len(selected), 3)
        self.assertLessEqual(
            sum("chipmaker" in item["headline"].lower() for item in selected),
            1,
        )

    def test_retains_strong_recent_story_but_expires_stale_state(self) -> None:
        retained = story("Austin employer begins major headquarters expansion", hours_old=30, url_suffix="retained")
        retained["first_seen_at"] = (NOW - timedelta(hours=24)).isoformat()
        stale = story("Austin company begins major campus development", hours_old=49, url_suffix="stale")
        selected = select_stories([], [retained, stale], NOW)
        self.assertEqual([item["headline"] for item in selected], [retained["headline"]])

    def test_new_stronger_stories_can_replace_retained_item(self) -> None:
        retained = story("Austin employer begins major office expansion", hours_old=30, priority=1, url_suffix="retained")
        newcomers = [
            story("Austin chipmaker announces $3 billion semiconductor facility", priority=5, url_suffix="new-one"),
            story("Central Texas manufacturer adds 800 jobs in major expansion", priority=5, url_suffix="new-two"),
            story("Austin airport awards $1 billion construction contract", priority=5, url_suffix="new-three"),
        ]
        selected = select_stories(newcomers, [retained], NOW)
        self.assertNotIn(retained["headline"], [item["headline"] for item in selected])


if __name__ == "__main__":
    unittest.main()
