from __future__ import annotations

import json
import re
import unittest
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
COMPONENT = ROOT / "components" / "SportsDeskPage.tsx"
PAYLOAD = ROOT / "public" / "sports_desks.json"


class FrontendContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.source = COMPONENT.read_text(encoding="utf-8")
        cls.payload = json.loads(PAYLOAD.read_text(encoding="utf-8"))

    def test_every_generated_story_has_valid_original_url(self) -> None:
        for desk_id, desk in self.payload.get("desks", {}).items():
            for story in desk.get("stories", []):
                parsed = urlparse(str(story.get("url", "")))
                self.assertIn(parsed.scheme, {"http", "https"}, f"{desk_id}: {story.get('title')}")
                self.assertTrue(parsed.netloc, f"{desk_id}: {story.get('title')}")

    def test_story_cards_are_semantic_and_keyboard_accessible(self) -> None:
        self.assertIn('aria-label={`Read ${story.title}', self.source)
        self.assertIn('focus-visible:ring-2', self.source)
        self.assertIn('after:absolute after:inset-0', self.source)
        self.assertNotRegex(self.source, re.compile(r"<a[^>]*>\s*<a", re.DOTALL))

    def test_navigation_is_derived_from_rendered_section_ids(self) -> None:
        self.assertIn('navItems.map((item)', self.source)
        self.assertIn('href={`#${item.id}`}', self.source)
        self.assertIn('id={section.id}', self.source)
        for section_id in ("top-stories", "key-storylines", "editorial-standards"):
            self.assertIn(f'id="{section_id}"', self.source)

    def test_empty_sections_render_truthful_state(self) -> None:
        self.assertIn("Current verified", self.source)
        self.assertIn("is unavailable", self.source)
        self.assertIn("next successful provider update", self.source)

    def test_no_static_score_or_standing_rows_are_embedded(self) -> None:
        self.assertNotRegex(self.source, re.compile(r'away_score:\s*["\']\d'))
        self.assertNotRegex(self.source, re.compile(r'games_back:\s*["\']\d'))


if __name__ == "__main__":
    unittest.main()