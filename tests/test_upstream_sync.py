from __future__ import annotations

import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


sync = _load("sync_hermes_agent", ROOT / "scripts/upstream/sync_hermes_agent.py")
gate = _load("evaluate_sync", ROOT / "scripts/upstream/evaluate_sync.py")
updater = _load("app_update", ROOT / "scripts/upstream/app_update.py")


class UpstreamSyncTests(unittest.TestCase):
    def test_official_release_is_not_republished_when_already_recorded(self) -> None:
        release = {
            "repo": "NousResearch/hermes-agent",
            "tag": "v0.22.4",
            "tag_object": "64dbae64747ab640a3fece06f359307c30d129da",
            "commit": "4d04303818b61bf3aa09278af48356315515965b",
            "published_at": "2026-10-21T18:49:24Z",
        }
        original = sync.STATE_PATH.read_text(encoding="utf-8")
        try:
            sync.STATE_PATH.write_text(json.dumps({
                "last_synced_tag": release["tag"],
                "last_synced_commit": release["commit"],
            }), encoding="utf-8")
            result = sync.evaluate(release, gates_passed=True)
        finally:
            sync.STATE_PATH.write_text(original, encoding="utf-8")
        self.assertEqual("skip_duplicate", result["decision"])
        self.assertFalse(result["publish_android_release"])
        self.assertIn("already_synced", result["hold_reasons"])

    def test_new_release_is_held_until_engine_adaptation_and_gates_pass(self) -> None:
        result = sync.evaluate({
            "tag": "v9.9.9",
            "tag_object": "abc",
            "commit": "def",
        }, gates_passed=False)
        self.assertEqual("hold", result["decision"])
        self.assertIn("verification_gates_not_passed", result["hold_reasons"])
        self.assertNotIn("engine_not_replaced_pending_android_adaptation", result["hold_reasons"])
        self.assertFalse(result["publish_android_release"])

    def test_merge_conflicts_and_failed_tests_block_publication(self) -> None:
        result = gate.evaluate({
            "proposed_version_code": 8,
            "proposed_version_name": "0.2.6",
            "conflicts": ["android/app/src/main/python/hermes_cli/web_server.py"],
            "tests_passed": False,
            "build_passed": False,
            "publish": True,
            "signature_verified": False,
            "overlay_preserved": True,
        })
        self.assertFalse(result["publish"])
        self.assertIn("unresolved_merge_conflicts", result["errors"])
        self.assertIn("tests_failed_or_not_run", result["errors"])
        self.assertIn("signature_not_verified", result["errors"])

    def test_version_code_must_increase_and_cannot_repeat(self) -> None:
        repeated = gate.evaluate({
            "proposed_version_code": 8,
            "proposed_version_name": "0.2.6",
            "tests_passed": True,
            "build_passed": True,
            "publish": True,
            "signature_verified": True,
            "overlay_preserved": True,
        })
        advanced = gate.evaluate({
            "proposed_version_code": 9,
            "proposed_version_name": "0.2.7",
            "tests_passed": True,
            "build_passed": True,
            "publish": True,
            "signature_verified": True,
            "overlay_preserved": True,
            "engine_replaced": False,
        })
        self.assertIn("version_code_not_increased", repeated["errors"])
        self.assertTrue(advanced["publish"])

    def test_sha256_must_match_before_install_prompt(self) -> None:
        payload = b"hermes-arabic-test-apk"
        digest = hashlib.sha256(payload).hexdigest()
        accepted = updater.assess_update(
            installed_version_code=7,
            release_version_code=8,
            release={"tag_name": "v0.2.6", "assets": [{
                "name": "hermes-arabic-arm64-v0.2.6.apk",
                "browser_download_url": "https://example.invalid/app.apk",
                "size": len(payload),
                "digest": f"sha256:{digest}",
            }]},
            downloaded_bytes=payload,
            expected_package="com.hoodmoshla.hermesarabic",
        )
        rejected = updater.assess_update(
            installed_version_code=7,
            release_version_code=8,
            release={"tag_name": "v0.2.6", "assets": [{
                "name": "hermes-arabic-arm64-v0.2.6.apk",
                "browser_download_url": "https://example.invalid/app.apk",
                "size": len(payload),
                "digest": "sha256:" + ("0" * 64),
            }]},
            downloaded_bytes=payload,
            expected_package="com.hoodmoshla.hermesarabic",
        )
        self.assertTrue(accepted["notify"])
        self.assertTrue(accepted["sha256_ok"])
        self.assertFalse(rejected["install_allowed"])
        self.assertEqual("sha256_mismatch", rejected["error"])

    def test_no_update_notification_for_current_or_older_release(self) -> None:
        current = updater.assess_update(
            installed_version_code=7,
            release={"tag_name": "v0.2.5", "assets": [{
                "name": "hermes-arabic-arm64-v0.2.5.apk",
                "browser_download_url": "https://example.invalid/current.apk",
                "size": 10,
                "digest": "sha256:" + ("a" * 64),
            }]},
            release_version_code=7,
        )
        self.assertFalse(current["notify"])
        self.assertEqual("up_to_date", current["status"])

    def test_user_data_is_not_deleted_by_update_plan(self) -> None:
        plan = updater.install_plan("/data/user/0/com.hoodmoshla.hermesarabic/files")
        self.assertNotIn("clear_data", plan["actions"])
        self.assertTrue(plan["preserves_private_data"])
        self.assertIn("request_user_install_confirmation", plan["actions"])

    def test_download_failure_does_not_publish_or_claim_success(self) -> None:
        failed = updater.assess_update(
            installed_version_code=7,
            release={"tag_name": "v0.2.6", "assets": []},
            network_error="offline",
        )
        self.assertEqual("network_unavailable", failed["status"])
        self.assertFalse(failed["notify"])
        self.assertFalse(failed["install_allowed"])
        self.assertFalse(failed["published"])
