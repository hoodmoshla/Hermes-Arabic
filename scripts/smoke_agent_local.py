#!/usr/bin/env python3
"""Exercise the real agent against a loopback test provider, not a live model."""
from __future__ import annotations

import json
import os
from pathlib import Path
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "android/app/src/main/python"))
ANSWER = "نجح مسار الاختبار المحلي."
requests_seen: list[str] = []


class TestProvider(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_POST(self):
        request = json.loads(self.rfile.read(int(self.headers.get("Content-Length", "0"))))
        requests_seen.append(self.path)
        if request.get("stream"):
            chunks = [
                {"id": "test", "object": "chat.completion.chunk", "created": 1, "model": "local-test", "choices": [{"index": 0, "delta": {"role": "assistant", "content": ANSWER}, "finish_reason": None}]},
                {"id": "test", "object": "chat.completion.chunk", "created": 1, "model": "local-test", "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}]},
            ]
            body = ("".join("data: " + json.dumps(x) + "\n\n" for x in chunks) + "data: [DONE]\n\n").encode()
            content_type = "text/event-stream"
        else:
            body = json.dumps({"id": "test", "object": "chat.completion", "created": 1, "model": "local-test", "choices": [{"index": 0, "message": {"role": "assistant", "content": ANSWER}, "finish_reason": "stop"}], "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2}}).encode()
            content_type = "application/json"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    for name in tuple(os.environ):
        if name.endswith("API_KEY") or name in {"OPENAI_API_BASE", "OPENAI_BASE_URL", "CUSTOM_BASE_URL"}:
            os.environ.pop(name, None)
    old = os.getcwd()
    with tempfile.TemporaryDirectory(prefix="hermes-agent-test-") as directory:
        os.environ["HERMES_HOME"] = directory
        os.environ["HERMES_ANDROID_EMBEDDED"] = "1"
        os.environ["HERMES_IGNORE_RULES"] = "1"
        os.chdir(directory)
        provider = ThreadingHTTPServer(("127.0.0.1", 0), TestProvider)
        worker = threading.Thread(target=provider.serve_forever, daemon=True)
        worker.start()
        try:
            from run_agent import AIAgent
            agent = AIAgent(model="local-test", provider="custom", api_mode="chat_completions",
                            base_url=f"http://127.0.0.1:{provider.server_port}/v1",
                            api_key="loopback-test-not-a-secret", max_iterations=2,
                            enabled_toolsets=[], quiet_mode=True, skip_context_files=True,
                            skip_memory=True, checkpoints_enabled=False)
            result = agent.run_conversation("اختبار مسار الطلب فقط")
            assert result.get("final_response") == ANSWER, {k: result.get(k) for k in ("final_response", "error")}
            # Hermes also probes loopback providers for Ollama model capabilities.
            assert "/v1/chat/completions" in requests_seen, requests_seen
            assert set(requests_seen) <= {"/api/show", "/v1/chat/completions"}, requests_seen
            print("PASS: real AIAgent -> loopback provider -> final Arabic response")
            print("This tests execution/wiring with a simulated response, not model quality or Android hardware.")
        finally:
            provider.shutdown()
            provider.server_close()
            os.chdir(old)


if __name__ == "__main__":
    main()
