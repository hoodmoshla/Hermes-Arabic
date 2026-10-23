#!/usr/bin/env python3
"""Pure update policy for Hermes Arabic Android releases.

The official Hermes Agent version is not an installable Android version.
Only a release asset from hoodmoshla/Hermes-Arabic can notify or install.
"""
from __future__ import annotations

import hashlib
import re
from typing import Any

REPO = "hoodmoshla/Hermes-Arabic"
PACKAGE_ID = "com.hoodmoshla.hermesarabic"
ASSET_RE = re.compile(r"^hermes-arabic-arm64-v(\d+\.\d+\.\d+)\.apk$")


def _asset(release: dict[str, Any] | None) -> dict[str, Any] | None:
    if not release:
        return None
    for asset in release.get("assets") or []:
        if ASSET_RE.fullmatch(str(asset.get("name") or "")):
            return asset
    return None


def _version_code_from_release(release: dict[str, Any] | None, explicit: int | None) -> int | None:
    if explicit is not None:
        return int(explicit)
    if not release:
        return None
    value = release.get("android_version_code")
    if isinstance(value, int):
        return value
    return None


def assess_update(
    *,
    installed_version_code: int,
    release: dict[str, Any] | None = None,
    release_version_code: int | None = None,
    downloaded_bytes: bytes | None = None,
    expected_package: str = PACKAGE_ID,
    network_error: str | None = None,
) -> dict[str, Any]:
    result = {
        "repo": REPO,
        "package": expected_package,
        "installed_version_code": installed_version_code,
        "notify": False,
        "install_allowed": False,
        "sha256_ok": False,
        "published": False,
        "status": "unknown",
        "error": "",
        "download_url": "",
        "size": None,
        "version_name": "",
    }
    if expected_package != PACKAGE_ID:
        result.update(status="incompatible_package", error="package_mismatch")
        return result
    if network_error:
        result.update(status="network_unavailable", error=network_error)
        return result
    asset = _asset(release)
    remote_code = _version_code_from_release(release, release_version_code)
    if release and asset and remote_code is None:
        # Version-name-only metadata is not enough to install over an Android package.
        result.update(status="version_code_unavailable", error="android_version_code_missing")
        result["download_url"] = str(asset.get("browser_download_url") or "")
        return result
    if remote_code is None or remote_code <= installed_version_code or asset is None:
        result["status"] = "up_to_date" if asset is not None else "no_compatible_asset"
        return result
    result.update(
        notify=True,
        status="update_available",
        download_url=str(asset.get("browser_download_url") or ""),
        size=asset.get("size"),
        version_name=str(release.get("tag_name") or ""),
    )
    digest = str(asset.get("digest") or "")
    if not digest.startswith("sha256:") or len(digest) != 71:
        result.update(install_allowed=False, error="sha256_unavailable")
        return result
    if downloaded_bytes is None:
        result.update(install_allowed=False, sha256_ok=False, error="download_not_complete")
        return result
    actual = hashlib.sha256(downloaded_bytes).hexdigest()
    expected = digest.removeprefix("sha256:")
    if actual != expected:
        result.update(status="download_rejected", install_allowed=False, sha256_ok=False, error="sha256_mismatch")
        return result
    result.update(sha256_ok=True, install_allowed=True, error="")
    return result


def install_plan(files_dir: str) -> dict[str, Any]:
    return {
        "files_dir": files_dir,
        "preserves_private_data": True,
        "actions": ["verify_sha256", "request_user_install_confirmation", "hand_off_to_android_package_installer"],
        "forbidden_actions": ["clear_data", "delete_hermes_home", "silent_install"],
    }
