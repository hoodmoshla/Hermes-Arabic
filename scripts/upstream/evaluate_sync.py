#!/usr/bin/env python3
"""Decide whether an upstream sync may update the embedded engine or publish."""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GRADLE = ROOT / "android/app/build.gradle"


def gradle_version() -> tuple[int, str]:
    text = GRADLE.read_text(encoding="utf-8")
    code = int(re.search(r"versionCode\s+(\d+)", text).group(1))
    name = re.search(r'versionName\s+"([^"]+)"', text).group(1)
    return code, name


def evaluate(plan: dict) -> dict:
    errors = []
    code, name = gradle_version()
    proposed_code = int(plan.get("proposed_version_code", code))
    proposed_name = str(plan.get("proposed_version_name", name))
    if proposed_code <= code:
        errors.append("version_code_not_increased")
    if proposed_name == name and plan.get("publish"):
        errors.append("version_name_reused")
    if plan.get("conflicts"):
        errors.append("unresolved_merge_conflicts")
    if not plan.get("tests_passed", False):
        errors.append("tests_failed_or_not_run")
    if not plan.get("build_passed", False):
        errors.append("android_build_failed_or_not_run")
    if plan.get("publish") and not plan.get("signature_verified", False):
        errors.append("signature_not_verified")
    if plan.get("same_upstream_commit_as_last_sync") and plan.get("publish"):
        errors.append("duplicate_upstream_publication")
    if plan.get("engine_replaced") and not plan.get("overlay_preserved"):
        errors.append("android_overlay_missing_after_engine_replacement")
    publish = bool(plan.get("publish")) and not errors
    return {
        "ok": not errors,
        "publish": publish,
        "current_version_code": code,
        "current_version_name": name,
        "errors": errors,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("plan")
    args = parser.parse_args()
    result = evaluate(json.loads(Path(args.plan).read_text(encoding="utf-8")))
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
