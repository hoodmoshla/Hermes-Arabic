#!/usr/bin/env python3
"""Small repository invariants for Hermes Arabic; no secrets are read or emitted."""
from __future__ import annotations

import re
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP_ID = "com.hoodmoshla.hermesarabic"


def check() -> list[str]:
    errors: list[str] = []
    gradle = (ROOT / "android/app/build.gradle").read_text(encoding="utf-8")
    capacitor = (ROOT / "capacitor.config.ts").read_text(encoding="utf-8")
    manifest = (ROOT / "android/app/src/main/AndroidManifest.xml").read_text(encoding="utf-8")
    if f'namespace = "{APP_ID}"' not in gradle or f'applicationId "{APP_ID}"' not in gradle:
        errors.append("Android namespace/applicationId do not match the independent package ID")
    if APP_ID not in capacitor:
        errors.append("Capacitor appId does not match the Android package ID")
    if "C:/Program Files/Python311/python.exe" in gradle or "buildPython" not in gradle:
        errors.append("Chaquopy build Python must be configurable and portable")
    if 'abiFilters "arm64-v8a"' not in gradle:
        errors.append("Expected the single arm64-v8a ABI filter")
    if "android.permission.INTERNET" not in manifest:
        errors.append("INTERNET permission missing")
    if "BOOT_COMPLETED" in manifest or "RECEIVE_BOOT_COMPLETED" in manifest:
        errors.append("Hermes runtime must not autostart during device boot")
    service = (ROOT / "android/app/src/main/java/com/hoodmoshla/hermesarabic/HermesForegroundService.java").read_text(encoding="utf-8")
    if "START_STICKY" in service or "checkIdleRuntime" not in service or "task_state_available" not in service:
        errors.append("Foreground runtime must use the native fail-closed idle watchdog and START_NOT_STICKY")
    if 'android:allowBackup="false"' not in manifest:
        errors.append("Automatic backup must be disabled for app-private credentials")
    network_config = ROOT / "android/app/src/main/res/xml/network_security_config.xml"
    if 'android:networkSecurityConfig="@xml/network_security_config"' not in manifest or 'android:usesCleartextTraffic="false"' not in manifest:
        errors.append("Android must enforce the custom Network Security Config and disable cleartext by default")
    if not network_config.exists():
        errors.append("Android Network Security Config is missing")
    else:
        network_policy = network_config.read_text(encoding="utf-8")
        for marker in ('<base-config cleartextTrafficPermitted="false"', '<domain includeSubdomains="false">localhost</domain>', '<domain includeSubdomains="false">127.0.0.1</domain>'):
            if marker not in network_policy:
                errors.append(f"Android cleartext policy marker missing: {marker}")
    activity = (ROOT / "android/app/src/main/java/com/hoodmoshla/hermesarabic/MainActivity.java").read_text(encoding="utf-8")
    for marker in ('KeyStore.getInstance("AndroidKeyStore")', 'Cipher.getInstance("AES/GCM/NoPadding")', 'apiKeyEncrypted', 'setInstanceFollowRedirects(false)', 'HTTPS'):
        if marker not in activity:
            errors.append(f"Android credential/network protection marker missing: {marker}")
    locale = ROOT / "android/app/src/main/assets/hermes-arabic-locale.js"
    if not locale.exists() or 'document.documentElement.dir = "rtl"' not in locale.read_text(encoding="utf-8"):
        errors.append("Arabic RTL localization layer is missing")
    mobile_locale = ROOT / "www/locales/ar-mobile.json"
    dashboard_locale = ROOT / "android/app/src/main/python/locales/ar.yaml"
    if not (ROOT / "android/app/src/main/python/locales/ar.yaml").is_file():
        errors.append("Arabic Hermes system-message catalog is missing")
    try:
        mobile_catalog = json.loads(mobile_locale.read_text(encoding="utf-8"))
        if len(mobile_catalog) < 348:
            errors.append("Arabic mobile UI catalog is missing source phrases")
        if any(re.search(r"[\u3400-\u9fff]", value) and not re.search(r"[\u0600-\u06ff]", value) for value in mobile_catalog.values()):
            errors.append("Arabic mobile catalog contains untranslated Chinese UI text")
    except (OSError, ValueError, TypeError):
        errors.append("Arabic mobile UI catalog is missing or invalid JSON")
    try:
        dashboard_catalog = dashboard_locale.read_text(encoding="utf-8")
        if "ar:" not in dashboard_catalog and not dashboard_catalog.strip():
            errors.append("Arabic dashboard catalog does not cover Hermes locale groups")
    except (OSError, ValueError, TypeError):
        errors.append("Arabic dashboard catalog is missing or invalid JSON")
    dashboard_assets = ROOT / "android/app/src/main/python/hermes_cli/web_dist/assets"
    dashboard_bundle = next(dashboard_assets.glob("index-*.js"), None) if dashboard_assets.is_dir() else None
    dashboard_html = ROOT / "android/app/src/main/python/hermes_cli/web_dist/index.html"
    i18n_bundle = next(dashboard_assets.glob("i18n-*.js"), None) if dashboard_assets.is_dir() else None
    if dashboard_bundle and dashboard_bundle.exists() and i18n_bundle and i18n_bundle.exists():
        bundle_text = i18n_bundle.read_text(encoding="utf-8", errors="replace")
        if '"ar"' not in bundle_text and "ar:" not in bundle_text:
            errors.append("Hermes dashboard bundle lacks the Arabic locale")
    else:
        errors.append("Hermes dashboard bundle is missing")
    if not dashboard_html.exists() or '<html lang="ar" dir="rtl">' not in dashboard_html.read_text(encoding="utf-8"):
        errors.append("Hermes dashboard HTML must declare Arabic and RTL")
    web_bridge = ROOT / "www/hermes-mobile-bridge.js"
    android_bridge = ROOT / "android/app/src/main/assets/public/hermes-mobile-bridge.js"
    if not web_bridge.exists() or not android_bridge.exists() or web_bridge.read_bytes() != android_bridge.read_bytes():
        errors.append("Web and Android bridge copies are not identical")
    asset_pairs = [
        (ROOT / "www/index.html", ROOT / "android/app/src/main/assets/public/index.html"),
        (ROOT / "www/hermes-mobile-agents.js", ROOT / "android/app/src/main/assets/public/hermes-mobile-agents.js"),
        (ROOT / "www/hermes-arabic-locale.js", ROOT / "android/app/src/main/assets/hermes-arabic-locale.js"),
        (ROOT / "www/hermes-arabic-locale.js", ROOT / "android/app/src/main/assets/public/hermes-arabic-locale.js"),
        (ROOT / "www/hermes-arabic-locale.js", ROOT / "android/app/src/main/python/hermes_cli/web_dist/hermes-arabic-locale.js"),
        (ROOT / "www/hermes-arabic-mobile.css", ROOT / "android/app/src/main/assets/public/hermes-arabic-mobile.css"),
        (ROOT / "www/hermes-arabic-mobile.css", ROOT / "android/app/src/main/python/hermes_cli/web_dist/hermes-arabic-mobile.css"),
        (ROOT / "www/locales/ar-mobile.json", ROOT / "android/app/src/main/assets/public/locales/ar-mobile.json"),
        (ROOT / "www/locales/ar-mobile.json", ROOT / "android/app/src/main/python/hermes_cli/web_dist/locales/ar-mobile.json"),
    ]
    for source, mirror in asset_pairs:
        if not source.is_file() or not mirror.is_file() or source.read_bytes() != mirror.read_bytes():
            errors.append(f"Localized web asset is missing or differs from its Android/dashboard copy: {source.relative_to(ROOT)}")
            break
    bridge_text = web_bridge.read_text(encoding="utf-8") if web_bridge.exists() else ""
    for marker in ("ماذا تريد من ", "أنشئ سير عمل للهاتف", "الخصوصية والبيانات", "data-action=\\\"capture-photo\\\"", "data-action=\\\"voice-input\\\"", "data-action=\\\"agent-new\\\"", "data-action=\\\"parallel-run\\\"", "data-action=\\\"parallel-pick-files\\\"", "data-action=\\\"parallel-capture-photo\\\"", "formatContextRef(item.path)", "Promise.all(jobs.map", "session.create", "prompt.submit", "android-mobile-parallel"):
        if marker not in bridge_text:
            errors.append(f"Critical Arabic mobile UI control or translation is missing: {marker}")
            break
    if not (ROOT / "LICENSE").exists() or not (ROOT / "THIRD_PARTY_NOTICES.md").exists():
        errors.append("Project license notices are missing")
    try:
        status = subprocess.check_output(["git", "status", "--porcelain", "-z", "--untracked-files=all"], cwd=ROOT).decode().split("\0")
    except (subprocess.CalledProcessError, FileNotFoundError):
        status = []
    changed: list[str] = []
    for entry in status:
        if len(entry) >= 4:
            changed.append(entry[3:])
    for item in changed:
        lower = item.lower()
        if lower.endswith((".jks", ".keystore", ".apk", ".aab", ".pem", ".p12")) or lower.endswith("local.properties"):
            errors.append(f"Sensitive or generated artifact is present in the working tree: {item}")
            break
    # Scan changed project files only: the inherited upstream bundle contains
    # intentional redaction patterns and illustrative token-like strings.
    # Never print a matched value or source line.
    suspicious = re.compile(r"(?i)(?:gh[pousr]_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9_-]{40,}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----)")
    for item in changed:
        p = ROOT / item
        if p.is_file() and p.stat().st_size < 3_000_000 and p.suffix.lower() in {".py", ".js", ".ts", ".java", ".gradle", ".xml", ".json", ".md", ".yml", ".yaml", ".properties"}:
            try:
                if suspicious.search(p.read_text(encoding="utf-8", errors="ignore")):
                    errors.append(f"Possible hard-coded credential/private key in changed source: {item}")
            except OSError:
                pass
    return errors


def main() -> int:
    errors = check()
    if errors:
        for error in errors:
            print(f"FAIL: {error}")
        return 1
    print("Repository invariants passed (static checks only; not an Android device test).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
