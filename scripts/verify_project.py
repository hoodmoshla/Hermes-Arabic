#!/usr/bin/env python3
"""Small repository invariants for Hermes Arabic; no secrets are read or emitted."""
from __future__ import annotations

import re
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
    web_bridge = ROOT / "www/hermes-mobile-bridge.js"
    android_bridge = ROOT / "android/app/src/main/assets/public/hermes-mobile-bridge.js"
    if not web_bridge.exists() or not android_bridge.exists() or web_bridge.read_bytes() != android_bridge.read_bytes():
        errors.append("Web and Android bridge copies are not identical")
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
