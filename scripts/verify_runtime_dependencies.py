#!/usr/bin/env python3
"""Smoke-test the Android Python dependency set on the build host; no API calls."""
from __future__ import annotations

import asyncio
import importlib.metadata
from pathlib import Path


def main() -> None:
    import httpx
    import openai

    requirements = (Path(__file__).resolve().parents[1] /
                    "android/app/src/main/python/requirements-hermes-android.txt").read_text()
    assert f"openai=={openai.__version__}" in requirements
    assert f"httpx[socks]=={httpx.__version__}" in requirements
    # The SDK's default sync and async wrappers must construct successfully.
    # This caught OpenAI 1.39 + httpx 0.28 rejecting the removed proxies argument.
    client = openai.OpenAI(api_key="dependency-test-not-a-secret", base_url="http://127.0.0.1:1/v1")
    client.close()
    async_client = openai.AsyncOpenAI(api_key="dependency-test-not-a-secret", base_url="http://127.0.0.1:1/v1")
    asyncio.run(async_client.close())
    for package in ("openai", "httpx", "fastapi", "starlette", "pydantic", "uvicorn"):
        print(f"{package}={importlib.metadata.version(package)}")
    print("Sync and async model clients constructed and closed; no network requests made.")


if __name__ == "__main__":
    main()
