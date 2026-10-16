"""Android-native GitHub tools for the embedded Hermes agent.

All writes are staged as private proposals by the Android connector; the agent
cannot push a commit or trigger CI without the user's native confirmation.
"""
from __future__ import annotations

import json
from typing import Any

from tools.registry import registry


_BRIDGE_CLASS = "com.hoodmoshla.hermesarabic.GitHubConnector"


def _connector():
    try:
        from java import jclass  # Chaquopy; imported only on Android.
        return jclass(_BRIDGE_CLASS)
    except Exception:
        return None


def _call(method: str, *args: Any) -> str:
    bridge = _connector()
    if bridge is None:
        return json.dumps({"ok": False, "error": "GitHub Android connector is unavailable in this runtime."})
    try:
        return str(getattr(bridge, method)(*args))
    except Exception as exc:
        # Never include tokens or raw HTTP headers in agent-visible exceptions.
        return json.dumps({"ok": False, "error": f"GitHub operation failed ({type(exc).__name__})."})


def _connected() -> bool:
    bridge = _connector()
    if bridge is None:
        return False
    try:
        return bool(bridge.isConnected())
    except Exception:
        return False


def _args(schema: dict) -> dict:
    return {
        "type": "object",
        "properties": schema,
        "required": list(schema.keys()),
        "additionalProperties": False,
    }


registry.register(
    name="github_list_repositories",
    toolset="github",
    schema={
        "name": "github_list_repositories",
        "description": "List repositories accessible to the connected GitHub account, including default branches and push permission.",
        "parameters": _args({}),
    },
    handler=lambda args, **kw: _call("agentListRepositories"),
    check_fn=_connected,
    description="List repositories connected to the user's GitHub account.",
    emoji="GH",
    max_result_size_chars=30000,
)

registry.register(
    name="github_list_files",
    toolset="github",
    schema={
        "name": "github_list_files",
        "description": "List tracked file paths, blob ids, sizes and modes in a GitHub repository reference. Repository must be owner/name.",
        "parameters": _args({
            "repository": {"type": "string", "description": "Repository in owner/name format."},
            "reference": {"type": "string", "description": "Branch, tag or commit SHA."},
        }),
    },
    handler=lambda args, **kw: _call("agentListTree", args["repository"], args["reference"]),
    check_fn=_connected,
    description="List files in a GitHub repository.",
    emoji="GH",
    max_result_size_chars=50000,
)

registry.register(
    name="github_read_file",
    toolset="github",
    schema={
        "name": "github_read_file",
        "description": "Read a UTF-8 text file of up to 2 MiB from a repository reference.",
        "parameters": _args({
            "repository": {"type": "string", "description": "Repository in owner/name format."},
            "path": {"type": "string", "description": "Repository-relative file path."},
            "reference": {"type": "string", "description": "Branch, tag or commit SHA."},
        }),
    },
    handler=lambda args, **kw: _call("agentReadFile", args["repository"], args["path"], args["reference"]),
    check_fn=_connected,
    description="Read one text file from GitHub.",
    emoji="GH",
    max_result_size_chars=2500000,
)

registry.register(
    name="github_propose_changes",
    toolset="github",
    schema={
        "name": "github_propose_changes",
        "description": "Prepare a commit proposal from file contents. It is stored locally and is NOT uploaded until the user reviews it and approves in the Android app. When targeting the default branch, an isolated hermes/* review branch is created only after approval. Changes are limited to 30 UTF-8 text files and 5 MiB total.",
        "parameters": {
            "type": "object",
            "properties": {
                "repository": {"type": "string", "description": "Repository in owner/name format."},
                "branch": {"type": "string", "description": "Existing branch to update, or the default branch from which a new review branch will be created after approval."},
                "changes": {
                    "type": "array",
                    "minItems": 1,
                    "maxItems": 30,
                    "items": {
                        "type": "object",
                        "properties": {
                            "path": {"type": "string", "description": "Repository-relative file path."},
                            "content": {"type": "string", "description": "Complete UTF-8 text of the new file; omit for deletions."},
                            "delete": {"type": "boolean", "description": "Set true to delete this file."},
                        },
                        "required": ["path"],
                        "additionalProperties": False,
                    },
                },
                "commit_message": {"type": "string", "description": "Commit message shown in the approval dialog."},
            },
            "required": ["repository", "branch", "changes", "commit_message"],
            "additionalProperties": False,
        },
    },
    handler=lambda args, **kw: _call(
        "agentProposeChanges",
        args["repository"],
        args["branch"],
        json.dumps(args["changes"], ensure_ascii=False, separators=(",", ":")),
        args["commit_message"],
    ),
    check_fn=_connected,
    description="Create a user-reviewable GitHub commit proposal; never pushes automatically.",
    emoji="GH",
    max_result_size_chars=12000,
)

registry.register(
    name="github_list_workflow_runs",
    toolset="github",
    schema={
        "name": "github_list_workflow_runs",
        "description": "Read recent GitHub Actions workflow runs for a repository branch to inspect test/build results.",
        "parameters": _args({
            "repository": {"type": "string", "description": "Repository in owner/name format."},
            "branch": {"type": "string", "description": "Branch name."},
        }),
    },
    handler=lambda args, **kw: _call("agentListWorkflowRuns", args["repository"], args["branch"]),
    check_fn=_connected,
    description="Inspect CI/test runs for a GitHub branch.",
    emoji="GH",
    max_result_size_chars=30000,
)

registry.register(
    name="github_list_workflows",
    toolset="github",
    schema={
        "name": "github_list_workflows",
        "description": "List GitHub Actions workflows available in a repository, including active state, id, and file path.",
        "parameters": _args({
            "repository": {"type": "string", "description": "Repository in owner/name format."},
        }),
    },
    handler=lambda args, **kw: _call("agentListWorkflows", args["repository"]),
    check_fn=_connected,
    description="List Actions workflows available for approved test runs.",
    emoji="GH",
    max_result_size_chars=30000,
)

registry.register(
    name="github_propose_workflow_run",
    toolset="github",
    schema={
        "name": "github_propose_workflow_run",
        "description": "Prepare a GitHub Actions workflow_dispatch request for a branch. This only saves a proposal; it cannot start CI. The user must review the repository, workflow, exact branch SHA, and inputs, then approve in the Android app.",
        "parameters": {
            "type": "object",
            "properties": {
                "repository": {"type": "string", "description": "Repository in owner/name format."},
                "workflow_id": {"type": "string", "description": "Workflow numeric ID or YAML filename such as android.yml."},
                "branch": {"type": "string", "description": "Existing branch to test; a commit SHA is not accepted."},
                "inputs": {"type": "object", "description": "Optional workflow_dispatch inputs, as string values.", "additionalProperties": {"type": "string"}},
            },
            "required": ["repository", "workflow_id", "branch"],
            "additionalProperties": False,
        },
    },
    handler=lambda args, **kw: _call(
        "agentProposeWorkflowRun",
        args["repository"],
        args["workflow_id"],
        args["branch"],
        json.dumps(args.get("inputs", {}), ensure_ascii=False, separators=(",", ":")),
    ),
    check_fn=_connected,
    description="Request a reviewable GitHub Actions test run; never dispatches without native user approval.",
    emoji="GH",
    max_result_size_chars=12000,
)
