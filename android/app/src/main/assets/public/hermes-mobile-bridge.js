(function () {
  if (window.hermesDesktop) {
    return;
  }

  var COMMUNITY_GROUP_ID = "436742652";
  var COMMUNITY_QQ_URL = "mqqapi://card/show_pslcard?src_type=internal&version=1&uin=436742652&card_type=group&source=qrcode";
  var AI_MOBILE_CHANNEL_ID = "pd51668397";
  var AI_MOBILE_CHANNEL_URL = "https://pd.qq.com/s/hoxw8t1so?b=9";
  var THEME_STORAGE_KEY = "hermes.mobile.theme";
  var MOBILE_CHAT_CONFIG_KEY = "hermes.mobile.chat.config";
  var MOBILE_CHAT_HISTORY_KEY = "hermes.mobile.chat.history";
  var MOBILE_SESSIONS_KEY = "hermes.mobile.chat.sessions.v1";
  var MOBILE_READY_KEY = "hermes.mobile.ready.v1";
  var MOBILE_TTS_ENABLED_KEY = "hermes.mobile.tts.enabled";
  var DEFAULT_CHAT_ENDPOINT = "https://api.openai.com/v1";
  var DEFAULT_CHAT_MODEL = "gpt-5.5";
  var BOOT_CHECK_VERSION = "Hermes Mobile v2026.07.03";
  var embeddedDashboardBaseUrl = "";
  var embeddedTerminalUrl = "";
  var MODEL_PRESETS = [
    { label: "OpenAI / GPT-5.6 Sol", model: "gpt-5.6-sol", baseUrl: DEFAULT_CHAT_ENDPOINT },
    { label: "OpenAI / GPT-5.6 Terra", model: "gpt-5.6-terra", baseUrl: DEFAULT_CHAT_ENDPOINT },
    { label: "OpenAI / GPT-5.6 Luna", model: "gpt-5.6-luna", baseUrl: DEFAULT_CHAT_ENDPOINT },
    { label: "OpenAI / GPT-5.5", model: "gpt-5.5", baseUrl: DEFAULT_CHAT_ENDPOINT },
    { label: "OpenAI / GPT-5.4 mini", model: "gpt-5.4-mini", baseUrl: DEFAULT_CHAT_ENDPOINT },
    { label: "OpenAI / GPT-5.4", model: "gpt-5.4", baseUrl: DEFAULT_CHAT_ENDPOINT },
    { label: "Anthropic / Claude Fable 5", model: "claude-fable-5", baseUrl: "https://api.anthropic.com/v1" },
    { label: "Anthropic / Claude Opus 4.8", model: "claude-opus-4-8", baseUrl: "https://api.anthropic.com/v1" },
    { label: "Anthropic / Claude Sonnet 5", model: "claude-sonnet-5", baseUrl: "https://api.anthropic.com/v1" },
    { label: "DeepSeek / V4 Pro", model: "deepseek-v4-pro", baseUrl: "https://api.deepseek.com/v1" },
    { label: "Zhipu GLM / GLM-5.2", model: "glm-5.2", baseUrl: "https://open.bigmodel.cn/api/paas/v4" },
    { label: "Gemini / 3.1 Pro", model: "gemini-3.1-pro-preview", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai" },
    { label: "Moonshot / Kimi K2.7 Code", model: "kimi-k2.7-code", baseUrl: "https://api.moonshot.cn/v1" },
    { label: "Qwen / Qwen3.7 Max", model: "qwen3.7-max", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
    { label: "Qwen / Qwen3.7 Plus", model: "qwen3.7-plus", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
    { label: "MiniMax / MiniMax-M3", model: "MiniMax-M3", baseUrl: "https://api.minimax.chat/v1" },
    { label: "xAI / Grok 4.3", model: "grok-4.3", baseUrl: "https://api.x.ai/v1" },
    { label: "OpenRouter / Claude Fable 5", model: "anthropic/claude-fable-5", baseUrl: "https://openrouter.ai/api/v1" },
    { label: "OpenRouter / Opus 4.8", model: "anthropic/claude-opus-4.8", baseUrl: "https://openrouter.ai/api/v1" },
    { label: "OpenRouter / Sonnet 5", model: "anthropic/claude-sonnet-5", baseUrl: "https://openrouter.ai/api/v1" },
    { label: "OpenRouter / Gemini 3.1 Pro", model: "google/gemini-3.1-pro-preview", baseUrl: "https://openrouter.ai/api/v1" },
    { label: "OpenRouter / DeepSeek V4 Pro", model: "deepseek/deepseek-v4-pro", baseUrl: "https://openrouter.ai/api/v1" },
    { label: "OpenRouter / GLM-5.2", model: "z-ai/glm-5.2", baseUrl: "https://openrouter.ai/api/v1" },
    { label: "OpenRouter / Kimi K2.7 Code", model: "moonshotai/kimi-k2.7-code", baseUrl: "https://openrouter.ai/api/v1" },
    { label: "Ollama / llama3.1 محلي", model: "llama3.1", baseUrl: "http://127.0.0.1:11434/v1" },
    { label: "مخصص", model: "", baseUrl: "" }
  ];
  var DRAWER_TOOLS = [
    ["مركز الملفات", "الصور والصوت والمستندات والملفات الناتجة", "resources", "الرئيسية"],
    ["المهام المجدولة", "جدولة المهام وتسليمها عبر قنوات متعددة", "automation", "الرئيسية"],
    ["التكاملات", "منصات المراسلة وإعداد البوابة ومراقبة الحالة", "integrations", "الاتصال"],
    ["الخوادم البعيدة", "OAuth أو بيانات الحساب واتصال WebSocket آمن", "remote", "الاتصال"]
  ];
  var SETTINGS_TOOLS = [
    ["النماذج والاتصالات", "إعداد نماذج Hermes وعنوان الخدمة ومفتاح API", "models", "الإعدادات الأساسية"],
    ["النماذج المحلية", "تنزيل GGUF والتحقق منه وتشغيل llama.cpp بلا API", "local-models", "الإعدادات الأساسية"],
    ["GitHub", "قراءة المستودعات ومراجعة مقترحات الوكيل قبل رفعها", "github", "قدرات الوكيل"],
    ["اللغة", "تغيير اللغة والإعدادات الإقليمية", "language", "الإعدادات الأساسية"],
    ["المظهر", "الوضع الداكن والخط وحجم العرض", "appearance", "الإعدادات الأساسية"],
    ["الاستخدام", "استهلاك الرموز وإحصاءات الاستخدام", "usage", "الإعدادات الأساسية"],
    ["إدارة الذاكرة", "ذاكرة المشروع المنظمة وتفضيلات المستخدم", "memory", "قدرات الوكيل"],
    ["الملفات الناتجة", "إدارة سير العمل والنتائج", "artifacts", "قدرات الوكيل"],
    ["مركز المهارات", "استعراض المهارات وتثبيتها وإزالتها وفحصها", "skills", "قدرات الوكيل"],
    ["الشخصية", "تعديل الشخصية وأسلوب الإجابة في SOUL.md", "persona", "قدرات الوكيل"],
    ["الأدوات", "الويب والطرفية والملفات والبرمجة والصور والصوت", "tools", "قدرات الوكيل"],
    ["MCP", "استعراض خوادم MCP وتثبيتها وتبديلها", "mcp", "قدرات الوكيل"],
    ["بيئات معزولة", "محلي وDocker وSSH وSingularity وModal", "sandboxes", "متقدم"],
    ["الوكلاء الفرعيون", "وكلاء فرعيون معزولون وتنفيذ متوازٍ", "subagents", "متقدم"],
    ["لوحة الأوامر", "Cmd/Ctrl+K والإجراءات العامة", "command-palette", "متقدم"]
  ];
  var ALL_SETTINGS_TOOLS = [
    ["النماذج والاتصالات", "إعداد النماذج وعنوان الخدمة ومفتاح API", "models", "النموذج والاتصال"],
    ["التكاملات", "منصات المراسلة وإعداد البوابة ومراقبة الحالة", "integrations", "النموذج والاتصال"],
    ["الخوادم البعيدة", "OAuth أو بيانات الحساب واتصال WebSocket آمن", "remote", "النموذج والاتصال"],
    ["مركز الملفات", "الصور والصوت والمستندات والملفات الناتجة", "resources", "الملفات"],
    ["الملفات الناتجة", "إدارة سير العمل والنتائج", "artifacts", "الملفات"],
    ["المهام المجدولة", "جدولة المهام وتسليمها عبر قنوات متعددة", "automation", "المهام"],
    ["الخصوصية والبيانات", "مكان حفظ الجلسات ومتى تُرسل البيانات إلى مزوّد خارجي", "privacy", "الخصوصية"],
    ["المظهر", "الوضع الداكن والخط وحجم العرض", "appearance", "المظهر واللغة"],
    ["اللغة", "تغيير لغة الواجهة والإعدادات الإقليمية", "language", "المظهر واللغة"],
    ["النماذج المحلية", "تنزيل GGUF والتحقق منه وتشغيل llama.cpp بلا API", "local-models", "النماذج"],
    ["الاستخدام", "استهلاك الرموز وإحصاءات الاستخدام", "usage", "البيانات"],
    ["إدارة الذاكرة", "ذاكرة المشروع المنظمة وتفضيلات المستخدم", "memory", "البيانات"],
    ["GitHub", "قراءة المستودعات ومراجعة مقترحات الوكيل قبل رفعها", "github", "قدرات Hermes"],
    ["مركز المهارات", "استعراض المهارات وتثبيتها وإزالتها وفحصها", "skills", "قدرات Hermes"],
    ["الشخصية", "تعديل الشخصية وأسلوب الإجابة في SOUL.md", "persona", "قدرات Hermes"],
    ["الأدوات", "الويب والطرفية والملفات والبرمجة والصور والصوت", "tools", "قدرات Hermes"],
    ["MCP", "استعراض خوادم MCP وتثبيتها وتبديلها", "mcp", "قدرات Hermes"],
    ["بيئات معزولة", "محلي وDocker وSSH وSingularity وModal", "sandboxes", "متقدم"],
    ["الوكلاء الفرعيون", "وكلاء فرعيون معزولون وتنفيذ متوازٍ", "subagents", "متقدم"],
    ["لوحة الأوامر", "Cmd/Ctrl+K والإجراءات العامة", "command-palette", "متقدم"]
  ];
  var FEATURE_INFO = {
    integrations: ["التكاملات", "إعداد منصات المراسلة والبوابة ومراقبة حالة Hermes المحلي."],
    remote: ["الخوادم البعيدة", "تجد هنا إعداد الاتصال ببوابة Hermes."],
    language: ["اللغة", "تتزامن اللغة مع إعدادات لوحة Hermes على سطح المكتب."],
    resources: ["مركز الملفات", "إدارة الصور والصوت والمستندات والملفات المصدّرة من هنا."],
    artifacts: ["الملفات الناتجة", "تُعرض هنا الملفات والنتائج الناتجة عن المهام."],
    automation: ["المهام المجدولة", "جدولة المهام بلغة طبيعية وتسليمها إلى قنوات متعددة."],
    appearance: ["المظهر", "إعدادات السمة والخط وحجم العرض."],
    usage: ["الاستخدام", "إحصاءات الرموز والنماذج واستخدام المحادثات."],
    memory: ["إدارة الذاكرة", "الذاكرة المنظمة وسياق المشروع والتفضيلات."],
    skills: ["مركز المهارات", "البحث عن المهارات وتثبيتها وإزالتها وفحصها."],
    persona: ["الشخصية", "إعداد الشخصية والنبرة وأسلوب الإجابة."],
    tools: ["الأدوات", "إعداد أدوات الويب والطرفية والملفات والبرمجة والصور والصوت."],
    mcp: ["MCP", "استعراض خوادم MCP وتثبيتها وتبديلها."],
    sandboxes: ["بيئات معزولة", "بيئات محلية أو Docker أو SSH أو Singularity أو Modal."],
    subagents: ["الوكلاء الفرعيون", "وكلاء فرعيون معزولون وتنفيذ متوازٍ."],
    "command-palette": ["لوحة الأوامر", "الإجراءات العامة والأوامر المختصرة."],
    "local-models": ["النماذج المحلية", "تنزيل نموذج GGUF موثق وتشغيل استدلال llama.cpp داخل الجهاز."],
    privacy: ["الخصوصية والبيانات", "راجع أين تُحفظ الجلسات وكيف تُرسل بيانات الرسائل والمرفقات."],
    github: ["GitHub", "ربط مستودعات GitHub وقراءة الملفات ومراجعة التغييرات ونتائج الاختبار."]
  };
  var SLASH_COMMANDS = {
    "/new": "new-session",
    "/web": "tool-web",
    "/code": "tool-code",
    "/shell": "tool-shell",
    "/memory": "view-memory",
    "/usage": "view-usage",
    "/undo": "undo"
  };
  var CHANNELS = [
    "Telegram", "Discord", "Slack", "WhatsApp", "Signal", "Feishu", "DingTalk", "WeCom", "WeChat", "QQ", "البريد الإلكتروني", "رسائل نصية", "Matrix", "Line", "Teams", "Notion", "GitHub", "Webhooks", "RSS", "HTTP مخصص"
  ];
  var listeners = {
    backendExit: [],
    bootProgress: [],
    bootstrap: [],
    closePreview: [],
    deepLink: [],
    focusSession: [],
    notificationAction: [],
    previewFileChanged: [],
    powerResume: [],
    updateProgress: [],
    updates: [],
    windowState: []
  };

  function logMobileEvent(name, detail) {
    try {
      var entry = {
        at: new Date().toISOString(),
        detail: detail || null,
        name: name
      };
      window.__hermesAndroidEvents = window.__hermesAndroidEvents || [];
      window.__hermesAndroidEvents.push(entry);
      if (window.__hermesAndroidEvents.length > 200) {
        window.__hermesAndroidEvents.splice(0, window.__hermesAndroidEvents.length - 200);
      }
      console.debug("[Hermes Android]", name, detail || "");
    } catch (error) {
      // ignore diagnostics failures
    }
  }

  function now() {
    return Date.now();
  }

  function bootProgress(message, progress, running, error) {
    return {
      error: error || null,
      fakeMode: false,
      message: message || "جارٍ تشغيل Hermes",
      phase: running === false ? "android.ready" : "android.backend",
      progress: progress == null ? 90 : progress,
      running: running !== false,
      timestamp: now()
    };
  }

  function emit(name, payload) {
    (listeners[name] || []).forEach(function (listener) {
      try {
        listener(payload);
      } catch (error) {
        console.warn("[Hermes mobile bridge] listener failed", error);
      }
    });
  }

  // Android viewport insets: MainActivity calls this after WebView layout changes.
  // Keep the variables generic so header, drawer, dialogs and composer can share them.
  function installAndroidInsetsBridge() {
    window.__hermesAndroidSetInsets = function (top, right, bottom, left) {
      var dpr = window.devicePixelRatio || 1;
      var root = document.documentElement;
      root.style.setProperty("--hermes-safe-top", Math.ceil((top || 0) / dpr) + "px");
      root.style.setProperty("--hermes-safe-right", Math.ceil((right || 0) / dpr) + "px");
      root.style.setProperty("--hermes-safe-bottom", Math.ceil((bottom || 0) / dpr) + "px");
      root.style.setProperty("--hermes-safe-left", Math.ceil((left || 0) / dpr) + "px");
    };
  }

  function ensureAndroidBootOverlay() {
    if (document.getElementById("hermes-android-boot-overlay")) {
      return;
    }
    installAndroidInsetsBridge();
    var style = document.createElement("style");
    style.id = "hermes-android-boot-style";
    style.textContent = [
      ":root{--hermes-safe-top:env(safe-area-inset-top,0px);--hermes-safe-right:env(safe-area-inset-right,0px);--hermes-safe-bottom:env(safe-area-inset-bottom,0px);--hermes-safe-left:env(safe-area-inset-left,0px);}",
      "html,body,#root{min-height:100%;background:#f5f7fb;}",
      "#hermes-android-boot-overlay{position:fixed;inset:0;z-index:2147483640;display:grid;place-items:center;background:#f5f7fb;color:#111827;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}",
      "#hermes-android-boot-overlay[hidden]{display:none!important;}",
      "#hermes-android-boot-card{width:min(84vw,420px);display:grid;gap:16px;text-align:left;}",
      "#hermes-android-boot-brand{display:flex;align-items:center;gap:12px;justify-content:center;}",
      "#hermes-android-boot-mark{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:#111827;color:#f9fafb;font-weight:800;font-size:20px;box-shadow:0 12px 30px rgba(15,23,42,.18);}",
      "#hermes-android-boot-heading{display:grid;gap:2px;}",
      "#hermes-android-boot-kicker{font-size:12px;font-weight:700;color:#0f766e;text-transform:uppercase;letter-spacing:0;}",
      "#hermes-android-boot-title{font-size:22px;line-height:1.18;font-weight:760;color:#111827;text-align:left;}",
      "#hermes-android-boot-text{font-size:15px;line-height:1.65;color:#5f6b7a;text-align:center;}",
      "#hermes-android-boot-status{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;}",
      "#hermes-android-boot-status[hidden]{display:none!important;}",
      "#hermes-android-boot-status>div{min-width:0;border:1px solid #dde3eb;border-radius:10px;background:#fff;padding:10px 8px;text-align:center;box-shadow:0 8px 20px rgba(15,23,42,.04);}",
      "#hermes-android-boot-status span{display:block;font-size:11px;color:#778293;line-height:1.25;}",
      "#hermes-android-boot-status strong{display:block;margin-top:4px;font-size:13px;color:#111827;line-height:1.25;}",
      "#hermes-android-boot-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;}",
      "#hermes-android-boot-actions[hidden]{display:none!important;}",
      "#hermes-android-boot-actions button{border:0;border-radius:10px;min-height:46px;padding:0 18px;background:#111827;color:#fff;font-size:15px;font-weight:700;box-shadow:0 12px 28px rgba(15,23,42,.18);}",
      "#hermes-android-boot-actions button.secondary{background:#e8edf3;color:#111827;box-shadow:none;}",
      "#hermes-android-boot-note{font-size:13px;line-height:1.55;color:#9aa4b2;text-align:center;}",
      "#hermes-android-boot-log{max-height:240px;overflow:auto;text-align:right;direction:rtl;unicode-bidi:plaintext;white-space:pre-wrap;overflow-wrap:anywhere;background:#111827;color:#d7dee8;border-radius:12px;padding:14px 16px;font:14px/1.65 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:normal;box-shadow:0 18px 36px rgba(15,23,42,.16);}",
      "#hermes-android-boot-log[hidden]{display:none!important;}",
      "#hermes-android-boot-bar{height:3px;border-radius:999px;background:#e5e7eb;overflow:hidden;}",
      "#hermes-android-boot-bar[hidden]{display:none!important;}",
      "#hermes-android-boot-bar>span{display:block;height:100%;width:38%;border-radius:inherit;background:#111827;animation:hermesAndroidBoot 1.2s ease-in-out infinite;}",
      "#hermes-android-boot-overlay.hermes-mobile-chat-mode{display:block;position:fixed;inset:0;width:100vw;max-width:none;background:#f5f7fb;overflow:hidden;}",
      "#hermes-mobile-chat{height:100vh;height:100dvh;display:grid;grid-template-rows:auto 1fr auto;background:#f5f7fb;color:#111827;}",
      "#hermes-mobile-chat-header{display:flex;align-items:center;gap:12px;padding:16px 16px 12px;border-bottom:1px solid #e5eaf0;background:rgba(245,247,251,.96);}",
      "#hermes-mobile-chat-mark{width:38px;height:38px;border-radius:11px;background:#111827;color:#fff;display:grid;place-items:center;font-size:19px;font-weight:800;box-shadow:0 10px 24px rgba(15,23,42,.16);}",
      "#hermes-mobile-chat-title{min-width:0;flex:1;}#hermes-mobile-chat-title strong{display:block;font-size:18px;line-height:1.2;}#hermes-mobile-chat-title span{display:block;margin-top:2px;font-size:12px;color:#667085;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
      "#hermes-mobile-chat-settings{border:0;border-radius:10px;background:#e8edf3;color:#111827;font-size:14px;font-weight:700;min-height:38px;padding:0 12px;}",
      "#hermes-mobile-chat-messages{min-height:0;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:12px;}",
      ".hermes-mobile-message{max-width:88%;border-radius:14px;padding:11px 13px;font-size:15px;line-height:1.55;white-space:pre-wrap;word-break:break-word;box-shadow:0 8px 20px rgba(15,23,42,.05);}",
      ".hermes-mobile-message.user{align-self:flex-end;background:#111827;color:#fff;border-bottom-right-radius:5px;}",
      ".hermes-mobile-message.assistant{align-self:flex-start;background:#fff;color:#111827;border:1px solid #e1e7ef;border-bottom-left-radius:5px;}",
      ".hermes-mobile-message.system{align-self:center;max-width:96%;background:#eef7f5;color:#0f766e;border:1px solid #cde8e2;text-align:center;font-size:13px;box-shadow:none;}",
      "#hermes-mobile-chat-composer{display:grid;grid-template-columns:1fr auto;gap:10px;padding:12px 16px 16px;border-top:1px solid #e5eaf0;background:rgba(245,247,251,.98);}",
      "#hermes-mobile-chat-input{width:100%;max-height:132px;min-height:46px;resize:none;border:1px solid #d9e1ea;border-radius:12px;background:#fff;color:#111827;padding:11px 12px;font:15px/1.45 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;outline:none;}",
      "#hermes-mobile-chat-send{border:0;border-radius:12px;background:#111827;color:#fff;font-size:15px;font-weight:750;min-width:72px;padding:0 16px;}",
      "#hermes-mobile-chat-send:disabled{opacity:.48;}",
      "#hermes-mobile-chat-config{position:fixed;inset:auto 12px 12px 12px;z-index:2147483641;background:#fff;border:1px solid #dbe3ec;border-radius:16px;padding:14px;box-shadow:0 24px 60px rgba(15,23,42,.2);display:grid;gap:10px;}",
      "#hermes-mobile-chat-config[hidden]{display:none!important;}#hermes-mobile-chat-config h2{margin:0;font-size:16px;line-height:1.3;}#hermes-mobile-chat-config label{display:grid;gap:5px;font-size:12px;color:#667085;font-weight:700;}",
      "#hermes-mobile-chat-config input{min-height:42px;border:1px solid #d9e1ea;border-radius:10px;padding:0 11px;font-size:14px;color:#111827;background:#fff;outline:none;}",
      "#hermes-mobile-chat-config-actions{display:flex;gap:8px;justify-content:flex-end;}#hermes-mobile-chat-config-actions button{border:0;border-radius:10px;min-height:40px;padding:0 13px;font-weight:750;background:#111827;color:#fff;}#hermes-mobile-chat-config-actions button.secondary{background:#e8edf3;color:#111827;}",
      "html.hermes-android-app,html.hermes-android-app body{margin:0!important;width:100vw!important;max-width:none!important;overflow:hidden!important;background:#0f172a!important;}",
      "#hermes-mobile-shell{position:fixed;inset:0;width:100vw;max-width:none;height:100vh;height:100dvh;display:grid;grid-template-rows:auto 1fr auto;background:radial-gradient(circle at 10% 0%,rgba(66,133,244,.12),transparent 30%),radial-gradient(circle at 92% 18%,rgba(234,67,53,.10),transparent 28%),linear-gradient(180deg,#fbfcff 0%,#f4f7fb 100%);color:#172033;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;overflow:hidden;overscroll-behavior:none;}",
      "#hermes-mobile-top{padding:14px 14px 8px;background:rgba(251,252,255,.78);backdrop-filter:blur(18px);}",
      "#hermes-mobile-brand{display:flex;align-items:center;gap:10px;}#hermes-mobile-logo{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#4285f4,#9b72cb 45%,#fbbc04);color:#fff;display:grid;place-items:center;font-size:19px;font-weight:850;box-shadow:0 12px 28px rgba(66,133,244,.24);}#hermes-mobile-title{min-width:0;flex:1;}#hermes-mobile-title strong{display:block;font-size:19px;line-height:1.12;letter-spacing:0;}#hermes-mobile-title span{display:block;margin-top:3px;color:#697386;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
      "#hermes-mobile-actions{display:flex;gap:8px;}#hermes-mobile-actions button{width:38px;height:38px;border:0;border-radius:999px;background:rgba(255,255,255,.82);color:#1f2937;font-size:17px;font-weight:800;box-shadow:0 8px 20px rgba(31,41,55,.08);}",
      "#hermes-mobile-status-row{display:flex;gap:8px;overflow:auto;padding-top:12px;scrollbar-width:none;}#hermes-mobile-status-row::-webkit-scrollbar{display:none;}.hermes-mobile-chip{flex:0 0 auto;border:1px solid rgba(209,216,228,.74);background:rgba(255,255,255,.72);border-radius:999px;padding:7px 10px;color:#5f6c80;font-size:12px;line-height:1;box-shadow:0 8px 18px rgba(31,41,55,.04);}.hermes-mobile-chip strong{color:#172033;font-weight:760;}",
      "#hermes-mobile-main{min-height:0;overflow:auto;padding:10px 12px 8px;}.hermes-mobile-page{display:none;min-height:100%;}.hermes-mobile-page.active{display:block;}",
      ".hermes-mobile-section{display:grid;gap:10px;min-width:0;max-width:100%;overflow-x:hidden;}.hermes-mobile-panel{min-width:0;max-width:100%;box-sizing:border-box;background:rgba(255,255,255,.78);border:1px solid rgba(218,225,235,.84);border-radius:18px;padding:14px;box-shadow:0 14px 34px rgba(31,41,55,.07);backdrop-filter:blur(16px);}.hermes-mobile-panel h2{margin:0 0 8px;font-size:16px;line-height:1.3;}.hermes-mobile-panel p{margin:0;color:#667085;font-size:13px;line-height:1.55;overflow-wrap:anywhere;word-break:break-word;}.hermes-mobile-resource-path{display:grid;gap:10px;}.hermes-mobile-resource-actions{display:flex;flex-wrap:wrap;gap:8px;}",
      "#hermes-mobile-hero{padding:12px 2px 10px;}#hermes-mobile-hero-title{font-size:24px;line-height:1.18;font-weight:760;letter-spacing:0;background:linear-gradient(100deg,#4285f4,#9b72cb 42%,#ea4335 72%,#fbbc04);-webkit-background-clip:text;background-clip:text;color:transparent;}#hermes-mobile-hero-sub{margin-top:8px;color:#697386;font-size:14px;line-height:1.5;}",
      "#hermes-mobile-suggestions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;overflow:visible;padding:0 0 12px;}.hermes-mobile-suggestion{min-width:0;min-height:54px;border:1px solid rgba(218,225,235,.82);border-radius:16px;background:rgba(255,255,255,.72);padding:10px 12px;text-align:left;color:#172033;font-size:13px;line-height:1.35;box-shadow:0 12px 30px rgba(31,41,55,.06);}.hermes-mobile-suggestion:nth-child(3){grid-column:1/-1;}",
      "#hermes-mobile-stream{display:flex;flex-direction:column;gap:10px;padding-bottom:12px;overflow-x:hidden;}.hermes-mobile-bubble{max-width:88%;border-radius:18px;padding:11px 13px;font-size:15px;line-height:1.55;white-space:pre-wrap;word-break:break-word;box-shadow:0 10px 24px rgba(31,41,55,.06);}.hermes-mobile-bubble.user{align-self:flex-end;max-width:78%;background:#1f2937;color:#fff;border-bottom-right-radius:7px;}.hermes-mobile-bubble.assistant{align-self:flex-start;max-width:94%;background:transparent;color:#172033;border:0;box-shadow:none;border-radius:0;padding:6px 2px;}.hermes-mobile-empty{margin:8px auto 18px;max-width:88%;border:1px solid rgba(190,216,255,.9);background:rgba(239,246,255,.72);color:#28589a;border-radius:18px;padding:12px;text-align:center;font-size:14px;line-height:1.5;}",
      ".hermes-mobile-agent-output{display:grid;gap:9px;min-width:min(260px,72vw);}.hermes-mobile-reasoning-card{border-radius:14px;padding:9px 10px;white-space:pre-wrap;word-break:break-word;background:rgba(99,102,241,.08);border:1px solid rgba(129,140,248,.24);color:#53617a;font-size:13px;line-height:1.45;}.hermes-mobile-reasoning-card p{margin:0;}.hermes-mobile-answer-text{white-space:pre-wrap;word-break:break-word;color:inherit;font-size:15px;line-height:1.6;}.hermes-mobile-answer-text.pending{display:none;}",
      ".hermes-mobile-reasoning-card summary,.hermes-mobile-tool-call summary{cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between;gap:10px;font-weight:720;}.hermes-mobile-reasoning-card summary::-webkit-details-marker,.hermes-mobile-tool-call summary::-webkit-details-marker{display:none;}.hermes-mobile-reasoning-card summary::before{content:'✦';color:#818cf8;margin-right:7px;}.hermes-mobile-reasoning-card.streaming summary::after{content:'';width:12px;height:12px;border:2px solid rgba(129,140,248,.28);border-top-color:#818cf8;border-radius:50%;animation:hermesToolSpin .8s linear infinite;}.hermes-mobile-reasoning-card p{margin:9px 0 0;padding-top:9px;border-top:1px solid rgba(129,140,248,.22);color:#334155;}.hermes-mobile-tool-trace{display:grid;gap:7px;}.hermes-mobile-tool-call{border:1px solid rgba(148,163,184,.25);border-radius:13px;background:rgba(148,163,184,.08);padding:9px 10px;font-size:12px;}.hermes-mobile-tool-call summary span::before{content:'⌁';color:#60a5fa;margin-right:7px;}.hermes-mobile-tool-call.running summary span::before{content:'◌';display:inline-block;animation:hermesToolSpin .8s linear infinite;}.hermes-mobile-tool-call summary em{font-style:normal;font-weight:650;color:#64748b;}.hermes-mobile-tool-call.running summary em{color:#6366f1;}.hermes-mobile-tool-call.complete summary em{color:#16a34a;}.hermes-mobile-tool-call.error summary em{color:#dc2626;}.hermes-mobile-tool-call p{margin:8px 0 0;color:#64748b;white-space:pre-wrap;word-break:break-word;}.hermes-mobile-tool-call pre{max-height:180px;overflow:auto;margin:8px 0 0;padding:8px;border-radius:9px;background:rgba(15,23,42,.06);white-space:pre-wrap;word-break:break-word;font:11px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;}@keyframes hermesToolSpin{to{transform:rotate(360deg);}}",
      "#hermes-mobile-composer{position:sticky;bottom:0;display:grid;grid-template-columns:auto auto 1fr auto;gap:8px;padding:10px 0 0;background:linear-gradient(180deg,rgba(244,247,251,0),#f4f7fb 30%);}#hermes-mobile-composer button{border:0;border-radius:999px;min-height:46px;min-width:46px;padding:0 12px;background:rgba(255,255,255,.82);color:#172033;font-weight:800;font-size:15px;box-shadow:0 10px 24px rgba(31,41,55,.08);}#hermes-mobile-composer button.primary{background:linear-gradient(135deg,#4285f4,#9b72cb);color:#fff;min-width:62px;}#hermes-mobile-input{min-width:0;min-height:46px;max-height:120px;border:1px solid rgba(210,219,232,.95);border-radius:24px;background:rgba(255,255,255,.9);color:#172033;padding:11px 14px;font:15px/1.45 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;resize:none;outline:none;box-shadow:0 10px 24px rgba(31,41,55,.06);}",
      ".hermes-mobile-list{display:grid;gap:9px;min-width:0;}.hermes-mobile-row{width:100%;box-sizing:border-box;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;background:rgba(255,255,255,.78);border:1px solid rgba(218,225,235,.88);border-radius:16px;padding:12px;box-shadow:0 10px 24px rgba(31,41,55,.05);overflow:hidden;}.hermes-mobile-row-main{min-width:0;overflow:hidden;}.hermes-mobile-row-main strong{display:block;font-size:14px;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.hermes-mobile-row-main span{display:block;margin-top:4px;color:#667085;font-size:12px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word;}.hermes-mobile-row-actions{display:grid;gap:7px;grid-auto-flow:row;justify-items:end;}.hermes-mobile-row button,.hermes-mobile-panel button{border:0;border-radius:999px;min-height:38px;padding:0 14px;background:#1f2937;color:#fff;font-weight:760;white-space:nowrap;}.hermes-mobile-row button.secondary,.hermes-mobile-panel button.secondary{background:#eef2f7;color:#172033;}@media(max-width:380px){.hermes-mobile-row{grid-template-columns:1fr;}.hermes-mobile-row-actions{grid-auto-flow:column;justify-content:end;}}",
      ".hermes-mobile-form{display:grid;gap:10px;}.hermes-mobile-form label{display:grid;gap:5px;color:#667085;font-size:12px;font-weight:750;}.hermes-mobile-form input{min-height:44px;border:1px solid rgba(210,219,232,.95);border-radius:14px;padding:0 12px;background:rgba(255,255,255,.88);color:#172033;font-size:14px;outline:none;}.hermes-mobile-form-actions{display:flex;gap:8px;justify-content:flex-end;}",
      "#hermes-mobile-nav{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;padding:7px 8px calc(7px + env(safe-area-inset-bottom));background:rgba(255,255,255,.84);border-top:1px solid rgba(218,225,235,.88);box-shadow:0 -14px 32px rgba(31,41,55,.08);backdrop-filter:blur(18px);}#hermes-mobile-nav button{border:0;border-radius:999px;background:transparent;color:#667085;min-height:48px;display:grid;place-items:center;font-size:11px;font-weight:760;}#hermes-mobile-nav button span{display:block;font-size:18px;line-height:1;}#hermes-mobile-nav button.active{background:#eef4ff;color:#2563eb;}",
      "@keyframes hermesGeminiFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}#hermes-mobile-logo{animation:hermesGeminiFloat 3.4s ease-in-out infinite;}",
      "#hermes-mobile-shell.gemini{grid-template-rows:auto 1fr auto;}",
      "#hermes-mobile-progress{position:absolute;inset:0;z-index:5;display:grid;place-items:center;background:radial-gradient(circle at 20% 12%,rgba(66,133,244,.16),transparent 34%),linear-gradient(180deg,#fbfcff,#f4f7fb);}",
      "#hermes-mobile-progress[hidden]{display:none!important;}#hermes-mobile-progress-box{width:min(78vw,340px);display:grid;gap:18px;text-align:left;}#hermes-mobile-progress-logo{width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#4285f4,#9b72cb 45%,#fbbc04);color:#fff;font-size:28px;font-weight:850;box-shadow:0 18px 44px rgba(66,133,244,.24);animation:hermesGeminiFloat 3.2s ease-in-out infinite;}#hermes-mobile-progress-title{font-size:24px;line-height:1.18;font-weight:760;color:#172033;}#hermes-mobile-progress-text{font-size:14px;color:#697386;line-height:1.55;}#hermes-mobile-progress-track{height:6px;border-radius:999px;background:#e5eaf2;overflow:hidden;}#hermes-mobile-progress-bar{height:100%;width:18%;border-radius:inherit;background:linear-gradient(90deg,#4285f4,#9b72cb,#fbbc04);animation:hermesProgress 1.55s ease-in-out infinite;}@keyframes hermesProgress{0%{transform:translateX(-115%);width:28%;}55%{width:55%;}100%{transform:translateX(360%);width:28%;}}",
      "#hermes-mobile-top.gemini{display:flex;align-items:center;gap:10px;padding:calc(max(12px,var(--hermes-safe-top)) + 10px) calc(14px + var(--hermes-safe-right)) 8px calc(14px + var(--hermes-safe-left));background:rgba(251,252,255,.72);backdrop-filter:blur(18px);}#hermes-mobile-menu-button{width:42px;height:42px;border:0;border-radius:999px;background:rgba(255,255,255,.84);box-shadow:0 8px 20px rgba(31,41,55,.08);font-size:22px;color:#172033;}#hermes-mobile-title.gemini{text-align:center;}#hermes-mobile-title.gemini strong{font-size:18px;}#hermes-mobile-subtitle{display:inline-block;margin-top:2px;border:0;background:transparent;color:#667085;font-size:12px;line-height:1.25;padding:2px 8px;border-radius:999px;}#hermes-mobile-subtitle:active{background:rgba(37,99,235,.1);color:#2563eb;}#hermes-mobile-settings-button.gemini{width:42px;height:42px;border:0;border-radius:999px;background:rgba(255,255,255,.84);box-shadow:0 8px 20px rgba(31,41,55,.08);font-size:18px;color:#172033;}",
      "#hermes-mobile-chat-body{min-height:0;overflow:auto;overflow-x:hidden;padding:4px calc(14px + var(--hermes-safe-right)) 12px calc(14px + var(--hermes-safe-left));}#hermes-mobile-chat-body.has-messages #hermes-mobile-hero,#hermes-mobile-chat-body.has-messages #hermes-mobile-suggestions{display:none!important;}#hermes-mobile-bottom{padding:7px calc(14px + var(--hermes-safe-right)) calc(9px + var(--hermes-safe-bottom)) calc(14px + var(--hermes-safe-left));background:linear-gradient(180deg,rgba(244,247,251,0),#f4f7fb 24%,#f4f7fb 100%);overflow:hidden;}#hermes-mobile-inputbar{display:grid;grid-template-columns:auto 1fr auto auto;gap:7px;align-items:center;background:rgba(255,255,255,.9);border:1px solid rgba(210,219,232,.95);border-radius:25px;padding:5px 6px 5px 8px;box-shadow:0 14px 34px rgba(31,41,55,.11);backdrop-filter:blur(18px);}#hermes-mobile-inputbar button{position:relative;border:0;border-radius:999px;width:38px;height:38px;background:#eef4ff;color:#2563eb;font-size:18px;font-weight:850;}#hermes-mobile-inputbar button.primary{background:linear-gradient(135deg,#4285f4,#9b72cb);color:#fff;}#hermes-mobile-inputbar button.tts-off::after{content:\"\";position:absolute;left:8px;right:8px;top:18px;height:3px;border-radius:999px;background:#ef4444;transform:rotate(-42deg);box-shadow:0 0 0 1px rgba(255,255,255,.72);}#hermes-mobile-inputbar button.tts-on{background:#dcfce7;color:#15803d;}#hermes-mobile-input{min-width:0;min-height:38px;max-height:88px;border:0;background:transparent;color:#172033;padding:7px 4px;font:15px/1.35 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;resize:none;outline:none;}",
      "#hermes-mobile-attachment-row{display:flex;gap:8px;overflow:auto;padding:0 4px 8px;scrollbar-width:none;}#hermes-mobile-attachment-row::-webkit-scrollbar{display:none;}.hermes-mobile-attachment{flex:0 0 auto;max-width:220px;display:flex;align-items:center;gap:7px;border:1px solid rgba(147,197,253,.9);border-radius:999px;background:rgba(239,246,255,.92);color:#1d4ed8;padding:7px 9px;font-size:12px;font-weight:720;box-shadow:0 8px 18px rgba(37,99,235,.08);}.hermes-mobile-attachment span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.hermes-mobile-attachment button{border:0;background:rgba(37,99,235,.12);color:#1d4ed8;border-radius:999px;width:22px;height:22px;font-size:14px;line-height:1;padding:0;}.hermes-mobile-row-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end;}.hermes-mobile-form select,.hermes-mobile-form textarea{min-height:44px;border:1px solid rgba(210,219,232,.95);border-radius:14px;padding:0 12px;background:rgba(255,255,255,.88);color:#172033;font-size:14px;outline:none;}.hermes-mobile-form textarea{min-height:84px;padding:10px 12px;resize:vertical;font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}.hermes-mobile-tool-grid{display:grid;grid-template-columns:1fr;gap:9px;}.hermes-mobile-tool{min-height:74px;border:1px solid rgba(218,225,235,.88);border-radius:18px;background:rgba(255,255,255,.78);padding:12px;text-align:left;box-shadow:0 10px 24px rgba(31,41,55,.05);overflow-wrap:anywhere;}.hermes-mobile-tool strong{display:block;font-size:14px;line-height:1.25;color:#172033;}.hermes-mobile-tool span{display:block;margin-top:6px;color:#667085;font-size:12px;line-height:1.35;}",
      "#hermes-mobile-shell.dark{background:radial-gradient(circle at 12% 0%,rgba(59,130,246,.18),transparent 30%),radial-gradient(circle at 94% 16%,rgba(236,72,153,.14),transparent 28%),linear-gradient(180deg,#09111f 0%,#0f172a 100%);color:#f8fafc;}#hermes-mobile-shell.dark #hermes-mobile-top.gemini{background:rgba(15,23,42,.86);}#hermes-mobile-shell.dark #hermes-mobile-subtitle,#hermes-mobile-shell.dark #hermes-mobile-hero-sub,#hermes-mobile-shell.dark .hermes-mobile-panel p,#hermes-mobile-shell.dark .hermes-mobile-row-main span,#hermes-mobile-shell.dark .hermes-mobile-tool span{color:#d7e3f8;}#hermes-mobile-shell.dark #hermes-mobile-menu-button,#hermes-mobile-shell.dark #hermes-mobile-settings-button,#hermes-mobile-shell.dark #hermes-mobile-inputbar,#hermes-mobile-shell.dark .hermes-mobile-panel,#hermes-mobile-shell.dark .hermes-mobile-row,#hermes-mobile-shell.dark .hermes-mobile-tool,#hermes-mobile-shell.dark .hermes-mobile-suggestion{background:rgba(15,23,42,.9);border-color:rgba(96,165,250,.42);color:#f8fafc;}#hermes-mobile-shell.dark .hermes-mobile-bubble.assistant{background:transparent;border:0;box-shadow:none;color:#f8fafc;}#hermes-mobile-shell.dark .hermes-mobile-panel h2,#hermes-mobile-shell.dark .hermes-mobile-row-main strong,#hermes-mobile-shell.dark .hermes-mobile-tool strong{color:#ffffff;}#hermes-mobile-shell.dark #hermes-mobile-bottom{background:linear-gradient(180deg,rgba(15,23,42,0),#0f172a 24%,#0f172a 100%);}#hermes-mobile-shell.dark #hermes-mobile-input,#hermes-mobile-shell.dark .hermes-mobile-form input,#hermes-mobile-shell.dark .hermes-mobile-form select,#hermes-mobile-shell.dark .hermes-mobile-form textarea{color:#ffffff;background:rgba(15,23,42,.82);border-color:#60a5fa;}#hermes-mobile-shell.dark #hermes-mobile-input::placeholder{color:#cbd5e1;}#hermes-mobile-shell.dark #hermes-mobile-drawer{background:rgba(15,23,42,.98);color:#f8fafc;}#hermes-mobile-shell.dark .hermes-mobile-drawer-item{color:#f8fafc;}#hermes-mobile-shell.dark .hermes-mobile-drawer-item small{color:#d7e3f8;}#hermes-mobile-shell.dark .hermes-mobile-drawer-item.active{background:#1d4ed8;color:#fff;box-shadow:inset 0 0 0 1px rgba(147,197,253,.36);}#hermes-mobile-shell.dark .hermes-mobile-drawer-item.active small{color:#dbeafe;}#hermes-mobile-shell.dark .hermes-mobile-drawer-item .icon{background:rgba(96,165,250,.18);color:#bfdbfe;}#hermes-mobile-shell.dark .hermes-mobile-drawer-item.active .icon{background:rgba(255,255,255,.18);color:#fff;}#hermes-mobile-shell.dark .hermes-mobile-tool:focus,#hermes-mobile-shell.dark .hermes-mobile-drawer-item:focus,#hermes-mobile-shell.dark .hermes-mobile-tool:focus-visible,#hermes-mobile-shell.dark .hermes-mobile-drawer-item:focus-visible{outline:none;box-shadow:inset 0 0 0 1px rgba(96,165,250,.62),0 0 0 3px rgba(37,99,235,.22);}#hermes-mobile-shell.dark .hermes-mobile-empty{background:rgba(30,41,59,.82);border-color:#60a5fa;color:#dbeafe;}#hermes-mobile-shell.dark #hermes-mobile-drawer-settings{background:#1d4ed8;color:#fff;}",
      "#hermes-mobile-shell.dark .hermes-mobile-reasoning-card{background:rgba(30,41,59,.72);border-color:rgba(129,140,248,.42);color:#f1f5f9;}#hermes-mobile-shell.dark .hermes-mobile-reasoning-card p{color:#e2e8f0;}#hermes-mobile-shell.dark .hermes-mobile-answer-text{color:#f8fafc;}#hermes-mobile-shell.dark .hermes-mobile-answer-text.pending{color:#cbd5e1;}",
      "#hermes-mobile-drawer-backdrop{position:absolute;inset:0;z-index:20;background:rgba(15,23,42,.26);opacity:0;pointer-events:none;transition:opacity .18s ease;}#hermes-mobile-drawer{position:absolute;z-index:21;left:0;top:0;bottom:0;width:min(84vw,340px);background:rgba(255,255,255,.94);box-shadow:28px 0 60px rgba(31,41,55,.18);transform:translateX(-102%);transition:transform .22s ease;border-radius:0 24px 24px 0;padding:calc(16px + var(--hermes-safe-top)) 14px calc(18px + var(--hermes-safe-bottom)) calc(14px + var(--hermes-safe-left));display:grid;grid-template-rows:auto 1fr auto;gap:14px;backdrop-filter:blur(22px);}#hermes-mobile-shell.drawer-open #hermes-mobile-drawer{transform:translateX(0);}#hermes-mobile-shell.drawer-open #hermes-mobile-drawer-backdrop{opacity:1;pointer-events:auto;}#hermes-mobile-drawer-head{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:12px;}#hermes-mobile-terminal-chip{border:0;border-radius:18px;min-width:82px;min-height:58px;padding:6px 9px;background:#111827;color:#fff;display:grid;place-items:center;gap:2px;box-shadow:0 14px 30px rgba(15,23,42,.18);}#hermes-mobile-terminal-chip span{display:block;font-size:18px;line-height:1;}#hermes-mobile-terminal-chip strong{display:block;font-size:12px;line-height:1.15;color:#fff;}#hermes-mobile-drawer-brand{display:flex;align-items:center;gap:10px;min-width:0;}#hermes-mobile-drawer-head .mark{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#4285f4,#9b72cb 45%,#fbbc04);color:#fff;font-weight:850;}#hermes-mobile-drawer-head strong{display:block;font-size:17px;}#hermes-mobile-drawer-head span{display:block;color:#697386;font-size:12px;margin-top:2px;}#hermes-mobile-drawer-list{display:grid;align-content:start;gap:8px;overflow:auto;}.hermes-mobile-drawer-group{padding:10px 12px 2px;color:#7b8796;font-size:12px;font-weight:760;}.hermes-mobile-drawer-item{width:100%;border:0;border-radius:16px;min-height:54px;padding:0 12px;background:transparent;color:#172033;display:flex;align-items:center;gap:12px;text-align:left;font-size:15px;font-weight:720;}.hermes-mobile-drawer-item small{display:block;color:#697386;font-size:12px;font-weight:520;margin-top:2px;}.hermes-mobile-drawer-item .icon{width:32px;height:32px;border-radius:999px;background:#eef4ff;color:#2563eb;display:grid;place-items:center;font-size:16px;flex:0 0 auto;}.hermes-mobile-drawer-item.active{background:#eef4ff;}#hermes-mobile-drawer-foot{display:flex;justify-content:flex-start;}#hermes-mobile-drawer-settings{border:0;border-radius:999px;width:46px;height:46px;background:#eef4ff;color:#2563eb;font-size:20px;box-shadow:0 10px 24px rgba(37,99,235,.12);}",
      "#hermes-mobile-drawer-backdrop{position:absolute;inset:0;z-index:20;background:rgba(15,23,42,.28);opacity:0;pointer-events:none;transition:opacity .18s ease;}#hermes-mobile-drawer{position:absolute;z-index:21;left:0;top:0;bottom:0;width:min(88vw,360px);background:rgba(250,251,253,.98);box-shadow:28px 0 60px rgba(31,41,55,.2);transform:translateX(-102%);transition:transform .22s ease;border-radius:0 22px 22px 0;padding:calc(14px + var(--hermes-safe-top)) 14px calc(12px + var(--hermes-safe-bottom)) calc(14px + var(--hermes-safe-left));display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;gap:12px;backdrop-filter:blur(24px);}#hermes-mobile-shell.drawer-open #hermes-mobile-drawer{transform:translateX(0);}#hermes-mobile-shell.drawer-open #hermes-mobile-drawer-backdrop{opacity:1;pointer-events:auto;}#hermes-mobile-drawer-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:2px 4px;}#hermes-mobile-drawer-brand{display:flex;align-items:center;gap:10px;min-width:0;}#hermes-mobile-drawer-head .mark{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#4285f4,#9b72cb 45%,#fbbc04);color:#fff;font-weight:850;}#hermes-mobile-drawer-head strong{display:block;font-size:18px;}#hermes-mobile-drawer-head span{display:block;color:#7a8496;font-size:12px;margin-top:2px;}#hermes-mobile-drawer-close{width:40px;height:40px;border:0;border-radius:999px;background:transparent;color:#475569;font-size:24px;}#hermes-mobile-drawer-actions{display:grid;gap:9px;}#hermes-mobile-drawer-new,#hermes-mobile-drawer-phone{width:100%;min-height:52px;border:0;border-radius:18px;color:#172033;display:flex;align-items:center;gap:13px;padding:0 16px;font-size:16px;font-weight:760;text-align:left;}#hermes-mobile-drawer-phone{background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;box-shadow:0 10px 24px rgba(37,99,235,.24);}#hermes-mobile-drawer-new{background:#eef0f3;}#hermes-mobile-drawer-new .icon,#hermes-mobile-drawer-phone .icon{font-size:24px;font-weight:500;}#hermes-mobile-drawer-search-wrap{position:relative;}#hermes-mobile-drawer-search-wrap .icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:20px;color:#7a8496;pointer-events:none;}#hermes-mobile-drawer-search{width:100%;height:48px;border:0;border-radius:16px;background:#f1f3f6;color:#172033;padding:0 14px 0 44px;font-size:15px;outline:none;}#hermes-mobile-drawer-search:focus{box-shadow:inset 0 0 0 2px rgba(66,133,244,.55);background:#fff;}#hermes-mobile-drawer-list{min-height:0;overflow:auto;overflow-x:hidden;padding:2px 2px 6px;}.hermes-mobile-drawer-group{padding:10px 8px 7px;color:#8792a5;font-size:12px;font-weight:760;}.hermes-mobile-drawer-session{width:100%;border:0;border-radius:14px;background:transparent;color:#172033;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;text-align:left;padding:11px 10px;margin-bottom:3px;}.hermes-mobile-drawer-session:active{background:#eef0f3;}.hermes-mobile-drawer-session.active{background:#e9edf5;}.hermes-mobile-drawer-session-main{min-width:0;width:100%;border:0;background:transparent;color:inherit;text-align:left;padding:0;font:inherit;}.hermes-mobile-drawer-session strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px;font-weight:680;}.hermes-mobile-drawer-session small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#7a8496;font-size:11px;margin-top:4px;}.hermes-mobile-drawer-session-delete{width:32px;height:32px;border:0;border-radius:10px;background:transparent;color:#94a3b8;font-size:18px;opacity:.78;}.hermes-mobile-drawer-session-delete:active{background:#fee2e2;color:#dc2626;}.hermes-mobile-drawer-empty{padding:26px 12px;text-align:center;color:#8792a5;font-size:13px;line-height:1.6;}#hermes-mobile-drawer-foot{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;border-top:1px solid rgba(210,219,232,.8);padding:12px 4px 0;}#hermes-mobile-drawer-profile{min-width:0;display:flex;align-items:center;gap:10px;}#hermes-mobile-drawer-profile .avatar{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#172033,#475569);color:#fff;font-weight:850;}#hermes-mobile-drawer-profile strong{display:block;font-size:14px;}#hermes-mobile-drawer-profile span{display:block;color:#7a8496;font-size:11px;margin-top:2px;}#hermes-mobile-drawer-settings{width:44px;height:44px;border:0;border-radius:14px;background:transparent;color:#172033;font-size:23px;box-shadow:none;}#hermes-mobile-drawer-settings:active{background:#e9edf5;}.hermes-mobile-community-card{border:1px solid rgba(147,197,253,.72)!important;background:linear-gradient(135deg,rgba(219,234,254,.82),rgba(243,232,255,.82))!important;}.hermes-mobile-community-card .hermes-mobile-form-actions{justify-content:flex-start;margin-top:14px;}.hermes-mobile-settings-hero{padding:2px 2px 4px;}.hermes-mobile-settings-hero h2{font-size:28px;margin:0 0 6px;}.hermes-mobile-settings-hero p{margin:0;color:#667085;font-size:13px;}",
      "#hermes-mobile-shell.dark #hermes-mobile-drawer-new,#hermes-mobile-shell.dark #hermes-mobile-drawer-search{background:#202838;color:#f8fafc;}#hermes-mobile-shell.dark #hermes-mobile-drawer-phone{background:linear-gradient(135deg,#1d4ed8,#4338ca);color:#fff;}#hermes-mobile-shell.dark #hermes-mobile-drawer-search::placeholder{color:#94a3b8;}#hermes-mobile-shell.dark .hermes-mobile-drawer-session{color:#f8fafc;}#hermes-mobile-shell.dark .hermes-mobile-drawer-session.active,#hermes-mobile-shell.dark .hermes-mobile-drawer-session:active{background:#222c3e;}#hermes-mobile-shell.dark .hermes-mobile-drawer-session small,#hermes-mobile-shell.dark #hermes-mobile-drawer-profile span{color:#94a3b8;}#hermes-mobile-shell.dark #hermes-mobile-drawer-close,#hermes-mobile-shell.dark #hermes-mobile-drawer-settings{color:#e2e8f0;}#hermes-mobile-shell.dark #hermes-mobile-drawer-settings:active{background:#222c3e;}#hermes-mobile-shell.dark .hermes-mobile-community-card{background:linear-gradient(135deg,rgba(30,64,175,.3),rgba(88,28,135,.3))!important;border-color:rgba(96,165,250,.38)!important;}",
      ".hermes-mobile-adb-status{display:flex;align-items:flex-start;gap:10px}.hermes-mobile-adb-status .dot{width:11px;height:11px;border-radius:50%;margin-top:5px;background:#94a3b8;box-shadow:0 0 0 5px rgba(148,163,184,.13)}.hermes-mobile-adb-status.connected .dot{background:#22c55e;box-shadow:0 0 0 5px rgba(34,197,94,.14)}.hermes-mobile-adb-status.error .dot{background:#ef4444;box-shadow:0 0 0 5px rgba(239,68,68,.13)}.hermes-mobile-guide{display:grid;gap:10px;counter-reset:adb-step}.hermes-mobile-guide-step{position:relative;padding:12px 12px 12px 48px;border-radius:16px;background:rgba(148,163,184,.08);border:1px solid rgba(148,163,184,.2)}.hermes-mobile-guide-step::before{counter-increment:adb-step;content:counter(adb-step);position:absolute;left:12px;top:12px;width:25px;height:25px;border-radius:50%;display:grid;place-items:center;background:#2563eb;color:#fff;font-size:12px;font-weight:800}.hermes-mobile-guide-step strong{display:block;font-size:14px}.hermes-mobile-guide-step p{margin:5px 0 0!important;font-size:12px!important}.hermes-mobile-adb-note{padding:10px 12px;border-radius:14px;background:rgba(245,158,11,.11);border:1px solid rgba(245,158,11,.28);color:#92400e;font-size:12px;line-height:1.5}#hermes-mobile-shell.dark .hermes-mobile-adb-note{color:#fde68a;background:rgba(245,158,11,.1)}",
      "@media(max-width:420px){#hermes-android-boot-card{width:min(88vw,380px);gap:14px;}#hermes-android-boot-title{font-size:20px;}#hermes-android-boot-text{font-size:14px;}#hermes-android-boot-log{font-size:12px;}#hermes-android-boot-status{gap:6px;}#hermes-android-boot-status>div{padding:8px 6px;}}",
      "@keyframes hermesAndroidBoot{0%{transform:translateX(-110%)}100%{transform:translateX(270%)}}"
    ].join("");
    document.head.appendChild(style);

    var overlay = document.createElement("div");
    overlay.id = "hermes-android-boot-overlay";
    overlay.innerHTML = [
      "<div id=\"hermes-android-boot-card\">",
      "  <div id=\"hermes-android-boot-brand\">",
      "    <div id=\"hermes-android-boot-mark\">H</div>",
      "    <div id=\"hermes-android-boot-heading\">",
      "      <div id=\"hermes-android-boot-kicker\">هيرمس للهاتف</div>",
      "      <div id=\"hermes-android-boot-title\">جارٍ تشغيل Hermes</div>",
      "    </div>",
      "  </div>",
      "  <div id=\"hermes-android-boot-text\">جارٍ الاتصال بالخدمة المحلية...</div>",
      "  <div id=\"hermes-android-boot-status\" hidden></div>",
      "  <div id=\"hermes-android-boot-actions\" hidden>",
      "    <button id=\"hermes-android-boot-primary\" type=\"button\">إعادة المحاولة</button>",
      "    <button id=\"hermes-android-boot-secondary\" class=\"secondary\" type=\"button\">المحاولة لاحقًا</button>",
      "  </div>",
      "  <pre id=\"hermes-android-boot-log\" hidden></pre>",
      "  <div id=\"hermes-android-boot-note\">" + BOOT_CHECK_VERSION + "</div>",
      "  <div id=\"hermes-android-boot-bar\"><span></span></div>",
      "</div>"
    ].join("");
    document.body.appendChild(overlay);
  }

  function openExternalUrl(url) {
    try {
      if (window.HermesAndroid && typeof window.HermesAndroid.openExternalUrl === "function") {
        return Boolean(window.HermesAndroid.openExternalUrl(url));
      }
      window.open(url, "_blank");
      return true;
    } catch (error) {
      logMobileEvent("open-external-url-failed", { error: String(error && error.message || error), url: url });
      return false;
    }
  }

  function callHermesAndroidJson(method, args) {
    if (!window.HermesAndroid || typeof window.HermesAndroid[method] !== "function") {
      return { ok: false, error: "هذه العملية غير متاحة على هذا الجهاز." };
    }
    try {
      return JSON.parse(window.HermesAndroid[method].apply(window.HermesAndroid, args || []));
    } catch (error) {
      return { ok: false, error: arabicErrorText(error, "تعذّر تنفيذ العملية على الهاتف.") };
    }
  }

  function callHermesAndroidBoolean(method, args) {
    if (!window.HermesAndroid || typeof window.HermesAndroid[method] !== "function") {
      return false;
    }
    try {
      return Boolean(window.HermesAndroid[method].apply(window.HermesAndroid, args || []));
    } catch (error) {
      return false;
    }
  }

  function isEmbeddedAgentAvailable() {
    return callHermesAndroidBoolean("isEmbeddedAgentAvailable");
  }

  function runEmbeddedAgentCommand(command) {
    return callHermesAndroidJson("runEmbeddedAgentCommand", [JSON.stringify({ command: command || "status" })]);
  }

  function startEmbeddedAgent() {
    return callHermesAndroidJson("startEmbeddedAgent");
  }

  function mobileDashboardLocale() {
    try {
      var saved = window.localStorage && (window.localStorage.getItem("hermes.mobile.locale") || window.localStorage.getItem("hermes.desktop.locale"));
      return saved === "en" ? "en" : (saved === "zh" || saved === "zh-CN") ? "zh" : "ar";
    } catch (error) {
      return "ar";
    }
  }

  function rememberEmbeddedDashboard(startResult) {
    var base = (startResult && startResult.url || ("http://127.0.0.1:" + (startResult && startResult.port || "9129"))).replace(/\/+$/, "");
    embeddedDashboardBaseUrl = base;
    embeddedTerminalUrl = base + "/chat?fresh=1&channel=android-mobile-terminal&locale=" + mobileDashboardLocale();
  }

  function openDashboardPath(path) {
    var base = embeddedDashboardBaseUrl || "http://127.0.0.1:9129";
    var target = base.replace(/\/+$/, "") + (path || ("/?locale=" + mobileDashboardLocale()));
    window.location.href = target;
  }

  function openTerminalMode() {
    if (!window.confirm("وضع الطرفية مخصص للعمليات المتقدمة. يمكنك العودة باستخدام زر «العودة إلى واجهة الهاتف» أعلى الشاشة. هل تريد المتابعة؟")) {
      return;
    }
    window.location.href = embeddedTerminalUrl || ("http://127.0.0.1:9129/chat?fresh=1&channel=android-mobile-terminal&locale=" + mobileDashboardLocale());
  }

  function formatEmbeddedStatus(result) {
    if (!result || typeof result !== "object") {
      return "لم تُعِد الخدمة المحلية حالتها. أعد المحاولة أو راجع سجل التطبيق.";
    }
    var lines = [];
    lines.push("الخدمة المحلية: " + (result.running ? "قيد التشغيل" : "متوقفة"));
    if (result.url) {
      lines.push("عنوان الخدمة: " + result.url);
    }
    if (result.uptime_seconds != null) {
      lines.push("مدة التشغيل: " + result.uptime_seconds + " ثانية");
    }
    if (result.api_status) {
      lines.push("واجهة الخدمة تستجيب.");
    }
    if (result.error) {
      console.warn("[Hermes Android] Embedded service startup detail:", result.error);
      lines.push("تعذّر تشغيل الخدمة المحلية. راجع سجل التطبيق أو أعد المحاولة.");
    }
    return lines.join("\n");
  }

  function arabicErrorText(error, fallback) {
    var raw = String(error && error.message || error || "").trim();
    if (!raw) {
      return fallback || "حدث خطأ غير متوقع. أعد المحاولة.";
    }
    if (/[\u0600-\u06FF]/.test(raw)) {
      return raw;
    }
    console.warn("[Hermes Mobile] Unlocalized error detail:", raw);
    return fallback || "حدث خطأ غير متوقع. أعد المحاولة.";
  }

  function inferProviderFromEndpoint(baseUrl) {
    var normalized = String(baseUrl || "").toLowerCase();
    if (!normalized) {
      return "custom";
    }
    return "custom";
  }

  function normalizeOpenAICompatibleBaseUrl(baseUrl) {
    var value = String(baseUrl || "").trim().replace(/\/+$/, "");
    if (!value) {
      return "";
    }
    try {
      var parsed = new URL(value);
      if (!parsed.pathname || parsed.pathname === "/") {
        parsed.pathname = "/v1";
      }
      return parsed.toString().replace(/\/+$/, "");
    } catch (error) {
      return value;
    }
  }

  function loadMobileChatConfig() {
    try {
      var raw = window.localStorage && window.localStorage.getItem(MOBILE_CHAT_CONFIG_KEY);
      var parsed = raw ? JSON.parse(raw) : {};
      return {
        apiKey: "",
        baseUrl: parsed.baseUrl || DEFAULT_CHAT_ENDPOINT,
        model: parsed.model || DEFAULT_CHAT_MODEL
      };
    } catch (error) {
      return { apiKey: "", baseUrl: DEFAULT_CHAT_ENDPOINT, model: DEFAULT_CHAT_MODEL };
    }
  }

  function saveMobileChatConfig(config) {
    try {
      window.localStorage.setItem(MOBILE_CHAT_CONFIG_KEY, JSON.stringify({
        baseUrl: config.baseUrl || "",
        model: config.model || ""
      }));
    } catch (error) {
      logMobileEvent("mobile-chat-config-save-failed", { error: String(error && error.message || error) });
    }
  }

  function loadMobileChatHistory() {
    try {
      var raw = window.localStorage && window.localStorage.getItem(MOBILE_CHAT_HISTORY_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        return parsed.filter(function (message) {
          return message && (message.role === "user" || message.role === "assistant") && typeof message.content === "string";
        }).slice(-40);
      }
    } catch (error) {
      logMobileEvent("mobile-chat-history-load-failed", { error: String(error && error.message || error) });
    }
    return [];
  }

  function saveMobileChatHistory(messages) {
    try {
      window.localStorage.setItem(MOBILE_CHAT_HISTORY_KEY, JSON.stringify((messages || []).slice(-40)));
    } catch (error) {
      logMobileEvent("mobile-chat-history-save-failed", { error: String(error && error.message || error) });
    }
  }

  function createMobileSession(seedMessages, title) {
    return {
      backendSessionId: "",
      createdAt: Date.now(),
      id: "session-" + Date.now() + "-" + Math.random().toString(16).slice(2),
      messages: (seedMessages || []).slice(-40),
      title: title || "محادثة جديدة",
      updatedAt: Date.now()
    };
  }

  function normalizeMobileSessions(value) {
    var parsed = Array.isArray(value) ? value : [];
    return parsed.map(function (session) {
      var messages = Array.isArray(session && session.messages) ? session.messages.filter(function (message) {
        return message && (message.role === "user" || message.role === "assistant") && typeof message.content === "string";
      }).slice(-40).map(function (message) {
        var attachments = Array.isArray(message.attachments) ? message.attachments.filter(function (item) {
          return item && typeof item.name === "string";
        }).map(function (item) {
          return { name: item.name, path: typeof item.path === "string" ? item.path : "" };
        }) : [];
        return { role: message.role, content: message.content, attachments: attachments };
      }) : [];
      return {
        backendSessionId: session && session.backendSessionId || "",
        createdAt: session && session.createdAt || Date.now(),
        id: session && session.id || ("session-" + Date.now() + "-" + Math.random().toString(16).slice(2)),
        messages: messages,
        title: session && session.title || "محادثة جديدة",
        updatedAt: session && session.updatedAt || Date.now()
      };
    });
  }

  function loadMobileSessions() {
    try {
      var raw = window.localStorage && window.localStorage.getItem(MOBILE_SESSIONS_KEY);
      var sessions = normalizeMobileSessions(raw ? JSON.parse(raw) : []);
      if (sessions.length) {
        return sessions;
      }
      var legacyMessages = loadMobileChatHistory();
      return [createMobileSession(legacyMessages, legacyMessages.length ? "المحادثة الحالية" : "محادثة جديدة")];
    } catch (error) {
      logMobileEvent("mobile-sessions-load-failed", { error: String(error && error.message || error) });
      return [createMobileSession([], "محادثة جديدة")];
    }
  }

  function saveMobileSessions(sessions) {
    try {
      window.localStorage.setItem(MOBILE_SESSIONS_KEY, JSON.stringify(normalizeMobileSessions(sessions).slice(-30)));
    } catch (error) {
      logMobileEvent("mobile-sessions-save-failed", { error: String(error && error.message || error) });
    }
  }

  function extractOpenAiMessage(body) {
    var data = typeof body === "string" ? JSON.parse(body || "{}") : body;
    var choice = data && data.choices && data.choices[0];
    var message = choice && choice.message;
    if (message && typeof message.content === "string") {
      return message.content;
    }
    if (choice && typeof choice.text === "string") {
      return choice.text;
    }
    if (data && typeof data.output_text === "string") {
      return data.output_text;
    }
    return "";
  }

  function callMobileChatCompletion(config, messages) {
    throw new Error("تعمل المحادثة الآن عبر Hermes المحلي. افتح «وضع الطرفية» من القائمة الجانبية لاستخدام الوكيل الكامل.");
  }

  function getDashboardSessionToken() {
    try {
      if (window.HermesAndroid && typeof window.HermesAndroid.getDashboardSessionToken === "function") {
        return String(window.HermesAndroid.getDashboardSessionToken() || "");
      }
    } catch (error) {
      logMobileEvent("dashboard-token-read-failed", { error: String(error && error.message || error) });
    }
    return "";
  }

  function buildDashboardJsonHeaders(requireToken) {
    var headers = { "Content-Type": "application/json" };
    if (requireToken) {
      var token = getDashboardSessionToken();
      if (!token) {
        throw new Error("تعذّر الاتصال بجلسة Hermes المحلية. حاول لاحقًا أو افتح وضع الطرفية.");
      }
      headers["X-Hermes-Session-Token"] = token;
    }
    return headers;
  }

  function parseDashboardBridgeResponse(raw) {
    var envelope = {};
    try {
      envelope = raw ? JSON.parse(raw) : {};
    } catch (error) {
      throw new Error("أعادت الخدمة المحلية استجابة غير متوقعة");
    }
    if (!envelope.ok) {
      var detail = envelope.detail || envelope.error || envelope.body || ("HTTP " + (envelope.status || 0));
      throw new Error(String(detail || "فشل طلب الخدمة المحلية"));
    }
    if (envelope.json && typeof envelope.json === "object") {
      return envelope.json;
    }
    if (!envelope.body) {
      return {};
    }
    try {
      return JSON.parse(envelope.body);
    } catch (error) {
      return { detail: envelope.body };
    }
  }

  function requestDashboardJson(method, path, payload, requireToken, timeoutMs) {
    var normalizedMethod = String(method || "GET").toUpperCase();
    if (window.HermesAndroid && typeof window.HermesAndroid.dashboardRequest === "function") {
      return Promise.resolve().then(function () {
        return parseDashboardBridgeResponse(window.HermesAndroid.dashboardRequest(
          normalizedMethod,
          path,
          payload ? JSON.stringify(payload) : "",
          Boolean(requireToken),
          Number(timeoutMs || 15000)
        ));
      });
    }
    var base = embeddedDashboardBaseUrl || "http://127.0.0.1:9129";
    var options = {
      method: normalizedMethod,
      cache: "no-store"
    };
    if (normalizedMethod !== "GET") {
      options.headers = buildDashboardJsonHeaders(requireToken);
      options.body = JSON.stringify(payload || {});
    }
    return fetch(base.replace(/\/+$/, "") + path, options).then(function (response) {
      return response.text().then(function (text) {
        var body = {};
        try {
          body = text ? JSON.parse(text) : {};
        } catch (error) {
          body = { detail: text };
        }
        if (!response.ok || body.ok === false) {
          throw new Error(body.detail || body.error || body.confirm_message || ("HTTP " + response.status));
        }
        return body;
      });
    });
  }

  function stripTerminalOutput(value) {
    return String(value || "")
      .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
      .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, "")
      .replace(/\x1b[=>]/g, "")
      .replace(/\r/g, "\n")
      .replace(/[^\S\n]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function presentTerminalOutput(value, promptSent) {
    var cleaned = stripTerminalOutput(value);
    if (/setup\s*required|setuprequired|needs a model provider|configure provider/i.test(cleaned)) {
      return "يجب إعداد النموذج أولًا.\n\nافتح «الإعدادات > النماذج والاتصالات»، واختر إعدادًا جاهزًا، وأدخل مفتاح API ثم احفظ. بعد ذلك، عُد إلى المحادثة لإرسال رسالتك.";
    }
    if (!promptSent) {
      if (/summoning|starting\s*agent|forgig session|HermesAgent|Messenger of the Digital Gods/i.test(cleaned)) {
        return "جارٍ تشغيل Hermes Agent المحلي...";
      }
      return cleaned ? "جارٍ الاتصال بـ Hermes Agent المحلي..." : "";
    }
    return serializeAgentOutput(parseTerminalOutputParts(cleaned));
  }

  function normalizeTerminalLine(line) {
    return String(line || "")
      .replace(/[╭╮╰╯┌┐└┘├┤┬┴┼─━]+/g, " ")
      .replace(/^[│┃┆:|>\s❯]+/, "")
      .replace(/[│┃┆]+$/g, "")
      .replace(/[^\S\n]+/g, " ")
      .trim();
  }

  function isTerminalNoiseLine(line, prompt) {
    if (!line) return true;
    if (prompt && (line === prompt || line === ("1. " + prompt) || line === ("❯ " + prompt))) return true;
    if (/^(HermesAgent|NousResearch|Messenger of the Digital Gods)$/i.test(line)) return true;
    if (/Nous\s*Research|Messenger\s*of\s*the\s*Digital\s*Gods|Messengerof/i.test(line)) return true;
    if (/summoning|starting\s*agent|forgig session|setuprequired|queued\(|ready\s*,?\s*gpt|ready\s*\|/i.test(line)) return true;
    if (/^gpt[-\s]?5\.?5|gpt\s*5\.?5|Nous\s*Research|System Prompt|chars$/i.test(line)) return true;
    if (/Available\s*(Tools|Skills)|tools\s*·|skills\s*·|Session:/i.test(line)) return true;
    if (/^skills:|^terminal:|skill_manage|skill_view|skills_list|terminal$/i.test(line)) return true;
    if (/Ctrl\s*\+\s*C\s*to\s*interrupt|interrupt/i.test(line)) return true;
    if (/\/data\/data\/com\.sesaloy\.hermes|files\/hermes-|Try\"/i.test(line)) return true;
    if (/^\d+$|^\d+\.\s*$|^\d+\.\s*.+$/.test(line) && prompt && line.indexOf(prompt) >= 0) return true;
    if (/^\d+(?:\.\d+)?[kKmM]?\/\d+(?:\.\d+)?[kKmM]?.*%$/.test(line)) return true;
    if (/^[\\\/\[\]\s]+0%$/.test(line)) return true;
    if (line === ">" || line === "❯") return true;
    return false;
  }

  function joinAnswerLines(lines) {
    var out = "";
    (lines || []).forEach(function (line) {
      var current = String(line || "").trim();
      if (!current) return;
      if (!out) {
        out = current;
        return;
      }
      var last = out.slice(-1);
      var first = current.charAt(0);
      if (/[\u4e00-\u9fff]/.test(last) && /[\u4e00-\u9fff]/.test(first) && !/[。！？；：，、,.!?;:]$/.test(last)) {
        out += current;
      } else {
        out += "\n" + current;
      }
    });
    return out.trim();
  }

  function normalizeDedupeText(text) {
    return String(text || "")
      .replace(/\s+/g, "")
      .replace(/[，。！？、,.!?;；:："'“”‘’()[\]{}<>《》【】]/g, "")
      .toLowerCase();
  }

  function stripPromptEcho(text, prompt) {
    var output = String(text || "").trim();
    var rawPrompt = String(prompt || "").trim();
    if (!rawPrompt) {
      return output;
    }
    var guard = 0;
    while (guard < 10 && output.indexOf(rawPrompt) === 0) {
      output = output.slice(rawPrompt.length).replace(/^[\s，。！？、,.!?;；:：-]+/, "").trim();
      guard += 1;
    }
    return output;
  }

  function collapseRepeatedWholeText(text) {
    var output = String(text || "").trim();
    var changed = true;
    while (changed && output.length > 8) {
      changed = false;
      for (var parts = 2; parts <= 4; parts += 1) {
        if (output.length % parts !== 0) {
          continue;
        }
        var pieceLength = output.length / parts;
        var first = output.slice(0, pieceLength);
        var allSame = true;
        for (var index = 1; index < parts; index += 1) {
          if (normalizeDedupeText(output.slice(index * pieceLength, (index + 1) * pieceLength)) !== normalizeDedupeText(first)) {
            allSame = false;
            break;
          }
        }
        if (allSame) {
          output = first.trim();
          changed = true;
          break;
        }
      }
    }
    return output;
  }

  function dedupeSentences(text) {
    var raw = String(text || "").trim();
    if (!raw) {
      return "";
    }
    var matches = raw.match(/[^。！？!?]+[。！？!?]?|\n+/g) || [raw];
    var result = [];
    var seen = {};
    matches.forEach(function (part) {
      var item = String(part || "");
      if (!item.trim()) {
        if (result.length && result[result.length - 1] !== "\n") {
          result.push("\n");
        }
        return;
      }
      var key = normalizeDedupeText(item);
      if (!key) {
        return;
      }
      if (seen[key]) {
        return;
      }
      seen[key] = true;
      result.push(item.trim());
    });
    return result.join("").replace(/\n{3,}/g, "\n\n").trim();
  }

  function dedupeAnswerText(text, prompt) {
    var uniqueLines = [];
    var seenLines = {};
    String(text || "").split(/\n+/).forEach(function (line) {
      var current = stripPromptEcho(line, prompt).trim();
      var key = normalizeDedupeText(current);
      if (!key || (prompt && key === normalizeDedupeText(prompt))) {
        return;
      }
      if (seenLines[key]) {
        return;
      }
      seenLines[key] = true;
      uniqueLines.push(current);
    });
    var output = joinAnswerLines(uniqueLines);
    output = stripPromptEcho(output, prompt);
    output = collapseRepeatedWholeText(output);
    output = dedupeSentences(output);
    return output.trim();
  }

  function parseTerminalOutputParts(cleaned) {
    var rawLines = String(cleaned || "").split(/\n+/).map(function (line) { return normalizeTerminalLine(line); }).filter(Boolean);
    var prompt = "";
    for (var i = 0; i < rawLines.length; i += 1) {
      if (/^\d+\.\s+/.test(rawLines[i])) {
        prompt = rawLines[i].replace(/^\d+\.\s+/, "").trim();
      } else if (/^❯\s+/.test(rawLines[i])) {
        prompt = rawLines[i].replace(/^❯\s+/, "").trim();
      }
    }
    var thinking = [];
    var answer = [];
    var sawGeneration = false;
    rawLines.forEach(function (line) {
      if (/synthesizing|thinking|reasoning|思考|推理|generating|正在/i.test(line)) {
        sawGeneration = true;
        var thinkingLine = line
          .replace(/[♡♢◇·•]+/g, " ")
          .replace(/\breasoning\b/ig, "جارٍ تنظيم الرد")
          .replace(/\bthinking\b|\bsynthesizing\b|\bgenerating\b/ig, "جارٍ تجهيز السياق")
          .replace(/\.{2,}/g, "")
          .replace(/\s+\d+$/g, "")
          .replace(/\s+/g, " ")
          .trim();
        if (thinkingLine && thinking.indexOf(thinkingLine) < 0) {
          thinking.push(thinkingLine);
        }
        return;
      }
      if (isTerminalNoiseLine(line, prompt)) {
        return;
      }
      if (prompt && line === prompt) {
        return;
      }
      if (sawGeneration || /[。！？?]$/.test(line) || /[\u4e00-\u9fff]/.test(line)) {
        answer.push(line);
      }
    });
    var answerText = dedupeAnswerText(joinAnswerLines(answer), prompt);
    return {
      thinking: thinking.length ? thinking.slice(-3).join("\n") : (answerText ? "" : ""),
      answer: answerText
    };
  }

  function serializeAgentOutput(parts) {
    var thinking = parts && parts.thinking ? String(parts.thinking).trim() : "";
    var answer = parts && parts.answer ? String(parts.answer).trim() : "";
    var tools = parts && Array.isArray(parts.tools) ? parts.tools : [];
    var streaming = Boolean(parts && parts.streaming);
    if (!thinking && !answer) {
      thinking = "جارٍ إنشاء الرد مباشرةً...";
    }
    return [
      "<<<HERMES_THINKING>>>",
      thinking,
      "<<<HERMES_TOOLS>>>",
      JSON.stringify(tools),
      "<<<HERMES_STATE>>>",
      streaming ? "streaming" : "complete",
      "<<<HERMES_ANSWER>>>",
      answer
    ].join("\n").trim();
  }

  function parseSerializedAgentOutput(text) {
    var raw = String(text || "");
    if (raw.indexOf("<<<HERMES_THINKING>>>") < 0 && raw.indexOf("<<<HERMES_ANSWER>>>") < 0) {
      return { thinking: "", tools: [], answer: raw.trim(), streaming: false, structured: false };
    }
    var thinking = "";
    var tools = [];
    var streaming = false;
    var answer = "";
    var thinkingIndex = raw.indexOf("<<<HERMES_THINKING>>>");
    var toolsIndex = raw.indexOf("<<<HERMES_TOOLS>>>");
    var stateIndex = raw.indexOf("<<<HERMES_STATE>>>");
    var answerIndex = raw.indexOf("<<<HERMES_ANSWER>>>");
    if (thinkingIndex >= 0) {
      var thinkingStart = thinkingIndex + "<<<HERMES_THINKING>>>".length;
      var thinkingEnd = toolsIndex >= 0 ? toolsIndex : (stateIndex >= 0 ? stateIndex : (answerIndex >= 0 ? answerIndex : raw.length));
      thinking = raw.slice(thinkingStart, thinkingEnd).trim();
    }
    if (toolsIndex >= 0) {
      var toolsStart = toolsIndex + "<<<HERMES_TOOLS>>>".length;
      var toolsEnd = stateIndex >= 0 ? stateIndex : (answerIndex >= 0 ? answerIndex : raw.length);
      try {
        var parsedTools = JSON.parse(raw.slice(toolsStart, toolsEnd).trim() || "[]");
        tools = Array.isArray(parsedTools) ? parsedTools : [];
      } catch (error) {
        tools = [];
      }
    }
    if (stateIndex >= 0) {
      var stateStart = stateIndex + "<<<HERMES_STATE>>>".length;
      var stateEnd = answerIndex >= 0 ? answerIndex : raw.length;
      streaming = raw.slice(stateStart, stateEnd).trim() === "streaming";
    }
    if (answerIndex >= 0) {
      answer = raw.slice(answerIndex + "<<<HERMES_ANSWER>>>".length).trim();
    }
    answer = dedupeAnswerText(answer, "");
    return { thinking: thinking, tools: tools, answer: answer, streaming: streaming, structured: true };
  }

  function buildPtyWebSocketUrl() {
    var token = getDashboardSessionToken();
    if (!token) {
      throw new Error("تعذّر الاتصال بجلسة Hermes المحلية. أعد المحاولة لاحقًا أو افتح وضع الطرفية.");
    }
    var base = embeddedDashboardBaseUrl || "http://127.0.0.1:9129";
    var wsBase = base.replace(/^http:/, "ws:").replace(/^https:/, "ws:").replace(/\/+$/, "");
    return wsBase + "/api/pty?fresh=1&channel=android-mobile-graph&cols=96&rows=32&token=" + encodeURIComponent(token);
  }

  function buildGatewayWebSocketUrl() {
    var token = getDashboardSessionToken();
    if (!token) {
      throw new Error("تعذّر الاتصال بجلسة Hermes المحلية. أعد المحاولة لاحقًا أو افتح وضع الطرفية.");
    }
    var base = embeddedDashboardBaseUrl || "http://127.0.0.1:9129";
    var wsBase = base.replace(/^http:/, "ws:").replace(/^https:/, "ws:").replace(/\/+$/, "");
    return wsBase + "/api/ws?token=" + encodeURIComponent(token);
  }

  function callGatewayRpc(method, params, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var ws;
      var rid = "mobile-" + Date.now() + "-" + Math.random().toString(16).slice(2);
      var settled = false;
      var timer = window.setTimeout(function () {
        if (settled) return;
        settled = true;
        try {
          if (ws) ws.close(1000, "mobile rpc timeout");
        } catch (error) {
          // ignore close failures
        }
        reject(new Error("انتهت مهلة استجابة الخدمة المحلية."));
      }, timeoutMs || 12000);

      function finish(error, value) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        try {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close(1000, "mobile rpc complete");
          }
        } catch (closeError) {
          // ignore close failures
        }
        if (error) {
          reject(error);
        } else {
          resolve(value);
        }
      }

      try {
        ws = new WebSocket(buildGatewayWebSocketUrl());
      } catch (error) {
        finish(error);
        return;
      }
      ws.onopen = function () {
        try {
          ws.send(JSON.stringify({
            id: rid,
            jsonrpc: "2.0",
            method: method,
            params: params || {}
          }));
        } catch (error) {
          finish(error);
        }
      };
      ws.onmessage = function (event) {
        var data;
        try {
          data = JSON.parse(String(event.data || ""));
        } catch (error) {
          return;
        }
        if (data.id !== rid) {
          return;
        }
        if (data.error) {
          finish(new Error(data.error.message || "فشل استدعاء الخدمة المحلية"));
          return;
        }
        finish(null, data.result || {});
      };
      ws.onerror = function () {
        finish(new Error("تعذّر الاتصال بالخدمة المحلية"));
      };
      ws.onclose = function () {
        if (!settled) {
          finish(new Error("أُغلق اتصال الخدمة المحلية"));
        }
      };
    });
  }

  function sendPtyText(ws, text) {
    var chars = Array.from(String(text || ""));
    chars.forEach(function (char, index) {
      window.setTimeout(function () {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(char);
        }
      }, index * 6);
    });
    window.setTimeout(function () {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send("\r");
      }
    }, chars.length * 6 + 180);
  }

  function showEmbeddedLiteMode(initialText) {
    ensureAndroidBootOverlay();
    var overlay = document.getElementById("hermes-android-boot-overlay");
    if (!overlay) {
      return;
    }
    if (document.getElementById("hermes-mobile-shell")) {
      return;
    }
    window.__hermesMobileShellStarted = true;
    overlay.hidden = false;
    overlay.className = "hermes-mobile-chat-mode";
    overlay.innerHTML = [
      "<div id=\"hermes-mobile-shell\" class=\"gemini\">",
      "  <div id=\"hermes-mobile-progress\">",
      "    <div id=\"hermes-mobile-progress-box\">",
      "      <div id=\"hermes-mobile-progress-logo\">H</div>",
      "      <div id=\"hermes-mobile-progress-title\">جارٍ تجهيز Hermes</div>",
      "      <div id=\"hermes-mobile-progress-text\">جارٍ التحقق من الخدمة المحلية وإعداد النموذج وموارد الهاتف.</div>",
      "      <div id=\"hermes-mobile-progress-track\"><div id=\"hermes-mobile-progress-bar\"></div></div>",
      "    </div>",
      "  </div>",
      "  <div id=\"hermes-mobile-drawer-backdrop\" data-action=\"close-drawer\"></div>",
      "  <aside id=\"hermes-mobile-drawer\" aria-label=\"قائمة تنقل Hermes\">",
      "    <div id=\"hermes-mobile-drawer-head\"><div id=\"hermes-mobile-drawer-brand\"><div class=\"mark\">H</div><div><strong>Hermes</strong><span>وكيلك على الهاتف</span></div></div><button id=\"hermes-mobile-drawer-close\" type=\"button\" data-action=\"close-drawer\" aria-label=\"إغلاق قائمة التنقل\">×</button></div>",
      "    <div id=\"hermes-mobile-drawer-actions\"><button id=\"hermes-mobile-drawer-phone\" type=\"button\" data-action=\"view\" data-view=\"phone-control\"><span class=\"icon\">▣</span><span>التحكم بالهاتف</span></button><button id=\"hermes-mobile-drawer-new\" type=\"button\" data-action=\"new-session\"><span class=\"icon\">✎</span><span>محادثة جديدة</span></button><label id=\"hermes-mobile-drawer-search-wrap\"><span class=\"icon\">⌕</span><input id=\"hermes-mobile-drawer-search\" type=\"search\" placeholder=\"ابحث في المحادثات\" autocomplete=\"off\"></label></div>",
      "    <div id=\"hermes-mobile-drawer-list\"></div>",
      "    <div id=\"hermes-mobile-drawer-foot\"><div id=\"hermes-mobile-drawer-profile\"><div class=\"avatar\">H</div><div><strong>Hermes</strong><span>الوكيل المحلي</span></div></div><button id=\"hermes-mobile-drawer-settings\" type=\"button\" data-action=\"view\" data-view=\"settings\" aria-label=\"الإعدادات\">⚙</button></div>",
      "  </aside>",
      "  <header id=\"hermes-mobile-top\" class=\"gemini\">",
      "    <button id=\"hermes-mobile-menu-button\" type=\"button\" data-action=\"open-drawer\" aria-label=\"فتح قائمة التنقل\">☰</button>",
      "    <div id=\"hermes-mobile-title\" class=\"gemini\"><strong>Hermes</strong><button id=\"hermes-mobile-subtitle\" type=\"button\" data-action=\"view\" data-view=\"models\">الهاتف</button></div>",
      "    <button id=\"hermes-mobile-settings-button\" class=\"gemini\" type=\"button\" data-action=\"theme\" aria-label=\"التبديل إلى الوضع الداكن\">☾</button>",
      "  </header>",
      "  <main id=\"hermes-mobile-chat-body\">",
      "    <div id=\"hermes-mobile-view\"></div>",
      "  </main>",
      "  <footer id=\"hermes-mobile-bottom\">",
      "    <div id=\"hermes-mobile-attachment-row\" hidden></div>",
      "    <div id=\"hermes-mobile-attachment-actions\" hidden aria-label=\"خيارات المرفقات\"><button type=\"button\" data-action=\"close-attachment-menu\" aria-label=\"إغلاق\">×</button><button type=\"button\" data-action=\"capture-photo\"><span aria-hidden=\"true\">◎</span> التقاط صورة بالكاميرا</button><button type=\"button\" data-action=\"pick-file\"><span aria-hidden=\"true\">▤</span> اختيار ملف من الجهاز</button></div>",
      "    <div id=\"hermes-mobile-inputbar\">",
      "      <button id=\"hermes-mobile-send\" class=\"primary\" type=\"button\" data-action=\"send\" aria-label=\"إرسال\" title=\"إرسال\"><svg aria-hidden=\"true\" viewBox=\"0 0 24 24\"><path d=\"M20 12H5m7-7-7 7 7 7\"></path></svg></button>",
      "      <textarea id=\"hermes-mobile-input\" rows=\"1\" placeholder=\"اكتب رسالتك\"></textarea>",
      "      <button id=\"hermes-mobile-voice-input\" type=\"button\" data-action=\"voice-input\" aria-label=\"إملاء صوتي\" title=\"إملاء صوتي\"><svg aria-hidden=\"true\" viewBox=\"0 0 24 24\"><rect x=\"9\" y=\"2\" width=\"6\" height=\"12\" rx=\"3\"></rect><path d=\"M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8\"></path></svg></button>",
      "      <button id=\"hermes-mobile-attachment-toggle\" type=\"button\" data-action=\"attachment-menu\" aria-label=\"إضافة مرفق\" aria-expanded=\"false\" title=\"إضافة مرفق\">＋</button>",
      "      <button id=\"hermes-mobile-speak\" type=\"button\" data-action=\"speak\" aria-label=\"القراءة الصوتية\" title=\"القراءة الصوتية\">♪</button>",
      "    </div>",
      "  </footer>",
      "</div>"
    ].join("");

    var config = loadMobileChatConfig();
    var modelStatus = { checked: false, hasApiKey: false, model: config.model || "" };
    var sessions = loadMobileSessions();
    var activeSessionId = sessions[0] && sessions[0].id;
    var messages = sessions[0] ? sessions[0].messages : [];
    var currentView = "chat";
    var selectedFiles = [];
    var isSpeaking = false;
    var currentAudioPlayer = null;
    var speechRequestSerial = 0;
    var queuedSpeechChunks = [];
    var speechQueueActive = false;
    var MIN_STREAM_SPEECH_CHARS = 120;
    var MAX_STREAM_SPEECH_CHARS = 240;
    var ttsEnabled = false;
    var lastSpokenAssistantText = "";
    var imagePreviewCache = Object.create(null);
    var imagePreviewPending = Object.create(null);
    var mobileRpcSessionId = sessions[0] && sessions[0].backendSessionId || "";
    var mobileRpcListenerSocket = null;
    var androidAdbState = { loading: false, error: "", data: null, message: "" };
    var localModelState = { data: null, error: "", polling: false };
    var githubState = { status: null, repositories: [], selectedRepo: "", branch: "", files: [], fileContents: {}, workflows: [], proposals: [], runs: [], error: "", loading: false };
    var featureData = {
      resources: { loading: false, error: "", data: null, path: "", rootPath: "" },
      automation: { loading: false, error: "", data: null },
      integrations: { loading: false, error: "", data: null },
      remote: { loading: false, error: "", data: null },
      memory: { loading: false, error: "", data: null },
      skills: { loading: false, error: "", data: null },
      persona: { loading: false, error: "", data: null },
      tools: { loading: false, error: "", data: null },
      mcp: { loading: false, error: "", data: null },
      usage: { loading: false, error: "", data: null },
      appearance: { loading: false, error: "", data: null }
    };
    var currentTheme = preferredMobileTheme();
    var currentLocale = "ar";
    try {
      var savedLocale = window.localStorage && (window.localStorage.getItem("hermes.mobile.locale") || window.localStorage.getItem("hermes.desktop.locale")) || "ar";
      currentLocale = savedLocale === "en" ? "en" : (savedLocale === "zh" || savedLocale === "zh-CN") ? "zh" : "ar";
    } catch (error) {
      currentLocale = "ar";
    }
    var shell = document.getElementById("hermes-mobile-shell");
    var body = document.getElementById("hermes-mobile-chat-body");
    var view = document.getElementById("hermes-mobile-view");
    var input = document.getElementById("hermes-mobile-input");
    var send = document.getElementById("hermes-mobile-send");
    var subtitle = document.getElementById("hermes-mobile-subtitle");
    var themeButton = document.getElementById("hermes-mobile-settings-button");
    var speakButton = document.getElementById("hermes-mobile-speak");
    var attachmentRow = document.getElementById("hermes-mobile-attachment-row");
    var attachmentActions = document.getElementById("hermes-mobile-attachment-actions");
    var attachmentToggle = document.getElementById("hermes-mobile-attachment-toggle");
    var voiceInputButton = document.getElementById("hermes-mobile-voice-input");

    try {
      ttsEnabled = window.localStorage && window.localStorage.getItem(MOBILE_TTS_ENABLED_KEY) === "1";
    } catch (error) {
      ttsEnabled = false;
    }

    function activeSession() {
      var found = sessions.filter(function (session) { return session.id === activeSessionId; })[0];
      if (!found) {
        found = sessions[0] || createMobileSession([], "محادثة جديدة");
        sessions = sessions.length ? sessions : [found];
        activeSessionId = found.id;
      }
      return found;
    }

    function persistActiveSession() {
      var session = activeSession();
      session.messages = messages.slice(-40);
      session.updatedAt = Date.now();
      var firstUser = messages.filter(function (message) { return message.role === "user" && message.content; })[0];
      if (firstUser) {
        session.title = firstUser.content.slice(0, 24);
      }
      saveMobileSessions(sessions);
      saveMobileChatHistory(messages);
    }

    function closeMobileRpcListener(reason) {
      if (!mobileRpcListenerSocket) {
        return;
      }
      try {
        mobileRpcListenerSocket.close(1000, reason || "mobile session changed");
      } catch (error) {
        // ignore stale listener close failures
      }
      mobileRpcListenerSocket = null;
    }

    function isLegacyBackendSessionId(value) {
      return /^[0-9a-f]{8}$/i.test(String(value || "").trim());
    }

    function setBusy(busy) {
      send.disabled = Boolean(busy);
      send.classList.toggle("busy", Boolean(busy));
      input.disabled = Boolean(busy);
    }

    function applyShellTheme(mode) {
      currentTheme = applyMobileTheme(mode);
      shell.classList.toggle("dark", currentTheme === "dark");
      if (themeButton) {
        themeButton.textContent = currentTheme === "dark" ? "☀" : "☾";
        themeButton.setAttribute("aria-label", currentTheme === "dark" ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن");
      }
    }

    function syncTtsButton() {
      if (!speakButton) {
        return;
      }
      speakButton.classList.toggle("tts-on", Boolean(ttsEnabled));
      speakButton.classList.toggle("tts-off", !ttsEnabled);
      speakButton.classList.toggle("speaking", Boolean(isSpeaking));
      speakButton.innerHTML = isSpeaking
        ? "<span aria-hidden=\"true\">■</span>"
        : "<svg aria-hidden=\"true\" viewBox=\"0 0 24 24\"><path d=\"M4 10v4h4l5 4V6l-5 4H4Z\"></path><path d=\"M16 9a5 5 0 0 1 0 6m2-9a9 9 0 0 1 0 12\"></path></svg>";
      speakButton.setAttribute("aria-label", ttsEnabled ? "إيقاف القراءة الصوتية" : "تشغيل القراءة الصوتية");
      speakButton.setAttribute("title", speakButton.getAttribute("aria-label"));
      try {
        window.localStorage.setItem(MOBILE_TTS_ENABLED_KEY, ttsEnabled ? "1" : "0");
      } catch (error) {
        // ignore
      }
    }

    function isImagePath(path) {
      return /\.(?:png|jpe?g|webp|gif)$/i.test(String(path || ""));
    }

    function loadImagePreview(path) {
      if (!path || imagePreviewCache[path] || imagePreviewPending[path] || !isImagePath(path)) return;
      if (!window.hermesDesktop || typeof window.hermesDesktop.readImagePreviewDataUrl !== "function") return;
      imagePreviewPending[path] = true;
      Promise.resolve(window.hermesDesktop.readImagePreviewDataUrl(path)).then(function (dataUrl) {
        if (dataUrl) imagePreviewCache[path] = dataUrl;
      }).catch(function () {
        // A missing, unsupported, or large image remains a normal file attachment.
      }).finally(function () {
        delete imagePreviewPending[path];
        if (imagePreviewCache[path] && currentView === "chat") renderView();
      });
    }

    function renderAttachmentCard(attachment, index, removable) {
      var path = String(attachment && attachment.path || "");
      var name = String(attachment && attachment.name || path.split(/[\\/]/).pop() || "ملف مرفق");
      loadImagePreview(path);
      var preview = path && imagePreviewCache[path]
        ? "<img class=\"hermes-mobile-attachment-thumb\" src=\"" + escapeHtml(imagePreviewCache[path]) + "\" alt=\"معاينة " + escapeHtml(name) + "\">"
        : "<span class=\"hermes-mobile-attachment-file\" aria-hidden=\"true\">" + (isImagePath(name) ? "▧" : "▤") + "</span>";
      var remove = removable
        ? "<button type=\"button\" data-action=\"remove-attachment\" data-index=\"" + index + "\" aria-label=\"إزالة " + escapeHtml(name) + "\" title=\"إزالة المرفق\">×</button>"
        : "";
      return "<div class=\"hermes-mobile-attachment\">" + preview + "<span class=\"hermes-mobile-attachment-name\" dir=\"auto\">" + escapeHtml(name) + "</span>" + remove + "</div>";
    }

    function setAttachmentMenu(open) {
      if (!attachmentActions) return;
      attachmentActions.hidden = !open;
      if (attachmentToggle) attachmentToggle.setAttribute("aria-expanded", open ? "true" : "false");
    }

    function renderAttachments() {
      if (!attachmentRow) {
        return;
      }
      attachmentRow.hidden = !selectedFiles.length;
      attachmentRow.innerHTML = selectedFiles.map(function (path, index) {
        return renderAttachmentCard({ path: path, name: String(path || "").split(/[\\\\/]/).pop() || "ملف مرفق" }, index, true);
      }).join("");
    }

    function refreshHeader() {
      if (modelStatus.checked && !modelStatus.hasApiKey) {
        subtitle.textContent = "يلزم إعداد النموذج";
        return;
      }
      var modelLabel = modelStatus.model || config.model || "";
      subtitle.textContent = modelLabel || "خدمة Hermes المحلية جاهزة";
    }

    function refreshModelStatus() {
      return requestDashboardJson("GET", "/api/model/info", null, false)
        .then(function (info) {
          if (!info) return;
          modelStatus = {
            checked: true,
            hasApiKey: Boolean(info.has_api_key || info.hasapikey),
            model: info.model || config.model || ""
          };
          if (info.model || info.base_url) {
            config = {
              apiKey: "",
              baseUrl: info.base_url || config.baseUrl || DEFAULT_CHAT_ENDPOINT,
              model: info.model || config.model || DEFAULT_CHAT_MODEL
            };
            saveMobileChatConfig(config);
          }
          refreshHeader();
        })
        .catch(function (error) {
          logMobileEvent("model-status-refresh-failed", { error: String(error && error.message || error) });
        });
    }

    function saveModelToBackend(nextConfig, apiKey) {
      var baseUrl = normalizeOpenAICompatibleBaseUrl(nextConfig.baseUrl);
      var model = String(nextConfig.model || "").trim();
      var payload = {
        scope: "main",
        provider: inferProviderFromEndpoint(baseUrl),
        model: model,
        base_url: baseUrl,
        api_mode: "chat_completions",
        confirm_expensive_model: true
      };
      if (String(apiKey || "").trim()) {
        payload.api_key = String(apiKey || "").trim();
      }
      return requestDashboardJson("POST", "/api/model/set", payload, true);
    }

    function escapeHtml(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function isLiveFeatureView(viewName) {
      return [
        "resources",
        "automation",
        "integrations",
        "remote",
        "memory",
        "skills",
        "persona",
        "tools",
        "mcp",
        "usage",
        "appearance"
      ].indexOf(viewName) !== -1;
    }

    function dashboardPathForFeature(viewName) {
      var locale = mobileDashboardLocale();
      return {
        resources: "/files?locale=" + locale,
        automation: "/cron?locale=" + locale,
        integrations: "/settings/messaging?locale=" + locale,
        remote: "/settings/remote?locale=" + locale,
        memory: "/settings/memory?locale=" + locale,
        skills: "/settings/skills?locale=" + locale,
        persona: "/profiles?locale=" + locale,
        tools: "/settings/tools?locale=" + locale,
        mcp: "/settings/mcp?locale=" + locale,
        usage: "/usage?locale=" + locale,
        appearance: "/settings/appearance?locale=" + locale
      }[viewName] || ("/?locale=" + locale);
    }

    function formatBytes(size) {
      var value = Number(size || 0);
      if (!value) return "0 B";
      if (value < 1024) return value + " B";
      if (value < 1024 * 1024) return Math.round(value / 102.4) / 10 + " KB";
      return Math.round(value / 1024 / 102.4) / 10 + " MB";
    }

    function formatFeatureTime(value) {
      if (!value) return "لا يوجد";
      try {
        var date = typeof value === "number" ? new Date(value * 1000) : new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString(currentLocale === "zh" ? "zh-CN" : currentLocale === "en" ? "en" : "ar", { hour12: false });
        }
      } catch (error) {
        // fall through
      }
      return String(value);
    }

    function featureState(viewName) {
      if (!featureData[viewName]) {
        featureData[viewName] = { loading: false, error: "", data: null };
      }
      return featureData[viewName];
    }

    async function loadFeatureData(viewName, options) {
      if (!isLiveFeatureView(viewName)) {
        return;
      }
      options = options || {};
      var state = featureState(viewName);
      if (state.loading) {
        return;
      }
      state.loading = true;
      state.error = "";
      if (options.path != null) {
        state.path = String(options.path || "");
      }
      if (currentView === viewName) {
        renderView();
      }
      try {
        if (viewName === "resources") {
          var pathQuery = state.path ? "?path=" + encodeURIComponent(state.path) : "";
          state.data = await requestDashboardJson("GET", "/api/files" + pathQuery, null, true);
          if (!state.rootPath && state.data && state.data.path) {
            state.rootPath = String(state.data.path);
          }
        } else if (viewName === "automation") {
          var automationResults = await Promise.all([
            requestDashboardJson("GET", "/api/cron/jobs?profile=all", null, true),
            requestDashboardJson("GET", "/api/cron/delivery-targets", null, true),
            requestDashboardJson("GET", "/api/cron/blueprints", null, true)
          ]);
          state.data = {
            jobs: automationResults[0] || [],
            targets: automationResults[1] && automationResults[1].targets || [],
            blueprints: automationResults[2] && automationResults[2].blueprints || []
          };
        } else if (viewName === "integrations") {
          var integrationResults = await Promise.all([
            requestDashboardJson("GET", "/api/messaging/platforms", null, true),
            requestDashboardJson("GET", "/api/status", null, false)
          ]);
          state.data = {
            messaging: integrationResults[0] || {},
            status: integrationResults[1] || {}
          };
        } else if (viewName === "remote") {
          var remoteResults = await Promise.all([
            requestDashboardJson("GET", "/api/status", null, false),
            requestDashboardJson("GET", "/api/pairing", null, true).catch(function () { return null; }),
            requestDashboardJson("GET", "/api/profiles", null, true).catch(function () { return null; })
          ]);
          state.data = {
            status: remoteResults[0] || {},
            pairing: remoteResults[1] || {},
            profiles: remoteResults[2] || {}
          };
        } else if (viewName === "memory") {
          var memoryResults = await Promise.all([
            requestDashboardJson("GET", "/api/memory", null, true),
            requestDashboardJson("GET", "/api/memory/providers", null, true).catch(function () { return null; })
          ]);
          state.data = {
            memory: memoryResults[0] || {},
            providers: memoryResults[1] || {}
          };
        } else if (viewName === "skills") {
          var skillResults = await Promise.all([
            requestDashboardJson("GET", "/api/skills", null, true),
            requestDashboardJson("GET", "/api/skills/hub/sources", null, true).catch(function () { return null; })
          ]);
          state.data = {
            skills: Array.isArray(skillResults[0]) ? skillResults[0] : [],
            hub: skillResults[1] || {}
          };
        } else if (viewName === "persona") {
          var profileResults = await Promise.all([
            requestDashboardJson("GET", "/api/profiles", null, true),
            requestDashboardJson("GET", "/api/profiles/active", null, true, 5000).catch(function () { return null; })
          ]);
          var activeRaw = profileResults[1] && (profileResults[1].current || profileResults[1].active) || "default";
          var activeProfile = typeof activeRaw === "string" ? activeRaw : activeRaw && (activeRaw.name || activeRaw.id) || "default";
          var soul = await requestDashboardJson("GET", "/api/profiles/" + encodeURIComponent(activeProfile) + "/soul", null, true, 5000).catch(function () { return null; });
          state.data = {
            profiles: profileResults[0] || {},
            active: profileResults[1] || { active: activeProfile, current: activeProfile },
            soul: soul || {}
          };
        } else if (viewName === "tools") {
          state.data = {
            toolsets: await requestDashboardJson("GET", "/api/tools/toolsets", null, true)
          };
        } else if (viewName === "mcp") {
          var mcpResults = await Promise.all([
            requestDashboardJson("GET", "/api/mcp/servers", null, true),
            requestDashboardJson("GET", "/api/mcp/catalog", null, true).catch(function () { return null; })
          ]);
          state.data = {
            servers: mcpResults[0] || {},
            catalog: mcpResults[1] || {}
          };
        } else if (viewName === "usage") {
          state.data = await requestDashboardJson("GET", "/api/analytics/usage?days=30", null, true);
        } else if (viewName === "appearance") {
          var appearanceResults = await Promise.all([
            requestDashboardJson("GET", "/api/dashboard/themes", null, true),
            requestDashboardJson("GET", "/api/dashboard/font", null, true).catch(function () { return null; })
          ]);
          state.data = {
            themes: appearanceResults[0] || {},
            font: appearanceResults[1] || {}
          };
        }
      } catch (error) {
        state.error = String(error && error.message || error);
      } finally {
        state.loading = false;
        if (currentView === viewName) {
          renderView();
        }
      }
    }

    function setDrawer(open) {
      shell.classList.toggle("drawer-open", Boolean(open));
      if (open) {
        renderDrawerSessions();
      }
    }

    function sessionSearchText(session) {
      return [session.title || ""].concat((session.messages || []).map(function (message) {
        return message && message.content || "";
      })).join(" ").toLowerCase();
    }

    function renderDrawerSessions(query) {
      var list = document.getElementById("hermes-mobile-drawer-list");
      if (!list) {
        return;
      }
      var keyword = String(query == null ? (document.getElementById("hermes-mobile-drawer-search") || {}).value || "" : query).trim().toLowerCase();
      var visible = sessions.filter(function (session) {
        return !keyword || sessionSearchText(session).indexOf(keyword) !== -1;
      });
      list.innerHTML = visible.length ? [
        "<div class=\"hermes-mobile-drawer-group\">" + (keyword ? "نتائج البحث" : "الأخيرة") + "</div>",
        visible.map(function (session) {
          var active = session.id === activeSessionId;
          var lastMessage = session.messages && session.messages.length ? session.messages[session.messages.length - 1].content : "لا توجد رسائل بعد";
          return "<div class=\"hermes-mobile-drawer-session" + (active ? " active" : "") + "\"><button class=\"hermes-mobile-drawer-session-main\" type=\"button\" data-action=\"switch-session\" data-id=\"" + escapeHtml(session.id) + "\"><strong>" + escapeHtml(session.title || "محادثة جديدة") + "</strong><small>" + escapeHtml(lastMessage) + "</small></button><button class=\"hermes-mobile-drawer-session-delete\" type=\"button\" data-action=\"delete-session\" data-id=\"" + escapeHtml(session.id) + "\" aria-label=\"حذف المحادثة\">×</button></div>";
        }).join("")
      ].join("") : "<div class=\"hermes-mobile-drawer-empty\">لم نعثر على محادثات مطابقة</div>";
    }

    function switchView(nextView) {
      currentView = nextView || "chat";
      setDrawer(false);
      renderView();
      loadFeatureData(currentView);
      if (currentView === "phone-control") {
        window.setTimeout(refreshAndroidAdbStatus, 80);
      }
    }

    function handleMobileBack() {
      if (shell.classList.contains("drawer-open")) {
        setDrawer(false);
        return true;
      }
      if (currentView === "chat") {
        return false;
      }
      if (currentView === "settings" || currentView === "models" || currentView === "sessions") {
        switchView("chat");
        return true;
      }
      switchView("settings");
      return true;
    }

    window.__hermesHandleMobileBack = handleMobileBack;

    function appendAssistant(text) {
      messages.push({ role: "assistant", content: text });
      persistActiveSession();
      currentView = "chat";
      renderView();
      speakAssistantOutput(text);
    }

    function setTemporarySubtitle(text) {
      subtitle.textContent = text;
      window.clearTimeout(subtitle.__hermesMobileTimer);
      subtitle.__hermesMobileTimer = window.setTimeout(refreshHeader, 1600);
    }

    function updateAssistantMessage(index, text, options) {
      if (!messages[index]) {
        return;
      }
      options = options || {};
      messages[index].content = text;
      if (options.persist !== false) {
        persistActiveSession();
      }
      if (options.render !== false) {
        renderView();
      }
    }

    function cleanAgentDeltaText(text) {
      return String(text || "")
        .replace(/^[\s│┃┆|:>❯⋮]+/, "")
        .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "");
    }

    function appendAgentDelta(current, delta) {
      var next = cleanAgentDeltaText(delta);
      if (!next) {
        return String(current || "");
      }
      var existing = String(current || "");
      if (!existing) {
        return next;
      }
      if (/^\s/.test(next) || /\s$/.test(existing)) {
        return existing + next;
      }
      return existing + next;
    }

    function streamHermesAgentReply(prompt, assistantIndex) {
      return new Promise(function (resolve) {
        closeMobileRpcListener("mobile next prompt");
        var ws;
        var settled = false;
        var answer = "";
        var reasoning = "";
        var toolEvents = [];
        var asyncAnswer = "";
        var asyncReasoning = "";
        var asyncToolEvents = [];
        var asyncAssistantIndex = -1;
        var createId = "mobile-create-" + Date.now();
        var resumeId = "mobile-resume-" + Date.now();
        var submitId = "mobile-submit-" + Date.now();
        var activeSid = activeSession().backendSessionId || "";
        var migratingLegacySession = false;
        var timeout = 0;
        var renderTimer = 0;
        var pendingStructuredText = "";
        var lastStructuredRender = 0;
        var streamedSpeechRequestId = 0;
        var streamedSpeechCursor = 0;
        var streamedSpeechBuffer = "";
        var streamedSpeechQueued = false;

        function renderStructured(immediate) {
          pendingStructuredText = serializeAgentOutput({
            thinking: reasoning || (answer ? "" : "جارٍ إنشاء الرد مباشرةً..."),
            tools: toolEvents,
            streaming: true,
            answer: answer
          });
          if (immediate) {
            if (renderTimer) {
              window.clearTimeout(renderTimer);
              renderTimer = 0;
            }
            lastStructuredRender = Date.now();
            updateAssistantMessage(assistantIndex, pendingStructuredText, { persist: false });
            return;
          }
          if (renderTimer) {
            return;
          }
          renderTimer = window.setTimeout(function () {
            renderTimer = 0;
            lastStructuredRender = Date.now();
            updateAssistantMessage(assistantIndex, pendingStructuredText, { persist: false });
          }, Math.max(0, 60 - (Date.now() - lastStructuredRender)));
        }

        function ensureStreamedSpeechRequest() {
          if (!ttsEnabled) {
            return 0;
          }
          if (!streamedSpeechRequestId || streamedSpeechRequestId !== speechRequestSerial) {
            speechRequestSerial += 1;
            streamedSpeechRequestId = speechRequestSerial;
            queuedSpeechChunks = [];
            stopCurrentAudioPlayback();
            isSpeaking = true;
            syncTtsButton();
          }
          return streamedSpeechRequestId;
        }

        function queueStreamedSpeech(final) {
          var unread = answer.slice(streamedSpeechCursor);
          if (!ttsEnabled || (!unread && !streamedSpeechBuffer)) {
            return false;
          }
          streamedSpeechCursor = answer.length;
          streamedSpeechBuffer += unread;
          var drained = drainSpeakableSpeechChunks(streamedSpeechBuffer, Boolean(final));
          streamedSpeechBuffer = drained.remainder;
          if (!drained.parts.length) {
            return false;
          }
          var requestId = ensureStreamedSpeechRequest();
          if (!requestId) {
            return false;
          }
          drained.parts.forEach(function (part) {
            streamedSpeechQueued = enqueueSpeechChunk(part, requestId) || streamedSpeechQueued;
          });
          return streamedSpeechQueued;
        }

        function closeSocket(reason) {
          try {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.close(1000, reason || "mobile rpc complete");
            }
          } catch (error) {
            // ignore close failures
          }
        }

        function finish(finalAnswer, finalReasoning) {
          if (settled) {
            return;
          }
          settled = true;
          window.clearTimeout(timeout);
          if (renderTimer) {
            window.clearTimeout(renderTimer);
            renderTimer = 0;
          }
          if (finalAnswer != null) {
            answer = String(finalAnswer || "");
          }
          if (finalReasoning != null) {
            reasoning = String(finalReasoning || "");
          }
          if (!answer.trim() && !reasoning.trim()) {
            updateAssistantMessage(assistantIndex, "لا توجد مخرجات أخرى من Hermes حاليًا.");
          } else {
            var finalOutput = serializeAgentOutput({ thinking: reasoning, tools: toolEvents, streaming: false, answer: answer });
            var queuedFinalSpeech = queueStreamedSpeech(true);
            updateAssistantMessage(assistantIndex, finalOutput);
            if (queuedFinalSpeech || streamedSpeechQueued) {
              lastSpokenAssistantText = extractAssistantSpeechText(finalOutput);
            } else {
              speakAssistantOutput(finalOutput);
            }
          }
          resolve();
        }

        function ensureAsyncAssistantMessage() {
          if (asyncAssistantIndex >= 0 && messages[asyncAssistantIndex]) {
            return asyncAssistantIndex;
          }
          messages.push({ role: "assistant", content: serializeAgentOutput({ thinking: "جارٍ تلقي نتيجة المهمة في الخلفية...", tools: [], streaming: true, answer: "" }) });
          asyncAssistantIndex = messages.length - 1;
          currentView = "chat";
          renderView();
          return asyncAssistantIndex;
        }

        function renderAsyncOutput(persist) {
          var index = ensureAsyncAssistantMessage();
          updateAssistantMessage(index, serializeAgentOutput({
            thinking: asyncReasoning || (asyncAnswer ? "" : "جارٍ تلقي نتيجة المهمة في الخلفية..."),
            tools: asyncToolEvents,
            streaming: !persist,
            answer: asyncAnswer
          }), { persist: Boolean(persist) });
        }

        function fail(message) {
          finish(arabicErrorText(message, "تعذّر الاتصال بـHermes المحلي. يمكنك المتابعة عبر وضع الطرفية من القائمة الجانبية."), "");
        }

        function sendRpc(id, method, params) {
          ws.send(JSON.stringify({
            id: id,
            jsonrpc: "2.0",
            method: method,
            params: params || {}
          }));
        }

        function backendSeedMessages() {
          var seed = [];
          messages.slice(0, Math.max(0, assistantIndex - 1)).forEach(function (message) {
            var content = parseSerializedAgentOutput(message.content || "").answer || message.content || "";
            // تُستخدم العبارات الصينية القديمة للتعرّف على رسائل جلسات محفوظة من إصدار سابق فقط، ولا تظهر في الواجهة.
            if (message.role === "assistant" && /无法恢复原会话|原会话暂时无法连接|تعذّر استعادة المحادثة السابقة|تعذّر الوصول إلى المحادثة السابقة|جارٍ الاتصال بوكيل Hermes المحلي/.test(content)) {
              if (seed.length && seed[seed.length - 1].role === "user") seed.pop();
              return;
            }
            if (content) seed.push({ role: message.role, content: content });
          });
          return seed;
        }

        function createBackendSession() {
          sendRpc(createId, "session.create", {
            close_on_disconnect: false,
            cols: 80,
            messages: backendSeedMessages(),
            source: "android-mobile"
          });
        }

        function updateToolEvent(target, payload, status) {
          var toolId = String(payload.tool_id || payload.id || payload.name || ("tool-" + Date.now()));
          var found = target.filter(function (item) { return item.id === toolId; })[0];
          if (!found) {
            found = { id: toolId, name: String(payload.name || "tool"), context: "", status: "running" };
            target.push(found);
          }
          found.name = String(payload.name || found.name || "tool");
          found.context = String(payload.context || payload.preview || found.context || "");
          found.status = status || found.status || "running";
          if (payload.summary) found.summary = String(payload.summary);
          if (payload.duration_s != null) found.duration = Number(payload.duration_s);
          if (payload.result_text) found.result = String(payload.result_text).slice(0, 1200);
          if (payload.error) found.error = String(payload.error);
        }

        function submitPrompt() {
          if (!activeSid) {
            fail("تعذّر إنشاء جلسة Hermes المحلية.");
            return;
          }
          renderStructured();
          sendRpc(submitId, "prompt.submit", { session_id: activeSid, text: prompt });
        }

        try {
          ws = new WebSocket(buildGatewayWebSocketUrl());
        } catch (error) {
          fail("تعذّر الاتصال بـHermes المحلي. " + arabicErrorText(error, "تحقّق من الخدمة ثم أعد المحاولة."));
          return;
        }

        timeout = window.setTimeout(function () {
          if (!settled) {
            fail(answer || "انتهت مهلة استجابة Hermes المحلي.");
          }
        }, 90000);

        ws.onopen = function () {
          mobileRpcListenerSocket = ws;
          if (activeSid) {
            sendRpc(resumeId, "session.resume", {
              session_id: activeSid,
              cols: 80
            });
            return;
          }
          createBackendSession();
        };

        ws.onmessage = function (event) {
          var data;
          try {
            data = JSON.parse(String(event.data || ""));
          } catch (error) {
            return;
          }
          if (data.method === "event") {
            var params = data.params || {};
            if (params.session_id && activeSid && params.session_id !== activeSid) {
              return;
            }
            var payload = params.payload || {};
            if (params.type === "status.update" && !answer) {
              var statusText = String(payload.text || "");
              if (/reason|think|思考|推理|整理|生成/i.test(statusText)) {
                reasoning = statusText;
                renderStructured();
              }
            } else if (params.type === "reasoning.delta" || params.type === "reasoning.available") {
              if (settled) {
                asyncReasoning = params.type === "reasoning.delta"
                  ? appendAgentDelta(asyncReasoning, payload.text || "")
                  : String(payload.text || asyncReasoning || "");
                renderAsyncOutput(false);
              } else {
                reasoning = params.type === "reasoning.delta"
                  ? appendAgentDelta(reasoning, payload.text || "")
                  : String(payload.text || reasoning || "");
                renderStructured();
              }
            } else if (params.type === "tool.start" || params.type === "tool.progress" || params.type === "tool.complete") {
              var targetTools = settled ? asyncToolEvents : toolEvents;
              updateToolEvent(targetTools, payload, params.type === "tool.complete" ? (payload.error ? "error" : "complete") : "running");
              if (settled) renderAsyncOutput(false); else renderStructured();
            } else if (params.type === "message.delta") {
              if (settled) {
                asyncAnswer = appendAgentDelta(asyncAnswer, payload.text || "");
                renderAsyncOutput(false);
              } else {
                answer = appendAgentDelta(answer, payload.text || "");
                renderStructured();
                queueStreamedSpeech(false);
              }
            } else if (params.type === "message.complete") {
              var completeText = String(payload.text || "");
              if (payload.session_key) {
                activeSession().backendSessionId = String(payload.session_key);
                saveMobileSessions(sessions);
              }
              if (settled) {
                if (asyncAnswer && normalizeDedupeText(completeText) === normalizeDedupeText(asyncAnswer)) {
                  completeText = asyncAnswer;
                }
                asyncAnswer = completeText || asyncAnswer;
                asyncReasoning = String(payload.reasoning || asyncReasoning || "");
                renderAsyncOutput(true);
                speakAssistantOutput(messages[asyncAssistantIndex] && messages[asyncAssistantIndex].content || asyncAnswer);
                asyncAnswer = "";
                asyncReasoning = "";
                asyncToolEvents = [];
                asyncAssistantIndex = -1;
              } else {
                if (answer && normalizeDedupeText(completeText) === normalizeDedupeText(answer)) {
                  completeText = answer;
                }
                finish(completeText || answer, payload.reasoning || reasoning);
              }
            } else if (params.type === "error") {
              if (settled) {
                asyncAnswer = arabicErrorText(payload.message, "تعذّرت مهمة الخلفية.");
                renderAsyncOutput(true);
                asyncAnswer = "";
                asyncReasoning = "";
                asyncAssistantIndex = -1;
              } else {
                fail(payload.message || "أعاد Hermes المحلي خطأ أثناء تنفيذ الطلب.");
              }
            }
            return;
          }
          if (data.id === createId) {
            if (data.error) {
              fail(data.error.message || "تعذّر إنشاء جلسة Hermes المحلية.");
              return;
            }
            activeSid = data.result && data.result.session_id || "";
            var storedSessionId = data.result && data.result.stored_session_id || activeSid;
            mobileRpcSessionId = activeSid;
            activeSession().backendSessionId = storedSessionId;
            saveMobileSessions(sessions);
            if (migratingLegacySession) setTemporarySubtitle("تم إصلاح ربط المحادثة السابقة.");
            submitPrompt();
            return;
          }
          if (data.id === resumeId) {
            if (data.error) {
              if (/session not found/i.test(String(data.error.message || "")) && isLegacyBackendSessionId(activeSession().backendSessionId) && !migratingLegacySession) {
                migratingLegacySession = true;
                activeSid = "";
                mobileRpcSessionId = "";
                setTemporarySubtitle("جارٍ إصلاح ربط المحادثة السابقة...");
                createBackendSession();
                return;
              }
              fail("تعذّر استعادة المحادثة السابقة، وأوقفنا الإرسال دون إنشاء محادثة جديدة تلقائيًا. " + arabicErrorText(data.error.message, "أعد المحاولة لاحقًا."));
              return;
            }
            activeSid = data.result && data.result.session_id || activeSid;
            mobileRpcSessionId = activeSid;
            activeSession().backendSessionId = data.result && (data.result.session_key || data.result.resumed) || activeSession().backendSessionId;
            saveMobileSessions(sessions);
            submitPrompt();
            return;
          }
          if (data.id === submitId && data.error) {
            var rawErrorMessage = String(data.error.message || "");
            var errorMessage = /session not found/i.test(rawErrorMessage)
              ? "تعذّر الوصول إلى المحادثة السابقة. احتفظنا بارتباطها ولن ننشئ محادثة جديدة تلقائيًا؛ أعد الإرسال لاحقًا."
              : arabicErrorText(rawErrorMessage, "تعذّر إرسال الرسالة إلى Hermes المحلي.");
            fail(errorMessage);
          }
        };

        ws.onerror = function () {
          if (!settled) {
            fail("تعذّر الاتصال بـHermes المحلي. يمكنك المتابعة عبر وضع الطرفية من القائمة الجانبية.");
          }
        };

        ws.onclose = function () {
          if (mobileRpcListenerSocket === ws) {
            mobileRpcListenerSocket = null;
          }
          if (!settled) {
            finish(answer, reasoning);
          }
        };
      });
    }

    function latestAssistantText() {
      for (var index = messages.length - 1; index >= 0; index -= 1) {
        if (messages[index].role === "assistant" && messages[index].content) {
          return extractAssistantSpeechText(messages[index].content || "");
        }
      }
      return "";
    }

    function speakAssistantOutput(text) {
      var content = extractAssistantSpeechText(text);
      if (!ttsEnabled || !content || /^正在/.test(content)) {
        return;
      }
      if (content === lastSpokenAssistantText) {
        return;
      }
      lastSpokenAssistantText = content;
      speakTextNow(content);
    }

    function extractAssistantSpeechText(text) {
      var parts = parseSerializedAgentOutput(text || "");
      return String(parts.answer || "").trim();
    }

    function cleanSpeechChunk(text) {
      return String(text || "")
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\*\*/g, "")
        .replace(/^[\s\-*#>]+/, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    function lastSpeechBoundary(text, limit) {
      var source = String(text || "");
      var max = Math.min(source.length - 1, limit == null ? source.length - 1 : limit);
      var index;
      for (index = max; index >= 0; index -= 1) {
        if ("。！？!?；;\n".indexOf(source.charAt(index)) !== -1) {
          return index + 1;
        }
      }
      for (index = max; index >= 0; index -= 1) {
        if ("，,、 ".indexOf(source.charAt(index)) !== -1) {
          return index + 1;
        }
      }
      return Math.min(source.length, Math.max(0, max + 1));
    }

    function splitSpeechCandidate(text, final) {
      var source = String(text || "");
      var parts = [];
      while (cleanSpeechChunk(source).length > MAX_STREAM_SPEECH_CHARS) {
        var cut = lastSpeechBoundary(source, MAX_STREAM_SPEECH_CHARS);
        if (cut < MIN_STREAM_SPEECH_CHARS) {
          cut = Math.min(source.length, MAX_STREAM_SPEECH_CHARS);
        }
        var chunk = cleanSpeechChunk(source.slice(0, cut));
        if (chunk) {
          parts.push(chunk);
        }
        source = source.slice(cut);
      }
      var tail = cleanSpeechChunk(source);
      if (tail && (final || tail.length >= MIN_STREAM_SPEECH_CHARS || !parts.length)) {
        parts.push(tail);
        source = "";
      }
      return { parts: parts, remainder: source };
    }

    function drainSpeakableSpeechChunks(buffer, final) {
      var text = String(buffer || "");
      if (final) {
        return splitSpeechCandidate(text, true);
      }
      var boundary = lastSpeechBoundary(text);
      if (!boundary || cleanSpeechChunk(text.slice(0, boundary)).length < MIN_STREAM_SPEECH_CHARS) {
        return { parts: [], remainder: text };
      }
      var split = splitSpeechCandidate(text.slice(0, boundary), false);
      return { parts: split.parts, remainder: split.remainder + text.slice(boundary) };
    }

    function isSpeechRequestUsable(requestId) {
      return requestId === speechRequestSerial && ttsEnabled;
    }

    function enqueueSpeechChunk(text, requestId) {
      var content = cleanSpeechChunk(text);
      if (!content || !isSpeechRequestUsable(requestId)) {
        return false;
      }
      queuedSpeechChunks.push({ text: content, requestId: requestId });
      drainSpeechQueue();
      return true;
    }

    async function drainSpeechQueue() {
      if (speechQueueActive) {
        return;
      }
      speechQueueActive = true;
      try {
        while (queuedSpeechChunks.length) {
          var item = queuedSpeechChunks.shift();
          if (!isSpeechRequestUsable(item.requestId)) {
            continue;
          }
          isSpeaking = true;
          syncTtsButton();
          try {
            var audioResult = await requestDashboardJson("POST", "/api/audio/speak", { text: item.text }, true);
            if (!isSpeechRequestUsable(item.requestId)) {
              break;
            }
            if (audioResult && audioResult.data_url) {
              await playAudioDataUrl(audioResult.data_url, item.text, { keepSpeaking: queuedSpeechChunks.length > 0 });
            }
          } catch (error) {
            logMobileEvent("streaming-audio-tts-failed", { error: String(error && error.message || error) });
          }
        }
      } finally {
        speechQueueActive = false;
        if (!queuedSpeechChunks.length && !currentAudioPlayer) {
          isSpeaking = false;
          syncTtsButton();
          refreshHeader();
        }
      }
    }

    function stopCurrentAudioPlayback() {
      var audio = currentAudioPlayer;
      if (!audio) {
        return false;
      }
      currentAudioPlayer = null;
      try {
        audio.__hermesStopped = true;
        if (typeof audio.__hermesFinish === "function") {
          audio.__hermesFinish(null, true);
          return true;
        }
        audio.pause();
        try {
          audio.currentTime = 0;
        } catch (seekError) {
          // ignore
        }
        audio.removeAttribute("src");
        audio.load();
      } catch (error) {
        logMobileEvent("audio-stop-failed", { error: String(error && error.message || error) });
      }
      return true;
    }

    function isCurrentSpeechRequest(requestId) {
      return requestId === speechRequestSerial && isSpeaking && ttsEnabled;
    }

    function stopSpeaking() {
      speechRequestSerial += 1;
      queuedSpeechChunks = [];
      stopCurrentAudioPlayback();
      isSpeaking = false;
      if (window.HermesAndroid && typeof window.HermesAndroid.stopSpeaking === "function") {
        try {
          window.HermesAndroid.stopSpeaking();
        } catch (error) {
          logMobileEvent("tts-stop-failed", { error: String(error && error.message || error) });
        }
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      syncTtsButton();
      setTemporarySubtitle("توقفت القراءة الصوتية");
    }

    async function speakTextNow(text) {
      var content = String(text || "").trim();
      if (!content) {
        setTemporarySubtitle("لا يوجد محتوى لقراءته صوتيًا");
        return;
      }
      try {
        queuedSpeechChunks = [];
        stopCurrentAudioPlayback();
        var speechRequestId = speechRequestSerial + 1;
        speechRequestSerial = speechRequestId;
        isSpeaking = true;
        syncTtsButton();
        if (window.HermesAndroid && typeof window.HermesAndroid.speakText === "function") {
          var nativeResult = JSON.parse(window.HermesAndroid.speakText(JSON.stringify({ text: content, language: currentLocale === "zh" ? "zh-CN" : currentLocale === "en" ? "en" : "ar" }), 30000));
          if (nativeResult.ok) {
            setTemporarySubtitle("جارٍ نطق الرد");
            window.setTimeout(function () {
              if (isCurrentSpeechRequest(speechRequestId)) {
                isSpeaking = false;
                syncTtsButton();
                refreshHeader();
              }
            }, Math.min(12000, Math.max(1800, content.length * 180)));
            return;
          }
          logMobileEvent("native-tts-failed", { error: String(nativeResult.error || "تعذّرت قراءة الرد صوتيًا") });
        }
        try {
          var audioResult = await requestDashboardJson("POST", "/api/audio/speak", { text: content }, true);
          if (!isCurrentSpeechRequest(speechRequestId)) {
            return;
          }
          if (audioResult && audioResult.data_url) {
            await playAudioDataUrl(audioResult.data_url, content);
            return;
          }
        } catch (audioError) {
          logMobileEvent("dashboard-audio-tts-failed", { error: String(audioError && audioError.message || audioError) });
        }
        try {
          await callGatewayRpc("voice.tts", { text: content }, 5000);
          if (!isCurrentSpeechRequest(speechRequestId)) {
            return;
          }
          setTemporarySubtitle("جارٍ نطق الرد");
          window.setTimeout(function () {
            if (isCurrentSpeechRequest(speechRequestId)) {
              isSpeaking = false;
              syncTtsButton();
              refreshHeader();
            }
          }, Math.min(12000, Math.max(1800, content.length * 180)));
          return;
        } catch (rpcError) {
          logMobileEvent("backend-tts-failed", { error: String(rpcError && rpcError.message || rpcError) });
        }
        if (!isCurrentSpeechRequest(speechRequestId)) {
          return;
        }
        if (window.speechSynthesis && typeof window.SpeechSynthesisUtterance === "function") {
          window.speechSynthesis.cancel();
          var utterance = new SpeechSynthesisUtterance(content);
          utterance.lang = currentLocale === "zh" ? "zh-CN" : currentLocale === "en" ? "en" : "ar";
          utterance.onend = utterance.onerror = function () {
            if (speechRequestId !== speechRequestSerial) {
              return;
            }
            isSpeaking = false;
            syncTtsButton();
            refreshHeader();
          };
          window.speechSynthesis.speak(utterance);
          setTemporarySubtitle("جارٍ نطق الرد");
          return;
        }
        isSpeaking = false;
        syncTtsButton();
        setTemporarySubtitle("لا يدعم هذا الجهاز القراءة الصوتية حاليًا");
      } catch (error) {
        isSpeaking = false;
        syncTtsButton();
        logMobileEvent("tts-failed", { error: String(error && error.message || error) });
        setTemporarySubtitle("تعذّرت القراءة الصوتية");
      }
    }

    function playAudioDataUrl(dataUrl, sourceText, options) {
      return new Promise(function (resolve, reject) {
        options = options || {};
        stopCurrentAudioPlayback();
        var audio = new Audio(dataUrl);
        var settled = false;
        var fallbackMs = Math.min(30000, Math.max(2200, String(sourceText || "").length * 190));
        currentAudioPlayer = audio;
        var timer = window.setTimeout(function () {
          if (settled) return;
          finish(null);
        }, fallbackMs);

        function cleanupAudio() {
          if (currentAudioPlayer === audio) {
            currentAudioPlayer = null;
          }
          audio.onended = null;
          audio.onerror = null;
          audio.__hermesFinish = null;
          try {
            audio.pause();
            audio.removeAttribute("src");
            audio.load();
          } catch (error) {
            // ignore cleanup errors
          }
        }

        function finish(error, stopped) {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          cleanupAudio();
          if (!options.keepSpeaking || stopped || error) {
            isSpeaking = false;
          }
          syncTtsButton();
          refreshHeader();
          if (stopped) {
            resolve();
            return;
          }
          if (error) reject(error);
          else resolve();
        }

        audio.__hermesFinish = finish;
        audio.onended = function () { finish(null); };
        audio.onerror = function () { finish(new Error("تعذّر تشغيل الصوت")); };
        setTemporarySubtitle("جارٍ نطق الرد");
        audio.play().then(function () {
          logMobileEvent("dashboard-audio-tts-playing", { length: String(sourceText || "").length });
        }).catch(finish);
      });
    }

    function toggleTts() {
      if (ttsEnabled || isSpeaking) {
        ttsEnabled = false;
        stopSpeaking();
        return;
      }
      ttsEnabled = true;
      syncTtsButton();
      var text = (input.value || "").trim() || latestAssistantText();
      if (!text) {
        setTemporarySubtitle("تم تفعيل القراءة الصوتية");
        return;
      }
      speakTextNow(text);
    }

    function isLoopbackProviderHost(hostname) {
      var host = String(hostname || "").toLowerCase().replace(/^\[|\]$/g, "");
      return host === "localhost" || host.endsWith(".localhost") || host === "::1" || /^127\./.test(host);
    }

    async function ensureExternalProviderConsent() {
      await refreshModelStatus();
      var endpoint;
      try {
        endpoint = new URL(String(config.baseUrl || DEFAULT_CHAT_ENDPOINT).trim());
      } catch (error) {
        setTemporarySubtitle("تعذّر التحقق من عنوان مزوّد النموذج. راجع الإعدادات قبل الإرسال.");
        return false;
      }
      if (isLoopbackProviderHost(endpoint.hostname)) {
        return true;
      }
      if (endpoint.protocol !== "https:") {
        setTemporarySubtitle("الاتصال البعيد غير المشفّر محظور. استخدم HTTPS قبل الإرسال.");
        return false;
      }
      var origin = endpoint.origin;
      var consentKey = "hermes.mobile.external-provider-consent:" + origin;
      try {
        if (window.localStorage.getItem(consentKey) === "accepted") {
          return true;
        }
      } catch (error) {
        // Ask again next time if local storage is unavailable.
      }
      var notice = "قبل المتابعة: قد يُرسل نص رسالتك وسياق المحادثة والملفات المستخدمة إلى مزوّد النموذج عبر الإنترنت (" + origin + "). راجع سياسة المزوّد؛ لن نرسل هذه الرسالة ما لم توافق. هل تريد المتابعة؟";
      if (!window.confirm(notice)) {
        return false;
      }
      try {
        window.localStorage.setItem(consentKey, "accepted");
      } catch (error) {
        // Consent remains valid for this request even if it cannot be persisted.
      }
      return true;
    }

    async function submitMessage() {
      var text = (input.value || "").trim();
      if (!text && !selectedFiles.length) {
        return;
      }
      if (!(await ensureExternalProviderConsent())) {
        return;
      }
      input.value = "";
      var attachments = selectedFiles.map(function (path) {
        var value = String(path || "");
        return { name: value.split(/[\\/]/).pop() || "ملف مرفق", path: value };
      });
      var fileContext = attachments.map(function (attachment) { return formatContextRef(attachment.path); }).filter(Boolean).join(" ");
      var userContent = [text, fileContext].filter(Boolean).join("\n\n");
      var visibleContent = text || (attachments.length ? "مرفق: " + attachments.map(function (item) { return item.name; }).join("، ") : "");
      messages.push({ role: "user", content: visibleContent, attachments: attachments });
      selectedFiles = [];
      renderAttachments();
      persistActiveSession();
      currentView = "chat";
      renderView();
      setBusy(true);
      try {
        await new Promise(function (resolve) { setTimeout(resolve, 20); });
        var assistantIndex = messages.length;
        messages.push({ role: "assistant", content: "جارٍ الاتصال بوكيل Hermes المحلي..." });
        persistActiveSession();
        renderView();
        await streamHermesAgentReply(userContent, assistantIndex);
      } catch (error) {
        appendAssistant(arabicErrorText(error, "تعذّر إرسال الرسالة. تحقّق من اتصال Hermes ثم أعد المحاولة."));
      } finally {
        setBusy(false);
        input.blur();
      }
    }

    function renderChat() {
      var html = [
        "<div id=\"hermes-mobile-hero\">",
        "  <div id=\"hermes-mobile-hero-title\">ماذا تريد من Hermes أن يفعل اليوم؟</div>",
        "</div>",
        "<div id=\"hermes-mobile-suggestions\">",
        "  <button class=\"hermes-mobile-suggestion\" type=\"button\" data-action=\"suggest\" data-prompt=\"نظّم المهام التي عليّ إنجازها اليوم ورتّبها حسب الأولوية.\">نظّم مهام اليوم</button>",
        "  <button class=\"hermes-mobile-suggestion\" type=\"button\" data-action=\"suggest\" data-prompt=\"تحقّق من إعداد النموذج الحالي وأخبرني إن كان مناسبًا.\">راجع إعداد النموذج</button>",
        "  <button class=\"hermes-mobile-suggestion\" type=\"button\" data-action=\"suggest\" data-prompt=\"أريد استخدام Hermes على الهاتف؛ اقترح لي سير عمل مختصرًا.\">أنشئ سير عمل للهاتف</button>",
        "</div>",
        "<div id=\"hermes-mobile-stream\">"
      ];
      messages.forEach(function (message) {
        if (message.role === "assistant") {
          html.push(renderAssistantBubble(message.content || ""));
        } else {
          var attachments = Array.isArray(message.attachments) ? message.attachments : [];
          html.push("<div class=\"hermes-mobile-bubble user\"><div class=\"hermes-mobile-user-text\">" + escapeHtml(message.content || "") + "</div>" + (attachments.length ? "<div class=\"hermes-mobile-message-attachments\">" + attachments.map(function (item, index) { return renderAttachmentCard(item, index, false); }).join("") + "</div>" : "") + "</div>");
        }
      });
      html.push("</div>");
      return html.join("");
    }

    function renderAssistantBubble(content) {
      var parts = parseSerializedAgentOutput(content || "");
      if (!parts.structured) {
        return "<div class=\"hermes-mobile-bubble assistant\">" + escapeHtml(cleanAgentDeltaText(parts.answer || "")) + "</div>";
      }
      var html = ["<div class=\"hermes-mobile-bubble assistant hermes-mobile-agent-output\">"];
      if (parts.thinking) {
        var thinkingPending = parts.streaming && /^(?:正在流式生成|جارٍ إنشاء الرد)/.test(parts.thinking);
        html.push("<details class=\"hermes-mobile-reasoning-card" + (thinkingPending ? " pending" : "") + (parts.streaming ? " streaming" : "") + "\"" + (parts.streaming ? " open" : "") + "><summary>" + (parts.streaming ? "جارٍ التفكير…" : "التفكير") + "</summary>" + (thinkingPending ? "" : "<p>" + escapeHtml(parts.thinking) + "</p>") + "</details>");
      }
      if (parts.tools && parts.tools.length) {
        html.push("<div class=\"hermes-mobile-tool-trace\">" + parts.tools.map(function (tool) {
          var state = tool.status === "complete" ? "مكتمل" : (tool.status === "error" ? "فشل" : "قيد التشغيل");
          var detail = tool.summary || tool.error || tool.context || "";
          var duration = tool.duration != null ? " · " + Number(tool.duration).toFixed(1) + " ث" : "";
          return "<details class=\"hermes-mobile-tool-call " + escapeHtml(tool.status || "running") + "\"" + (tool.status === "running" ? " open" : "") + "><summary><span>" + escapeHtml(tool.name || "أداة") + "</span><em>" + state + duration + "</em></summary>" + (detail ? "<p>" + escapeHtml(detail) + "</p>" : "") + (tool.result ? "<pre>" + escapeHtml(tool.result) + "</pre>" : "") + "</details>";
        }).join("") + "</div>");
      }
      html.push("<div class=\"hermes-mobile-answer-text" + (parts.answer ? "" : " pending") + "\">" + escapeHtml(cleanAgentDeltaText(parts.answer || "")) + "</div>");
      html.push("</div>");
      return html.join("");
    }

    function renderGroupedToolGrid(items) {
      var groups = [];
      (items || []).forEach(function (item) {
        var group = item[3] || "أخرى";
        var found = groups.filter(function (entry) { return entry.name === group; })[0];
        if (!found) {
          found = { name: group, items: [] };
          groups.push(found);
        }
        found.items.push(item);
      });
      return groups.map(function (group) {
        return [
          "<div class=\"hermes-mobile-panel\"><h2>" + escapeHtml(group.name) + "</h2><div class=\"hermes-mobile-tool-grid\">",
          group.items.map(function (tool) {
            return "<button class=\"hermes-mobile-tool\" type=\"button\" data-action=\"tool\" data-tool=\"" + escapeHtml(tool[2]) + "\"><strong>" + escapeHtml(tool[0]) + "</strong><span>" + escapeHtml(tool[1]) + "</span></button>";
          }).join(""),
          "</div></div>"
        ].join("");
      }).join("");
    }

    function renderFeatureHeader(viewName, title, description) {
      var state = featureState(viewName);
      return [
        "<div class=\"hermes-mobile-panel\"><h2>" + escapeHtml(title) + "</h2><p>" + escapeHtml(description) + "</p>",
        "<div class=\"hermes-mobile-form-actions\">",
        "<button class=\"secondary\" type=\"button\" data-action=\"mobile-back\">العودة إلى الإعدادات</button>",
        "<button class=\"secondary\" type=\"button\" data-action=\"feature-refresh\" data-view=\"" + escapeHtml(viewName) + "\">تحديث</button>",
        "<button class=\"secondary\" type=\"button\" data-action=\"feature-open-dashboard\" data-view=\"" + escapeHtml(viewName) + "\">إعدادات متقدمة</button>",
        "</div>",
        state.loading ? "<p>جارٍ تحميل بيانات الخدمة المحلية...</p>" : "",
        state.error ? "<p role=\"alert\">تعذّر تحميل البيانات. تحقّق من الاتصال ثم أعد المحاولة.</p>" : "",
        "</div>"
      ].join("");
    }

    function renderFeatureEmpty(text) {
      return "<div class=\"hermes-mobile-empty\">" + escapeHtml(text) + "</div>";
    }

    function renderResourcesPage() {
      var state = featureState("resources");
      var data = state.data || {};
      var entries = data.entries || [];
      var currentPath = String(data.path || state.path || "");
      var rootPath = String(state.rootPath || currentPath || "");
      var canGoUp = Boolean(currentPath && rootPath && currentPath !== rootPath && currentPath.indexOf(rootPath + "/") === 0);
      var parentPath = canGoUp ? currentPath.slice(0, currentPath.lastIndexOf("/")) : rootPath;
      return [
        "<div class=\"hermes-mobile-section\">",
        renderFeatureHeader("resources", "الملفات والموارد", "استعراض الملفات والموارد التي يديرها Hermes والتنزيلات."),
        currentPath ? "<div class=\"hermes-mobile-panel hermes-mobile-resource-path\"><p>المسار الحالي: " + escapeHtml(currentPath) + "</p><div class=\"hermes-mobile-resource-actions\">" + (canGoUp ? "<button class=\"secondary\" type=\"button\" data-action=\"resource-open-dir\" data-path=\"" + escapeHtml(parentPath) + "\">المجلد السابق</button>" : "") + (rootPath && currentPath !== rootPath ? "<button class=\"secondary\" type=\"button\" data-action=\"resource-open-dir\" data-path=\"" + escapeHtml(rootPath) + "\">المجلد الجذر</button>" : "") + "</div></div>" : "",
        entries.length ? "<div class=\"hermes-mobile-list\">" + entries.slice(0, 24).map(function (entry) {
          var isDir = Boolean(entry.is_directory || entry.isDirectory);
          var name = entry.name || entry.path || "عنصر بلا اسم";
          var meta = isDir ? "مجلد" : formatBytes(entry.size);
          var path = entry.path || name;
          var action = isDir ? "resource-open-dir" : "resource-download";
          var button = isDir ? "فتح" : "تنزيل";
          return "<div class=\"hermes-mobile-row\"><div class=\"hermes-mobile-row-main\"><strong>" + escapeHtml((isDir ? "▣ " : "◇ ") + name) + "</strong><span>" + escapeHtml(meta) + "</span></div><div class=\"hermes-mobile-row-actions\"><button class=\"secondary\" type=\"button\" data-action=\"" + action + "\" data-path=\"" + escapeHtml(path) + "\">" + button + "</button></div></div>";
        }).join("") + "</div>" : renderFeatureEmpty(state.loading ? "جارٍ تحميل الموارد..." : "لا توجد موارد لعرضها حاليًا."),
        "</div>"
      ].join("");
    }

    function renderAutomationPage() {
      var state = featureState("automation");
      var data = state.data || {};
      var jobs = Array.isArray(data.jobs) ? data.jobs : [];
      var targets = data.targets || [];
      var blueprints = data.blueprints || [];
      return [
        "<div class=\"hermes-mobile-section\">",
        renderFeatureHeader("automation", "المهام المجدولة", "عرض مهام Cron ووجهات الإشعار وقوالب الأتمتة."),
        "<div class=\"hermes-mobile-panel\"><h2>وجهات الإشعار</h2><p>" + escapeHtml(targets.length ? targets.map(function (target) { return target.name || target.id; }).join("، ") : "الحفظ محليًا فقط") + "</p></div>",
        jobs.length ? "<div class=\"hermes-mobile-list\">" + jobs.slice(0, 20).map(function (job) {
          var enabled = job.enabled !== false && job.paused !== true;
          var id = job.id || job.name || "";
          var profile = job.profile || "default";
          var title = job.name || job.id || "مهمة بلا اسم";
          var detail = [
            job.schedule || "بلا جدول زمني",
            enabled ? "مفعّلة" : "متوقفة مؤقتًا",
            "التشغيل التالي: " + formatFeatureTime(job.next_run || job.next_run_at || job.next_at)
          ].join(" · ");
          return "<div class=\"hermes-mobile-row\"><div class=\"hermes-mobile-row-main\"><strong>" + escapeHtml(title) + "</strong><span>" + escapeHtml(detail) + "</span></div><div class=\"hermes-mobile-row-actions\"><button class=\"secondary\" type=\"button\" data-action=\"cron-trigger\" data-job=\"" + escapeHtml(id) + "\" data-profile=\"" + escapeHtml(profile) + "\">تشغيل الآن</button><button class=\"secondary\" type=\"button\" data-action=\"" + (enabled ? "cron-pause" : "cron-resume") + "\" data-job=\"" + escapeHtml(id) + "\" data-profile=\"" + escapeHtml(profile) + "\">" + (enabled ? "إيقاف مؤقت" : "استئناف") + "</button></div></div>";
        }).join("") + "</div>" : renderFeatureEmpty(state.loading ? "جارٍ تحميل المهام..." : "لا توجد مهام مجدولة."),
        "<div class=\"hermes-mobile-panel\"><h2>قوالب الأتمتة</h2><p>" + escapeHtml(blueprints.length ? blueprints.slice(0, 6).map(function (item) { return item.title || item.name || item.key; }).join("، ") : "لا توجد قوالب متاحة") + "</p></div>",
        "</div>"
      ].join("");
    }

    function renderIntegrationsPage() {
      var state = featureState("integrations");
      var data = state.data || {};
      var status = data.status || {};
      var platforms = data.messaging && data.messaging.platforms || [];
      return [
        "<div class=\"hermes-mobile-section\">",
        renderFeatureHeader("integrations", "التكاملات", "إدارة منصات المراسلة والاتصال وحالة البوابة."),
        "<div class=\"hermes-mobile-panel\"><h2>البوابة (Gateway)</h2><p>" + escapeHtml((status.gateway_running ? "قيد التشغيل" : "متوقفة") + (status.gateway_state ? " · " + status.gateway_state : "")) + "</p><div class=\"hermes-mobile-form-actions\"><button class=\"secondary\" type=\"button\" data-action=\"gateway-start\">تشغيل</button><button class=\"secondary\" type=\"button\" data-action=\"gateway-stop\">إيقاف</button></div></div>",
        platforms.length ? "<div class=\"hermes-mobile-list\">" + platforms.map(function (platform) {
          var name = platform.name || platform.id || "منصة غير معروفة";
          var rawState = String(platform.state || (platform.configured ? "configured" : "not configured"));
          var stateText = ({ configured: "مهيّأ", "not configured": "غير مهيّأ", running: "قيد التشغيل", stopped: "متوقف", connected: "متصل", disconnected: "غير متصل", error: "خطأ" })[rawState.toLowerCase()] || rawState;
          var detail = [
            platform.enabled ? "مفعّلة" : "غير مفعّلة",
            platform.configured ? "مهيّأة" : "غير مهيّأة",
            stateText
          ].join(" · ");
          return "<div class=\"hermes-mobile-row\"><div class=\"hermes-mobile-row-main\"><strong>" + escapeHtml(name) + "</strong><span>" + escapeHtml(detail) + "</span></div><div class=\"hermes-mobile-row-actions\"><button class=\"secondary\" type=\"button\" data-action=\"platform-toggle\" data-platform=\"" + escapeHtml(platform.id || "") + "\" data-enabled=\"" + (platform.enabled ? "true" : "false") + "\" data-configured=\"" + (platform.configured ? "true" : "false") + "\" data-gateway-running=\"" + (platform.gateway_running ? "true" : "false") + "\">" + (platform.enabled ? "تعطيل" : "تفعيل") + "</button><button class=\"secondary\" type=\"button\" data-action=\"platform-test\" data-platform=\"" + escapeHtml(platform.id || "") + "\">اختبار</button></div></div>";
        }).join("") + "</div>" : renderFeatureEmpty(state.loading ? "جارٍ تحميل حالة التكاملات..." : "لا توجد منصات مراسلة مهيّأة."),
        "</div>"
      ].join("");
    }

    function renderRemotePage() {
      var state = featureState("remote");
      var data = state.data || {};
      var status = data.status || {};
      var pairing = data.pairing || {};
      var profiles = data.profiles || {};
      var profileItems = profiles.profiles || profiles.items || [];
      var pendingItems = pairing.pending || pairing.requests || [];
      return [
        "<div class=\"hermes-mobile-section\">",
        renderFeatureHeader("remote", "الخوادم البعيدة", "إدارة الاتصالات البعيدة وطلبات الاقتران وملفات التعريف وحالة الخدمة."),
        "<div class=\"hermes-mobile-panel\"><h2>حالة الخدمة الخلفية</h2><p>" + escapeHtml("لوحة التحكم (Dashboard): " + (status.ok === false ? "غير متاحة" : "متاحة") + " · البوابة (Gateway): " + (status.gateway_running ? "قيد التشغيل" : "متوقفة")) + "</p></div>",
        "<div class=\"hermes-mobile-panel\"><h2>طلبات الاقتران</h2><p>" + escapeHtml(pendingItems.length ? pendingItems.length + " طلب قيد المراجعة" : "لا توجد طلبات معلّقة") + "</p><div class=\"hermes-mobile-form-actions\"><button class=\"secondary\" type=\"button\" data-action=\"feature-open-dashboard\" data-view=\"remote\">فتح إعدادات الاتصال البعيد</button></div></div>",
        profileItems.length ? "<div class=\"hermes-mobile-list\">" + profileItems.slice(0, 12).map(function (profile) {
          var name = profile.name || profile.id || "default";
          var detail = [profile.description || "", profile.active ? "نشط" : ""].filter(Boolean).join(" · ") || "ملف تعريف";
          return "<div class=\"hermes-mobile-row\"><div class=\"hermes-mobile-row-main\"><strong>" + escapeHtml(name) + "</strong><span>" + escapeHtml(detail) + "</span></div></div>";
        }).join("") + "</div>" : renderFeatureEmpty(state.loading ? "جارٍ تحميل بيانات الاتصال البعيد..." : "لا توجد ملفات تعريف متاحة."),
        "</div>"
      ].join("");
    }

    function formatFeatureNumber(value) {
      var number = Number(value || 0);
      if (!isFinite(number)) return "0";
      return String(Math.round(number * 100) / 100);
    }

    function renderMemoryPage() {
      var state = featureState("memory");
      var data = state.data || {};
      var memory = data.memory || {};
      var providers = memory.providers || data.providers && data.providers.providers || [];
      var files = memory.builtin_files || {};
      var active = memory.active || "built-in";
      return [
        "<div class=\"hermes-mobile-section\">",
        renderFeatureHeader("memory", "إدارة الذاكرة", "عرض الذاكرة المنظمة وتفضيلات المستخدم ومزوّدي الذاكرة الخارجيين."),
        "<div class=\"hermes-mobile-panel\"><h2>المزوّد الحالي</h2><p>" + escapeHtml(active === "built-in" ? "الذاكرة المدمجة" : active) + "</p></div>",
        "<div class=\"hermes-mobile-panel\"><h2>ملفات الذاكرة المدمجة</h2><p>" + escapeHtml("ذاكرة المشروع " + formatBytes(files.memory || 0) + " · تفضيلات المستخدم " + formatBytes(files.user || 0)) + "</p></div>",
        providers.length ? "<div class=\"hermes-mobile-list\">" + providers.map(function (provider) {
          var name = provider.name || "provider";
          var detail = [provider.description || "", provider.configured ? "مهيّأ" : "غير مهيّأ"].filter(Boolean).join(" · ");
          return "<div class=\"hermes-mobile-row\"><div class=\"hermes-mobile-row-main\"><strong>" + escapeHtml(name) + "</strong><span>" + escapeHtml(detail || "مزوّد ذاكرة") + "</span></div></div>";
        }).join("") + "</div>" : renderFeatureEmpty(state.loading ? "جارٍ تحميل حالة الذاكرة..." : "لا توجد مزوّدات ذاكرة خارجية."),
        "</div>"
      ].join("");
    }

    function renderSkillsPage() {
      var state = featureState("skills");
      var data = state.data || {};
      var skills = Array.isArray(data.skills) ? data.skills : [];
      var hub = data.hub || {};
      var sources = hub.sources || [];
      var featured = hub.featured || [];
      var enabled = skills.filter(function (skill) { return skill.enabled !== false; }).length;
      return [
        "<div class=\"hermes-mobile-section\">",
        renderFeatureHeader("skills", "مركز المهارات", "استعراض المهارات المثبتة ومصادرها والمهارات المقترحة."),
        "<div class=\"hermes-mobile-panel\"><h2>المهارات المثبتة</h2><p>" + escapeHtml(enabled + " مفعّلة · " + skills.length + " متاحة") + "</p></div>",
        skills.length ? "<div class=\"hermes-mobile-list\">" + skills.slice(0, 18).map(function (skill) {
          var name = skill.name || "مهارة";
          var detail = [
            skill.enabled === false ? "معطّلة" : "مفعّلة",
            skill.provenance || "",
            skill.usage != null ? "عدد مرات الاستخدام: " + skill.usage : ""
          ].filter(Boolean).join(" · ");
          return "<div class=\"hermes-mobile-row\"><div class=\"hermes-mobile-row-main\"><strong>" + escapeHtml(name) + "</strong><span>" + escapeHtml(detail || "مهارة") + "</span></div></div>";
        }).join("") + "</div>" : renderFeatureEmpty(state.loading ? "جارٍ تحميل المهارات..." : "لا توجد مهارات مثبتة."),
        "<div class=\"hermes-mobile-panel\"><h2>مصادر المهارات</h2><p>" + escapeHtml(sources.length ? sources.map(function (source) { return source.label || source.id; }).join("، ") : "لا توجد معلومات عن المصادر") + "</p></div>",
        featured.length ? "<div class=\"hermes-mobile-panel\"><h2>مهارات مقترحة</h2><p>" + escapeHtml(featured.slice(0, 6).map(function (item) { return item.name || item.identifier || item.title; }).filter(Boolean).join("، ")) + "</p></div>" : "",
        "</div>"
      ].join("");
    }

    function renderPersonaPage() {
      var state = featureState("persona");
      var data = state.data || {};
      var active = data.active || {};
      var profiles = data.profiles && data.profiles.profiles || [];
      var soul = data.soul || {};
      var current = active.current || active.active || "default";
      var soulText = String(soul.content || "").trim();
      return [
        "<div class=\"hermes-mobile-section\">",
        renderFeatureHeader("persona", "الشخصية", "إعداد الشخصية والنبرة وأسلوب الإجابة."),
        "<div class=\"hermes-mobile-panel\"><h2>ملف التعريف النشط</h2><p>" + escapeHtml("النشط: " + current + " · الافتراضي: " + (active.active || "default")) + "</p></div>",
        "<div class=\"hermes-mobile-panel\"><h2>SOUL.md</h2><p>" + escapeHtml(soul.exists ? "مهيّأ · " + soulText.length + " حرفًا" : "غير مهيّأ") + "</p>" + (soulText ? "<p>" + escapeHtml(soulText.slice(0, 160)) + (soulText.length > 160 ? "..." : "") + "</p>" : "") + "</div>",
        profiles.length ? "<div class=\"hermes-mobile-list\">" + profiles.slice(0, 12).map(function (profile) {
          var name = profile.name || "default";
          var detail = [profile.description || "", name === current ? "نشط" : ""].filter(Boolean).join(" · ") || "ملف تعريف";
          return "<div class=\"hermes-mobile-row\"><div class=\"hermes-mobile-row-main\"><strong>" + escapeHtml(name) + "</strong><span>" + escapeHtml(detail) + "</span></div></div>";
        }).join("") + "</div>" : renderFeatureEmpty(state.loading ? "جارٍ تحميل ملفات التعريف..." : "لا توجد ملفات تعريف متاحة."),
        "</div>"
      ].join("");
    }

    function renderToolsPage() {
      var state = featureState("tools");
      var toolsets = state.data && Array.isArray(state.data.toolsets) ? state.data.toolsets : [];
      var enabled = toolsets.filter(function (toolset) { return toolset.enabled; }).length;
      return [
        "<div class=\"hermes-mobile-section\">",
        renderFeatureHeader("tools", "الأدوات", "عرض حالة أدوات الويب والطرفية والملفات والبرمجة والصور والنطق (TTS)."),
        "<div class=\"hermes-mobile-panel\"><h2>حالة الأدوات</h2><p>" + escapeHtml(enabled + " مفعّلة · " + toolsets.length + " قابلة للإعداد") + "</p></div>",
        toolsets.length ? "<div class=\"hermes-mobile-list\">" + toolsets.slice(0, 20).map(function (toolset) {
          var name = toolset.label || toolset.name || "مجموعة أدوات";
          var detail = [
            toolset.enabled ? "مفعّلة" : "معطّلة",
            toolset.configured ? "مهيّأة" : "غير مهيّأة",
            Array.isArray(toolset.tools) ? toolset.tools.length + " أداة" : ""
          ].filter(Boolean).join(" · ");
          return "<div class=\"hermes-mobile-row\"><div class=\"hermes-mobile-row-main\"><strong>" + escapeHtml(name) + "</strong><span>" + escapeHtml(detail) + "</span></div></div>";
        }).join("") + "</div>" : renderFeatureEmpty(state.loading ? "جارٍ تحميل الأدوات..." : "لا توجد بيانات للأدوات."),
        "</div>"
      ].join("");
    }

    function renderMcpPage() {
      var state = featureState("mcp");
      var data = state.data || {};
      var servers = data.servers && data.servers.servers || [];
      var catalog = data.catalog && data.catalog.entries || [];
      var installed = catalog.filter(function (entry) { return entry.installed; }).length;
      return [
        "<div class=\"hermes-mobile-section\">",
        renderFeatureHeader("mcp", "MCP", "عرض خوادم MCP وطرق الاتصال وحالة الدليل الرسمي."),
        "<div class=\"hermes-mobile-panel\"><h2>خوادم MCP</h2><p>" + escapeHtml(servers.length + " مهيّأ · الدليل " + catalog.length + " عنصر · المثبّت " + installed + " عنصر") + "</p></div>",
        servers.length ? "<div class=\"hermes-mobile-list\">" + servers.slice(0, 16).map(function (server) {
          var name = server.name || "خادم";
          var detail = [
            server.enabled === false ? "معطّل" : "مفعّل",
            server.transport || server.url && "HTTP/SSE" || server.command && "stdio" || "",
            server.auth_type ? "المصادقة: " + server.auth_type : ""
          ].filter(Boolean).join(" · ");
          return "<div class=\"hermes-mobile-row\"><div class=\"hermes-mobile-row-main\"><strong>" + escapeHtml(name) + "</strong><span>" + escapeHtml(detail || "خادم MCP") + "</span></div></div>";
        }).join("") + "</div>" : renderFeatureEmpty(state.loading ? "جارٍ تحميل خوادم MCP..." : "لا توجد خوادم MCP مهيّأة."),
        catalog.length ? "<div class=\"hermes-mobile-panel\"><h2>أمثلة من الدليل</h2><p>" + escapeHtml(catalog.slice(0, 6).map(function (entry) { return entry.name; }).join("، ")) + "</p></div>" : "",
        "</div>"
      ].join("");
    }

    function renderUsagePage() {
      var state = featureState("usage");
      var data = state.data || {};
      var totals = data.totals || {};
      var byModel = data.by_model || [];
      var totalTokens = Number(totals.total_input || 0) + Number(totals.total_output || 0) + Number(totals.total_cache_read || 0) + Number(totals.total_reasoning || 0);
      return [
        "<div class=\"hermes-mobile-section\">",
        renderFeatureHeader("usage", "الاستخدام", "إحصاءات الرموز والنماذج واستخدام المحادثات خلال آخر 30 يومًا."),
        "<div class=\"hermes-mobile-panel\"><h2>ملخص الاستخدام</h2><p>" + escapeHtml(formatFeatureNumber(totalTokens) + " رمز · " + formatFeatureNumber(totals.total_sessions) + " جلسة · " + formatFeatureNumber(totals.total_api_calls) + " طلب API") + "</p></div>",
        byModel.length ? "<div class=\"hermes-mobile-list\">" + byModel.slice(0, 10).map(function (row) {
          var tokens = Number(row.input_tokens || 0) + Number(row.output_tokens || 0);
          var detail = formatFeatureNumber(tokens) + " رمز · " + formatFeatureNumber(row.sessions) + " جلسة";
          return "<div class=\"hermes-mobile-row\"><div class=\"hermes-mobile-row-main\"><strong>" + escapeHtml(row.model || "غير معروف") + "</strong><span>" + escapeHtml(detail) + "</span></div></div>";
        }).join("") + "</div>" : renderFeatureEmpty(state.loading ? "جارٍ تحميل بيانات الاستخدام..." : "لا توجد بيانات استخدام بعد."),
        "</div>"
      ].join("");
    }

    function renderAppearancePage() {
      var state = featureState("appearance");
      var data = state.data || {};
      var themes = data.themes && data.themes.themes || [];
      var active = data.themes && data.themes.active || "default";
      var font = data.font && data.font.font || "theme";
      var themeLabels = { "default": "فيروزي Hermes", "default-large": "فيروزي Hermes — خط أكبر", "nous-blue": "أزرق Nous", "midnight": "منتصف الليل", "ember": "جمرة", "mono": "أحادي اللون", "cyberpunk": "سايبربانك" };
      var themeDescriptions = { "default": "السمة الفيروزية الداكنة الكلاسيكية من Hermes.", "default-large": "سمة Hermes الكلاسيكية مع خط أكبر ومسافات أوسع.", "nous-blue": "سمة فاتحة بلمسات زرقاء على خلفية عاجية.", "midnight": "أزرق بنفسجي داكن مع لمسات باردة.", "ember": "تدرجات حمراء دافئة ولمسات نحاسية.", "mono": "درجات رمادية هادئة وبسيطة.", "cyberpunk": "أخضر نيون على خلفية سوداء." };
      var fontLabels = { "theme": "حسب السمة", "system-sans": "خط نظام بلا تذييل", "system-serif": "خط نظام مزخرف", "system-mono": "خط أحادي المسافة" };
      var activeLabel = themeLabels[active] || active;
      var fontLabel = fontLabels[font] || font;
      return [
        "<div class=\"hermes-mobile-section\">",
        renderFeatureHeader("appearance", "المظهر", "إعداد سمة لوحة Hermes والخط والألوان على الهاتف."),
        "<div class=\"hermes-mobile-panel\"><h2>السمة الحالية</h2><p>" + escapeHtml("سمة لوحة Hermes: " + activeLabel + " · الخط: " + fontLabel + " · الهاتف: " + (currentTheme === "dark" ? "داكن" : "فاتح")) + "</p><div class=\"hermes-mobile-form-actions\"><button class=\"secondary\" type=\"button\" data-action=\"appearance-mobile-theme\" data-theme=\"light\">فاتح</button><button class=\"secondary\" type=\"button\" data-action=\"appearance-mobile-theme\" data-theme=\"dark\">داكن</button></div></div>",
        themes.length ? "<div class=\"hermes-mobile-list\">" + themes.slice(0, 12).map(function (theme) {
          var themeId = theme.name || "default";
          var name = themeLabels[themeId] || theme.label || themeId || "سمة";
          var detail = [themeId === active ? "مفعّلة" : "", themeDescriptions[themeId] || theme.description || "سمة مخصصة"].filter(Boolean).join(" · ");
          return "<div class=\"hermes-mobile-row\"><div class=\"hermes-mobile-row-main\"><strong>" + escapeHtml(name) + "</strong><span>" + escapeHtml(detail) + "</span></div><div class=\"hermes-mobile-row-actions\"><button class=\"secondary\" type=\"button\" data-action=\"appearance-dashboard-theme\" data-theme=\"" + escapeHtml(themeId) + "\">تطبيق</button></div></div>";
        }).join("") + "</div>" : renderFeatureEmpty(state.loading ? "جارٍ تحميل السمات..." : "لا توجد سمات متاحة."),
        "<div class=\"hermes-mobile-panel\"><h2>الخط</h2><div class=\"hermes-mobile-form-actions\"><button class=\"secondary\" type=\"button\" data-action=\"appearance-font\" data-font=\"theme\">حسب السمة</button><button class=\"secondary\" type=\"button\" data-action=\"appearance-font\" data-font=\"system-sans\">خط نظام بلا تذييل</button><button class=\"secondary\" type=\"button\" data-action=\"appearance-font\" data-font=\"system-serif\">خط نظام مزخرف</button><button class=\"secondary\" type=\"button\" data-action=\"appearance-font\" data-font=\"system-mono\">خط أحادي المسافة</button></div></div>",
        "</div>"
      ].join("");
    }

    function renderLanguagePage() {
      return [
        "<div class=\"hermes-mobile-section\">",
        renderFeatureHeader("language", "اللغة", "تغيير لغة واجهة الهاتف ولوحة Hermes."),
        "<div class=\"hermes-mobile-panel\"><h2>اللغة الحالية</h2><p>" + (currentLocale === "en" ? "الإنجليزية" : currentLocale === "zh" ? "الصينية المبسطة" : "العربية") + "</p><div class=\"hermes-mobile-form-actions\"><button class=\"secondary\" type=\"button\" data-action=\"language-set\" data-locale=\"ar\">العربية</button><button class=\"secondary\" type=\"button\" data-action=\"language-set\" data-locale=\"en\">الإنجليزية</button><button class=\"secondary\" type=\"button\" data-action=\"language-set\" data-locale=\"zh\">الصينية المبسطة</button></div></div>",
        "</div>"
      ].join("");
    }

    function refreshAndroidAdbStatus() {
      androidAdbState.loading = true;
      androidAdbState.error = "";
      renderView();
      window.setTimeout(function () {
        var result = callHermesAndroidJson("getAndroidAdbStatus");
        androidAdbState.loading = false;
        androidAdbState.data = result;
        androidAdbState.error = result.error || "";
        renderView();
      }, 40);
    }

    function renderPhoneControlPage() {
      var data = androidAdbState.data || {};
      var connected = Boolean(data.connected);
      var statusClass = androidAdbState.error ? " error" : (connected ? " connected" : "");
      var statusTitle = androidAdbState.loading ? "جارٍ التحقق من حالة ADB" : (connected ? "الهاتف متصل" : "الهاتف غير متصل");
      var statusDetail = androidAdbState.error ? "تعذّر التحقق من حالة ADB. أعد المحاولة بعد تفعيل التصحيح اللاسلكي." : (connected ? (data.output || "ADB جاهز") : "أكمِل الاقتران عبر التصحيح اللاسلكي، ثم أدخل عنوان الاتصال والمنفذ.");
      var savedEndpoint = "";
      try {
        var storedHost = localStorage.getItem("hermes.mobile.adb.host") || "";
        var storedPort = localStorage.getItem("hermes.mobile.adb.port") || "";
        savedEndpoint = storedHost && storedPort ? storedHost + ":" + storedPort : "";
      } catch (error) {
        // ignore storage failures
      }
      return [
        "<div class=\"hermes-mobile-section\">",
        renderFeatureHeader("phone-control", "التحكم بالهاتف", "ربط الهاتف عبر ADB اللاسلكي لعرض الجهاز والتحكم به من Hermes."),
        "<div class=\"hermes-mobile-panel\"><div class=\"hermes-mobile-adb-status" + statusClass + "\"><span class=\"dot\"></span><div><h2>" + escapeHtml(statusTitle) + "</h2><p>" + escapeHtml(statusDetail) + "</p></div></div><div class=\"hermes-mobile-form-actions\"><button class=\"secondary\" type=\"button\" data-action=\"adb-refresh\">إعادة التحقق</button><button class=\"secondary\" type=\"button\" data-action=\"adb-test\">اختبار التحكم</button></div></div>",
        "<div class=\"hermes-mobile-panel\"><h2>البدء لأول مرة</h2><div class=\"hermes-mobile-guide\"><div class=\"hermes-mobile-guide-step\"><strong>تفعيل خيارات المطوّر</strong><p>افتح إعدادات النظام ثم «حول الهاتف»، واضغط على «رقم الإصدار» نحو 7 مرات حتى تظهر رسالة تفعيل خيارات المطوّر.</p></div><div class=\"hermes-mobile-guide-step\"><strong>تفعيل التصحيح اللاسلكي</strong><p>انتقل إلى الإعدادات → خيارات المطوّر → التصحيح اللاسلكي، ثم فعّل الخيار.</p></div><div class=\"hermes-mobile-guide-step\"><strong>الاقتران باستخدام رمز</strong><p>اختر «الاقتران باستخدام رمز» وأبقِ نافذة الرمز مفتوحة. قد يتغيّر رمز الاقتران ومنفذه عند إغلاق النافذة أو مغادرتها.</p></div></div><div class=\"hermes-mobile-form-actions\"><button class=\"secondary\" type=\"button\" data-action=\"adb-open-developer\">فتح خيارات المطوّر</button><button class=\"primary\" type=\"button\" data-action=\"adb-open-wireless\">فتح التصحيح اللاسلكي</button></div><div class=\"hermes-mobile-adb-note\">يمكنك عرض Hermes وإعدادات النظام في شاشة منقسمة أو نافذة صغيرة. أبقِ نافذة رمز الاقتران ظاهرة، ثم ارجع إلى Hermes وأدخل المنفذ والرمز المكوّن من 6 أرقام.</div></div>",
        "<div class=\"hermes-mobile-panel\"><h2>الخطوة 1: الاقتران</h2><div class=\"hermes-mobile-form\"><label>عنوان الاقتران والمنفذ<input id=\"hermes-mobile-adb-pair-endpoint\" placeholder=\"مثال: 192.168.1.8:37123\" inputmode=\"text\"></label><label>رمز الاقتران (6 أرقام)<input id=\"hermes-mobile-adb-pair-code\" placeholder=\"مثال: 123456\" inputmode=\"numeric\" maxlength=\"6\"></label><div class=\"hermes-mobile-form-actions\"><button class=\"primary\" type=\"button\" data-action=\"adb-pair\">بدء الاقتران</button></div></div></div>",
        "<div class=\"hermes-mobile-panel\"><h2>الخطوة 2: الاتصال</h2><p>ارجع إلى صفحة التصحيح اللاسلكي وانسخ «عنوان IP والمنفذ». قد يختلف منفذ الاتصال عن منفذ الاقتران.</p><div class=\"hermes-mobile-form\"><label>عنوان الاتصال والمنفذ<input id=\"hermes-mobile-adb-endpoint\" value=\"" + escapeHtml(savedEndpoint) + "\" placeholder=\"مثال: 192.168.1.8:40765\" inputmode=\"text\"></label><div class=\"hermes-mobile-form-actions\"><button class=\"primary\" type=\"button\" data-action=\"adb-connect\">اتصال الهاتف</button></div></div></div>",
        "<div class=\"hermes-mobile-panel\"><h2>ما الذي يمكن التحكم به؟</h2><p>بعد الاتصال، تتيح أداة <code>android_debug</code> عرض معلومات الجهاز والتقاط الشاشة والنقر والكتابة وفتح التطبيقات وتنفيذ أوامر ADB Shell. ستظل العمليات الحساسة، مثل حذف البيانات أو إزالة التطبيقات أو إعادة ضبط المصنع، بحاجة إلى موافقتك.</p></div>",
        "</div>"
      ].join("");
    }

    function renderLocalModelsPage() {
      var result = callHermesAndroidJson("getLocalModelStatus");
      if (result && result.ok) localModelState.data = result;
      else if (result && result.error) localModelState.error = result.error;
      var data = localModelState.data || {};
      var pct = Number(data.progress || 0);
      var downloaded = Number(data.downloaded_bytes || 0);
      var total = Number(data.size_bytes || 0);
      var downloadState = data.download_state || "not_downloaded";
      var runtime = data.runtime_state || "idle";
      var active = Boolean(data.running);
      var rawModelError = localModelState.error || data.runtime_error || "";
      var message = rawModelError ? arabicErrorText(rawModelError, "تعذّر تشغيل النموذج المحلي. راجع مساحة التخزين وحالة المحرك ثم أعد المحاولة.") : "";
      var downloadLabel = downloadState === "downloaded" ? "تم تنزيل النموذج والتحقق من SHA-256" : downloadState === "downloading" ? "التنزيل جارٍ" : downloadState === "interrupted" ? "تنزيل غير مكتمل — يمكن استئنافه" : "النموذج غير موجود على الجهاز";
      var runtimeLabel = runtime === "running" ? "يعمل محليًا" : runtime === "loading" ? "يجري تحميل النموذج إلى الذاكرة" : runtime === "error" ? "تعذر تشغيل المحرك" : "متوقف";
      return [
        "<div class=\"hermes-mobile-section\">",
        renderFeatureHeader("local-models", "النماذج المحلية", "نزّل نموذج GGUF إلى مساحة التطبيق الخاصة وشغّله على الجهاز بمحرك llama.cpp، دون إرسال المحادثات إلى API خارجي."),
        "<div class=\"hermes-mobile-panel\"><h2>Qwen2.5 0.5B Instruct · Q4_K_M</h2><p>الحجم: 397,808,192 بايت (نحو 379 MiB) · الترخيص: Apache-2.0 · المعمارية: ARM64. لا تُضمّن أوزان النموذج داخل APK.</p><p>" + escapeHtml(downloadLabel) + " · " + escapeHtml(formatBytes(downloaded)) + (total ? " / " + escapeHtml(formatBytes(total)) : "") + "</p><div style=\"height:8px;background:#e2e8f0;border-radius:9px;overflow:hidden\"><div style=\"height:100%;width:" + Math.max(0, Math.min(100, pct)) + "% ;background:#2563eb\"></div></div><p>حالة المحرك: " + escapeHtml(runtimeLabel) + (data.endpoint ? " · " + escapeHtml(data.endpoint) : "") + "</p>" + (message ? "<p role=\"alert\">" + escapeHtml(message) + "</p>" : "") + "<div class=\"hermes-mobile-form-actions\">" + (downloadState === "downloading" ? "<button class=\"secondary\" type=\"button\" data-action=\"local-model-cancel\">إيقاف التنزيل</button>" : "<button type=\"button\" data-action=\"local-model-download\">" + (downloadState === "downloaded" ? "إعادة تنزيل النموذج" : "تنزيل / استئناف") + "</button>") + (downloadState === "downloaded" && !active ? "<button type=\"button\" data-action=\"local-model-start\">تشغيل النموذج</button>" : "") + (active || runtime === "loading" ? "<button class=\"secondary\" type=\"button\" data-action=\"local-model-stop\">إيقاف المحرك</button>" : "") + (downloadState !== "not_downloaded" && !active && runtime !== "loading" ? "<button class=\"secondary\" type=\"button\" data-action=\"local-model-delete\">حذف النموذج</button>" : "") + "<button class=\"secondary\" type=\"button\" data-action=\"local-model-refresh\">تحديث الحالة</button></div></div>",
        "<div class=\"hermes-mobile-panel\"><h2>التحقق والخصوصية</h2><p>يُثبت التنزيل على نسخة مصدر محددة وبصمة SHA-256. لا يبدأ Hermes استخدام هذا المزود إلا بعد تشغيل المحرك؛ عند إيقافه تُستعاد إعدادات المزود السابقة. يلزم نحو 650 MiB من الذاكرة الحرة للتشغيل؛ وقد يعتمد الأداء على الجهاز.</p></div>",
        "</div>"
      ].join("");
    }

    function renderGitHubPage() {
      if (!githubState.status) githubState.status = callHermesAndroidJson("getGitHubStatus");
      var connected = Boolean(githubState.status && githubState.status.connected);
      var selected = githubState.repositories.filter(function (repo) { return repo.full_name === githubState.selectedRepo; })[0];
      var repoOptions = githubState.repositories.map(function (repo) {
        return "<option value=\"" + escapeHtml(repo.full_name) + "\"" + (repo.full_name === githubState.selectedRepo ? " selected" : "") + ">" + escapeHtml(repo.full_name + (repo.private ? " · خاص" : "")) + "</option>";
      }).join("");
      var fileRows = githubState.files.slice(0, 250).map(function (file) {
        return "<div class=\"hermes-mobile-row\"><div class=\"hermes-mobile-row-main\"><strong>" + escapeHtml(file.path) + "</strong><span>" + escapeHtml(formatBytes(file.size || 0)) + " · " + escapeHtml(file.mode || "100644") + "</span></div><div class=\"hermes-mobile-row-actions\"><button class=\"secondary\" type=\"button\" data-action=\"github-read-file\" data-path=\"" + escapeHtml(file.path) + "\">قراءة</button></div></div>";
      }).join("");
      var fileContent = Object.keys(githubState.fileContents).map(function (path) {
        return "<details open><summary>" + escapeHtml(path) + "</summary><pre style=\"white-space:pre-wrap;overflow:auto;max-height:45vh\">" + escapeHtml(githubState.fileContents[path]) + "</pre></details>";
      }).join("");
      var proposalRows = githubState.proposals.map(function (proposal) {
        var changes = (proposal.changes || []).map(function (change) {
          return "<details><summary>" + escapeHtml((change.delete ? "حذف · " : "تغيير · ") + change.path) + "</summary><pre style=\"white-space:pre-wrap;overflow:auto;max-height:40vh\">" + escapeHtml(change.delete ? "سيُحذف هذا الملف." : change.content || "") + "</pre></details>";
        }).join("");
        var branchDetail = proposal.create_branch ? "فرع جديد من " + proposal.source_branch + " → " + proposal.branch : "الفرع " + proposal.branch;
        var workflowProposal = proposal.kind === "workflow_dispatch";
        var proposalDetail = workflowProposal ? (proposal.workflow_name + " · " + proposal.preview) : (branchDetail + " · " + (proposal.file_count || 0) + " ملف · " + proposal.commit_message);
        var approveLabel = workflowProposal ? "مراجعة ثم تشغيل الاختبارات" : "مراجعة ثم رفع";
        var inputPreview = workflowProposal && proposal.inputs ? "<pre>" + escapeHtml(JSON.stringify(proposal.inputs, null, 2)) + "</pre>" : "";
        return "<div class=\"hermes-mobile-panel\"><h2>" + escapeHtml(proposal.repository) + "</h2><p>" + escapeHtml(proposalDetail) + "</p>" + inputPreview + "<div>" + changes + "</div><div class=\"hermes-mobile-form-actions\"><button type=\"button\" data-action=\"github-approve\" data-id=\"" + escapeHtml(proposal.id) + "\">" + approveLabel + "</button><button class=\"secondary\" type=\"button\" data-action=\"github-discard\" data-id=\"" + escapeHtml(proposal.id) + "\">رفض المقترح</button></div></div>";
      }).join("");
      var runRows = githubState.runs.map(function (run) {
        return "<div class=\"hermes-mobile-row\"><div class=\"hermes-mobile-row-main\"><strong>" + escapeHtml(run.name || "GitHub Actions") + "</strong><span>" + escapeHtml((run.status || "") + (run.conclusion ? " · " + run.conclusion : "") + " · " + (run.head_branch || "")) + "</span></div></div>";
      }).join("");
      var workflowRows = githubState.workflows.map(function (workflow) {
        var dispatchButton = workflow.state === "active" ? "<button class=\"secondary\" type=\"button\" data-action=\"github-run-workflow\" data-workflow-id=\"" + escapeHtml(String(workflow.id)) + "\">إعداد طلب اختبار</button>" : "";
        return "<div class=\"hermes-mobile-row\"><div class=\"hermes-mobile-row-main\"><strong>" + escapeHtml(workflow.name || workflow.path) + "</strong><span>" + escapeHtml(workflow.path + " · " + workflow.state + " · #" + workflow.id) + "</span></div><div class=\"hermes-mobile-row-actions\">" + dispatchButton + "</div></div>";
      }).join("");
      return [
        "<div class=\"hermes-mobile-section\">",
        renderFeatureHeader("github", "GitHub", "استعرض مستودعاتك واقترح تغييرات أو تشغيل GitHub Actions. لا يُرفع شيء ولا يُشغّل اختبار قبل مراجعة المحتوى المقترح والفرع في نافذة Android والموافقة."),
        "<div class=\"hermes-mobile-panel\"><h2>الحساب</h2><p>" + escapeHtml(connected ? "متصل باسم " + (githubState.status.login || "حساب GitHub") : "غير متصل") + "</p>" + (connected ? "<p>الرمز محفوظ مشفرًا في Android Keystore ولا يُرسل إلى JavaScript أو يُكتب في السجلات.</p><div class=\"hermes-mobile-form-actions\"><button class=\"secondary\" type=\"button\" data-action=\"github-refresh\">تحديث المستودعات</button><button class=\"secondary\" type=\"button\" data-action=\"github-proposals-refresh\">مقترحات الوكيل</button><button class=\"secondary\" type=\"button\" data-action=\"github-disconnect\">فصل الحساب</button></div>" : "<div class=\"hermes-mobile-form\"><label>رمز وصول شخصي دقيق الصلاحيات (Fine-grained Personal Access Token)<input id=\"hermes-github-token\" type=\"password\" autocomplete=\"new-password\" placeholder=\"يُتحقق منه ثم يُحفظ مشفرًا فقط\"></label><p>أنشئ رمزًا محدودًا للمستودعات المطلوبة. امنحه صلاحية قراءة/كتابة Contents وقراءة Metadata. يلزم Actions: read لقراءة النتائج وActions: write لطلب تشغيل سير عمل بموافقتك. لا يرفع الوكيل تغييرات ولا يشغّل سير عمل دون موافقتك.</p><div class=\"hermes-mobile-form-actions\"><button type=\"button\" data-action=\"github-connect\">التحقق والربط</button></div></div>") + "</div>",
        (githubState.error ? "<div class=\"hermes-mobile-panel\" role=\"alert\"><p>" + escapeHtml(arabicErrorText(githubState.error, "تعذّر إكمال العملية عبر GitHub. تحقّق من الحساب والصلاحيات ثم أعد المحاولة.")) + "</p></div>" : ""),
        connected ? "<div class=\"hermes-mobile-panel\"><h2>المستودع</h2><div class=\"hermes-mobile-form\"><label>المستودعات<select id=\"hermes-github-repo\" data-action=\"github-repo-select\"><option value=\"\">اختر مستودعًا</option>" + repoOptions + "</select></label><label>الفرع / المصدر<input id=\"hermes-github-branch\" value=\"" + escapeHtml(githubState.branch || selected && selected.default_branch || "main") + "\" autocomplete=\"off\"></label><div class=\"hermes-mobile-form-actions\"><button type=\"button\" data-action=\"github-files\">استعراض الملفات</button><button class=\"secondary\" type=\"button\" data-action=\"github-runs\">نتائج الاختبارات</button></div></div><p>عند اختيار الفرع الافتراضي، يجهّز الوكيل فرع مراجعة منفصلًا؛ لا تعديل مباشر للفرع الافتراضي.</p></div>" : "",
        connected && githubState.files.length ? "<div class=\"hermes-mobile-panel\"><h2>الملفات (" + githubState.files.length + ")</h2><div class=\"hermes-mobile-list\">" + fileRows + "</div>" + fileContent + "</div>" : "",
        connected ? "<div class=\"hermes-mobile-panel\"><h2>GitHub Actions / الاختبارات</h2><div class=\"hermes-mobile-form-actions\"><button class=\"secondary\" type=\"button\" data-action=\"github-workflows\">عرض workflows</button><button class=\"secondary\" type=\"button\" data-action=\"github-runs\">تحديث النتائج</button></div>" + (workflowRows ? "<div class=\"hermes-mobile-list\">" + workflowRows + "</div>" : "<p>اعرض workflows المتاحة لطلب تشغيل اختبار.</p>") + (runRows || "<p>لا توجد نتائج محمّلة بعد؛ اختر مستودعًا وفرعًا ثم حدّث النتائج.</p>") + "</div>" : "",
        connected ? "<h2>مقترحات التغييرات (" + githubState.proposals.length + ")</h2>" + (proposalRows || "<div class=\"hermes-mobile-panel\"><p>لا توجد مقترحات معلقة.</p></div>") : "",
        "<div class=\"hermes-mobile-panel\"><p>حدود هذا الإصدار: قراءة ملفات نصية حتى 2 MiB، ومقترح حتى 30 ملفًا و5 MiB. نتيجة Actions تُقرأ بعد إتاحتها من GitHub؛ لا يُدّعى نجاح اختبار قبل ظهور نتيجته.</p></div>",
        "</div>"
      ].join("");
    }

    function renderPrivacyPage() {
      return [
        "<div class=\"hermes-mobile-section\">",
        "<div class=\"hermes-mobile-panel\"><h2>الخصوصية والبيانات</h2><p>ملخص واضح لمواضع حفظ بياناتك وما يحدث عند إرسال رسالة أو مرفق.</p><div class=\"hermes-mobile-form-actions\"><button class=\"secondary\" type=\"button\" data-action=\"view\" data-view=\"settings\">العودة إلى الإعدادات</button></div></div>",
        "<div class=\"hermes-mobile-panel\"><h2>الجلسات على الهاتف</h2><p>يحفظ Hermes سجل الجلسات محليًا داخل تخزين التطبيق على الهاتف. يمكنك حذف جلسة من قائمة المحادثات؛ أما النسخ التي أُرسلت إلى خدمة أو مزوّد خارجي فتخضع لإعداداته وسياسة الاحتفاظ لديه.</p></div>",
        "<div class=\"hermes-mobile-panel\"><h2>إرسال الرسائل والمرفقات</h2><p>قبل الإرسال إلى عنوان HTTPS خارجي، يعرض التطبيق اسم المزوّد ويطلب موافقتك. إذا وافقت، يُرسل نص الرسالة ومراجع الملفات التي أرفقتها إلى المزوّد لمعالجتها؛ لا تُرسل الرسالة عند رفض الموافقة.</p></div>",
        "<div class=\"hermes-mobile-panel\"><h2>المفاتيح والتكاملات</h2><p>يُرسل مفتاح API إلى خدمة Hermes المحلية لإعداده، ولا يُحفظ كنص في واجهة الهاتف. يُحفظ رمز GitHub مشفّرًا في Android Keystore ولا يُمرّر إلى JavaScript.</p></div>",
        "</div>"
      ].join("");
    }

    function renderFeaturePage(viewName) {
      var info = FEATURE_INFO[viewName] || ["واجهة الميزة", "سيُربط هذا الخيار لاحقًا بخدمة Hermes المحلية."];
      if (viewName === "privacy") {
        return renderPrivacyPage();
      }
      if (viewName === "resources") {
        return renderResourcesPage();
      }
      if (viewName === "automation") {
        return renderAutomationPage();
      }
      if (viewName === "integrations") {
        return renderIntegrationsPage();
      }
      if (viewName === "remote") {
        return renderRemotePage();
      }
      if (viewName === "memory") {
        return renderMemoryPage();
      }
      if (viewName === "skills") {
        return renderSkillsPage();
      }
      if (viewName === "persona") {
        return renderPersonaPage();
      }
      if (viewName === "tools") {
        return renderToolsPage();
      }
      if (viewName === "mcp") {
        return renderMcpPage();
      }
      if (viewName === "usage") {
        return renderUsagePage();
      }
      if (viewName === "appearance") {
        return renderAppearancePage();
      }
      if (viewName === "language") {
        return renderLanguagePage();
      }
      if (viewName === "phone-control") {
        return renderPhoneControlPage();
      }
      if (viewName === "local-models") {
        return renderLocalModelsPage();
      }
      if (viewName === "github") {
        return renderGitHubPage();
      }
      return [
        "<div class=\"hermes-mobile-section\">",
        "<div class=\"hermes-mobile-panel\"><h2>" + escapeHtml(info[0]) + "</h2><p>" + escapeHtml(info[1]) + "</p></div>",
        "<div class=\"hermes-mobile-panel\"><p>هذا الخيار محفوظ ضمن القسم المناسب. ستُربط وظائفه تدريجيًا بخدمة Hermes الفعلية؛ وللوصول إلى الميزات الكاملة، افتح وضع الطرفية من القائمة الجانبية.</p></div>",
        "</div>"
      ].join("");
    }

    function renderView() {
      body.classList.toggle("has-messages", currentView === "chat" && messages.length > 0);
      var sessionPreview = messages.length ? messages[messages.length - 1].content : "لا توجد محادثات بعد";
      var modelOptions = MODEL_PRESETS.map(function (preset, index) {
        var selected = preset.model && preset.model === config.model ? " selected" : "";
        if (!selected && !preset.model && !MODEL_PRESETS.some(function (item) { return item.model === config.model; })) {
          selected = " selected";
        }
        return "<option value=\"" + index + "\"" + selected + ">" + escapeHtml(preset.label) + "</option>";
      }).join("");
      if (currentView === "chat") {
        view.innerHTML = renderChat();
      } else if (currentView === "sessions") {
        view.innerHTML = [
          "<div class=\"hermes-mobile-section\"><div class=\"hermes-mobile-panel\"><h2>المحادثات</h2><p>إدارة محادثات الهاتف: إنشاء محادثة أو التبديل بينها أو حذفها أو مسح الحالية.</p></div>",
          "<div class=\"hermes-mobile-panel\"><div class=\"hermes-mobile-form-actions\"><button type=\"button\" data-action=\"new-session\">محادثة جديدة</button><button class=\"secondary\" type=\"button\" data-action=\"clear-session\">مسح الحالية</button></div></div>",
          "<div class=\"hermes-mobile-list\">",
          sessions.map(function (session) {
            var active = session.id === activeSessionId;
            var count = session.messages.length;
            var preview = count ? session.messages[session.messages.length - 1].content : "محادثة فارغة";
            return "<div class=\"hermes-mobile-row\"><div class=\"hermes-mobile-row-main\"><strong>" + escapeHtml((active ? "الحالية · " : "") + session.title) + "</strong><span>" + escapeHtml(count + " رسالة · " + preview) + "</span></div><div class=\"hermes-mobile-row-actions\"><button class=\"secondary\" type=\"button\" data-action=\"switch-session\" data-id=\"" + escapeHtml(session.id) + "\">فتح</button><button class=\"secondary\" type=\"button\" data-action=\"delete-session\" data-id=\"" + escapeHtml(session.id) + "\">حذف</button></div></div>";
          }).join(""),
          "</div></div>"
        ].join("");
      } else if (currentView === "models") {
        view.innerHTML = [
          "<div class=\"hermes-mobile-section hermes-mobile-models-view\"><div class=\"hermes-mobile-panel\"><h2>النماذج والاتصالات</h2><p>يحفظ Hermes المحلي إعداد النموذج والمفتاح. ترسل واجهة الهاتف الإعدادات إلى الخدمة ولا تحفظ مفتاح API كنص فيها.</p><div class=\"hermes-mobile-form-actions\"><button class=\"secondary\" type=\"button\" data-action=\"mobile-back\">العودة إلى المحادثة</button></div></div>",
          "<div class=\"hermes-mobile-panel hermes-mobile-model-card\"><div class=\"hermes-mobile-form\">",
          "  <label>إعداد جاهز للنموذج<select id=\"hermes-mobile-model-preset\" data-action=\"model-preset\"><option value=\"\">اختر إعدادًا</option>" + modelOptions + "</select></label>",
          "  <label>عنوان API<input id=\"hermes-mobile-model-endpoint\" type=\"url\" autocomplete=\"off\" value=\"" + escapeHtml(config.baseUrl || "") + "\"></label>",
          "  <label>اسم النموذج<input id=\"hermes-mobile-model-name\" type=\"text\" autocomplete=\"off\" value=\"" + escapeHtml(config.model || "") + "\"></label>",
          "  <label>مفتاح API<input id=\"hermes-mobile-model-key\" type=\"password\" autocomplete=\"off\" placeholder=\"يُحفظ المفتاح في خدمة Hermes المحلية\"></label>",
          "  <label>إعدادات متقدمة<textarea readonly>إعدادات البث ودرجة الحرارة وطول السياق وتعليمات النظام تُدار من إعدادات Hermes المتقدمة.</textarea></label>",
          "  <div class=\"hermes-mobile-form-actions\"><button class=\"secondary\" type=\"button\" data-action=\"model-test\">فحص الاتصال</button><button class=\"secondary\" type=\"button\" data-action=\"open-models\">الإعدادات المتقدمة</button><button type=\"button\" data-action=\"model-save\">حفظ</button></div>",
          "</div></div></div>"
        ].join("");
      } else if (currentView === "settings") {
        view.innerHTML = [
          "<div class=\"hermes-mobile-section\"><div class=\"hermes-mobile-settings-hero\"><h2>الإعدادات</h2><p>إدارة اتصال Hermes وبيئة العمل وقدرات الوكيل والتفضيلات.</p></div>",
          "<div class=\"hermes-mobile-panel hermes-mobile-community-card\"><h2>مجتمع Hermes</h2><p>أدلة الإعداد والأسئلة الشائعة وتحديثات تجربة الهاتف في مجتمع Hermes.</p><div class=\"hermes-mobile-form-actions\"><button type=\"button\" data-action=\"community\">زيارة المجتمع</button></div></div>",
          renderGroupedToolGrid(ALL_SETTINGS_TOOLS),
          "<div class=\"hermes-mobile-panel\"><h2>أدوات متقدمة</h2><p>للوصول إلى وظائف سطر الأوامر، افتح وضع الطرفية.</p><div class=\"hermes-mobile-form-actions\"><button class=\"secondary\" type=\"button\" data-action=\"terminal\">وضع الطرفية</button></div></div>",
          "</div>"
        ].join("");
      } else {
        try {
          view.innerHTML = renderFeaturePage(currentView);
        } catch (error) {
          var message = arabicErrorText(error, "حدث خطأ أثناء عرض الصفحة.");
          var title = FEATURE_LABELS[currentView] && FEATURE_LABELS[currentView][0] || "صفحة الميزة";
          view.innerHTML = [
            "<div class=\"hermes-mobile-section\">",
            "<div class=\"hermes-mobile-panel\"><h2>" + escapeHtml(title) + "</h2><p role=\"alert\">تعذّر عرض الصفحة. " + escapeHtml(message) + "</p></div>",
            "<div class=\"hermes-mobile-panel\"><div class=\"hermes-mobile-form-actions\"><button class=\"secondary\" type=\"button\" data-action=\"view\" data-view=\"settings\">العودة إلى الإعدادات</button><button class=\"secondary\" type=\"button\" data-action=\"feature-refresh\" data-view=\"" + escapeHtml(currentView) + "\">إعادة المحاولة</button></div></div>",
            "</div>"
          ].join("");
        }
      }
      refreshHeader();
      renderAttachments();
      if (currentView === "chat") {
        body.scrollTop = body.scrollHeight;
      }
    }

    function newSession() {
      persistActiveSession();
      closeMobileRpcListener("mobile new session");
      var session = createMobileSession([], "محادثة جديدة");
      sessions.unshift(session);
      activeSessionId = session.id;
      mobileRpcSessionId = "";
      messages = [];
      selectedFiles = [];
      saveMobileSessions(sessions);
      renderDrawerSessions();
      switchView("chat");
    }

    function switchSession(id) {
      persistActiveSession();
      var session = sessions.filter(function (item) { return item.id === id; })[0];
      if (!session) {
        return;
      }
      closeMobileRpcListener("mobile switch session");
      activeSessionId = session.id;
      mobileRpcSessionId = session.backendSessionId || "";
      messages = session.messages.slice(-40);
      selectedFiles = [];
      renderDrawerSessions();
      switchView("chat");
    }

    async function deleteSession(id) {
      var deleting = sessions.filter(function (session) { return session.id === id; })[0];
      if (!deleting) {
        return;
      }
      if (deleting.backendSessionId) {
        try {
          await requestDashboardJson("DELETE", "/api/sessions/" + encodeURIComponent(deleting.backendSessionId), null, true);
        } catch (error) {
          appendAssistant("تعذّر حذف الجلسة؛ احتفظنا بالمحادثة الحالية. " + arabicErrorText(error, "تحقّق من اتصال الخدمة المحلية."));
          return;
        }
      }
      if (activeSessionId === id) {
        closeMobileRpcListener("mobile delete session");
      }
      sessions = sessions.filter(function (session) { return session.id !== id; });
      if (!sessions.length) {
        sessions = [createMobileSession([], "محادثة جديدة")];
      }
      if (activeSessionId === id) {
        activeSessionId = sessions[0].id;
        mobileRpcSessionId = sessions[0].backendSessionId || "";
        messages = sessions[0].messages.slice(-40);
      }
      saveMobileSessions(sessions);
      renderDrawerSessions();
      renderView();
    }

    async function clearCurrentSession() {
      var session = activeSession();
      closeMobileRpcListener("mobile clear session");
      if (session.backendSessionId) {
        try {
          await requestDashboardJson("DELETE", "/api/sessions/" + encodeURIComponent(session.backendSessionId), null, true);
        } catch (error) {
          appendAssistant("تعذّر مسح الجلسة؛ احتفظنا بالمحادثة الحالية. " + arabicErrorText(error, "تحقّق من اتصال الخدمة المحلية."));
          return;
        }
      }
      mobileRpcSessionId = "";
      session.backendSessionId = "";
      messages = [];
      persistActiveSession();
      renderView();
    }

    function applyModelPreset(indexValue) {
      var preset = MODEL_PRESETS[Number(indexValue)];
      if (!preset) {
        return;
      }
      var endpoint = document.getElementById("hermes-mobile-model-endpoint");
      var model = document.getElementById("hermes-mobile-model-name");
      if (preset.baseUrl && endpoint) {
        endpoint.value = preset.baseUrl;
      }
      if (preset.model && model) {
        model.value = preset.model;
      }
    }

    refreshHeader();
    applyShellTheme(currentTheme);
    syncTtsButton();
    renderDrawerSessions();
    renderView();
    var drawerSearch = document.getElementById("hermes-mobile-drawer-search");
    if (drawerSearch) {
      drawerSearch.addEventListener("input", function () {
        renderDrawerSessions(drawerSearch.value);
      });
    }
    shell.addEventListener("click", async function (event) {
      var target = event.target && event.target.closest ? event.target.closest("[data-action]") : null;
      if (
        currentView === "models"
        && event.target
        && event.target.closest
        && !event.target.closest(".hermes-mobile-model-card")
        && !event.target.closest("[data-action='view']")
        && !event.target.closest("#hermes-mobile-top")
        && !event.target.closest("#hermes-mobile-bottom")
      ) {
        switchView("chat");
        return;
      }
      if (!target) {
        return;
      }
      var action = target.getAttribute("data-action");
      if (action === "open-drawer") {
        setDrawer(true);
      } else if (action === "close-drawer") {
        setDrawer(false);
      } else if (action === "view") {
        switchView(target.getAttribute("data-view") || "chat");
      } else if (action === "mobile-back") {
        handleMobileBack();
      } else if (action === "terminal") {
        openTerminalMode();
      } else if (action === "open-models") {
        openDashboardPath("/models?locale=ar");
      } else if (action === "feature-refresh") {
        var refreshView = target.getAttribute("data-view") || currentView;
        loadFeatureData(refreshView, { force: true });
      } else if (action === "feature-open-dashboard") {
        openDashboardPath(dashboardPathForFeature(target.getAttribute("data-view") || currentView));
      } else if (action === "resource-open-dir") {
        loadFeatureData("resources", { path: target.getAttribute("data-path") || "" });
      } else if (action === "resource-download") {
        try {
          var token = await getDashboardSessionToken();
          var base = embeddedDashboardBaseUrl || window.location.origin;
          var downloadUrl = base.replace(/\/+$/, "") + "/api/files/download?path=" + encodeURIComponent(target.getAttribute("data-path") || "") + "&token=" + encodeURIComponent(token || "");
          openExternalUrl(downloadUrl);
        } catch (error) {
          appendAssistant("تعذّر تنزيل المورد. " + arabicErrorText(error, "تحقّق من الاتصال ثم أعد المحاولة."));
        }
      } else if (action === "cron-trigger" || action === "cron-pause" || action === "cron-resume") {
        var jobId = target.getAttribute("data-job") || "";
        var profile = target.getAttribute("data-profile") || "";
        var cronPath = "/api/cron/jobs/" + encodeURIComponent(jobId) + "/" + action.replace("cron-", "");
        if (profile) {
          cronPath += "?profile=" + encodeURIComponent(profile);
        }
        try {
          await requestDashboardJson("POST", cronPath, {}, true);
          setTemporarySubtitle(action === "cron-trigger" ? "تم تشغيل المهمة" : "تم تحديث حالة المهمة");
          loadFeatureData("automation", { force: true });
        } catch (error) {
          appendAssistant("تعذّر تنفيذ إجراء المهمة المجدولة. " + arabicErrorText(error, "تحقّق من الاتصال ثم أعد المحاولة."));
        }
      } else if (action === "gateway-start" || action === "gateway-stop") {
        try {
          await requestDashboardJson("POST", action === "gateway-start" ? "/api/gateway/start" : "/api/gateway/stop", {}, true);
          setTemporarySubtitle(action === "gateway-start" ? "جارٍ تشغيل البوابة" : "جارٍ إيقاف البوابة");
          loadFeatureData("integrations", { force: true });
          loadFeatureData("remote", { force: true });
        } catch (error) {
          appendAssistant("تعذّر تنفيذ إجراء البوابة. " + arabicErrorText(error, "تحقّق من الاتصال ثم أعد المحاولة."));
        }
      } else if (action === "platform-toggle") {
        try {
          var togglePlatformId = target.getAttribute("data-platform") || "";
          var wasEnabled = target.getAttribute("data-enabled") === "true";
          var isConfigured = target.getAttribute("data-configured") === "true";
          var gatewayWasRunning = target.getAttribute("data-gateway-running") === "true";
          var nextEnabled = !wasEnabled;
          await requestDashboardJson("PUT", "/api/messaging/platforms/" + encodeURIComponent(togglePlatformId), { enabled: nextEnabled }, true);
          if ((nextEnabled && isConfigured) || (!nextEnabled && gatewayWasRunning)) {
            await requestDashboardJson("POST", "/api/gateway/restart", {}, true);
            appendAssistant((nextEnabled ? "تم تفعيل" : "تم تعطيل") + " الاتصال، ويجري الآن إعادة تشغيل البوابة.", { persist: false });
          } else if (nextEnabled) {
            appendAssistant("تم تفعيل الاتصال، لكن الإعداد غير مكتمل. أضف المعلومات المطلوبة من الإعدادات المتقدمة.", { persist: false });
          } else {
            appendAssistant("تم تعطيل الاتصال.", { persist: false });
          }
          setTemporarySubtitle(nextEnabled ? "تم تفعيل الاتصال" : "تم تعطيل الاتصال");
          loadFeatureData("integrations", { force: true });
          loadFeatureData("remote", { force: true });
        } catch (error) {
          appendAssistant("تعذّر تعديل حالة الاتصال. " + arabicErrorText(error, "تحقّق من الإعدادات ثم أعد المحاولة."));
        }
      } else if (action === "platform-test") {
        try {
          var platformId = target.getAttribute("data-platform") || "";
          var testResult = await requestDashboardJson("POST", "/api/messaging/platforms/" + encodeURIComponent(platformId) + "/test", {}, true);
          appendAssistant("نتيجة اختبار الاتصال: " + (testResult && testResult.ok ? "نجح الاختبار." : "لم ينجح الاختبار."));
          loadFeatureData("integrations", { force: true });
        } catch (error) {
          appendAssistant("تعذّر اختبار الاتصال. " + arabicErrorText(error, "تحقّق من الإعدادات ثم أعد المحاولة."));
        }
      } else if (action === "local-model-refresh" || action === "local-model-download" || action === "local-model-start" || action === "local-model-stop" || action === "local-model-delete" || action === "local-model-cancel") {
        localModelState.error = "";
        target.disabled = true;
        try {
          if (action === "local-model-download") {
            callHermesAndroidJson("downloadLocalModel", ["qwen2.5-0.5b-instruct-q4_k_m"]);
            localModelState.polling = true;
            var localPollStarted = Date.now();
            var localPoll = window.setInterval(function () {
              localModelState.data = callHermesAndroidJson("getLocalModelStatus");
              if (currentView === "local-models") renderView();
              var localDone = !localModelState.data || localModelState.data.download_state !== "downloading";
              if (localDone || Date.now() - localPollStarted > 45 * 60 * 1000) {
                window.clearInterval(localPoll);
                localModelState.polling = false;
              }
            }, 1200);
          } else if (action === "local-model-start") {
            callHermesAndroidJson("startLocalModel", ["qwen2.5-0.5b-instruct-q4_k_m"]);
            localModelState.polling = true;
            var localStartAt = Date.now();
            var modelPoll = window.setInterval(function () {
              localModelState.data = callHermesAndroidJson("getLocalModelStatus");
              if (currentView === "local-models") renderView();
              if (!localModelState.data || localModelState.data.runtime_state !== "loading" || Date.now() - localStartAt > 5 * 60 * 1000) {
                window.clearInterval(modelPoll);
                localModelState.polling = false;
              }
            }, 1200);
          } else if (action === "local-model-stop") {
            localModelState.data = callHermesAndroidJson("stopLocalModel");
          } else if (action === "local-model-delete") {
            localModelState.data = callHermesAndroidJson("deleteLocalModel", ["qwen2.5-0.5b-instruct-q4_k_m"]);
          } else if (action === "local-model-cancel") {
            localModelState.data = callHermesAndroidJson("cancelLocalModelDownload");
          } else {
            localModelState.data = callHermesAndroidJson("getLocalModelStatus");
          }
          await new Promise(function (resolve) { window.setTimeout(resolve, 80); });
          localModelState.data = callHermesAndroidJson("getLocalModelStatus");
        } catch (error) {
          localModelState.error = String(error && error.message || error);
        }
        renderView();
      } else if (action === "github-connect") {
        var tokenInput = document.getElementById("hermes-github-token");
        var githubToken = String(tokenInput && tokenInput.value || "").trim();
        if (!githubToken) {
          githubState.error = "أدخل رمز Fine-grained Personal Access Token أولًا.";
          renderView();
          return;
        }
        if (tokenInput) tokenInput.value = "";
        target.disabled = true;
        githubState.loading = true;
        githubState.error = "";
        renderView();
        await new Promise(function (resolve) { window.setTimeout(resolve, 50); });
        githubState.status = callHermesAndroidJson("connectGitHub", [githubToken]);
        githubToken = "";
        githubState.loading = false;
        if (!githubState.status || !githubState.status.ok) githubState.error = githubState.status && githubState.status.error || "تعذر ربط GitHub.";
        else {
          var afterConnect = callHermesAndroidJson("listGitHubRepositories");
          githubState.repositories = afterConnect && afterConnect.repositories || [];
          githubState.selectedRepo = githubState.repositories[0] && githubState.repositories[0].full_name || "";
          var selectedAfterConnect = githubState.repositories[0];
          githubState.branch = selectedAfterConnect && selectedAfterConnect.default_branch || "main";
        }
        renderView();
      } else if (action === "github-disconnect") {
        githubState.status = callHermesAndroidJson("disconnectGitHub");
        githubState.repositories = [];
        githubState.selectedRepo = "";
        githubState.files = [];
        githubState.fileContents = {};
        githubState.workflows = [];
        githubState.proposals = [];
        githubState.runs = [];
        githubState.error = "";
        renderView();
      } else if (action === "github-refresh") {
        target.disabled = true;
        githubState.loading = true;
        githubState.error = "";
        renderView();
        await new Promise(function (resolve) { window.setTimeout(resolve, 50); });
        var reposResult = callHermesAndroidJson("listGitHubRepositories");
        githubState.repositories = reposResult && reposResult.repositories || [];
        if (!reposResult || !reposResult.ok) githubState.error = reposResult && reposResult.error || "تعذر تحميل المستودعات.";
        if (!githubState.repositories.some(function (repo) { return repo.full_name === githubState.selectedRepo; })) {
          githubState.selectedRepo = githubState.repositories[0] && githubState.repositories[0].full_name || "";
        }
        var currentRepoInfo = githubState.repositories.filter(function (repo) { return repo.full_name === githubState.selectedRepo; })[0];
        if (!githubState.branch || currentRepoInfo && !githubState.repositories.some(function (repo) { return repo.full_name === githubState.selectedRepo && repo.default_branch === githubState.branch; })) {
          githubState.branch = currentRepoInfo && currentRepoInfo.default_branch || "main";
        }
        githubState.status = callHermesAndroidJson("getGitHubStatus");
        githubState.loading = false;
        renderView();
      } else if (action === "github-files") {
        githubState.selectedRepo = String((document.getElementById("hermes-github-repo") || {}).value || githubState.selectedRepo);
        githubState.branch = String((document.getElementById("hermes-github-branch") || {}).value || githubState.branch).trim();
        githubState.loading = true;
        githubState.error = "";
        renderView();
        await new Promise(function (resolve) { window.setTimeout(resolve, 50); });
        var treeResult = callHermesAndroidJson("listGitHubTree", [githubState.selectedRepo, githubState.branch]);
        githubState.files = treeResult && treeResult.files || [];
        githubState.loading = false;
        if (!treeResult || !treeResult.ok) githubState.error = treeResult && treeResult.error || "تعذر قراءة شجرة المستودع.";
        renderView();
      } else if (action === "github-read-file") {
        githubState.selectedRepo = String((document.getElementById("hermes-github-repo") || {}).value || githubState.selectedRepo);
        githubState.branch = String((document.getElementById("hermes-github-branch") || {}).value || githubState.branch).trim();
        var fileResult = callHermesAndroidJson("readGitHubFile", [githubState.selectedRepo, target.getAttribute("data-path") || "", githubState.branch]);
        if (!fileResult || !fileResult.ok) githubState.error = fileResult && fileResult.error || "تعذرت قراءة الملف.";
        else githubState.fileContents[fileResult.path] = fileResult.content;
        renderView();
      } else if (action === "github-proposals-refresh") {
        var proposalsResult = callHermesAndroidJson("listPendingGitHubProposals");
        githubState.proposals = proposalsResult && proposalsResult.proposals || [];
        githubState.error = proposalsResult && proposalsResult.ok ? "" : proposalsResult && proposalsResult.error || "تعذر تحميل المقترحات.";
        renderView();
      } else if (action === "github-approve") {
        target.disabled = true;
        await new Promise(function (resolve) { window.setTimeout(resolve, 50); });
        var approvalResult = callHermesAndroidJson("approveGitHubProposal", [target.getAttribute("data-id") || ""]);
        if (!approvalResult || !approvalResult.ok) githubState.error = approvalResult && approvalResult.error || "لم يكتمل الرفع.";
        else githubState.error = "نجح الإجراء: " + (approvalResult.html_url || approvalResult.message || "تم التنفيذ");
        var remainingProposals = callHermesAndroidJson("listPendingGitHubProposals");
        githubState.proposals = remainingProposals && remainingProposals.proposals || [];
        renderView();
      } else if (action === "github-discard") {
        var discardResult = callHermesAndroidJson("discardGitHubProposal", [target.getAttribute("data-id") || ""]);
        githubState.error = discardResult && discardResult.ok ? "تم رفض المقترح وحذفه محليًا؛ لم يُرفع أي تغيير." : discardResult && discardResult.error || "تعذر حذف المقترح.";
        var afterDiscard = callHermesAndroidJson("listPendingGitHubProposals");
        githubState.proposals = afterDiscard && afterDiscard.proposals || [];
        renderView();
      } else if (action === "github-runs") {
        githubState.selectedRepo = String((document.getElementById("hermes-github-repo") || {}).value || githubState.selectedRepo);
        githubState.branch = String((document.getElementById("hermes-github-branch") || {}).value || githubState.branch).trim();
        var runsResult = callHermesAndroidJson("listGitHubWorkflowRuns", [githubState.selectedRepo, githubState.branch]);
        githubState.runs = runsResult && runsResult.runs || [];
        githubState.error = runsResult && runsResult.ok ? "" : runsResult && runsResult.error || "تعذر قراءة نتائج Actions.";
        renderView();
      } else if (action === "github-workflows") {
        githubState.selectedRepo = String((document.getElementById("hermes-github-repo") || {}).value || githubState.selectedRepo);
        if (!githubState.selectedRepo) {
          githubState.error = "اختر مستودع GitHub أولًا.";
        } else {
          var workflowsResult = callHermesAndroidJson("listGitHubWorkflows", [githubState.selectedRepo]);
          githubState.workflows = workflowsResult && workflowsResult.workflows || [];
          githubState.error = workflowsResult && workflowsResult.ok ? "" : workflowsResult && workflowsResult.error || "تعذر قراءة workflows.";
        }
        renderView();
      } else if (action === "github-run-workflow") {
        githubState.selectedRepo = String((document.getElementById("hermes-github-repo") || {}).value || githubState.selectedRepo);
        githubState.branch = String((document.getElementById("hermes-github-branch") || {}).value || githubState.branch).trim();
        var workflowProposalResult = callHermesAndroidJson("proposeGitHubWorkflowRun", [githubState.selectedRepo, target.getAttribute("data-workflow-id") || "", githubState.branch, "{}"]);
        if (!workflowProposalResult || !workflowProposalResult.ok) {
          githubState.error = workflowProposalResult && workflowProposalResult.error || "تعذر إعداد طلب الاختبار.";
        } else {
          var workflowProposals = callHermesAndroidJson("listPendingGitHubProposals");
          githubState.proposals = workflowProposals && workflowProposals.proposals || [];
          githubState.error = "أُعدّ طلب تشغيل workflow ولم يُرسل بعد؛ راجعه ثم وافق داخل التطبيق.";
        }
        renderView();
      } else if (action === "adb-open-developer") {
        if (!callHermesAndroidBoolean("openDeveloperOptions")) {
          androidAdbState.error = "تعذّر فتح خيارات المطوّر مباشرةً؛ افتحها يدويًا من إعدادات النظام.";
          renderView();
        }
      } else if (action === "adb-open-wireless") {
        if (!callHermesAndroidBoolean("openWirelessDebuggingSettings")) {
          androidAdbState.error = "تعذّر فتح التصحيح اللاسلكي مباشرةً؛ افتحه يدويًا من خيارات المطوّر.";
          renderView();
        }
      } else if (action === "adb-refresh") {
        refreshAndroidAdbStatus();
      } else if (action === "adb-pair") {
        var pairEndpoint = String((document.getElementById("hermes-mobile-adb-pair-endpoint") || {}).value || "").trim();
        var pairParts = pairEndpoint.match(/^(.+):([0-9]+)$/);
        var pairHost = pairParts ? pairParts[1].trim() : "";
        var pairPort = pairParts ? Number(pairParts[2]) : 0;
        var pairCode = String((document.getElementById("hermes-mobile-adb-pair-code") || {}).value || "").trim();
        if (!pairPort || !/^\d{6}$/.test(pairCode)) {
          androidAdbState.error = "أدخل منفذ الاقتران والرمز المكوّن من 6 أرقام الظاهرين في نافذة الاقتران.";
          renderView();
          return;
        }
        target.disabled = true;
        target.textContent = "جارٍ الاقتران...";
        await new Promise(function (resolve) { window.setTimeout(resolve, 60); });
        var pairResult = callHermesAndroidJson("pairAndroidAdb", [pairHost, pairPort, pairCode]);
        androidAdbState.error = pairResult.ok ? "" : (pairResult.error || pairResult.output || "تعذّر الاقتران");
        androidAdbState.message = pairResult.ok ? "تم الاقتران. ارجع إلى صفحة التصحيح اللاسلكي وأدخل عنوان الاتصال ومنفذه." : "";
        renderView();
      } else if (action === "adb-connect") {
        var adbEndpoint = String((document.getElementById("hermes-mobile-adb-endpoint") || {}).value || "").trim();
        var adbParts = adbEndpoint.match(/^(.+):([0-9]+)$/);
        var adbHost = adbParts ? adbParts[1].trim() : "";
        var adbPort = adbParts ? Number(adbParts[2]) : 0;
        if (!adbHost || !adbPort) {
          androidAdbState.error = "أدخل عنوان IP ومنفذ الاتصال الظاهرين في صفحة التصحيح اللاسلكي.";
          renderView();
          return;
        }
        try {
          localStorage.setItem("hermes.mobile.adb.host", adbHost);
          localStorage.setItem("hermes.mobile.adb.port", String(adbPort));
        } catch (error) {
          // ignore storage failures
        }
        target.disabled = true;
        target.textContent = "جارٍ الاتصال...";
        await new Promise(function (resolve) { window.setTimeout(resolve, 60); });
        var connectResult = callHermesAndroidJson("connectAndroidAdb", [adbHost, adbPort]);
        androidAdbState.error = connectResult.connected ? "" : (connectResult.error || connectResult.output || "تعذّر الاتصال");
        androidAdbState.message = connectResult.connected ? "تم الاتصال؛ أصبح Hermes قادرًا على التحكم بالهاتف عبر ADB." : "";
        androidAdbState.data = callHermesAndroidJson("getAndroidAdbStatus");
        renderView();
      } else if (action === "adb-test") {
        var devices = androidAdbState.data && androidAdbState.data.devices || [];
        var serial = devices.length ? devices[0].serial : "";
        if (!serial) {
          androidAdbState.error = "لم يُعثر على جهاز متصل. أكمِل الاقتران والاتصال أولًا.";
          renderView();
          return;
        }
        target.disabled = true;
        target.textContent = "جارٍ اختبار التحكم...";
        await new Promise(function (resolve) { window.setTimeout(resolve, 60); });
        var testAdbResult = callHermesAndroidJson("runAndroidAdbShell", [serial, "getprop ro.product.model"]);
        androidAdbState.error = testAdbResult.ok ? "" : (testAdbResult.error || testAdbResult.output || "تعذّر اختبار التحكم");
        androidAdbState.message = testAdbResult.ok ? "نجح اختبار التحكم؛ طراز الجهاز: " + String(testAdbResult.output || "Android") : "";
        renderView();
      } else if (action === "language-set") {
        var requestedLocale = target.getAttribute("data-locale");
        currentLocale = requestedLocale === "en" ? "en" : requestedLocale === "zh" ? "zh" : "ar";
        try {
          localStorage.setItem("hermes.mobile.locale", currentLocale);
          localStorage.setItem("hermes.desktop.locale", currentLocale);
          localStorage.setItem("hermes-locale", currentLocale);
        } catch (error) {
          // ignore storage failures
        }
        document.documentElement.lang = currentLocale === "en" ? "en" : currentLocale === "zh" ? "zh-CN" : "ar";
        setTemporarySubtitle(currentLocale === "en" ? "Language: English" : currentLocale === "zh" ? "语言：简体中文" : "اللغة: العربية");
        renderView();
      } else if (action === "appearance-mobile-theme") {
        applyShellTheme(target.getAttribute("data-theme") === "dark" ? "dark" : "light");
        renderView();
      } else if (action === "appearance-dashboard-theme") {
        try {
          await requestDashboardJson("PUT", "/api/dashboard/theme", { name: target.getAttribute("data-theme") || "default" }, true);
          setTemporarySubtitle("تم تحديث سمة لوحة التحكم.");
          loadFeatureData("appearance", { force: true });
        } catch (error) {
          appendAssistant("تعذّر تحديث السمة. " + arabicErrorText(error, "تحقّق من اتصال الخدمة ثم أعد المحاولة."));
        }
      } else if (action === "appearance-font") {
        try {
          await requestDashboardJson("PUT", "/api/dashboard/font", { font: target.getAttribute("data-font") || "theme" }, true);
          setTemporarySubtitle("تم تحديث الخط.");
          loadFeatureData("appearance", { force: true });
        } catch (error) {
          appendAssistant("تعذّر تحديث الخط. " + arabicErrorText(error, "تحقّق من اتصال الخدمة ثم أعد المحاولة."));
        }
      } else if (action === "theme") {
        applyShellTheme(currentTheme === "dark" ? "light" : "dark");
      } else if (action === "suggest") {
        input.value = target.getAttribute("data-prompt") || "";
        switchView("chat");
        input.focus();
      } else if (action === "send") {
        submitMessage();
      } else if (action === "community") {
        setDrawer(false);
        openCommunityDialog();
      } else if (action === "speak") {
        toggleTts();
      } else if (action === "status") {
        var result = runEmbeddedAgentCommand("diagnose");
        appendAssistant(formatEmbeddedStatus(result.status || result));
      } else if (action === "clear-session") {
        await clearCurrentSession();
      } else if (action === "new-session") {
        newSession();
      } else if (action === "switch-session") {
        switchSession(target.getAttribute("data-id") || "");
      } else if (action === "delete-session") {
        await deleteSession(target.getAttribute("data-id") || "");
      } else if (action === "attachment-menu") {
        setAttachmentMenu(Boolean(attachmentActions && attachmentActions.hidden));
      } else if (action === "close-attachment-menu") {
        setAttachmentMenu(false);
      } else if (action === "capture-photo") {
        setAttachmentMenu(false);
        target.disabled = true;
        try {
          var photoPath = await window.hermesDesktop.capturePhoto(120000);
          if (photoPath) {
            if (selectedFiles.indexOf(photoPath) === -1) selectedFiles.push(photoPath);
            renderAttachments();
            setTemporarySubtitle("أُرفقت الصورة بالمحادثة.");
          }
        } catch (error) {
          var cameraError = String(error && error.message || error);
          logMobileEvent("camera-capture-failed", { error: cameraError });
          setTemporarySubtitle(cameraError === "أُلغي التقاط الصورة." ? "أُلغيت عملية التصوير." : "تعذر التقاط الصورة. تحقق من توفر تطبيق كاميرا ثم حاول مجددًا.");
        } finally {
          target.disabled = false;
        }
      } else if (action === "voice-input") {
        setAttachmentMenu(false);
        if (!window.HermesAndroid || typeof window.HermesAndroid.recordSpeechText !== "function") {
          setTemporarySubtitle("الإملاء الصوتي غير متاح على هذا الجهاز.");
          return;
        }
        target.disabled = true;
        target.classList.add("recording");
        setTemporarySubtitle("جارٍ الاستماع باللغة العربية…");
        try {
          var speechResult = JSON.parse(window.HermesAndroid.recordSpeechText(JSON.stringify({ language: "ar-SA", prompt: "تحدث الآن" }), 60000));
          if (!speechResult.ok) throw new Error(speechResult.error || "speech_recognition_failed");
          var spokenText = String(speechResult.text || "").trim();
          if (!spokenText) {
            setTemporarySubtitle("لم يُلتقط كلام واضح؛ حاول مرة أخرى.");
          } else {
            var existingText = String(input.value || "").trim();
            input.value = existingText ? existingText + " " + spokenText : spokenText;
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.focus();
            setTemporarySubtitle("أُضيف النص الصوتي إلى الرسالة.");
          }
        } catch (error) {
          logMobileEvent("voice-input-failed", { error: String(error && error.message || error) });
          setTemporarySubtitle("تعذر تحويل الصوت إلى نص. تحقق من إذن الميكروفون وخدمة التعرف على الكلام.");
        } finally {
          target.disabled = false;
          target.classList.remove("recording");
        }
      } else if (action === "remove-attachment") {
        selectedFiles.splice(Number(target.getAttribute("data-index") || 0), 1);
        renderAttachments();
      } else if (action === "pick-file") {
        setAttachmentMenu(false);
        try {
          var pickedPaths = await window.hermesDesktop.selectPaths({ multiple: true, title: "اختيار ملفات" });
          (pickedPaths || []).forEach(function (path) {
            if (path && selectedFiles.indexOf(path) === -1) selectedFiles.push(path);
          });
          currentView = "chat";
          renderView();
        } catch (error) {
          logMobileEvent("pick-file-failed", { error: String(error && error.message || error) });
          setTemporarySubtitle("تعذّر اختيار الملفات. أعد المحاولة.");
        }
      } else if (action === "model-save") {
        var saveButton = target;
        var previousLabel = saveButton.textContent;
        saveButton.disabled = true;
        saveButton.textContent = "جارٍ الحفظ";
        var apiKeyInput = document.getElementById("hermes-mobile-model-key");
        config = {
          apiKey: "",
          baseUrl: normalizeOpenAICompatibleBaseUrl(document.getElementById("hermes-mobile-model-endpoint").value),
          model: document.getElementById("hermes-mobile-model-name").value.trim()
        };
        try {
          if (!config.baseUrl || !config.model) {
            throw new Error("أدخل عنوان API واسم النموذج أولًا.");
          }
          var apiKeyValue = apiKeyInput ? apiKeyInput.value.trim() : "";
          if (!modelStatus.hasApiKey && !apiKeyValue) {
            throw new Error("أدخل مفتاح API.");
          }
          await saveModelToBackend(config, apiKeyValue);
          if (apiKeyInput) {
            apiKeyInput.value = "";
          }
          saveMobileChatConfig(config);
          modelStatus = { checked: false, hasApiKey: false, model: config.model || "" };
          await refreshModelStatus();
          appendAssistant("حُفظت إعدادات النموذج. أُرسل المفتاح إلى خدمة Hermes المحلية، ولا تحفظ الواجهة نسخة صريحة منه. ستستخدم المحادثات الجديدة هذا الإعداد.");
        } catch (error) {
          appendAssistant("تعذّر حفظ إعدادات النموذج. " + arabicErrorText(error, "تحقّق من عنوان API ومفتاح API ثم أعد المحاولة."));
          refreshHeader();
        } finally {
          saveButton.disabled = false;
          saveButton.textContent = previousLabel || "حفظ";
        }
      } else if (action === "model-test") {
        var diagnoseResult = runEmbeddedAgentCommand("diagnose");
        await refreshModelStatus();
        var statusText = formatEmbeddedStatus(diagnoseResult.status || diagnoseResult);
        statusText += "\nإعداد النموذج: " + (modelStatus.hasApiKey ? "مكتمل" : "غير مكتمل");
        if (modelStatus.model) {
          statusText += "\nالنموذج الحالي: " + modelStatus.model;
        }
        appendAssistant(statusText);
      } else if (action === "tool") {
        switchView(target.getAttribute("data-tool") || "settings");
      }
    });
    shell.addEventListener("change", function (event) {
      var target = event.target && event.target.closest ? event.target.closest("[data-action]") : null;
      if (!target) {
        return;
      }
      if (target.getAttribute("data-action") === "model-preset") {
        applyModelPreset(target.value);
      } else if (target.getAttribute("data-action") === "github-repo-select") {
        githubState.selectedRepo = target.value || "";
        var chosenRepo = githubState.repositories.filter(function (repo) { return repo.full_name === githubState.selectedRepo; })[0];
        githubState.branch = chosenRepo && chosenRepo.default_branch || "main";
        githubState.files = [];
        githubState.fileContents = {};
        githubState.workflows = [];
        githubState.runs = [];
        renderView();
      }
    });
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submitMessage();
      }
    });
    window.setTimeout(function () {
      var progress = document.getElementById("hermes-mobile-progress");
      if (progress) {
        progress.hidden = true;
      }
      refreshModelStatus();
      try {
        localStorage.setItem(MOBILE_READY_KEY, "1");
      } catch (error) {
        // ignore
      }
    }, localStorage.getItem(MOBILE_READY_KEY) ? 600 : 1800);
  }

  function updateAndroidBootOverlay(message, done, error, options) {
    ensureAndroidBootOverlay();
    var overlay = document.getElementById("hermes-android-boot-overlay");
    var text = document.getElementById("hermes-android-boot-text");
    var title = document.getElementById("hermes-android-boot-title");
    var actions = document.getElementById("hermes-android-boot-actions");
    var primary = document.getElementById("hermes-android-boot-primary");
    var secondary = document.getElementById("hermes-android-boot-secondary");
    var note = document.getElementById("hermes-android-boot-note");
    var bar = document.getElementById("hermes-android-boot-bar");
    var log = document.getElementById("hermes-android-boot-log");
    var statusGrid = document.getElementById("hermes-android-boot-status");
    var opts = options || {};
    if (title && opts.title) {
      title.textContent = opts.title;
    }
    if (text) {
      text.textContent = message || (error ? "فشل بدء التشغيل. أعد فتح التطبيق." : "جارٍ الاتصال بالخدمة المحلية...");
      text.style.color = error ? "#b91c1c" : "#6b7280";
    }
    if (note) {
      note.textContent = opts.note || "";
    }
    if (bar) {
      bar.hidden = Boolean(opts.hideProgress);
    }
    if (statusGrid) {
      if (Array.isArray(opts.statusItems) && opts.statusItems.length) {
        statusGrid.innerHTML = opts.statusItems.map(function (item) {
          return "<div><span>" + String(item.label || "") + "</span><strong>" + String(item.value || "") + "</strong></div>";
        }).join("");
        statusGrid.hidden = false;
      } else {
        statusGrid.hidden = true;
        statusGrid.innerHTML = "";
      }
    }
    if (log) {
      if (opts.logText) {
        log.textContent = opts.logText;
        log.hidden = false;
        log.scrollTop = log.scrollHeight;
      } else if (opts.hideLog) {
        log.hidden = true;
        log.textContent = "";
      }
    }
    if (actions) {
      actions.hidden = !opts.actions;
    }
    if (primary && opts.primaryText) {
      primary.textContent = opts.primaryText;
      primary.onclick = opts.primaryAction || null;
    }
    if (secondary && opts.secondaryText) {
      secondary.textContent = opts.secondaryText;
      secondary.onclick = opts.secondaryAction || null;
      secondary.hidden = false;
    } else if (secondary) {
      secondary.hidden = true;
    }
    if (overlay && done) {
      overlay.hidden = true;
    }
  }

  function on(name, callback) {
    if (!listeners[name]) {
      listeners[name] = [];
    }
    listeners[name].push(callback);
    return function () {
      listeners[name] = listeners[name].filter(function (item) {
        return item !== callback;
      });
    };
  }

  function startAndroidBootGate() {
    ensureAndroidBootOverlay();
    try {
      updateAndroidBootOverlay("جارٍ تشغيل خدمة Hermes المحلية...", false, false, {
        hideProgress: false,
        title: "جارٍ تشغيل Hermes"
      });
      var startResult = startEmbeddedAgent();
      if (!startResult || !startResult.running) {
        updateAndroidBootOverlay("تعذّر بدء خدمة Hermes المحلية. تحقّق من حالة الخلفية وأعد المحاولة قبل المتابعة.", false, true, {
          actions: true,
          hideProgress: true,
          logText: formatEmbeddedStatus(startResult),
          primaryAction: startAndroidBootGate,
          primaryText: "إعادة محاولة التشغيل",
          statusItems: startResult ? [
            { label: "الخلفية", value: startResult.running ? "قيد التشغيل" : "متوقفة" },
            { label: "المنفذ", value: startResult.port || "9129" },
            { label: "الوضع", value: "الهاتف" }
          ] : null,
          title: "فشل بدء الخدمة"
        });
        emit("bootProgress", bootProgress("تعذّر تشغيل خدمة Hermes المحلية.", 100, false, startResult && startResult.error));
        return;
      }
      rememberEmbeddedDashboard(startResult);
      updateAndroidBootOverlay("بدأت خدمة Hermes المحلية؛ جارٍ فتح لوحة التحكم...", false, false, {
        hideProgress: false,
        statusItems: [
          { label: "الخلفية", value: "قيد التشغيل" },
          { label: "المنفذ", value: startResult.port || "9129" },
          { label: "الإصدار", value: startResult.api_status && startResult.api_status.version || "Hermes" }
        ],
        title: "Hermes جاهز"
      });
      emit("bootProgress", bootProgress("خدمة Hermes المحلية جاهزة", 100, false));
      window.setTimeout(function () {
        showEmbeddedLiteMode("Hermes جاهز");
      }, 250);
    } catch (error) {
      logMobileEvent("mobile-shell-start-failed", { error: String(error && error.message || error) });
      updateAndroidBootOverlay("جارٍ تجهيز واجهة Hermes؛ أعد المحاولة بعد قليل.", false, true, {
        actions: true,
        hideProgress: true,
        primaryAction: function () { window.location.reload(); },
        primaryText: "إعادة الفتح",
        title: "فشل التشغيل"
      });
    }
  }

  function connection() {
    return {
      authMode: "none",
      baseUrl: "",
      isFullscreen: false,
      logs: [],
      mode: "embedded",
      nativeOverlayWidth: 0,
      source: "android",
      token: "",
      windowButtonPosition: null,
      wsUrl: ""
    };
  }

  async function api(request) {
    if (request && request.path === "/api/config" && (!request.method || request.method === "GET")) {
      return { display: { language: currentLocale } };
    }
    return Promise.reject(new Error("يستخدم إصدار Android الحالي وظائف الهاتف المضمنة في APK."));
  }

  function unsupportedOk() {
    return Promise.resolve({ ok: false, error: "unsupported-on-android" });
  }

  function composerInsert(text, mode) {
    var value = String(text || "").trim();
    if (!value) {
      return false;
    }
    try {
      window.dispatchEvent(new CustomEvent("hermes:composer-insert", {
        detail: { mode: mode || "block", target: "main", text: value }
      }));
      window.dispatchEvent(new CustomEvent("hermes:composer-focus", {
        detail: { target: "main" }
      }));
      return true;
    } catch (error) {
      logMobileEvent("composer-insert-event-failed", { error: String(error && error.message || error) });
    }

    var editor = document.querySelector('[data-slot="composer-rich-input"]');
    if (!editor) {
      return false;
    }
    var base = (editor.innerText || "").trimEnd();
    var sep = base ? (mode === "inline" ? " " : "\n\n") : "";
    editor.textContent = base + sep + value;
    editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
    try {
      editor.focus({ preventScroll: true });
    } catch (error) {
      editor.focus();
    }
    return true;
  }

  function formatContextRef(path) {
    var value = String(path || "").trim();
    if (!value) {
      return "";
    }
    return "@file:`" + value.replace(/`/g, "\\`") + "`";
  }

  async function pickAndroidFilesIntoComposer() {
    logMobileEvent("pick-files-start");
    var paths = await window.hermesDesktop.selectPaths({ multiple: true, title: "اختيار ملف" });
    logMobileEvent("pick-files-result", { count: paths && paths.length || 0, paths: paths || [] });
    if (!paths || !paths.length) {
      return [];
    }
    composerInsert(paths.map(formatContextRef).filter(Boolean).join(" "), "inline");
    return paths;
  }

  function focusComposerAndShowKeyboard() {
    var editor = document.querySelector('[data-slot="composer-rich-input"]');
    if (editor) {
      try {
        editor.focus({ preventScroll: true });
      } catch (error) {
        editor.focus();
      }
    }
    if (window.HermesAndroid && typeof window.HermesAndroid.showSoftKeyboard === "function") {
      window.setTimeout(function () {
        window.HermesAndroid.showSoftKeyboard();
      }, 40);
    }
    window.dispatchEvent(new CustomEvent("hermes:composer-focus", {
      detail: { target: "main" }
    }));
    logMobileEvent("show-keyboard-for-system-dictation");
  }

  function installAndroidComposerClickFallbacks() {
    if (window.__hermesAndroidComposerFallbacksInstalled) {
      return;
    }
    window.__hermesAndroidComposerFallbacksInstalled = true;
    document.addEventListener("click", function (event) {
      var button = event.target && event.target.closest ? event.target.closest("button") : null;
      if (!button || !document.documentElement.classList.contains("hermes-android-app")) {
        return;
      }
      var composer = button.closest('[data-slot="composer-root"]');
      if (!composer) {
        return;
      }
      var label = [
        button.getAttribute("aria-label") || "",
        button.getAttribute("title") || "",
        button.innerText || "",
        button.textContent || ""
      ].join(" ").trim();
      var classText = button.className && typeof button.className === "string" ? button.className : "";
      var hasAddIcon =
        (
          Boolean(button.querySelector(".codicon-add,[class*='codicon-add']")) ||
          /(^|\s)(\+|add)(\s|$)|add context|添加上下文|添加附件|اختيار ملف|附件|文件/i.test(label)
        );

      if (hasAddIcon) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        void pickAndroidFilesIntoComposer().catch(function (error) {
          logMobileEvent("pick-files-failed", { error: String(error && error.message || error) });
        });
      }
    }, true);
  }

  function writeClipboardText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
    }
    return Promise.resolve(false);
  }

  function ensureMobileThemeStyle() {
    if (document.getElementById("hermes-mobile-theme-style")) {
      return;
    }
    var style = document.createElement("style");
    style.id = "hermes-mobile-theme-style";
    style.textContent = [
      "#hermes-mobile-theme-toggle{display:grid!important;position:fixed;right:8px;top:max(42px,calc(var(--hermes-safe-top,0px) + 6px));z-index:2147483601;width:30px;height:30px;min-height:30px!important;max-height:30px;padding:0;border:0;border-radius:7px;background:rgba(255,255,255,.48);color:#111827;font-size:16px;line-height:1;place-items:center;box-shadow:none;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);}",
      "html.hermes-android-app:not(.hermes-mobile-dark-mode),html.hermes-android-app:not(.hermes-mobile-dark-mode) body,html.hermes-android-app:not(.hermes-mobile-dark-mode) #root{color-scheme:light;background:#f7f8fa!important;color:#17171a!important;}",
      "html.hermes-mobile-dark-mode #hermes-mobile-theme-toggle{background:rgba(15,23,42,.72);color:#f8fafc;}",
      "html.hermes-mobile-dark-mode,html.hermes-mobile-dark-mode body{color-scheme:dark;background:#0b0f14!important;color:#e5e7eb!important;}",
      "html.hermes-mobile-dark-mode #root{background:#0b0f14!important;color:#e5e7eb!important;}",
      "html.hermes-mobile-dark-mode{--theme-foreground:#f3f4f6!important;--theme-primary:#8ab4ff!important;--theme-secondary:#172033!important;--theme-accent-soft:#1e293b!important;--theme-midground:#8ab4ff!important;--theme-background-seed:#0b0f14!important;--theme-sidebar-seed:#111827!important;--theme-card-seed:#111827!important;--theme-elevated-seed:#151c29!important;--theme-bubble-seed:#182235!important;--theme-neutral-chrome:#0b0f14!important;--theme-neutral-sidebar:#111827!important;--theme-neutral-card:#151c29!important;--ui-bg-input:#111827!important;--ui-inline-code-background:#ffffff17!important;--ui-inline-code-foreground:#e5e7eb!important;--dt-background:#0b0f14!important;--dt-foreground:#e5e7eb!important;--dt-card:#111827!important;--dt-card-foreground:#e5e7eb!important;--dt-muted:#1f2937!important;--dt-muted-foreground:#9ca3af!important;--dt-popover:#151c29!important;--dt-popover-foreground:#f3f4f6!important;--dt-secondary:#172033!important;--dt-secondary-foreground:#cbd5e1!important;--dt-accent:#1e293b!important;--dt-accent-foreground:#f3f4f6!important;--dt-border:#334155!important;--dt-input:#475569!important;--dt-sidebar-bg:#111827!important;--dt-sidebar-border:#334155!important;--dt-user-bubble:#182235!important;--dt-user-bubble-border:#334155!important;}",
      "html.hermes-mobile-dark-mode #root [data-slot='sidebar'],html.hermes-mobile-dark-mode #root [data-hermes-force-sidebar='true']{background:#111827!important;color:#e5e7eb!important;}",
      "html.hermes-mobile-dark-mode #root [data-slot='composer-root']{background:#111827!important;color:#e5e7eb!important;border-color:#334155!important;}",
      "html.hermes-mobile-dark-mode #root button:hover{background-color:rgba(148,163,184,.14);}"
    ].join("");
    document.head.appendChild(style);
  }

  function preferredMobileTheme() {
    try {
      var saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "dark" || saved === "light") {
        return saved;
      }
    } catch (error) {
      // ignore
    }
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyMobileTheme(mode) {
    ensureMobileThemeStyle();
    var next = mode === "dark" ? "dark" : "light";
    var isDark = next === "dark";
    document.documentElement.classList.toggle("hermes-mobile-dark-mode", isDark);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch (error) {
      // ignore
    }
    var button = document.getElementById("hermes-mobile-theme-toggle");
    if (button) {
      button.textContent = isDark ? "☀" : "☾";
      button.setAttribute("aria-label", isDark ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن");
      button.setAttribute("title", isDark ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن");
    }
    logMobileEvent("theme-change", { theme: next });
    return next;
  }

  function installMobileThemeToggle() {
    ensureMobileThemeStyle();
    applyMobileTheme(preferredMobileTheme());
    if (document.getElementById("hermes-mobile-shell")) {
      return;
    }
    if (document.getElementById("hermes-mobile-theme-toggle")) {
      return;
    }
    var button = document.createElement("button");
    button.id = "hermes-mobile-theme-toggle";
    button.type = "button";
    button.addEventListener("click", function () {
      var isDark = document.documentElement.classList.contains("hermes-mobile-dark-mode");
      applyMobileTheme(isDark ? "light" : "dark");
    });
    document.body.appendChild(button);
    applyMobileTheme(preferredMobileTheme());
  }

  function ensureCommunityDialog() {
    if (!document.getElementById("hermes-mobile-community-style")) {
      var style = document.createElement("style");
      style.id = "hermes-mobile-community-style";
      style.textContent = [
        "#hermes-mobile-community-entry{width:100%;display:flex;align-items:center;gap:10px;border:0;background:transparent;color:inherit;text-align:left;font:inherit;padding:9px 12px;border-radius:8px;min-height:40px;cursor:pointer;}",
        "#hermes-mobile-community-entry:active{background:rgba(148,163,184,.18);}",
        "#hermes-mobile-community-entry .hermes-mobile-community-icon{width:18px;height:18px;display:inline-grid;place-items:center;font-size:16px;line-height:1;}",
        "#hermes-mobile-community-dialog[hidden]{display:none!important;}",
        "#hermes-mobile-community-dialog{position:fixed;inset:0;z-index:2147483642;display:grid;place-items:center;background:radial-gradient(circle at 20% 12%,rgba(59,130,246,.28),transparent 34%),radial-gradient(circle at 82% 18%,rgba(236,72,153,.22),transparent 30%),rgba(15,23,42,.48);padding:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;backdrop-filter:blur(16px);box-sizing:border-box;}",
        "#hermes-mobile-community-panel{box-sizing:border-box;width:min(calc(100vw - 20px),360px);max-width:calc(100vw - 20px);max-height:calc(100dvh - 20px);overflow:auto;border-radius:20px;background:linear-gradient(145deg,rgba(255,255,255,.96),rgba(239,246,255,.92));color:#172033;box-shadow:0 26px 70px rgba(15,23,42,.32);padding:14px;border:1px solid rgba(255,255,255,.82);}",
        "#hermes-mobile-community-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;}",
        "#hermes-mobile-community-title{font-size:20px;font-weight:820;background:linear-gradient(100deg,#2563eb,#9333ea 48%,#f97316);-webkit-background-clip:text;background-clip:text;color:transparent;}",
        "#hermes-mobile-community-close{border:0;border-radius:999px;background:rgba(15,23,42,.08);color:#172033;width:36px;height:36px;font-size:20px;line-height:1;}",
        "#hermes-mobile-community-copy{margin:0 0 12px;color:#475569;font-size:14px;line-height:1.6;}",
        "#hermes-mobile-community-copy strong{color:#111827;font-weight:760;}",
        "#hermes-mobile-community-community{margin:12px 0 0;padding:13px;border-radius:18px;background:linear-gradient(135deg,rgba(37,99,235,.12),rgba(147,51,234,.12));color:#334155;font-size:13px;line-height:1.55;border:1px solid rgba(147,197,253,.7);}",
        "#hermes-mobile-community-community strong{display:block;color:#172033;font-size:15px;margin-bottom:4px;}",
        "#hermes-mobile-community-status{min-height:18px;margin:10px 0 0;color:#2563eb;font-size:12px;line-height:1.5;}",
        "#hermes-mobile-community-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px;}",
        "#hermes-mobile-community-actions button{min-width:0;border:0;border-radius:14px;min-height:42px;padding:0 10px;font-size:13px;font-weight:760;box-shadow:0 10px 24px rgba(37,99,235,.12);white-space:normal;}",
        "#hermes-mobile-community-open-qq{background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;}",
        "#hermes-mobile-community-open-channel{background:linear-gradient(135deg,#06b6d4,#2563eb);color:#fff;}",
        "#hermes-mobile-community-copy-id{background:#e0f2fe;color:#075985;}",
        "#hermes-mobile-community-dismiss{background:#eef2f7;color:#172033;}",
        "html.hermes-mobile-dark-mode #hermes-mobile-community-panel{background:linear-gradient(145deg,#142136,#18263c);color:#f0f4fb;border-color:#425570;}",
        "html.hermes-mobile-dark-mode #hermes-mobile-community-close{background:#26354c;color:#f0f4fb;}",
        "html.hermes-mobile-dark-mode #hermes-mobile-community-copy{color:#c5d1e1;}",
        "html.hermes-mobile-dark-mode #hermes-mobile-community-copy strong{color:#fff;}",
        "html.hermes-mobile-dark-mode #hermes-mobile-community-community{background:linear-gradient(135deg,rgba(37,99,235,.22),rgba(147,51,234,.2));color:#dce7f5;border-color:#4b6385;}",
        "html.hermes-mobile-dark-mode #hermes-mobile-community-community strong{color:#f0f5ff;}",
        "html.hermes-mobile-dark-mode #hermes-mobile-community-status{color:#9bb8ff;}",
        "html.hermes-mobile-dark-mode #hermes-mobile-community-copy-id{background:#253a57;color:#d8e8ff;}",
        "html.hermes-mobile-dark-mode #hermes-mobile-community-dismiss{background:#273448;color:#e6edf7;}",
        "@media(max-width:340px){#hermes-mobile-community-actions{grid-template-columns:1fr;}#hermes-mobile-community-title{font-size:18px;}#hermes-mobile-community-copy,#hermes-mobile-community-community{font-size:12px;}}"
      ].join("");
      document.head.appendChild(style);
    }

    var dialog = document.getElementById("hermes-mobile-community-dialog");
    if (dialog) {
      return dialog;
    }

    dialog = document.createElement("div");
    dialog.id = "hermes-mobile-community-dialog";
    dialog.hidden = true;
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "مجتمع Hermes");
    dialog.innerHTML = [
      "<div id=\"hermes-mobile-community-panel\">",
      "  <div id=\"hermes-mobile-community-head\">",
      "    <div id=\"hermes-mobile-community-title\">مجتمع Hermes</div>",
      "    <button id=\"hermes-mobile-community-close\" type=\"button\" aria-label=\"إغلاق\">×</button>",
      "  </div>",
      "  <p id=\"hermes-mobile-community-copy\">انضم إلى مجموعة <strong>Hermes mobile</strong> للحصول على التحديثات وأدلة الإعداد والإجابات عن الأسئلة الشائعة وتجارب الاستخدام على الهاتف. رقم المجموعة: <strong>436742652</strong></p>",
      "  <div id=\"hermes-mobile-community-community\"><strong>#مجتمع الذكاء الاصطناعي على الهاتف</strong> قناة QQ للمهتمين بأدوات الذكاء الاصطناعي على الهاتف. معرّف القناة: <strong>pd51668397</strong>. أهلًا بك لمناقشة مسارات العمل والوكلاء على الهاتف.</div>",
      "  <div id=\"hermes-mobile-community-status\"></div>",
      "  <div id=\"hermes-mobile-community-actions\">",
      "    <button id=\"hermes-mobile-community-open-qq\" type=\"button\">فتح QQ للانضمام</button>",
      "    <button id=\"hermes-mobile-community-open-channel\" type=\"button\">فتح قناة QQ</button>",
      "    <button id=\"hermes-mobile-community-copy-id\" type=\"button\">نسخ رقم المجموعة</button>",
      "    <button id=\"hermes-mobile-community-dismiss\" type=\"button\">إغلاق</button>",
      "  </div>",
      "</div>"
    ].join("");
    document.body.appendChild(dialog);

    function closeDialog() {
      dialog.hidden = true;
    }
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) {
        closeDialog();
      }
    });
    dialog.querySelector("#hermes-mobile-community-close").addEventListener("click", closeDialog);
    dialog.querySelector("#hermes-mobile-community-dismiss").addEventListener("click", closeDialog);
    dialog.querySelector("#hermes-mobile-community-open-qq").addEventListener("click", openQQGroupPage);
    dialog.querySelector("#hermes-mobile-community-open-channel").addEventListener("click", openQQChannelPage);
    dialog.querySelector("#hermes-mobile-community-copy-id").addEventListener("click", function (event) {
      var button = event.currentTarget;
      writeClipboardText(COMMUNITY_GROUP_ID).then(function (ok) {
        button.textContent = ok ? "تم النسخ" : "تعذّر النسخ";
        window.setTimeout(function () {
          button.textContent = "نسخ رقم المجموعة";
        }, 1200);
      });
    });
    return dialog;
  }

  function openCommunityDialog() {
    var dialog = ensureCommunityDialog();
    dialog.hidden = false;
    if (window.__hermesAndroidToggleSidebar) {
      window.__hermesAndroidToggleSidebar(false);
    }
    logMobileEvent("community-dialog-open");
  }

  function openQQGroupPage() {
    var opened = false;
    try {
      if (window.HermesAndroid && typeof window.HermesAndroid.openExternalUrl === "function") {
        opened = Boolean(window.HermesAndroid.openExternalUrl(COMMUNITY_QQ_URL));
      } else {
        window.location.href = COMMUNITY_QQ_URL;
        opened = true;
      }
    } catch (error) {
      opened = false;
      logMobileEvent("community-open-qq-failed", { error: String(error && error.message || error) });
    }
    var status = document.getElementById("hermes-mobile-community-status");
    if (status) {
      status.textContent = opened ? "حاولنا فتح QQ. إذا لم تنتقل الصفحة، انسخ رقم المجموعة وابحث عنها يدويًا." : "تعذّر فتح QQ. انسخ رقم المجموعة وابحث عنها يدويًا.";
    }
  }

  function openQQChannelPage() {
    var opened = false;
    try {
      if (window.HermesAndroid && typeof window.HermesAndroid.openExternalUrl === "function") {
        opened = Boolean(window.HermesAndroid.openExternalUrl(AI_MOBILE_CHANNEL_URL));
      } else {
        window.open(AI_MOBILE_CHANNEL_URL, "_blank");
        opened = true;
      }
    } catch (error) {
      opened = false;
      logMobileEvent("community-open-channel-failed", { error: String(error && error.message || error) });
    }
    var status = document.getElementById("hermes-mobile-community-status");
    if (status) {
      status.textContent = opened ? "حاولنا فتح قناة QQ. إذا لم تنتقل الصفحة، فابحث عن رقم القناة في QQ: " + AI_MOBILE_CHANNEL_ID + "。" : "تعذّر فتح قناة QQ. ابحث عن رقم القناة في QQ: " + AI_MOBILE_CHANNEL_ID + "。";
    }
  }

  function installCommunityMenuEntry() {
    ensureCommunityDialog();
    var sidebar = document.querySelector('#root [data-slot="sidebar"], #root [data-hermes-force-sidebar="true"]');
    if (!sidebar || document.getElementById("hermes-mobile-community-entry")) {
      return;
    }

    var button = document.createElement("button");
    button.id = "hermes-mobile-community-entry";
    button.type = "button";
    button.setAttribute("aria-label", "مجموعة النقاش");
    button.innerHTML = "<span class=\"hermes-mobile-community-icon\">#</span><span>مجموعة النقاش</span>";
    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      openCommunityDialog();
    });

    var navAnchor = null;
    var candidates = Array.prototype.slice.call(sidebar.querySelectorAll("nav, [role='navigation'], [data-sidebar='menu'], [data-slot='sidebar-content']"));
    if (candidates.length) {
      navAnchor = candidates[0];
    }
    (navAnchor || sidebar).appendChild(button);
  }

  function installCommunityMenuObserver() {
    installCommunityMenuEntry();
    if (window.__hermesAndroidCommunityObserverInstalled) {
      return;
    }
    window.__hermesAndroidCommunityObserverInstalled = true;
    new MutationObserver(function () {
      window.requestAnimationFrame(installCommunityMenuEntry);
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  window.hermesDesktop = {
    api: api,
    applyConnectionConfig: function () {
      return Promise.resolve({ mode: "local", remote: {}, profiles: {} });
    },
    fetchLinkTitle: function (url) {
      return Promise.resolve(url || "");
    },
    getBootProgress: function () {
      return Promise.resolve(bootProgress("جارٍ تشغيل خدمة Hermes المحلية...", 12, true));
    },
    getBootstrapState: function () {
      return Promise.resolve({
        active: false,
        completedAt: Date.now(),
        error: null,
        log: [],
        manifest: null,
        stages: {},
        startedAt: null,
        unsupportedPlatform: null
      });
    },
    getConnection: async function () {
      return connection();
    },
    getConnectionConfig: function () {
      return Promise.resolve({ mode: "local", remote: {}, profiles: {} });
    },
    getGatewayWsUrl: function () {
      return Promise.resolve("");
    },
    getPathForFile: function () {
      return "";
    },
    getRecentLogs: function () {
      return Promise.resolve({ path: "", lines: [] });
    },
    getRemoteDisplayReason: function () {
      return Promise.resolve(null);
    },
    getVersion: function () {
      return Promise.resolve({ appVersion: "0.17.0", backendVersion: "0.17.0" });
    },
    gitRoot: function () {
      return Promise.resolve(null);
    },
    normalizePreviewTarget: function () {
      return Promise.resolve(null);
    },
    notify: function () {
      return Promise.resolve(false);
    },
    oauthLoginConnectionConfig: function () {
      return Promise.resolve({ ok: false, baseUrl: "", connected: false });
    },
    oauthLogoutConnectionConfig: function () {
      return Promise.resolve({ ok: true, connected: false });
    },
    onBackendExit: function (callback) {
      return on("backendExit", callback);
    },
    onBootProgress: function (callback) {
      return on("bootProgress", callback);
    },
    onClosePreviewRequested: function (callback) {
      return on("closePreview", callback);
    },
    onDeepLink: function (callback) {
      return on("deepLink", callback);
    },
    onOpenUpdatesRequested: function (callback) {
      return on("updates", callback);
    },
    onBootstrapEvent: function (callback) {
      return on("bootstrap", callback);
    },
    onFocusSession: function (callback) {
      return on("focusSession", callback);
    },
    onNotificationAction: function (callback) {
      return on("notificationAction", callback);
    },
    onOpenUpdates: function (callback) {
      return on("updates", callback);
    },
    onPowerResume: function (callback) {
      return on("powerResume", callback);
    },
    onPreviewFileChanged: function (callback) {
      return on("previewFileChanged", callback);
    },
    onWindowStateChanged: function (callback) {
      return on("windowState", callback);
    },
    openExternal: function (url) {
      window.open(url, "_blank");
      return Promise.resolve();
    },
    openNewSessionWindow: unsupportedOk,
    openPreviewInBrowser: function (url) {
      window.open(url, "_blank");
      return Promise.resolve();
    },
    openSessionWindow: unsupportedOk,
    petOverlay: {
      close: unsupportedOk,
      control: function () {},
      onControl: function (callback) { return on("petControl", callback); },
      onState: function (callback) { return on("petState", callback); },
      open: unsupportedOk,
      pushState: function () {},
      setBounds: function () {},
      setFocusable: function () {},
      setIgnoreMouse: function () {}
    },
    probeConnectionConfig: function () {
      return Promise.resolve({ ok: true, baseUrl: "", authMode: "none", authProviders: [] });
    },
    profile: {
      get: function () {
        return Promise.resolve({ profile: null });
      },
      set: function () {
        return Promise.resolve({ profile: null });
      }
    },
    readDir: function () {
      return Promise.resolve({ entries: [] });
    },
    readFileDataUrl: function (path) {
      if (window.HermesAndroid && typeof window.HermesAndroid.readFileDataUrl === "function") {
        var result = JSON.parse(window.HermesAndroid.readFileDataUrl(path || ""));
        if (result.ok) {
          return Promise.resolve(result.dataUrl || "");
        }
        return Promise.reject(new Error(result.error || "تعذّرت قراءة الملف."));
      }
      return Promise.reject(new Error("لا يدعم إصدار Android قراءة هذا الملف مباشرةً حاليًا."));
    },
    readImagePreviewDataUrl: function (path) {
      if (window.HermesAndroid && typeof window.HermesAndroid.readImagePreviewDataUrl === "function") {
        var result = JSON.parse(window.HermesAndroid.readImagePreviewDataUrl(path || ""));
        if (result.ok) return Promise.resolve(result.dataUrl || "");
        return Promise.reject(new Error(result.error || "تعذرت معاينة الصورة."));
      }
      return Promise.resolve("");
    },
    readFileText: function () {
      return Promise.reject(new Error("لا يدعم إصدار Android قراءة هذا الملف مباشرةً حاليًا."));
    },
    requestMicrophoneAccess: function () {
      if (window.HermesAndroid && typeof window.HermesAndroid.requestMicrophoneAccess === "function") {
        return Promise.resolve(Boolean(window.HermesAndroid.requestMicrophoneAccess(60000)));
      }
      return Promise.resolve(false);
    },
    cancelBootstrap: function () {
      return Promise.resolve({ ok: true, cancelled: false });
    },
    repairBootstrap: function () {
      return Promise.resolve({ ok: true });
    },
    resetBootstrap: function () {
      return Promise.resolve({ ok: true });
    },
    revalidateConnection: function () {
      return Promise.resolve({ ok: true, rebuilt: false });
    },
    revealLogs: unsupportedOk,
    revealPath: function () {
      return Promise.resolve(false);
    },
    renamePath: function (path) {
      return Promise.resolve({ path: path || "" });
    },
    sanitizeWorkspaceCwd: function (cwd) {
      return Promise.resolve({ cwd: cwd || "", sanitized: false });
    },
    saveClipboardImage: function () {
      return Promise.reject(new Error("لا يدعم إصدار Android قراءة الصور من الحافظة حاليًا."));
    },
    saveConnectionConfig: function () {
      return Promise.resolve({ mode: "local", remote: {}, profiles: {} });
    },
    saveImageBuffer: function () {
      return Promise.reject(new Error("لا يدعم إصدار Android حفظ الصور حاليًا."));
    },
    saveImageFromUrl: function () {
      return Promise.resolve(false);
    },
    selectPaths: function (options) {
      if (window.HermesAndroid && typeof window.HermesAndroid.selectPaths === "function") {
        logMobileEvent("bridge-selectPaths", options || {});
        var result = JSON.parse(window.HermesAndroid.selectPaths(JSON.stringify(options || {}), 120000));
        if (result.ok) {
          logMobileEvent("bridge-selectPaths-ok", { count: result.paths && result.paths.length || 0 });
          return Promise.resolve(result.paths || []);
        }
        logMobileEvent("bridge-selectPaths-error", { error: result.error || "" });
        return Promise.reject(new Error(result.error || "لم يتم اختيار ملف."));
      }
      return Promise.resolve([]);
    },
    capturePhoto: function (timeoutMs) {
      if (window.HermesAndroid && typeof window.HermesAndroid.capturePhoto === "function") {
        var result = JSON.parse(window.HermesAndroid.capturePhoto(timeoutMs || 120000));
        if (result.ok && result.path) return Promise.resolve(result.path);
        return Promise.reject(new Error(result.error || "تعذر التقاط صورة."));
      }
      return Promise.reject(new Error("الكاميرا غير متاحة في هذا الجهاز."));
    },
    setNativeTheme: function () {},
    setPreviewShortcutActive: function () {},
    setTitleBarTheme: function () {},
    setTranslucency: function () {},
    signalDeepLinkReady: function () {
      return Promise.resolve({ ok: true });
    },
    settings: {
      getDefaultProjectDir: function () {
        return Promise.resolve({
          defaultLabel: "مجلد التطبيق",
          dir: null,
          resolvedCwd: ""
        });
      },
      pickDefaultProjectDir: function () {
        return Promise.resolve({ canceled: true, dir: null });
      },
      setDefaultProjectDir: function () {
        return Promise.resolve({ dir: null });
      }
    },
    stopPreviewFileWatch: function () {
      return Promise.resolve(false);
    },
    testConnectionConfig: function () {
      return Promise.resolve({ ok: true, baseUrl: "", authMode: "none" });
    },
    themes: {
      fetchMarketplace: function () {
        return Promise.reject(new Error("لا يدعم إصدار Android متجر السمات حاليًا."));
      },
      searchMarketplace: function () {
        return Promise.resolve([]);
      }
    },
    terminal: {
      dispose: function () {
        return Promise.resolve(false);
      },
      onData: function () {
        return function () {};
      },
      onExit: function () {
        return function () {};
      },
      resize: function () {
        return Promise.resolve(false);
      },
      start: function () {
        return Promise.reject(new Error("لا يدعم إصدار Android الطرفية المضمنة حاليًا."));
      },
      write: function () {
        return Promise.resolve(false);
      }
    },
    touchBackend: function () {
      return Promise.resolve({ ok: true });
    },
    trashPath: function () {
      return Promise.resolve(false);
    },
    uninstall: {
      run: function () {
        return Promise.resolve({ ok: false, error: "unsupported-on-android" });
      },
      summary: function () {
        return Promise.resolve({ supported: false, items: [] });
      }
    },
    updates: {
      apply: unsupportedOk,
      check: function () {
        return Promise.resolve({ supported: false, update_available: false });
      },
      getBranch: function () {
        return Promise.resolve({ branch: "main" });
      },
      onProgress: function (callback) {
        return on("updateProgress", callback);
      },
      setBranch: function (name) {
        return Promise.resolve({ branch: name || "main" });
      }
    },
    watchPreviewFile: function () {
      return Promise.resolve({ id: "", url: "" });
    },
    writeClipboard: function (text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
      }
      return Promise.resolve(false);
    },
    writeTextFile: function (path) {
      return Promise.resolve({ path: path || "" });
    }
  };

  delete window.hermesDesktop.recordSpeechText;
  window.__hermesAndroidPickFiles = pickAndroidFilesIntoComposer;
  window.__hermesAndroidShowKeyboard = focusComposerAndShowKeyboard;
  window.__hermesAndroidOpenCommunity = openCommunityDialog;
  window.__hermesAndroidApplyTheme = applyMobileTheme;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      startAndroidBootGate();
      installAndroidComposerClickFallbacks();
      installCommunityMenuObserver();
      installMobileThemeToggle();
    }, { once: true });
  } else {
    startAndroidBootGate();
    installAndroidComposerClickFallbacks();
    installCommunityMenuObserver();
    installMobileThemeToggle();
  }
})();
