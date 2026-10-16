from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("verify_project", ROOT / "scripts/verify_project.py")
assert SPEC and SPEC.loader
verify_project = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(verify_project)


class RepositoryInvariantTests(unittest.TestCase):
    def test_project_invariants(self) -> None:
        self.assertEqual([], verify_project.check())

    def test_secret_scanner_recognizes_test_fixture_only(self) -> None:
        scanner = verify_project.re.compile(
            r"(?i)(?:gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----)"
        )
        self.assertIsNotNone(scanner.search("ghp_" + "A" * 30))
        private_key_marker = "-----BEGIN " + "PRIVATE KEY" + "-----"
        self.assertIsNotNone(scanner.search(private_key_marker))
        self.assertIsNone(scanner.search("ghp_not-a-real-token"))

    def test_embedded_and_source_bridges_are_identical(self) -> None:
        source = ROOT / "www/hermes-mobile-bridge.js"
        embedded = ROOT / "android/app/src/main/assets/public/hermes-mobile-bridge.js"
        self.assertEqual(source.read_bytes(), embedded.read_bytes())

    def test_android_secret_and_rtl_guards_are_present(self) -> None:
        activity = (ROOT / "android/app/src/main/java/com/hoodmoshla/hermesarabic/MainActivity.java").read_text(encoding="utf-8")
        manifest = (ROOT / "android/app/src/main/AndroidManifest.xml").read_text(encoding="utf-8")
        network = (ROOT / "android/app/src/main/res/xml/network_security_config.xml").read_text(encoding="utf-8")
        locale = (ROOT / "android/app/src/main/assets/hermes-arabic-locale.js").read_text(encoding="utf-8")
        self.assertIn('KeyStore.getInstance("AndroidKeyStore")', activity)
        self.assertIn('Cipher.getInstance("AES/GCM/NoPadding")', activity)
        self.assertIn('android:allowBackup="false"', manifest)
        self.assertIn('android:usesCleartextTraffic="false"', manifest)
        self.assertIn('<base-config cleartextTrafficPermitted="false"', network)
        self.assertIn('<domain includeSubdomains="false">127.0.0.1</domain>', network)
        self.assertIn('document.documentElement.dir = "rtl"', locale)
        self.assertIn('options.optString("language", "ar")', activity)
        self.assertIn('Locale.forLanguageTag(finalLanguage)', activity)

    def test_arabic_is_the_default_mobile_agent_locale(self) -> None:
        bridge = (ROOT / "www/hermes-mobile-bridge.js").read_text(encoding="utf-8")
        self.assertIn('var currentLocale = "ar"', bridge)
        self.assertIn('return { display: { language: currentLocale } };', bridge)
        self.assertIn('data-locale=\\"ar\\">العربية', bridge)

    def test_remote_provider_requires_disclosure_and_https(self) -> None:
        bridge = (ROOT / "www/hermes-mobile-bridge.js").read_text(encoding="utf-8")
        self.assertIn("async function ensureExternalProviderConsent()", bridge)
        self.assertIn("endpoint.protocol !== \"https:\"", bridge)
        self.assertIn("window.confirm(notice)", bridge)
        self.assertIn("hermes.mobile.external-provider-consent:", bridge)
        self.assertIn("if (!(await ensureExternalProviderConsent()))", bridge)


if __name__ == "__main__":
    unittest.main()
