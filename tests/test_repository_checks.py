from __future__ import annotations

import importlib.util
import json
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("verify_project", ROOT / "scripts/verify_project.py")
assert SPEC and SPEC.loader
verify_project = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(verify_project)
BACKEND_SPEC = importlib.util.spec_from_file_location(
    "hermes_mobile_backend",
    ROOT / "android/app/src/main/python/hermes_mobile_backend.py",
)
assert BACKEND_SPEC and BACKEND_SPEC.loader
android_backend = importlib.util.module_from_spec(BACKEND_SPEC)
BACKEND_SPEC.loader.exec_module(android_backend)


class RepositoryInvariantTests(unittest.TestCase):
    def test_project_invariants(self) -> None:
        self.assertEqual([], verify_project.check())

    def test_embedded_python_sources_compile_before_chaquopy_packaging(self) -> None:
        python_root = ROOT / "android/app/src/main/python"
        source_files = sorted(python_root.rglob("*.py"))
        self.assertTrue(source_files, "No embedded Python sources found")
        syntax_errors: list[str] = []
        for path in source_files:
            try:
                compile(path.read_bytes(), str(path), "exec")
            except (SyntaxError, UnicodeDecodeError) as exc:
                syntax_errors.append(f"{path.relative_to(ROOT)}: {exc}")
        self.assertEqual([], syntax_errors, "Embedded Python syntax errors:\n" + "\n".join(syntax_errors))

    def test_backend_status_does_not_report_ready_for_open_port_only(self) -> None:
        with (
            patch.object(android_backend, "_is_port_open", return_value=True),
            patch.object(android_backend, "_read_api_status", return_value=None),
            patch.object(android_backend, "_last_error", ""),
        ):
            result = json.loads(android_backend.status())
        self.assertTrue(result["running"])
        self.assertFalse(result["ready"])
        self.assertFalse(result["ok"])

    def test_backend_status_reports_ready_after_live_api_response(self) -> None:
        with (
            patch.object(android_backend, "_is_port_open", return_value=True),
            patch.object(android_backend, "_read_api_status", return_value={"version": "test"}),
            patch.object(android_backend, "_server_thread", threading.current_thread()),
            patch.object(android_backend, "_last_error", ""),
        ):
            result = json.loads(android_backend.status())
        self.assertTrue(result["ready"])
        self.assertTrue(result["ok"])

    def test_backend_rejects_health_response_without_its_server_thread(self) -> None:
        with (
            patch.object(android_backend, "_is_port_open", return_value=True),
            patch.object(android_backend, "_read_api_status", return_value={"version": "other-service"}),
            patch.object(android_backend, "_server_thread", None),
            patch.object(android_backend, "_last_error", ""),
        ):
            result = json.loads(android_backend.status())
        self.assertTrue(result["running"])
        self.assertFalse(result["thread_alive"])
        self.assertFalse(result["ready"])
        self.assertFalse(result["ok"])

    def test_diagnose_does_not_pass_before_backend_readiness(self) -> None:
        with (
            patch.object(android_backend, "initialize", return_value=json.dumps({"ok": True})),
            patch.object(android_backend, "status", return_value=json.dumps({"ok": False, "ready": False})),
        ):
            result = json.loads(android_backend.diagnose("/tmp/hermes-test", 9129))
        self.assertFalse(result["ok"])

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
        self.assertIn('android:foregroundServiceType="specialUse"', manifest)
        self.assertIn('android.permission.FOREGROUND_SERVICE_SPECIAL_USE', manifest)
        self.assertIn('android.intent.action.BOOT_COMPLETED', manifest)
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

    def test_local_gguf_is_pinned_verified_and_loopback_only(self) -> None:
        manager = (ROOT / "android/app/src/main/java/com/hoodmoshla/hermesarabic/LocalModelManager.java").read_text(encoding="utf-8")
        downloader = (ROOT / "android/app/src/main/java/com/hoodmoshla/hermesarabic/ResumableModelDownloader.java").read_text(encoding="utf-8")
        backend = (ROOT / "android/app/src/main/python/hermes_mobile_backend.py").read_text(encoding="utf-8")
        service = (ROOT / "android/app/src/main/java/com/hoodmoshla/hermesarabic/HermesForegroundService.java").read_text(encoding="utf-8")
        self.assertIn("6eb923e7d26e9cea28811e1a8e852009b21242fb157b26149d3b188f3a8c8653", manager)
        self.assertIn("41ba88dbac95fed2528c92514c131d73eb5a174b", manager)
        self.assertIn("ResumableModelDownloader.download", manager)
        self.assertIn("127.0.0.1", manager)
        self.assertIn("MessageDigest.getInstance(\"SHA-256\")", downloader)
        self.assertIn("configure_local_model", backend)
        self.assertIn("restore_local_model", backend)
        self.assertIn("import hermes_cli.web_server", backend)
        self.assertIn("LocalModelManager.resumeSelected(this)", service)
        self.assertIn("HermesForegroundService", service)
        self.assertIn("ResumableModelDownloader.sha256(file)", manager)
        self.assertIn("intent == null && !isEnabledAfterBoot(this)", service)

    def test_github_writes_require_native_approval_and_keep_token_native(self) -> None:
        root = ROOT / "android/app/src/main/java/com/hoodmoshla/hermesarabic"
        connector = (root / "GitHubConnector.java").read_text(encoding="utf-8")
        secret_store = (root / "AndroidSecretStore.java").read_text(encoding="utf-8")
        tools = (ROOT / "android/app/src/main/python/tools/github_android.py").read_text(encoding="utf-8")
        activity = (root / "MainActivity.java").read_text(encoding="utf-8")
        self.assertIn("HttpUrl.parse(API + path)", connector)
        self.assertIn('"https".equals(parsedUrl.scheme())', connector)
        self.assertIn("builder.method(method, requestBody)", connector)
        self.assertIn(".followRedirects(false)", connector)
        self.assertIn("AndroidSecretStore.put(context(), TOKEN_ALIAS, TOKEN_PREF, value)", connector)
        self.assertIn("workflow_dispatch", connector)
        self.assertIn("أوافق على تشغيل الاختبارات", connector)
        self.assertIn("dispatchWorkflow(proposal)", connector)
        self.assertIn("create_branch", connector)
        self.assertIn("agentProposeChanges", connector)
        self.assertIn('Cipher.getInstance(TRANSFORMATION)', secret_store)
        self.assertIn("github_propose_changes", tools)
        self.assertIn("github_propose_workflow_run", tools)
        self.assertIn("github_list_workflows", tools)
        self.assertIn("listPendingGitHubProposals", activity)
        self.assertIn("approveGitHubProposal", activity)
        self.assertIn("proposeGitHubWorkflowRun", activity)

    def test_mobile_ui_exposes_real_local_model_and_github_controls(self) -> None:
        bridge = (ROOT / "www/hermes-mobile-bridge.js").read_text(encoding="utf-8")
        self.assertIn("local-model-download", bridge)
        self.assertIn('callHermesAndroidJson("startLocalModel"', bridge)
        self.assertIn("github-files", bridge)
        self.assertIn('callHermesAndroidJson("listGitHubTree"', bridge)
        self.assertIn("github-approve", bridge)
        self.assertIn("github-run-workflow", bridge)
        self.assertIn('callHermesAndroidJson("listGitHubWorkflows"', bridge)


if __name__ == "__main__":
    unittest.main()
