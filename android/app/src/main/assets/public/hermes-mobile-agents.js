(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.HermesMobileAgents = api;
  }
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  var DEFAULT_AGENT_ID = "agent-hermes";
  var MAX_INSTRUCTIONS = 4000;
  var MAX_DESCRIPTION = 240;
  var MAX_NAME = 48;
  var MAX_EMOJI = 8;

  function starterAgents() {
    return [
      {
        id: DEFAULT_AGENT_ID,
        name: "Hermes",
        description: "الوكيل العام",
        instructions: "",
        emoji: "🤖",
        builtIn: true
      },
      {
        id: "agent-developer",
        name: "المطوّر",
        description: "للمهام البرمجية والتقنية",
        instructions: "تصرّف كمساعد تطوير برمجيات عملي. حلّل المشكلة قبل اقتراح التغيير، واذكر الملفات والخطوات والاختبارات المناسبة. لا تدّع تنفيذ أو اختبار شيء لم تنفذه فعليًا.",
        emoji: "💻",
        builtIn: false
      },
      {
        id: "agent-researcher",
        name: "الباحث",
        description: "للبحث والتحليل ومقارنة الخيارات",
        instructions: "تصرّف كباحث دقيق. افصل الحقائق عن الاستنتاجات، واستند إلى مصادر موثوقة عند استخدام البحث، واذكر عدم اليقين والقيود بدل التخمين.",
        emoji: "🔎",
        builtIn: false
      },
      {
        id: "agent-planner",
        name: "منظّم المهام",
        description: "للتخطيط وترتيب الأولويات",
        instructions: "حوّل الطلب إلى خطوات عملية مرتبة حسب الأولوية. اجعل الخطة واقعية ومختصرة، وبيّن ما يحتاج إلى قرار من المستخدم قبل التنفيذ.",
        emoji: "🗂️",
        builtIn: false
      }
    ];
  }

  function cleanText(value, limit) {
    return String(value == null ? "" : value).trim().slice(0, limit);
  }

  function normalizeAgent(value) {
    var source = value && typeof value === "object" ? value : {};
    var originalId = cleanText(source.id, 96);
    var id = originalId.replace(/[^A-Za-z0-9_-]/g, "");
    if (id !== originalId) return null;
    if (!id) return null;
    return {
      id: id,
      name: cleanText(source.name, MAX_NAME) || "وكيل جديد",
      description: cleanText(source.description, MAX_DESCRIPTION),
      instructions: cleanText(source.instructions, MAX_INSTRUCTIONS),
      emoji: cleanText(source.emoji, MAX_EMOJI) || "🤖",
      builtIn: id === DEFAULT_AGENT_ID
    };
  }

  function normalizeAgents(value) {
    var source = Array.isArray(value) ? value : [];
    var byId = Object.create(null);
    source.forEach(function (item) {
      var agent = normalizeAgent(item);
      if (agent && !byId[agent.id]) byId[agent.id] = agent;
    });
    if (!byId[DEFAULT_AGENT_ID]) {
      byId[DEFAULT_AGENT_ID] = starterAgents()[0];
    }
    return Object.keys(byId).map(function (id) { return byId[id]; });
  }

  function normalizeMessage(message) {
    if (!message || (message.role !== "user" && message.role !== "assistant") || typeof message.content !== "string") {
      return null;
    }
    var attachments = Array.isArray(message.attachments) ? message.attachments.filter(function (item) {
      return item && typeof item.name === "string";
    }).map(function (item) {
      return { name: item.name.slice(0, 240), path: typeof item.path === "string" ? item.path : "" };
    }) : [];
    return { role: message.role, content: message.content, attachments: attachments };
  }

  function normalizeSessions(value, now) {
    var timestamp = typeof now === "number" ? now : Date.now();
    return (Array.isArray(value) ? value : []).map(function (session) {
      var source = session && typeof session === "object" ? session : {};
      var messages = Array.isArray(source.messages) ? source.messages.map(normalizeMessage).filter(Boolean).slice(-40) : [];
      var agentId = cleanText(source.agentId, 96);
      if (!/^[A-Za-z0-9_-]+$/.test(agentId)) agentId = DEFAULT_AGENT_ID;
      return {
        agentId: agentId || DEFAULT_AGENT_ID,
        backendSessionId: typeof source.backendSessionId === "string" ? source.backendSessionId : "",
        createdAt: Number(source.createdAt) || timestamp,
        id: cleanText(source.id, 120) || ("session-" + timestamp + "-" + Math.random().toString(16).slice(2)),
        messages: messages,
        title: cleanText(source.title, 120) || "محادثة جديدة",
        updatedAt: Number(source.updatedAt) || timestamp
      };
    });
  }

  function sessionsForAgent(sessions, agentId) {
    return (Array.isArray(sessions) ? sessions : []).filter(function (session) {
      return session && session.agentId === agentId;
    });
  }

  function buildPrompt(agent, userText) {
    var prompt = String(userText == null ? "" : userText);
    if (!agent || !String(agent.instructions || "").trim()) return prompt;
    var name = cleanText(agent.name, MAX_NAME) || "الوكيل";
    var description = cleanText(agent.description, MAX_DESCRIPTION);
    var instructions = cleanText(agent.instructions, MAX_INSTRUCTIONS);
    return "[تعليمات الوكيل المختار: " + name + "]\n"
      + (description ? "الدور: " + description + "\n" : "")
      + instructions
      + "\n\nمهمة المستخدم:\n"
      + prompt;
  }

  return {
    DEFAULT_AGENT_ID: DEFAULT_AGENT_ID,
    buildPrompt: buildPrompt,
    normalizeAgents: normalizeAgents,
    normalizeSessions: normalizeSessions,
    sessionsForAgent: sessionsForAgent,
    starterAgents: starterAgents
  };
});
