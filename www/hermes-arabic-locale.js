(function () {
  if (window.__hermesArabicLocaleInstalled) return;
  window.__hermesArabicLocaleInstalled = true;

  var translations = {
    "Hermes": "Hermes", "Hermes 正在准备": "هيرمس العربي يستعد",
    "正在准备界面": "جارٍ تجهيز الواجهة", "正在检查本机服务、模型配置和移动端资源。": "جارٍ فحص الخدمة المحلية وإعداد النموذج وموارد الهاتف.",
    "你的移动智能体": "وكيلك الذكي على الهاتف", "接管手机": "التحكم بالهاتف",
    "发起新对话": "محادثة جديدة", "搜索会话": "ابحث في المحادثات",
    "关闭导航": "إغلاق القائمة", "打开导航": "فتح القائمة",
    "切换夜间模式": "تبديل الوضع الداكن", "切换日间模式": "تبديل الوضع الفاتح",
    "移动端": "الهاتف", "输入消息": "اكتب رسالتك", "语音播报": "القراءة الصوتية",
    "发送": "إرسال", "选择文件": "اختيار ملف", "正在思考": "جارٍ التفكير",
    "正在流式生成": "جارٍ إنشاء الرد", "正在组织回复": "جارٍ إعداد الرد",
    "正在连接本机服务": "جارٍ الاتصال بالخدمة المحلية", "本机服务已就绪": "الخدمة المحلية جاهزة",
    "需要完成模型设置": "أكمل إعداد النموذج للمتابعة", "连接失败": "تعذّر الاتصال",
    "连接成功": "تم الاتصال بنجاح", "保存": "حفظ", "取消": "إلغاء",
    "关闭": "إغلاق", "删除": "حذف", "编辑": "تعديل", "重试": "إعادة المحاولة",
    "返回": "رجوع", "刷新": "تحديث", "搜索": "بحث", "浏览": "استعراض",
    "新建": "إنشاء جديد", "新会话": "محادثة جديدة", "会话": "المحادثات",
    "当前会话": "المحادثة الحالية", "没有找到匹配的会话": "لم يُعثر على محادثات مطابقة",
    "还没有对话": "لا توجد محادثات بعد", "还没有消息": "لا توجد رسائل بعد",
    "模型与接口": "النماذج والاتصالات", "模型设置": "إعدادات النموذج",
    "模型配置": "إعداد النموذج", "模型": "النماذج", "模型和密钥由本机": "تُدار النماذج والمفاتيح على الهاتف",
    "自定义": "مخصص", "本地": "محلي", "本机": "الهاتف", "本地 llama3.1": "llama3.1 محلي",
    "资源中心": "مركز الملفات", "图片、音频、文档等产出资源": "الصور والصوت والمستندات والملفات الناتجة",
    "定时自动化": "المهام المجدولة", "Cron、自然语言任务、多渠道投递": "جدولة المهام والتسليم إلى قنوات متعددة",
    "接入": "التكاملات", "消息平台、网关配置、状态监控": "منصات المراسلة وإعدادات البوابة والحالة",
    "远程实例": "الخوادم البعيدة", "OAuth、账号密码、安全 WebSocket": "OAuth أو بيانات الحساب واتصال WebSocket آمن",
    "语言": "اللغة", "外观": "المظهر", "用量": "الاستخدام", "记忆管理": "إدارة الذاكرة",
    "工件": "الملفات الناتجة", "工具集": "الأدوات", "技能商店": "المهارات",
    "沙箱": "بيئات معزولة", "子代理": "الوكلاء الفرعيون", "命令面板": "لوحة الأوامر",
    "基础设置": "الإعدادات الأساسية", "Agent 能力": "قدرات الوكيل", "高级": "متقدم",
    "导航抽屉": "قائمة التنقل", "功能入口": "الميزات", "设置": "الإعدادات",
    "模型设置和移动端资源": "إعدادات النماذج وموارد الهاتف", "端点和密钥配置": "عنوان الخدمة ومفتاح API",
    "端点和模型名称": "عنوان الخدمة واسم النموذج", "密钥": "مفتاح API", "密钥保存在本机": "يُحفظ المفتاح على الهاتف",
    "请选择": "اختر", "连接地址和端口": "عنوان الاتصال والمنفذ", "当前模型": "النموذج الحالي",
    "当前提供方": "المزوّد الحالي", "文件": "ملفات", "文件夹": "مجلدات", "附件": "مرفقات",
    "添加附件": "إضافة مرفق", "移除附件": "إزالة المرفق", "任务": "المهام",
    "运行中": "قيد التشغيل", "运行状态": "حالة التشغيل", "暂停": "إيقاف مؤقت",
    "立即运行": "تشغيل الآن", "测试": "اختبار", "测试通过": "نجح الاختبار",
    "测试未通过": "لم ينجح الاختبار", "错误": "خطأ", "未知错误": "خطأ غير معروف",
    "安全": "الأمان", "高级设置": "إعدادات متقدمة", "默认": "افتراضي",
    "English": "الإنجليزية", "Simplified Chinese": "الصينية المبسطة",
    "Home": "الرئيسية", "Dashboard": "لوحة المعلومات", "Chat": "محادثة",
    "Sessions": "المحادثات", "New session": "محادثة جديدة", "Settings": "الإعدادات",
    "Tools": "الأدوات", "Memory": "الذاكرة", "Skills": "المهارات", "Models": "النماذج",
    "Providers": "المزوّدون", "Usage": "الاستخدام", "Automation": "المهام المجدولة",
    "Files": "الملفات", "Resources": "الموارد", "Search": "بحث", "Save": "حفظ",
    "Cancel": "إلغاء", "Delete": "حذف", "Edit": "تعديل", "Connect": "اتصال",
    "Disconnect": "قطع الاتصال", "Back": "رجوع", "Close": "إغلاق", "Send": "إرسال",
    "Run": "تشغيل", "Retry": "إعادة المحاولة", "Loading": "جارٍ التحميل",
    "Thinking": "جارٍ التفكير", "Working": "قيد التنفيذ", "Error": "خطأ",
    "New conversation": "محادثة جديدة", "Enter a message": "اكتب رسالتك",
    "No sessions found": "لم يُعثر على محادثات", "No data available": "لا توجد بيانات متاحة"
  };

  Object.assign(translations, {
    "Hermes 正在启动": "جارٍ تشغيل هيرمس العربي",
    "正在连接本机服务...": "جارٍ الاتصال بالخدمة المحلية...",
    "稍后再试": "حاول مجددًا لاحقًا",
    "终端模式适合高级操作。进入后可使用顶部的“返回移动界面”按钮返回。是否继续？": "وضع الطرفية مخصص للعمليات المتقدمة. يمكنك العودة من الزر أعلى الشاشة. هل تريد المتابعة؟",
    "图形聊天正在接入本机 Hermes Agent。当前请从左侧抽屉进入“终端模式”使用完整 Agent。": "تجربة المحادثة المباشرة ما زالت قيد الربط مع Hermes Agent المحلي. استخدم وضع الطرفية من قائمة التنقل للوصول إلى الوكيل الكامل.",
    "需要完成模型设置。\n请打开“设置 > 模型与接口”，选择模型预设，填写 API 密钥并保存。完成后再回到对话发送消息。": "أكمل إعداد النموذج أولًا.\nافتح «الإعدادات > النماذج والاتصالات»، واختر إعدادًا للنموذج، ثم أدخل مفتاح API واحفظه. بعد ذلك عد إلى المحادثة وأرسل رسالتك."
  });

  function translate(value) {
    var original = String(value == null ? "" : value);
    var key = original.trim();
    if (!key) return value;
    if (!Object.prototype.hasOwnProperty.call(translations, key)) return value;
    var offset = original.indexOf(key);
    return original.slice(0, offset) + translations[key] + original.slice(offset + key.length);
  }

  function excluded(node) {
    return !!node.closest("pre,code,textarea,input,select,script,style,[contenteditable='true'],.xterm,.monaco-editor,#hermes-mobile-stream,.hermes-mobile-bubble,.hermes-mobile-answer-text");
  }

  function localize(root) {
    if (!root || !root.querySelectorAll) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach(function (node) {
      if (excluded(node.parentElement)) return;
      var translated = translate(node.nodeValue);
      if (translated !== node.nodeValue) node.nodeValue = translated;
    });
    root.querySelectorAll("[placeholder],[aria-label],[title],[alt],[data-prompt]").forEach(function (element) {
      ["placeholder", "aria-label", "title", "alt", "data-prompt"].forEach(function (attribute) {
        if (!element.hasAttribute(attribute)) return;
        var oldValue = element.getAttribute(attribute);
        var newValue = translate(oldValue);
        if (newValue !== oldValue) element.setAttribute(attribute, newValue);
      });
    });
  }

  function install() {
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
    if (document.body) document.body.dir = "rtl";
    var stylesheet = document.getElementById("hermes-arabic-mobile-css")
      || document.querySelector("link[rel='stylesheet'][href*='hermes-arabic-mobile.css']");
    if (!stylesheet) {
      stylesheet = document.createElement("link");
      stylesheet.id = "hermes-arabic-mobile-css";
      stylesheet.rel = "stylesheet";
      stylesheet.href = "/hermes-arabic-mobile.css?v=0.2.4";
      (document.head || document.documentElement).appendChild(stylesheet);
    } else if (!stylesheet.id) {
      stylesheet.id = "hermes-arabic-mobile-css";
    }
    var style = document.getElementById("hermes-arabic-rtl-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "hermes-arabic-rtl-style";
      style.textContent = [
        "html[lang='ar'],html[lang='ar'] body,#root{direction:rtl;text-align:right}",
        "#hermes-mobile-shell,#hermes-mobile-chat,#hermes-android-boot-overlay{direction:rtl;text-align:right}",
        "#hermes-mobile-drawer{left:auto!important;right:0!important;transform:translateX(102%)!important;border-radius:24px 0 0 24px!important;box-shadow:-28px 0 60px rgba(31,41,55,.18)!important}",
        "#hermes-mobile-shell.drawer-open #hermes-mobile-drawer{transform:translateX(0)!important}",
        "#hermes-mobile-drawer-head{direction:rtl}#hermes-mobile-drawer-actions,#hermes-mobile-drawer-list,#hermes-mobile-drawer-foot{direction:rtl}",
        "#hermes-mobile-progress-box,#hermes-android-boot-card,#hermes-android-boot-title,#hermes-android-boot-text{direction:rtl;text-align:right!important}",
        "#hermes-mobile-suggestions button,.hermes-mobile-panel,.hermes-mobile-row,.hermes-mobile-tool,.hermes-mobile-form label{direction:rtl;text-align:right!important}",
        "#hermes-mobile-input,#hermes-mobile-chat-input{direction:rtl;text-align:right}",
        "input[type='url'],input[type='email'],input[type='password'],input[autocomplete='url'],pre,code,.xterm,.monaco-editor{direction:ltr;text-align:left}",
        "#hermes-mobile-shell :is(input[type='url'],input[type='email'],input[type='password'],code,pre,.xterm,.monaco-editor){direction:ltr;text-align:left}"
      ].join("");
      (document.head || document.documentElement).appendChild(style);
    }
    localize(document.body || document.documentElement);
    if (!window.__hermesArabicObserver && document.body) {
      window.__hermesArabicObserver = new MutationObserver(function (records) {
        records.forEach(function (record) {
          if (record.type === "childList") record.addedNodes.forEach(function (node) {
            if (node.nodeType === Node.ELEMENT_NODE) localize(node);
            else if (node.nodeType === Node.TEXT_NODE && !excluded(record.target)) {
              var translated = translate(node.nodeValue);
              if (translated !== node.nodeValue) node.nodeValue = translated;
            }
          });
        });
      });
      window.__hermesArabicObserver.observe(document.body, { childList: true, subtree: true });
    }
    if (window.fetch) {
      window.fetch("/locales/ar-mobile.json", { cache: "no-store" }).then(function (response) {
        if (!response.ok) throw new Error("Arabic locale file unavailable");
        return response.json();
      }).then(function (catalog) {
        if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) return;
        Object.keys(catalog).forEach(function (key) {
          if (typeof catalog[key] === "string") translations[key] = catalog[key];
        });
        localize(document.body || document.documentElement);
      }).catch(function () {
        // Keep the embedded critical translations if the optional catalog is unavailable.
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
