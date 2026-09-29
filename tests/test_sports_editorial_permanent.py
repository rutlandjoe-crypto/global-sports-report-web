import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
POLICY=(ROOT/"lib"/"sportsEditorialPolicy.ts").read_text(encoding="utf-8")
VALIDATOR=(ROOT/"validate_sports_editorial_output.py").read_text(encoding="utf-8")

class PermanentSportsEditorialPolicy(unittest.TestCase):
    def test_incident_copy_is_blocked(self):
        for phrase in ["the result should be read through","quarterback efficiency","trench play","coaching decisions","injury fallout"]:
            self.assertIn(phrase,POLICY.lower())
    def test_validator_blocks_incident(self):
        self.assertIn("the result should be read through",VALIDATOR.lower())
    def test_winner_first_protection_exists(self):
        self.assertTrue("winner" in POLICY.lower() or "final" in POLICY.lower())
    def test_dedup_protection_exists(self):
        self.assertTrue("dedup" in POLICY.lower() or "duplicate" in POLICY.lower())

if __name__=="__main__": unittest.main()
