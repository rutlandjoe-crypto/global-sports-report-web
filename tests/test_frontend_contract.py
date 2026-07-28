from __future__ import annotations

import json
import re
import unittest
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
COMPONENT = ROOT / "components" / "SportsDeskPage.tsx"
HOMEPAGE = ROOT / "app" / "page.tsx"
PAYLOAD = ROOT / "public" / "sports_desks.json"


class FrontendContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.source = COMPONENT.read_text(encoding="utf-8")
        cls.homepage = HOMEPAGE.read_text(encoding="utf-8")
        cls.payload = json.loads(PAYLOAD.read_text(encoding="utf-8"))

    def test_exact_six_published_desks_are_generated(self) -> None:
        self.assertEqual(
            {"nfl", "mlb", "nba", "college-football", "soccer", "fantasy"},
            set(self.payload.get("desks", {})),
        )

    def test_every_generated_story_has_valid_original_url(self) -> None:
        for desk_id, desk in self.payload.get("desks", {}).items():
            for story in desk.get("stories", []):
                parsed = urlparse(str(story.get("url", "")))
                self.assertIn(parsed.scheme, {"http", "https"}, f"{desk_id}: {story.get('title')}")
                self.assertTrue(parsed.netloc, f"{desk_id}: {story.get('title')}")

    def test_story_cards_are_semantic_and_keyboard_accessible(self) -> None:
        self.assertIn('aria-label={`Read ${story.title}', self.source)
        self.assertIn('focus-visible:ring-2', self.source)
        self.assertIn('<article className={compact ? "" : "p-5"}>', self.source)
        self.assertNotRegex(self.source, re.compile(r"<a[^>]*>\s*<a(?:\s|>)", re.DOTALL))
        self.assertIn("after:absolute after:inset-0", self.homepage)
        self.assertIn('["NBA", "/nba"]', self.homepage)
        self.assertNotIn('["WNBA", "/wnba"]', self.homepage)

    def test_every_visible_data_row_is_a_single_full_row_link(self) -> None:
        self.assertIn("function GameRow", self.source)
        self.assertIn("function StandingRow", self.source)
        self.assertIn("function RankingRow", self.source)
        self.assertIn('aria-label={`${String(item.team)} standings', self.source)
        self.assertIn('aria-label={`${String(item.team)} ranking', self.source)
        self.assertIn(".filter((item) => validExternalUrl(item.url) || validExternalUrl(item.source_url))", self.source)

    def test_navigation_is_derived_from_rendered_section_ids(self) -> None:
        self.assertIn('navItems.map((item)', self.source)
        self.assertIn('href={`#${item.id}`}', self.source)
        self.assertIn('id={section.id}', self.source)
        for section_id in ("top-stories", "key-storylines", "editorial-standards"):
            self.assertIn(f'id="{section_id}"', self.source)

    def test_empty_sections_render_truthful_state(self) -> None:
        self.assertIn("Current verified", self.source)
        self.assertIn("is unavailable", self.source)
        self.assertIn("when the provider publishes usable data", self.source)
        self.assertIn("provider?.label", self.source)

    def test_editorial_and_provider_timestamps_are_not_conflated(self) -> None:
        self.assertIn("Editorial selection updated", self.source)
        self.assertIn("Verified data updated", self.source)
        self.assertIn("Source:", self.source)
        self.assertNotIn("Content and data refreshed", self.source)

    def test_no_static_score_or_standing_rows_are_embedded(self) -> None:
        self.assertNotRegex(self.source, re.compile(r'away_score:\s*["\']\d'))
        self.assertNotRegex(self.source, re.compile(r'games_back:\s*["\']\d'))


if __name__ == "__main__":
    unittest.main()
