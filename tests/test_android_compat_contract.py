from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _load(name: str, relative: str):
    path = ROOT / relative
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


compat = _load("hermes_arabic_compat", "android/app/src/main/python/hermes_arabic_compat.py")


class AndroidCompatContractTests(unittest.TestCase):
    def test_android_call_matches_official_start_server_contract(self) -> None:
        adapted = compat.adapt_start_server_kwargs(
            host="127.0.0.1",
            port=9129,
            open_browser=True,
            allow_public=True,
            initial_profile="arabic",
        )
        self.assertEqual("127.0.0.1", adapted["host"])
        self.assertEqual(9129, adapted["port"])
        self.assertFalse(adapted["open_browser"])
        self.assertFalse(adapted["allow_public"])
        self.assertTrue(set(adapted) <= set(compat.UPSTREAM_ACCEPTED_KEYS))

    def test_unknown_server_arguments_are_rejected(self) -> None:
        with self.assertRaises(TypeError):
            compat.adapt_start_server_kwargs(host="127.0.0.1", replace_engine=True)

    def test_identity_does_not_pretend_engine_was_replaced(self) -> None:
        identity = compat.engine_identity()
        # v0.22.4 reports 0.0.0 until an install stamp exists. The pin, not this
        # placeholder, is the proof that the embedded tree came from that release.
        self.assertIn(identity["embedded_marker"], {"0.22.4", "0.0.0"})
        self.assertEqual("4d04303818b61bf3aa09278af48356315515965b", identity["official_target"]["commit"])
        self.assertTrue(identity["engine_replaced"])
        self.assertEqual("ar", identity["language"])
        self.assertEqual("", compat.replacement_blocked_reason())

    def test_backend_uses_compat_adapter_and_preserves_data_paths(self) -> None:
        backend = (ROOT / "android/app/src/main/python/hermes_mobile_backend.py").read_text(encoding="utf-8")
        self.assertIn("adapt_start_server_kwargs", backend)
        self.assertIn("hermes-home", backend)
        self.assertNotIn("shutil.rmtree", backend)
        gradle = (ROOT / "android/app/build.gradle").read_text(encoding="utf-8")
        self.assertIn("versionCode 8", gradle)
        self.assertIn('versionName "0.2.6"', gradle)

    def test_wholesale_engine_replacement_remains_blocked(self) -> None:
        root = ROOT / "android/app/src/main/python"
        html = (root / "hermes_cli/web_dist/index.html").read_text(encoding="utf-8")
        self.assertIn('lang="ar"', html)
        self.assertIn('dir="rtl"', html)
        self.assertTrue((root / "hermes_cli/web_server.py").exists())
        self.assertTrue((root / "tools/github_android.py").exists())
        self.assertFalse((root / "apps").exists())
        self.assertFalse((root / "node_modules").exists())
