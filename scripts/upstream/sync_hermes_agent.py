#!/usr/bin/env python3
"""Detect an official Hermes Agent release and stage an Android-safe sync.

This script never treats an upstream tag as an installable Android release.
It records the official tag, annotated-tag object, and target commit, then
refuses to publish when the Android overlay cannot be reapplied or when the
requested gates have not passed.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STATE_PATH = ROOT / "scripts" / "upstream" / "sync-state.json"
PIN_PATH = ROOT / "scripts" / "upstream" / "upstream-pin.json"
UPSTREAM_REPO = "NousResearch/hermes-agent"
STABLE_TAG = re.compile(r"^v\d+\.\d+\.\d+$")
OVERLAY_FILES = (
    "android/app/src/main/python/hermes_mobile_backend.py",
    "android/app/src/main/python/tools/github_android.py",
    "android/app/src/main/python/tools/android_debug_tool.py",
    "android/app/src/main/python/requirements-hermes-android.txt",
)


def _api(path: str) -> dict | list:
    request = urllib.request.Request(
        f"https://api.github.com{path}",
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "hermes-arabic-upstream-sync",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if token:
        request.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def latest_stable_release() -> dict:
    release = _api(f"/repos/{UPSTREAM_REPO}/releases/latest")
    if not isinstance(release, dict):
        raise RuntimeError("GitHub latest release response was not an object")
    tag = str(release.get("tag_name") or "")
    if release.get("draft") or release.get("prerelease") or not STABLE_TAG.fullmatch(tag):
        raise RuntimeError(f"Latest GitHub release is not a stable vX.Y.Z tag: {tag or 'missing'}")
    ref = _api(f"/repos/{UPSTREAM_REPO}/git/ref/tags/{tag}")
    if not isinstance(ref, dict):
        raise RuntimeError("Git tag lookup failed")
    obj = ref.get("object") or {}
    tag_object = str(obj.get("sha") or "")
    if obj.get("type") == "tag":
        annotated = _api(f"/repos/{UPSTREAM_REPO}/git/tags/{tag_object}")
        if not isinstance(annotated, dict):
            raise RuntimeError("Annotated tag lookup failed")
        target = annotated.get("object") or {}
        if target.get("type") != "commit" or not target.get("sha"):
            raise RuntimeError("Annotated tag does not point at a commit")
        commit = str(target["sha"])
    elif obj.get("type") == "commit":
        commit = tag_object
    else:
        raise RuntimeError(f"Unsupported tag object type: {obj.get('type')}")
    return {
        "repo": UPSTREAM_REPO,
        "tag": tag,
        "tag_object": tag_object,
        "commit": commit,
        "published_at": release.get("published_at"),
        "html_url": release.get("html_url"),
        "prerelease": False,
        "draft": False,
    }


def load_json(path: Path) -> dict:
    if not path.is_file():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def overlay_manifest() -> dict:
    files = {}
    missing = []
    for rel in OVERLAY_FILES:
        path = ROOT / rel
        if not path.is_file():
            missing.append(rel)
            continue
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        files[rel] = {"sha256": digest, "bytes": path.stat().st_size}
    return {"files": files, "missing": missing}


def engine_version_marker() -> str | None:
    path = ROOT / "android/app/src/main/python/hermes_cli/__init__.py"
    if not path.is_file():
        return None
    match = re.search(r'__version__\s*=\s*"([^"]+)"', path.read_text(encoding="utf-8"))
    return match.group(1) if match else None


def evaluate(release: dict, *, gates_passed: bool) -> dict:
    state = load_json(STATE_PATH)
    pin = load_json(PIN_PATH)
    overlay = overlay_manifest()
    reasons = []
    if overlay["missing"]:
        reasons.append("android_overlay_missing")
    if not release.get("commit") or not release.get("tag"):
        reasons.append("upstream_identity_incomplete")
    elif state.get("last_synced_commit") == release.get("commit") and state.get("last_synced_tag") == release.get("tag"):
        reasons.append("already_synced")
    if pin.get("engine_replaced") is not True:
        reasons.append("engine_not_replaced_pending_android_adaptation")
    if not gates_passed:
        reasons.append("verification_gates_not_passed")
    decision = "sync_branch" if not reasons else "hold"
    if "already_synced" in reasons:
        decision = "skip_duplicate"
    return {
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "release": release,
        "embedded_version_marker": engine_version_marker(),
        "pin": pin,
        "overlay": overlay,
        "decision": decision,
        "hold_reasons": reasons,
        "publish_android_release": decision == "sync_branch" and gates_passed and not overlay["missing"],
    }


def write_report(result: dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", default="scripts/upstream/sync-report.json")
    parser.add_argument("--gates-passed", action="store_true")
    parser.add_argument("--offline-release", help="JSON file used by tests instead of GitHub")
    args = parser.parse_args()
    try:
        release = json.loads(Path(args.offline_release).read_text(encoding="utf-8")) if args.offline_release else latest_stable_release()
        result = evaluate(release, gates_passed=args.gates_passed)
    except (OSError, urllib.error.URLError, TimeoutError, json.JSONDecodeError, RuntimeError) as exc:
        result = {
            "checked_at": datetime.now(timezone.utc).isoformat(),
            "decision": "hold",
            "hold_reasons": ["upstream_lookup_failed"],
            "error": type(exc).__name__,
            "publish_android_release": False,
        }
        write_report(result, ROOT / args.report)
        print(json.dumps({"decision": result["decision"], "error": result["error"]}, ensure_ascii=False))
        return 2
    write_report(result, ROOT / args.report)
    print(json.dumps({
        "decision": result["decision"],
        "tag": result.get("release", {}).get("tag"),
        "commit": result.get("release", {}).get("commit"),
        "publish_android_release": result["publish_android_release"],
        "hold_reasons": result["hold_reasons"],
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
