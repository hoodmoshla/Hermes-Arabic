const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const sourcePath = path.join(__dirname, "../www/hermes-mobile-bridge.js");
const androidPath = path.join(__dirname, "../android/app/src/main/assets/public/hermes-mobile-bridge.js");
const source = fs.readFileSync(sourcePath, "utf8");
const androidSource = fs.readFileSync(androidPath, "utf8");

function getFunctionBody(text, name) {
  const start = text.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `missing ${name}`);
  const open = text.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(open + 1, i);
    }
  }
  assert.fail(`unterminated ${name}`);
}

function compileFunction(text, name, args) {
  const params = args.join(", ");
  return vm.runInNewContext(`(function(${params}) {${getFunctionBody(text, name)}\n})`);
}

test("boot gate accepts only a ready, healthy Hermes API, not a listening port", () => {
  const isReady = compileFunction(source, "isEmbeddedServiceReady", ["result"]);
  const healthy = {
    ok: true,
    ready: true,
    running: true,
    api_status: { version: "1.2.3" }
  };
  assert.equal(isReady(healthy), true);
  assert.equal(isReady({ ...healthy, ready: false }), false);
  assert.equal(isReady({ ...healthy, ok: false }), false);
  assert.equal(isReady({ ...healthy, api_status: null }), false);
  assert.equal(isReady({ ...healthy, api_status: { version: "" } }), false);
  assert.equal(isReady({ running: true }), false);
});

test("a real setup reason is shown after removing credentials and private paths", () => {
  const sanitize = compileFunction(source, "sanitizeBootDiagnostic", ["value"]);
  const clean = sanitize("Provider initialization failed: API_KEY=sk-secret Bearer tok-secret at /data/user/0/app/cache/file");
  assert.match(clean, /Provider initialization failed/);
  assert.match(clean, /API_KEY=\[مخفي\]/);
  assert.match(clean, /Bearer \[مخفي\]/);
  assert.match(clean, /\[مسار خاص\]/);
  assert.doesNotMatch(clean, /sk-secret|tok-secret|\/data\/user/);
});

test("model readiness requires actual configured state, not localStorage defaults", () => {
  const isModelReady = compileFunction(source, "isModelReady", ["status"]);
  assert.equal(isModelReady({ configured: true, model: "provider/model" }), true);
  assert.equal(isModelReady({ configured: false, model: "provider/model" }), false);
  assert.equal(isModelReady({ configured: true, model: "" }), false);
  assert.equal(isModelReady({ model: "gpt-default" }), false);

  assert.match(source, /function loadMobileChatConfig\(\)\s*\{[\s\S]*?return \{ apiKey: "", baseUrl: "", model: "" \};/);
  assert.match(source, /requestDashboardJson\("GET", "\/api\/model\/info"/);
  assert.match(source, /requestDashboardJson\("POST", "\/api\/model\/set"/);
});

test("chat and parallel prompts are blocked before dispatch when no model is configured", () => {
  const submitStart = source.indexOf("async function submitMessage()");
  const parallelStart = source.indexOf("async function submitParallelTasks()");
  assert.notEqual(submitStart, -1);
  assert.notEqual(parallelStart, -1);
  const submit = source.slice(submitStart, source.indexOf("function renderAgentsPage()", submitStart));
  const parallel = source.slice(parallelStart, source.indexOf("function latestAssistantText()", parallelStart));
  assert.ok(submit.indexOf("await refreshModelStatus()") < submit.indexOf("streamHermesAgentReply("));
  assert.match(submit, /if \(!isModelReady\(currentModelStatus\)\)/);
  assert.match(parallel, /await refreshModelStatus\(\)/);
  assert.match(parallel, /if \(!isModelReady\(currentModelStatus\)\)/);
  assert.ok(parallel.indexOf("if (!isModelReady(currentModelStatus))") < parallel.indexOf("runParallelAgentTask("));
});

test("Android asset carries the same readiness and model-gating helpers", () => {
  for (const name of ["sanitizeBootDiagnostic", "isEmbeddedServiceReady", "isModelReady"]) {
    assert.equal(getFunctionBody(androidSource, name), getFunctionBody(source, name), `${name} diverged in Android asset`);
  }
  assert.match(androidSource, /if \(!isEmbeddedServiceReady\(startResult\)\)/);
  assert.match(androidSource, /requestDashboardJson\("GET", "\/api\/model\/info"/);
  assert.match(androidSource, /if \(!isModelReady\(currentModelStatus\)\)/);
});
