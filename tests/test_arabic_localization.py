from __future__ import annotations

import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MOBILE_PATH = ROOT / "www/locales/ar-mobile.json"
TECHNICAL_PATH = ROOT / "android/app/src/main/python/locales/ui-technical-terms.json"
HAN = re.compile(r"[\u3400-\u9fff]")
ARABIC = re.compile(r"[\u0600-\u06ff]")
JS_QUOTED = re.compile(r'"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|`(?:\\.|[^`\\])*`', re.S)


def _yaml_keys_and_placeholders(path: Path) -> dict[str, tuple[str, ...]]:
    """Read the nested scalar-key layout used by Hermes locale catalogs."""
    stack: list[tuple[int, str]] = []
    leaves: dict[str, tuple[str, ...]] = {}
    line_pattern = re.compile(r"^( *)([A-Za-z0-9_-]+):(?:\s+(.*))?\s*$")
    placeholder_pattern = re.compile(r"(?<!\\)\{([A-Za-z_][A-Za-z0-9_]*)\}")
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        match = line_pattern.match(line)
        if not match:
            raise AssertionError(f"Unrecognized locale YAML at {path}:{line_number}")
        indent = len(match.group(1))
        key = match.group(2)
        value = match.group(3)
        while stack and stack[-1][0] >= indent:
            stack.pop()
        dotted = ".".join([part for _, part in stack] + [key])
        if value is None or not value.strip():
            stack.append((indent, key))
        else:
            leaves[dotted] = tuple(sorted(placeholder_pattern.findall(value)))
    return leaves


def _decode_js_literal(token: str) -> str:
    if token.startswith('"'):
        try:
            return json.loads(token)
        except json.JSONDecodeError:
            pass
    value = token[1:-1]
    value = re.sub(r"\\u([0-9a-fA-F]{4})", lambda match: chr(int(match.group(1), 16)), value)
    return value.replace("\\n", "\n").replace("\\r", "\r").replace("\\t", "\t").replace('\\"', '"').replace("\\'", "'").replace("\\\\", "\\")


class ArabicLocalizationTests(unittest.TestCase):
    def test_system_arabic_catalog_has_exact_english_key_and_placeholder_parity(self) -> None:
        locales = ROOT / "android/app/src/main/python/locales"
        english = _yaml_keys_and_placeholders(locales / "en.yaml")
        arabic = _yaml_keys_and_placeholders(locales / "ar.yaml")
        self.assertEqual(set(english), set(arabic), "Arabic system catalog keys differ from English")
        mismatches = {key: (english[key], arabic[key]) for key in english if english[key] != arabic[key]}
        self.assertEqual({}, mismatches, "Arabic translations changed str.format placeholders")
        self.assertGreaterEqual(len(arabic), 300)

    def test_critical_mobile_copy_has_arabic_translation(self) -> None:
        catalog = json.loads(MOBILE_PATH.read_text(encoding="utf-8"))
        critical = {
            "今天想让 Hermes 做什么？": "ما الذي تريد من Hermes أن يفعله اليوم؟",
            "整理今天的任务": "تنظيم مهام اليوم",
            "检查模型配置": "التحقق من إعداد النموذج",
            "生成手机工作流": "إنشاء سير عمل للهاتف",
        }
        for source, expected in critical.items():
            with self.subTest(source=source):
                self.assertEqual(expected, catalog.get(source))
        self.assertGreaterEqual(len(catalog), 348)

    def test_chinese_source_phrases_are_not_left_as_chinese_values(self) -> None:
        catalog = json.loads(MOBILE_PATH.read_text(encoding="utf-8"))
        untranslated = [source for source, value in catalog.items() if HAN.search(source) and (not isinstance(value, str) or not ARABIC.search(value) or HAN.search(value))]
        self.assertEqual([], untranslated, "Chinese UI source keys must map to readable Arabic values")

    def test_chinese_ui_literals_in_mobile_source_are_mapped_or_are_script_regexes(self) -> None:
        bridge = (ROOT / "www/hermes-mobile-bridge.js").read_text(encoding="utf-8")
        catalog = json.loads(MOBILE_PATH.read_text(encoding="utf-8"))
        source_keys = [key for key in catalog if HAN.search(key)]
        unresolved: list[str] = []
        for match in JS_QUOTED.finditer(bridge):
            literal = _decode_js_literal(match.group(0))
            if not HAN.search(literal):
                continue
            if any(key and key in literal for key in source_keys):
                continue
            # This is a CJK Unicode-range matcher used to keep CJK text together,
            # not user-visible copy; its range is an intentional code literal.
            if "一-鿿" in literal:
                continue
            unresolved.append(literal[:180])
        self.assertEqual([], unresolved, "Unmapped Chinese literals remain in the mobile UI source")

    def test_visible_ui_fallbacks_are_arabic_and_optional_locale_is_explicit(self) -> None:
        bridge = (ROOT / "www/hermes-mobile-bridge.js").read_text(encoding="utf-8")
        for untranslated in (
            "Starting Hermes",
            "Starting Hermes backend",
            "Hermes backend ready",
            "Could not read file.",
            "No file selected.",
            'method + " is unavailable"',
            "Hermes Mobile</div>",
            "正在连接本机服务",
            "稍后再试</button>",
            "资源中心",
            "定时自动化",
            "接管手机",
            "文件选择失败",
        ):
            with self.subTest(copy=untranslated):
                self.assertNotIn(untranslated, bridge)
        self.assertIn('currentLocale = "ar"', bridge)
        self.assertIn('currentLocale === "zh" ? "语言：简体中文"', bridge)

    def test_technical_exceptions_are_explicit_and_reasoned_in_arabic(self) -> None:
        policy = json.loads(TECHNICAL_PATH.read_text(encoding="utf-8"))
        entries = policy.get("entries", [])
        terms = {item.get("term"): item.get("reason", "") for item in entries}
        self.assertTrue(terms)
        for term, reason in terms.items():
            with self.subTest(term=term):
                self.assertTrue(term)
                self.assertTrue(ARABIC.search(reason), f"Missing Arabic rationale for preserved term: {term}")
        for required in (
            "GitHub", "API", "OAuth", "MCP", "ADB", "Fine-grained Personal Access Token",
            "workflow_dispatch", "Model names and identifiers (dynamic)", "Telegram",
            "Simplified Chinese locale label",
        ):
            self.assertIn(required, terms)

    def test_rtl_and_color_modes_are_declared_for_mobile_and_dashboard(self) -> None:
        web_index = (ROOT / "www/index.html").read_text(encoding="utf-8")
        dashboard_index = (ROOT / "android/app/src/main/python/hermes_cli/web_dist/index.html").read_text(encoding="utf-8")
        css = (ROOT / "www/hermes-arabic-mobile.css").read_text(encoding="utf-8")
        locale_script = (ROOT / "www/hermes-arabic-locale.js").read_text(encoding="utf-8")
        self.assertIn('lang="ar"', web_index)
        self.assertIn('dir="rtl"', web_index)
        self.assertIn('id="hermes-arabic-mobile-css"', web_index)
        self.assertIn('href="./hermes-arabic-mobile.css?v=0.2.6"', web_index)
        self.assertIn('<html lang="ar" dir="rtl">', dashboard_index)
        self.assertIn('direction: rtl', css)
        self.assertIn("#hermes-mobile-shell.dark", css)
        self.assertIn("@media", css)
        self.assertIn("link[rel='stylesheet'][href*='hermes-arabic-mobile.css']", locale_script)
        self.assertIn('stylesheet.href = "/hermes-arabic-mobile.css?v=0.2.6"', locale_script)
        bridge = (ROOT / "www/hermes-mobile-bridge.js").read_text(encoding="utf-8")
        boot_log_css = next(line for line in bridge.splitlines() if "#hermes-android-boot-log{" in line)
        self.assertIn("direction:rtl", boot_log_css)
        self.assertIn("system-ui", boot_log_css)
        self.assertNotIn("ui-monospace", boot_log_css)
        self.assertIn(".hermes-mobile-bubble", locale_script)
        self.assertIn("#hermes-mobile-stream", locale_script)

    def test_primary_action_button_contrast_meets_wcag_aa(self) -> None:
        css = (ROOT / "www/hermes-arabic-mobile.css").read_text(encoding="utf-8")
        light_root = re.search(r":root\s*\{([^}]+)\}", css, re.S)
        dark_theme = re.search(r"#hermes-mobile-shell\.dark\s*\{([^}]+)\}", css, re.S)
        self.assertIsNotNone(light_root)
        self.assertIsNotNone(dark_theme)
        light_primary = re.search(r"--hm-primary:\s*(#[0-9a-fA-F]{6})", light_root.group(1)).group(1)
        dark_primary = re.search(r"--hm-primary:\s*(#[0-9a-fA-F]{6})", dark_theme.group(1)).group(1)

        def luminance(color: str) -> float:
            channels = [int(color[index:index + 2], 16) / 255 for index in (1, 3, 5)]
            linear = [value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4 for value in channels]
            return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]

        def contrast(foreground: str, background: str) -> float:
            lighter, darker = sorted((luminance(foreground), luminance(background)), reverse=True)
            return (lighter + 0.05) / (darker + 0.05)

        self.assertGreaterEqual(contrast("#ffffff", light_primary), 4.5)
        self.assertGreaterEqual(contrast("#ffffff", dark_primary), 4.5)

    def test_settings_and_mobile_actions_are_real_and_ordered(self) -> None:
        bridge = (ROOT / "www/hermes-mobile-bridge.js").read_text(encoding="utf-8")
        catalog = json.loads(MOBILE_PATH.read_text(encoding="utf-8"))
        settings = bridge[bridge.index("var ALL_SETTINGS_TOOLS") : bridge.index("var FEATURE_INFO")]
        ordered_labels = [
            "النماذج والاتصالات",
            "التكاملات",
            "الخوادم البعيدة",
            "مركز الملفات",
            "المهام المجدولة",
            "الخصوصية والبيانات",
            "المظهر",
        ]
        positions = [settings.index(f'["{label}"') for label in ordered_labels]
        self.assertEqual(sorted(positions), positions)
        for marker in ("data-action=\\\"capture-photo\\\"", "data-action=\\\"pick-file\\\"", "data-action=\\\"voice-input\\\"", "capturePhoto", "recordSpeechText", "renderPrivacyPage"):
            self.assertIn(marker, bridge)
        for arabic_label in (
            'renderFeatureHeader("skills", "مركز المهارات"',
            'renderFeatureHeader("persona", "الشخصية"',
            'renderFeatureHeader("tools", "الأدوات"',
            'renderFeatureHeader("appearance", "المظهر"',
            'renderFeatureHeader("resources", "الملفات والموارد"',
            'renderFeatureHeader("automation", "المهام المجدولة"',
            'renderFeatureHeader("phone-control", "التحكم بالهاتف"',
            "المهارات المثبتة",
            "ملف التعريف النشط",
            "ملخص الاستخدام",
            "الاقتران باستخدام رمز",
            "العودة إلى الإعدادات",
            "إعدادات متقدمة",
            "تعذّر الاتصال بجلسة Hermes المحلية. حاول لاحقًا أو افتح وضع الطرفية.",
            "التبديل إلى الوضع الفاتح",
        ):
            self.assertIn(arabic_label, bridge)
        for untranslated_label in ('"Skills Hub"', '"查看已安装 Skills"', '"Current Profile"', '"English"'):
            self.assertNotIn(untranslated_label, bridge)
        for untranslated_header in (
            'renderFeatureHeader("resources", "资源中心"',
            'renderFeatureHeader("automation", "定时自动化"',
            'renderFeatureHeader("phone-control", "接管手机"',
        ):
            self.assertNotIn(untranslated_header, bridge)
        self.assertNotIn('lines.push("خطأ: " + result.error)', bridge)
        self.assertIn("ما الذي تريد من Hermes أن يفعله اليوم؟", catalog.values())
        self.assertIn("إنشاء سير عمل للهاتف", catalog.values())


if __name__ == "__main__":
    unittest.main()
