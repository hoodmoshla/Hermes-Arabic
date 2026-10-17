from __future__ import annotations

import importlib.util
import json
import sys
import threading
import types
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
            patch.object(android_backend, "_last_health_error", "API route not ready"),
            patch.object(android_backend, "_server_thread", threading.current_thread()),
            patch.object(android_backend, "_active_task_snapshot", return_value={"available": False, "active_tasks": None, "error": "not ready"}),
        ):
            result = json.loads(android_backend.status())
        self.assertTrue(result["running"])
        self.assertFalse(result["ready"])
        self.assertFalse(result["ok"])
        self.assertIn("API route not ready", result["error"])

    def test_backend_status_reports_ready_after_live_api_response(self) -> None:
        with (
            patch.object(android_backend, "_is_port_open", return_value=True),
            patch.object(android_backend, "_read_api_status", return_value={"version": "test"}),
            patch.object(android_backend, "_server_thread", threading.current_thread()),
            patch.object(android_backend, "_last_error", ""),
            patch.object(android_backend, "_active_task_snapshot", return_value={"available": True, "active_tasks": 2, "error": ""}),
        ):
            result = json.loads(android_backend.status())
        self.assertTrue(result["ready"])
        self.assertTrue(result["ok"])
        self.assertEqual(2, result["active_tasks"])
        self.assertTrue(result["task_state_available"])

    def test_work_registry_is_available_even_when_http_server_is_down(self) -> None:
        for count in (0, 2):
            with (
                self.subTest(active_tasks=count),
                patch.object(android_backend, "_is_port_open", return_value=False),
                patch.object(android_backend, "_server_thread", None),
                patch.object(android_backend, "_active_task_snapshot", return_value={"available": True, "active_tasks": count, "error": ""}),
            ):
                result = json.loads(android_backend.status())
                self.assertFalse(result["ready"])
                self.assertTrue(result["task_state_available"])
                self.assertEqual(count, result["active_tasks"])

    def test_backend_task_snapshot_counts_parallel_sessions_background_and_subagents(self) -> None:
        module = types.ModuleType("tui_gateway.server")
        module._sessions_lock = threading.RLock()
        module._sessions = {
            "one": {"running": True},
            "two": {"running": True},
            "queued": {"running": False, "queued_prompt": {"text": "later"}},
            "idle": {"running": False},
        }
        module._background_tasks_lock = threading.RLock()
        module._background_tasks = {"bg_a": {"running": True}}
        tools = types.ModuleType("tools")
        tools.__path__ = []
        delegation = types.ModuleType("tools.async_delegation")
        delegation.active_count = lambda: 2
        gateway = types.ModuleType("tui_gateway")
        gateway.__path__ = []
        gateway.server = module
        with patch.dict(sys.modules, {
            "tui_gateway": gateway,
            "tui_gateway.server": module,
            "tools": tools,
            "tools.async_delegation": delegation,
        }):
            result = android_backend._active_task_snapshot()
        self.assertEqual({"available": True, "active_tasks": 6, "error": ""}, result)

    def test_backend_task_snapshot_fails_closed_on_unknown_session_status(self) -> None:
        module = types.ModuleType("tui_gateway.server")
        module._sessions_lock = threading.RLock()
        module._sessions = {"unknown": {}}
        module._background_tasks_lock = threading.RLock()
        module._background_tasks = {}
        gateway = types.ModuleType("tui_gateway")
        gateway.__path__ = []
        gateway.server = module
        with patch.dict(sys.modules, {"tui_gateway": gateway, "tui_gateway.server": module}):
            result = android_backend._active_task_snapshot()
        self.assertFalse(result["available"])
        self.assertIsNone(result["active_tasks"])
        self.assertIn("ValueError", result["error"])

    def test_backend_task_snapshot_fails_closed_when_state_is_unknown(self) -> None:
        with patch("builtins.__import__", side_effect=ImportError("not available")):
            result = android_backend._active_task_snapshot()
        self.assertFalse(result["available"])
        self.assertIsNone(result["active_tasks"])
        self.assertIn("ImportError", result["error"])

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
        self.assertNotIn('android.intent.action.BOOT_COMPLETED', manifest)
        self.assertNotIn('android.permission.RECEIVE_BOOT_COMPLETED', manifest)
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
        self.assertIn("START_NOT_STICKY", service)
        self.assertNotIn("START_STICKY", service)
        self.assertIn("checkIdleRuntime", service)
        self.assertIn("task_state_available", service)
        self.assertIn("HermesForegroundService.setActivityInForeground(true)", (ROOT / "android/app/src/main/java/com/hoodmoshla/hermesarabic/MainActivity.java").read_text(encoding="utf-8"))

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

    def test_parallel_tasks_do_not_mark_partial_results_complete(self) -> None:
        bridge = (ROOT / "www/hermes-mobile-bridge.js").read_text(encoding="utf-8")
        self.assertIn('finish(answer ? "انتهت مهلة المهمة المتوازية قبل اكتمالها؛ الرد المستلم جزئي." : "انتهت مهلة المهمة المتوازية قبل اكتمال رد Hermes.");', bridge)
        self.assertIn('if (!settled) finish(answer ? "أُغلق اتصال Hermes قبل اكتمال المهمة؛ الرد المستلم جزئي." : "أُغلق اتصال Hermes قبل اكتمال المهمة.");', bridge)
        self.assertNotIn('finish(answer ? "" : "انتهت مهلة المهمة المتوازية.")', bridge)

    def test_mobile_composer_stays_on_one_row_and_attachment_menu_can_escape_footer(self) -> None:
        css = (ROOT / "www/hermes-arabic-mobile.css").read_text(encoding="utf-8")
        bridge = (ROOT / "www/hermes-mobile-bridge.js").read_text(encoding="utf-8")
        activity = (ROOT / "android/app/src/main/java/com/hoodmoshla/hermesarabic/MainActivity.java").read_text(encoding="utf-8")
        self.assertRegex(css, r"#hermes-mobile-inputbar\s*\{[^}]*display:\s*flex\s*!important;")
        self.assertRegex(css, r"#hermes-mobile-inputbar\s*\{[^}]*flex-wrap:\s*nowrap\s*!important;")
        self.assertRegex(css, r"#hermes-mobile-inputbar\s*\{[^}]*width:\s*100%\s*!important;")
        self.assertRegex(css, r"#hermes-mobile-bottom\s*\{[^}]*overflow:\s*visible\s*!important;")
        self.assertIn(";overflow:visible;}#hermes-mobile-inputbar{display:flex;flex-direction:row;flex-wrap:nowrap;direction:rtl;", bridge)
        self.assertIn("align-items:center;width:100%;max-width:100%;box-sizing:border-box;", bridge)
        self.assertIn("#hermes-mobile-input{flex:1 1 0%;min-width:0;min-height:38px;", bridge)
        self.assertIn('data-action=\\\"pick-file\\\"', bridge)
        self.assertIn("window.hermesDesktop.selectPaths", bridge)
        self.assertIn("Intent.ACTION_OPEN_DOCUMENT", activity)
        self.assertIn("requestCode != REQ_PICK_FILES", activity)

    def test_android_edge_to_edge_safe_areas_and_ime_resize(self) -> None:
        activity = (ROOT / "android/app/src/main/java/com/hoodmoshla/hermesarabic/MainActivity.java").read_text(encoding="utf-8")
        manifest = (ROOT / "android/app/src/main/AndroidManifest.xml").read_text(encoding="utf-8")
        css = (ROOT / "www/hermes-arabic-mobile.css").read_text(encoding="utf-8")
        bridge = (ROOT / "www/hermes-mobile-bridge.js").read_text(encoding="utf-8")
        self.assertIn("WindowCompat.setDecorFitsSystemWindows(getWindow(), false)", activity)
        self.assertIn("WindowInsetsCompat.Type.displayCutout()", activity)
        self.assertIn("insets.isVisible(WindowInsetsCompat.Type.ime())", activity)
        self.assertIn('android:windowSoftInputMode="adjustResize"', manifest)
        self.assertIn("--hermes-viewport-offset-top", activity)
        self.assertIn("var(--hermes-safe-top, env(safe-area-inset-top, 0px))", css)
        self.assertIn("var(--hermes-safe-bottom, env(safe-area-inset-bottom, 0px))", css)
        self.assertIn("var(--hermes-safe-top,0px)", bridge)
        self.assertIn("var(--hermes-safe-bottom,0px)", bridge)
        self.assertIn("var(--hermes-app-height,100dvh)", bridge)


if __name__ == "__main__":
    unittest.main()
