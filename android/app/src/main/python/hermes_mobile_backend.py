"""Android bootstrap for the embedded Hermes Agent runtime.

This module is called from MainActivity through Chaquopy. It keeps Android
platform wiring separate from Hermes Agent code: filesystem layout, environment
variables, backend lifecycle, and small diagnostic commands live here, while
the real Agent/Gateway implementation remains the copied upstream source.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
import socket
import threading
import time
import traceback
from typing import Any
from urllib.request import urlopen

_lock = threading.RLock()
_server_thread: threading.Thread | None = None
_server_port = 9129
_last_error = ""
_started_at = 0.0
_files_dir = ""


def _json(data: dict[str, Any]) -> str:
    return json.dumps(data, ensure_ascii=False, sort_keys=True)


def _is_port_open(host: str, port: int, timeout: float = 0.25) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def _prepare_environment(files_dir: str) -> dict[str, str]:
    global _files_dir
    root = Path(files_dir).resolve()
    hermes_home = root / "hermes-home"
    workspace = hermes_home / "workspace"
    logs = hermes_home / "logs"
    for path in (hermes_home, workspace, logs):
        path.mkdir(parents=True, exist_ok=True)

    os.environ.setdefault("HOME", str(root))
    os.environ["HERMES_HOME"] = str(hermes_home)
    os.environ["HERMES_ANDROID_EMBEDDED"] = "1"
    os.environ.setdefault("HERMES_DESKTOP", "1")
    os.environ.setdefault("HERMES_NO_BROWSER_OPEN", "1")
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    _prepare_node_environment(root)
    os.chdir(workspace)
    _files_dir = str(root)
    return {
        "files_dir": str(root),
        "hermes_home": str(hermes_home),
        "workspace": str(workspace),
        "logs": str(logs),
    }


def _prepend_env_path(name: str, value: Path) -> None:
    current = os.environ.get(name, "")
    parts = [part for part in current.split(os.pathsep) if part]
    value_text = str(value)
    if value_text not in parts:
        parts.insert(0, value_text)
    os.environ[name] = os.pathsep.join(parts)


def _prepare_node_environment(root: Path) -> None:
    runtime = root / "hermes-node"
    tui_runtime = root / "hermes-tui"
    env_node = os.environ.get("HERMES_NODE", "").strip()
    node = Path(env_node) if env_node else runtime / "bin" / "node"
    lib = runtime / "lib"
    if not node.is_file():
        return

    os.environ["HERMES_NODE"] = str(node)
    if (tui_runtime / "dist" / "entry.js").is_file():
        os.environ["HERMES_TUI_DIR"] = str(tui_runtime)
    os.environ["HERMES_SKIP_NODE_BOOTSTRAP"] = "1"
    os.environ.setdefault("NODE_ENV", "production")
    os.environ.setdefault("TERM", "xterm-256color")
    _prepend_env_path("PATH", runtime / "bin")
    if lib.is_dir():
        _prepend_env_path("LD_LIBRARY_PATH", lib)


def initialize(files_dir: str, port: int = 9129) -> str:
    """Prepare local directories and verify the embedded source imports."""
    global _server_port, _last_error
    with _lock:
        _server_port = int(port or _server_port)
        env = _prepare_environment(files_dir)
        try:
            import hermes_cli  # noqa: F401
            import run_agent  # noqa: F401
            import gateway  # noqa: F401
            _last_error = ""
            return _json({
                "ok": True,
                "available": True,
                "port": _server_port,
                "running": is_running(),
                "env": env,
            })
        except Exception as exc:
            _last_error = "".join(traceback.format_exception_only(type(exc), exc)).strip()
            return _json({
                "ok": False,
                "available": False,
                "port": _server_port,
                "running": False,
                "env": env,
                "error": _last_error,
            })


def _run_server(host: str, port: int) -> None:
    global _last_error
    try:
        from hermes_cli.web_server import start_server

        start_server(
            host=host,
            port=port,
            open_browser=False,
            allow_public=False,
            initial_profile="",
        )
    except BaseException as exc:
        _last_error = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))[-8000:]
    finally:
        global _server_thread
        with _lock:
            if _server_thread is threading.current_thread():
                _server_thread = None


def start(files_dir: str, port: int = 9129) -> str:
    """Start Hermes backend on localhost inside the app process."""
    global _server_thread, _server_port, _started_at, _last_error
    with _lock:
        _server_port = int(port or _server_port)
        env_status = json.loads(initialize(files_dir, _server_port))
        if not env_status.get("ok"):
            return _json(env_status)

        if is_running():
            return status()

        _last_error = ""
        _started_at = time.time()
        _server_thread = threading.Thread(
            target=_run_server,
            args=("127.0.0.1", _server_port),
            name="hermes-android-backend",
            daemon=True,
        )
        _server_thread.start()

    deadline = time.time() + 20
    while time.time() < deadline:
        if is_running():
            return status()
        if _last_error:
            return status()
        time.sleep(0.25)
    return status()


def is_running() -> bool:
    return _is_port_open("127.0.0.1", _server_port)


def status() -> str:
    with _lock:
        uptime = max(0.0, time.time() - _started_at) if _started_at else 0.0
        running = is_running()
        body: dict[str, Any] | None = None
        if running:
            try:
                with urlopen(f"http://127.0.0.1:{_server_port}/api/status", timeout=1.5) as response:
                    raw = response.read().decode("utf-8", errors="replace")
                    body = json.loads(raw)
            except Exception:
                body = None
        return _json({
            "ok": running and not _last_error,
            "available": True,
            "running": running,
            "port": _server_port,
            "url": f"http://127.0.0.1:{_server_port}",
            "uptime_seconds": round(uptime, 3),
            "thread_alive": bool(_server_thread and _server_thread.is_alive()),
            "files_dir": _files_dir,
            "error": _last_error,
            "api_status": body,
        })


def diagnose(files_dir: str, port: int = 9129) -> str:
    init = json.loads(initialize(files_dir, port))
    stat = json.loads(status())
    return _json({
        "ok": bool(init.get("ok")),
        "init": init,
        "status": stat,
    })


def configure_local_model(model_id: str, base_url: str, api_key: str, files_dir: str) -> str:
    """Select the verified on-device llama.cpp endpoint as Hermes' custom model provider."""
    try:
        model_id = str(model_id or "").strip()
        base_url = str(base_url or "").strip().rstrip("/")
        api_key = str(api_key or "")
        expected = "http://127.0.0.1:9130/v1"
        if model_id != "qwen2.5-0.5b-instruct-q4_k_m" or base_url != expected or len(api_key) < 40:
            return _json({"ok": False, "error": "Invalid local-model provider configuration"})
        env = _prepare_environment(files_dir)
        with _model_config_lock:
            from hermes_cli.config import get_config_path, load_config, save_config

            backup = Path(env["hermes_home"]) / _LOCAL_MODEL_BACKUP
            config = load_config()
            current = config.get("model", "")
            if isinstance(current, dict):
                current_model = dict(current)
            elif isinstance(current, str):
                current_model = {"default": current} if current else {}
            else:
                current_model = {}
            if not backup.exists():
                backup.write_text(json.dumps(current_model, ensure_ascii=False), encoding="utf-8")
                try:
                    os.chmod(backup, 0o600)
                except OSError:
                    pass
            current_model["provider"] = "custom"
            current_model["default"] = model_id
            current_model["base_url"] = expected
            # The random bearer key is supplied only in process environment from Android Keystore.
            # Never persist or return the secret in config.yaml or a JavaScript-facing response.
            current_model.pop("api_key", None)
            config["model"] = current_model
            save_config(config)
            try:
                os.chmod(get_config_path(), 0o600)
            except OSError:
                pass
            os.environ["CUSTOM_API_KEY"] = api_key
            saved = load_config().get("model", {})
            ok = isinstance(saved, dict) and saved.get("provider") == "custom" and saved.get("base_url") == expected
            return _json({"ok": bool(ok), "model_id": model_id, "base_url": expected,
                          "config_path": str(get_config_path()), "error": "" if ok else "Hermes did not persist the custom endpoint"})
    except Exception as exc:
        return _json({"ok": False, "error": "Local model configuration failed: " + type(exc).__name__})


def restore_local_model(files_dir: str) -> str:
    """Restore the user's exact previous provider configuration after local inference is disabled."""
    try:
        env = _prepare_environment(files_dir)
        with _model_config_lock:
            from hermes_cli.config import get_config_path, load_config, save_config

            config = load_config()
            current = config.get("model", {})
            backup = Path(env["hermes_home"]) / _LOCAL_MODEL_BACKUP
            restored = False
            if isinstance(current, dict) and current.get("base_url") == "http://127.0.0.1:9130/v1":
                if backup.is_file():
                    old = json.loads(backup.read_text(encoding="utf-8"))
                    config["model"] = old if isinstance(old, (dict, str)) else {}
                else:
                    current = dict(current)
                    current.pop("base_url", None)
                    current.pop("api_key", None)
                    current.pop("provider", None)
                    current.pop("default", None)
                    config["model"] = current
                save_config(config)
                restored = True
            if backup.is_file():
                backup.unlink()
            try:
                os.chmod(get_config_path(), 0o600)
            except OSError:
                pass
            os.environ.pop("CUSTOM_API_KEY", None)
            return _json({"ok": True, "restored": restored})
    except Exception as exc:
        return _json({"ok": False, "error": "Could not restore the previous model configuration: " + type(exc).__name__})


def stop(files_dir: str, port: int = 9129) -> str:
    """Stop the local dashboard and allow Android to remove its foreground notification."""
    global _server_port, _server_thread, _started_at
    _server_port = int(port or _server_port)
    _prepare_environment(files_dir)
    try:
        from hermes_cli.web_server import request_server_shutdown
        requested = request_server_shutdown()
    except Exception:
        requested = False
    deadline = time.time() + 20
    while is_running() and time.time() < deadline:
        time.sleep(0.2)
    with _lock:
        running = is_running()
        if not running:
            _server_thread = None
            _started_at = 0.0
    return _json({"ok": not running, "stopping_requested": requested, "running": running,
                  "error": "Hermes server did not stop within 20 seconds" if running else ""})


def run_command(command_json: str, files_dir: str, port: int = 9129) -> str:
    try:
        request = json.loads(command_json or "{}")
    except Exception:
        request = {}
    command = str(request.get("command") or "status").strip().lower()
    if command in {"start", "run", "serve"}:
        return start(files_dir, port)
    if command in {"diagnose", "doctor"}:
        return diagnose(files_dir, port)
    if command == "stop":
        return stop(files_dir, port)
    if command in {"status", "version"}:
        return status()
    return _json({
        "ok": False,
        "available": True,
        "running": is_running(),
        "port": port,
        "error": f"Unsupported embedded command: {command}",
    })
_model_config_lock = threading.RLock()
_LOCAL_MODEL_BACKUP = "local-model-config-backup.json"
