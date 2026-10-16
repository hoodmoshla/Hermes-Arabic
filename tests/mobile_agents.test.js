const test = require("node:test");
const assert = require("node:assert/strict");
const agents = require("../www/hermes-mobile-agents.js");

test("fresh installs receive a general agent and three specialist starters", () => {
  const starters = agents.starterAgents();
  assert.equal(starters.length, 4);
  assert.equal(starters[0].id, agents.DEFAULT_AGENT_ID);
  assert.equal(starters[0].instructions, "");
  assert.equal(new Set(starters.map((agent) => agent.id)).size, starters.length);
});

test("agent normalization keeps one protected general agent and bounds user text", () => {
  const normalized = agents.normalizeAgents([
    { id: "agent-custom", name: "مساعد", description: "وصف", instructions: "تعليمات".repeat(900), emoji: "✨" },
    { id: "agent-custom", name: "نسخة مكررة" },
    { id: "../../unsafe", name: "غير صالح" }
  ]);
  assert.equal(normalized.filter((agent) => agent.id === "agent-custom").length, 1);
  assert.equal(normalized.find((agent) => agent.id === "agent-custom").instructions.length, 4000);
  assert.ok(normalized.some((agent) => agent.id === agents.DEFAULT_AGENT_ID && agent.builtIn));
  assert.ok(!normalized.some((agent) => agent.name === "غير صالح"));
});

test("legacy conversations migrate to the general agent and retain attachments", () => {
  const sessions = agents.normalizeSessions([
    {
      id: "legacy-session",
      title: "محادثة قديمة",
      messages: [
        { role: "user", content: "حلّل هذا الملف", attachments: [{ name: "report.pdf", path: "/private/report.pdf" }] },
        { role: "system", content: "غير مدعوم" }
      ]
    }
  ], 1234);
  assert.equal(sessions[0].agentId, agents.DEFAULT_AGENT_ID);
  assert.equal(sessions[0].messages.length, 1);
  assert.deepEqual(sessions[0].messages[0].attachments[0], { name: "report.pdf", path: "/private/report.pdf" });
});

test("sessions stay associated with their selected agent", () => {
  const sessions = agents.normalizeSessions([
    { id: "one", agentId: "agent-developer", messages: [] },
    { id: "two", agentId: "agent-researcher", messages: [] },
    { id: "three", messages: [] }
  ], 100);
  assert.deepEqual(agents.sessionsForAgent(sessions, "agent-developer").map((session) => session.id), ["one"]);
  assert.deepEqual(agents.sessionsForAgent(sessions, agents.DEFAULT_AGENT_ID).map((session) => session.id), ["three"]);
});

test("agent instructions are applied to the chosen task without changing the generic agent prompt", () => {
  const task = "راجع هذا المشروع";
  assert.equal(agents.buildPrompt({ id: "agent-hermes", name: "Hermes", instructions: "" }, task), task);
  const prompt = agents.buildPrompt({
    name: "المطوّر",
    description: "للمهام البرمجية",
    instructions: "اذكر الاختبارات المناسبة."
  }, task);
  assert.match(prompt, /تعليمات الوكيل المختار: المطوّر/);
  assert.match(prompt, /اذكر الاختبارات المناسبة/);
  assert.match(prompt, /مهمة المستخدم:\nراجع هذا المشروع$/);
});
