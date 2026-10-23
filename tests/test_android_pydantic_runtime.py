"""Import the Android server through the packages Chaquopy actually bundles."""

from __future__ import annotations

import importlib
import os
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PYTHON_SRC = ROOT / "android/app/src/main/python"
PACKAGED_SITE = ROOT / "android/app/build/python/pip/release/common"
REQUIRED_SYMBOLS = (
    "field_validator",
    "model_validator",
    "ConfigDict",
    "RootModel",
    "BaseModel",
    "ValidationError",
)


def _packaged_site() -> Path:
    if PACKAGED_SITE.is_dir() and (PACKAGED_SITE / "pydantic").is_dir():
        return PACKAGED_SITE
    debug_site = PACKAGED_SITE.parent.parent / "debug/common"
    if debug_site.is_dir() and (debug_site / "pydantic").is_dir():
        return debug_site
    raise unittest.SkipTest(
        "Chaquopy packaged site-packages are not present; run the Android Python pip task first"
    )


class AndroidPydanticRuntimeTests(unittest.TestCase):
    def test_packaged_pydantic_exposes_server_symbols_and_imports(self) -> None:
        site = _packaged_site()
        with tempfile.TemporaryDirectory(prefix="hermes-pydantic-") as files_dir:
            env = os.environ.copy()
            env["PYTHONPATH"] = os.pathsep.join((str(site), str(PYTHON_SRC)))
            env["PYTHONNOUSERSITE"] = "1"
            env["HERMES_HOME"] = str(Path(files_dir) / "hermes-home")
            command = r'''
import importlib
import json
import os
import sys
import types
import pydantic
import hermes_android_pydantic

# The Chaquopy psutil wheel is an Android arm64 extension. It cannot be opened
# by the host interpreter, but its import is downstream of the Pydantic failure
# that stopped the phone service. Provide the symbols imported at module load.
native = types.ModuleType("psutil._psutil_linux")
sys.modules["psutil._psutil_linux"] = native
psutil = types.ModuleType("psutil")
class _PsutilError(Exception):
    pass
class _NoSuchProcess(_PsutilError):
    pass
class _TimeoutExpired(_PsutilError):
    pass
class _AccessDenied(_PsutilError):
    pass
class _Process:
    def __init__(self, pid=0):
        self.pid = pid
    def create_time(self):
        return 0
    def children(self, recursive=False):
        return []
    def resume(self):
        return None
psutil.Error = _PsutilError
psutil.NoSuchProcess = _NoSuchProcess
psutil.TimeoutExpired = _TimeoutExpired
psutil.AccessDenied = _AccessDenied
psutil.Process = _Process
psutil.process_iter = lambda attrs=None: []
psutil.pid_exists = lambda pid: False
psutil._psutil_linux = native
sys.modules["psutil"] = psutil

version = hermes_android_pydantic.install()
missing = [name for name in %(symbols)r if not hasattr(pydantic, name)]
if missing:
    raise SystemExit("missing pydantic symbols: " + ",".join(missing))
from pydantic import BaseModel, Field, SecretStr, StrictBool, StrictInt, ValidationError, field_validator

class Probe(BaseModel):
    value: str
    @field_validator("value")
    @classmethod
    def _strip(cls, raw):
        return str(raw).strip()

probe = Probe(value=" ready ")
if probe.dict()["value"] != "ready":
    raise SystemExit("field_validator did not run")

modules = [
    "hermes_mobile_backend",
    "hermes_cli.web_models",
    "hermes_cli.web_server",
    "run_agent",
    "gateway",
]
for name in modules:
    importlib.import_module(name)
from hermes_cli.web_models import MoaPresetPayload
from hermes_cli.web_server import start_server
if not callable(start_server):
    raise SystemExit("start_server is missing")
checked = MoaPresetPayload.model_validate({"reference_timeout": "2.5"})
if checked.reference_timeout != 2.5:
    raise SystemExit("web model field_validator did not coerce the dashboard payload")
try:
    MoaPresetPayload.model_validate({"reference_timeout": True})
except ValidationError:
    pass
else:
    raise SystemExit("web model accepted an invalid reference_timeout")
print(json.dumps({
    "pydantic": version,
    "file": pydantic.__file__,
    "symbols": %(symbols)r,
    "modules": modules,
    "reference_timeout": checked.reference_timeout,
}, sort_keys=True))
''' % {"symbols": REQUIRED_SYMBOLS}
            import subprocess

            completed = subprocess.run(
                [sys.executable, "-c", command],
                cwd=ROOT,
                env=env,
                text=True,
                capture_output=True,
                check=False,
            )
        if completed.returncode != 0:
            self.fail(
                "Android packaged import failed\n"
                f"stdout:\n{completed.stdout}\n"
                f"stderr:\n{completed.stderr}"
            )
        self.assertIn('"modules"', completed.stdout)
        self.assertIn("field_validator", completed.stdout)
        self.assertIn("pydantic/__init__.py", completed.stdout.replace("\\", "/"))
        self.assertNotIn("cannot import name 'field_validator'", completed.stderr)


if __name__ == "__main__":
    unittest.main()
