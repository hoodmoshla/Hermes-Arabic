"""Compatibility seam between Hermes Arabic Android and Hermes Agent v0.22.4.

The Android bridge keeps calling ``start_server`` with the loopback-only
arguments it used before the engine upgrade. Desktop-only modules stay out of
the APK; ``pm`` remains available only as a lazy import for update tooling and
is not started by the mobile backend.
"""
from __future__ import annotations

import os
from typing import Any

OFFICIAL_UPSTREAM = {
    "repo": "NousResearch/hermes-agent",
    "tag": "v0.22.4",
    "tag_object": "64dbae64747ab640a3fece06f359307c30d129da",
    "commit": "4d04303818b61bf3aa09278af48356315515965b",
}
EMBEDDED_ENGINE_MARKER = "0.22.4"
ANDROID_START_SERVER_KEYS = ("host", "port", "open_browser", "allow_public", "initial_profile")
UPSTREAM_ACCEPTED_KEYS = ANDROID_START_SERVER_KEYS + (
    "headless",
    "isolated",
    "ssh_session_token",
    "ssh_owner_nonce",
    "start_mcp_discovery_after_bind",
    "ssh_lock_path",
)
EXCLUDED_DESKTOP_TREES = ("apps", "ui-tui", "web", "node_modules", "tests")


def engine_identity() -> dict[str, Any]:
    """Return the embedded marker separately from the verified upstream pin."""
    marker = EMBEDDED_ENGINE_MARKER
    try:
        import hermes_cli
        marker = getattr(hermes_cli, "__version__", marker)
    except Exception:
        pass
    return {
        "embedded_marker": marker,
        "official_target": OFFICIAL_UPSTREAM,
        "engine_replaced": True,
        "dashboard": "v0.22.4-arabic-rtl",
        "language": os.environ.get("HERMES_LANGUAGE", "ar"),
        "rtl": True,
    }


def adapt_start_server_kwargs(**kwargs: Any) -> dict[str, Any]:
    """Keep the Android call working against either the embedded or official signature."""
    unknown = sorted(set(kwargs) - set(UPSTREAM_ACCEPTED_KEYS))
    if unknown:
        raise TypeError(f"Unsupported start_server arguments: {', '.join(unknown)}")
    adapted = {key: kwargs[key] for key in ANDROID_START_SERVER_KEYS if key in kwargs}
    # Android must never open a desktop browser or accept a public unauthenticated bind.
    adapted["open_browser"] = False
    adapted["allow_public"] = False
    adapted.setdefault("host", "127.0.0.1")
    adapted.setdefault("port", 9129)
    return adapted


def require_android_runtime_ready() -> dict[str, Any]:
    """Check the modules the current APK bridge actually calls, without importing desktop stacks."""
    import hermes_cli.web_server as web_server
    import run_agent
    import gateway
    start_server = getattr(web_server, "start_server", None)
    if not callable(start_server):
        raise RuntimeError("hermes_cli.web_server.start_server is missing")
    return {
        "ok": True,
        "start_server": True,
        "run_agent": run_agent is not None,
        "gateway": gateway is not None,
        "desktop_apps_embedded": False,
    }


def replacement_blocked_reason() -> str:
    return ""


def request_embedded_shutdown() -> bool:
    """Ask the live loopback uvicorn server to exit without deleting user data.

    v0.22.4 removed the old ``request_server_shutdown`` helper. Android still
    needs a bounded stop so the foreground service can dismiss its notification.
    """
    import gc

    requested = False
    for obj in gc.get_objects():
        if obj.__class__.__name__ != "Server":
            continue
        if getattr(getattr(obj, "__class__", None), "__module__", "") != "uvicorn.server":
            continue
        try:
            obj.should_exit = True
            requested = True
        except Exception:
            continue
    return requested
