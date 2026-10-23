"""Functional checks for the Android-facing Hermes Agent v0.22.4 embed.

These tests boot the embedded engine in a temporary HERMES_HOME. They never
touch a user's real profile, GitHub credentials, or model downloads.
"""
from __future__ import annotations

import importlib.util
import json
import os
import sqlite3
import sys
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PYROOT = ROOT / "android" / "app" / "src" / "main" / "python"


def _load(name: str, relative: str):
    path = ROOT / relative
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class EmbeddedEngineFunctionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        sys.path.insert(0, str(PYROOT))
        os.environ["HERMES_ANDROID_EMBEDDED"] = "1"
        os.environ["HERMES_DESKTOP"] = "1"
        os.environ["HERMES_NO_BROWSER_OPEN"] = "1"
        cls.home = Path(tempfile.mkdtemp(prefix="hermes-fn-"))
        cls.files = cls.home / "files"
        cls.port = 19141
        os.environ["HERMES_HOME"] = str(cls.files / "hermes-home")
        backend = importlib.import_module("hermes_mobile_backend")
        cls.backend = backend
        started = json.loads(backend.start(str(cls.files), cls.port))
        if not started.get("ok"):
            raise AssertionError(f"embedded server did not start: {started}")
        deadline = time.time() + 40
        last = ""
        while time.time() < deadline:
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{cls.port}/api/status", timeout=2) as response:
                    if response.status == 200:
                        cls.status_body = json.loads(response.read().decode("utf-8"))
                        return
            except Exception as exc:
                last = type(exc).__name__
                time.sleep(0.4)
        raise AssertionError(f"/api/status did not become ready: {last}")

    @classmethod
    def tearDownClass(cls) -> None:
        try:
            cls.backend.stop(str(cls.files), cls.port)
        except Exception:
            pass

    def test_status_and_arabic_dashboard(self) -> None:
        self.assertIsInstance(self.status_body, dict)
        with urllib.request.urlopen(f"http://127.0.0.1:{self.port}/", timeout=5) as response:
            html = response.read().decode("utf-8", "replace")
        self.assertIn('lang="ar"', html)
        self.assertIn('dir="rtl"', html)

    def test_local_model_config_roundtrip_preserves_previous_provider(self) -> None:
        from hermes_cli.config import load_config, save_config

        save_config({"model": {"default": "cloud-model", "provider": "openai"}})
        configured = json.loads(self.backend.configure_local_model(
            "qwen2.5-0.5b-instruct-q4_k_m",
            "http://127.0.0.1:9130/v1",
            "k" * 40,
            str(self.files),
        ))
        self.assertTrue(configured["ok"], configured)
        saved = load_config().get("model", {})
        self.assertEqual("custom", saved.get("provider"))
        self.assertNotIn("api_key", saved)
        self.assertNotIn("CUSTOM_API_KEY", json.dumps(saved))
        restored = json.loads(self.backend.restore_local_model(str(self.files)))
        self.assertTrue(restored["ok"], restored)
        after = load_config().get("model", {})
        self.assertEqual("cloud-model", after.get("default"))
        self.assertEqual("openai", after.get("provider"))
        self.assertNotIn("CUSTOM_API_KEY", os.environ)

    def test_local_model_rejects_unverified_endpoint(self) -> None:
        result = json.loads(self.backend.configure_local_model(
            "other-model", "http://example.invalid/v1", "short", str(self.files)))
        self.assertFalse(result["ok"])

    def test_sessions_route_lists_multiple_conversations(self) -> None:
        from hermes_state import SessionDB
        from hermes_cli.config import get_hermes_home

        db = SessionDB()
        first = db.create_session("arabic-one", "android", display_name="محادثة أولى")
        second = db.create_session("arabic-two", "android", display_name="محادثة ثانية")
        self.assertTrue(first)
        self.assertTrue(second)
        with urllib.request.urlopen(f"http://127.0.0.1:{self.port}/", timeout=8) as response:
            html = response.read().decode("utf-8", "replace")
        match = re.search(r'window.__HERMES_SESSION_TOKEN__="([^"]+)"', html)
        self.assertIsNotNone(match, "dashboard did not inject the local session token")
        request = urllib.request.Request(
            f"http://127.0.0.1:{self.port}/api/sessions",
            headers={"X-Hermes-Session-Token": match.group(1)},
        )
        with urllib.request.urlopen(request, timeout=8) as response:
            body = json.loads(response.read().decode("utf-8"))
        encoded = json.dumps(body, ensure_ascii=False)
        self.assertIn("arabic-one", encoded)
        self.assertIn("arabic-two", encoded)
        state = Path(db.db_path)
        self.assertEqual(get_hermes_home().resolve(), state.parent.resolve())
        self.assertTrue(state.exists())
        with sqlite3.connect(state) as conn:
            count = conn.execute("select count(*) from sessions").fetchone()[0]
        self.assertGreaterEqual(count, 2)

    def test_github_write_tools_stage_proposals_without_pushing(self) -> None:
        import tools.github_android  # noqa: F401
        from tools.registry import registry

        names = {entry.name for entry in registry.get_all_entries() if entry.name.startswith("github_")}
        self.assertIn("github_list_repositories", names)
        self.assertIn("github_propose_changes", names)
        result = json.loads(registry.dispatch("github_propose_changes", {
            "repository": "hoodmoshla/Hermes-Arabic",
            "branch": "main",
            "changes": [{"path": "notes.txt", "content": "تجربة"}],
            "commit_message": "test",
        }))
        self.assertFalse(result["ok"])
        self.assertIn("unavailable", result["error"])

    def test_foreground_stop_leaves_home_data_intact(self) -> None:
        from hermes_cli.config import get_hermes_home

        home = get_hermes_home()
        marker = home / "user-data-marker.txt"
        marker.write_text("keep", encoding="utf-8")
        state_before = list(home.glob("state.db"))
        stopped = json.loads(self.backend.stop(str(self.files), self.port))
        self.assertTrue(stopped["ok"], stopped)
        self.assertTrue(marker.exists())
        self.assertEqual(state_before, list(home.glob("state.db")))
        # Later HTTP tests must see the same long-lived embedded server.
        if not self.backend.is_running():
            restarted = json.loads(self.backend.start(str(self.files), self.port))
            self.assertTrue(restarted["ok"], restarted)

    def test_java_bridges_and_background_service_remain_present(self) -> None:
        java = ROOT / "android/app/src/main/java/com/hoodmoshla/hermesarabic"
        for name in (
            "GitHubConnector.java",
            "LocalModelManager.java",
            "HermesForegroundService.java",
            "ResumableModelDownloader.java",
        ):
            self.assertTrue((java / name).exists(), name)
        service = (java / "HermesForegroundService.java").read_text(encoding="utf-8")
        self.assertIn("startForeground", service)
        gradle = (ROOT / "android/app/build.gradle").read_text(encoding="utf-8")
        self.assertIn('applicationId "com.hoodmoshla.hermesarabic"', gradle)
        self.assertIn('abiFilters "arm64-v8a"', gradle)


if __name__ == "__main__":
    unittest.main()
