from __future__ import annotations

import hashlib
import json
import os
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

import requests

import build_distribution
import espn_http
import get_soccer_report


class EspnHttpTests(unittest.TestCase):
    def test_session_uses_real_requests_identity_and_json_accept(self) -> None:
        session = espn_http._build_session()
        self.assertTrue(session.headers["User-Agent"].startswith("python-requests/"))
        self.assertEqual("application/json", session.headers["Accept"])
        self.assertNotIn("Mozilla", session.headers["User-Agent"])

    def test_http_failure_reports_status_and_request_context(self) -> None:
        response = requests.Response()
        response.status_code = 403
        response.url = "https://site.api.espn.com/example"
        response.request = requests.Request("GET", response.url).prepare()

        with patch.object(espn_http._SESSION, "get", return_value=response) as get:
            with self.assertRaisesRegex(espn_http.EspnFetchError, "HTTP 403"):
                espn_http.fetch_espn_json(response.url)

        get.assert_called_once_with(
            response.url,
            params=None,
            timeout=(5, 20),
            allow_redirects=True,
        )


class SoccerIntegrityTests(unittest.TestCase):
    def test_monitoring_window_copy_is_not_valid_sourced_content(self) -> None:
        report = "SOCCER REPORT\n\nUPCOMING\n- Monitoring window card"
        self.assertFalse(get_soccer_report.report_has_valid_sourced_content(report, 1))

    def test_failed_fetch_removes_stale_marker_without_replacing_report(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            report_path = root / "soccer_report.txt"
            marker_path = root / ".gsr_soccer_success.json"
            temp_marker_path = root / ".gsr_soccer_success.json.tmp"
            report_path.write_text("previous valid report\n", encoding="utf-8")
            marker_path.write_text('{"run_token": "old"}\n', encoding="utf-8")

            with (
                patch.object(get_soccer_report, "OUTPUT_FILE", report_path),
                patch.object(get_soccer_report, "SUCCESS_MARKER", marker_path),
                patch.object(get_soccer_report, "SUCCESS_MARKER_TEMP", temp_marker_path),
                patch.object(get_soccer_report, "fetch_events", side_effect=RuntimeError("HTTP 503")),
            ):
                self.assertEqual(1, get_soccer_report.main())

            self.assertFalse(marker_path.exists())
            self.assertEqual("previous valid report\n", report_path.read_text(encoding="utf-8"))

    def test_marker_hashes_the_bytes_written_to_disk(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            report_path = root / "soccer_report.txt"
            marker_path = root / ".gsr_soccer_success.json"
            temp_marker_path = root / ".gsr_soccer_success.json.tmp"
            report = "SOCCER REPORT\n\nUPCOMING\n- Club A at Club B - 7:00 PM.\n"
            report_path.write_text(report, encoding="utf-8")
            event = {
                "id": "1",
                "competitions": [
                    {
                        "status": {"type": {"state": "pre"}},
                        "competitors": [
                            {"team": {"displayName": "Club A"}},
                            {"team": {"displayName": "Club B"}},
                        ],
                    }
                ],
            }

            with (
                patch.object(get_soccer_report, "OUTPUT_FILE", report_path),
                patch.object(get_soccer_report, "SUCCESS_MARKER", marker_path),
                patch.object(get_soccer_report, "SUCCESS_MARKER_TEMP", temp_marker_path),
            ):
                get_soccer_report.write_success_marker(report, [event], "current-run")

            marker = json.loads(marker_path.read_text(encoding="utf-8"))
            self.assertEqual(
                hashlib.sha256(report_path.read_bytes()).hexdigest(),
                marker["report_sha256"],
            )


class DistributionHandoffTests(unittest.TestCase):
    def _write_marker(self, marker_path: Path, report_path: Path, token: str) -> None:
        marker_path.write_text(
            json.dumps(
                {
                    "run_token": token,
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                    "source": "ESPN",
                    "valid_event_count": 2,
                    "report_sha256": hashlib.sha256(report_path.read_bytes()).hexdigest(),
                }
            ),
            encoding="utf-8",
        )

    def test_current_token_fresh_hash_bound_soccer_handoff_is_accepted(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            report_path = root / "soccer_report.txt"
            marker_path = root / ".gsr_soccer_success.json"
            token = "current-test-run"
            report_path.write_text(
                "SOCCER REPORT | 2026-08-10\n\nUPCOMING\n- Club A at Club B - 7:00 PM.\n",
                encoding="utf-8",
            )
            self._write_marker(marker_path, report_path, token)

            with (
                patch.object(build_distribution, "SOCCER_SUCCESS_MARKER", marker_path),
                patch.dict(os.environ, {"GSR_RUN_TOKEN": token}, clear=False),
            ):
                valid, reason = build_distribution.validate_soccer_handoff(report_path)

            self.assertTrue(valid, reason)

    def test_wrong_token_and_placeholder_copy_are_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            report_path = root / "soccer_report.txt"
            marker_path = root / ".gsr_soccer_success.json"
            report_path.write_text(
                "SOCCER REPORT\n\nUPCOMING\n- Generic monitoring window card\n",
                encoding="utf-8",
            )
            self._write_marker(marker_path, report_path, "old-run")

            with (
                patch.object(build_distribution, "SOCCER_SUCCESS_MARKER", marker_path),
                patch.dict(os.environ, {"GSR_RUN_TOKEN": "current-run"}, clear=False),
            ):
                valid, reason = build_distribution.validate_soccer_handoff(report_path)
            self.assertFalse(valid)
            self.assertIn("token", reason.lower())

            self._write_marker(marker_path, report_path, "current-run")
            with (
                patch.object(build_distribution, "SOCCER_SUCCESS_MARKER", marker_path),
                patch.dict(os.environ, {"GSR_RUN_TOKEN": "current-run"}, clear=False),
            ):
                valid, reason = build_distribution.validate_soccer_handoff(report_path)
            self.assertFalse(valid)
            self.assertIn("fallback or placeholder", reason.lower())


if __name__ == "__main__":
    unittest.main()
