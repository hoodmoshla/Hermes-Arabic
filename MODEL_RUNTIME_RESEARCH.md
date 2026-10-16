# بحث محرك النماذج المحلية وGitHub على Android

تاريخ التحقق: 2026-10-16. هذه الملاحظات تتضمن المصادر التي فُتحت فعليًا، وليست استنتاجات من مقتطفات البحث فقط.

## محرك llama.cpp

### المكتبة

- المصدر المفتوح لواجهة Java وAndroid AAR: https://github.com/bernardladenthin/java-llama.cpp
- صفحة Maven Central: https://central.sonatype.com/artifact/net.ladenthin/llama-android
- الملف المتحقق من Maven: `net.ladenthin:llama-android:5.1.0`, بصيغة AAR، 19,839,083 بايت، MIT، ويضم `libjllama.so` لمعمارية `arm64-v8a` (25,219,576 بايت) و`x86_64`. يضم المصدر `LlamaModel`, `OpenAiCompatServer`, وخريطة OpenAI request. يمرر `tools` بصيغتها القياسية، ويدعم ردود SSE المتدفقة و`delta.tool_calls`؛ الخادم يربط افتراضيًا بـ `127.0.0.1`. هذه واجهة تكامل مبنية على llama.cpp وليست خدمة سحابية.
- يتطلب هذا الإصدار Android API 28 على الأقل؛ اختيار المكتبة يرفع الحد الأدنى للتطبيق من 24 إلى 28، ويجب التصريح بذلك للمستخدمين.
- مرجع llama.cpp الرسمي لبناء/دمج Android: https://github.com/ggml-org/llama.cpp/blob/master/docs/android.md. يوصي بمكتبة Android app binding، ويشرح بناء NDK ARM64 وخيارات تعطيل `GGML_NATIVE`, `GGML_OPENMP`, `GGML_LLAMAFILE`, `LLAMA_OPENSSL` عند البناء اليدوي.

### كتالوج التنزيل

- بطاقة النموذج والتحقق من بياناته: https://huggingface.co/api/models/bartowski/Qwen2.5-0.5B-Instruct-GGUF/tree/41ba88dbac95fed2528c92514c131d73eb5a174b?recursive=true&expand=true
- الاسم: `Qwen2.5-0.5B-Instruct-Q4_K_M.gguf`، المصدر `bartowski/Qwen2.5-0.5B-Instruct-GGUF`، حجم الملف 397,808,192 بايت، وSHA-256 من LFS هو `6eb923e7d26e9cea28811e1a8e852009b21242fb157b26149d3b188f3a8c8653`. بطاقة النموذج تشير إلى Apache-2.0؛ تُعرض معلومات الحجم والترخيص قبل التنزيل، ولا تُضمّن الأوزان في APK.
- رابط التنزيل يجب أن يثبت على commit `41ba88dbac95fed2528c92514c131d73eb5a174b`، ويُرفض الملف ما لم يطابق الحجم وبصمة SHA-256 أعلاه.

## GitHub

- توثيق GitHub OAuth Device Flow: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
- يتطلب Device Flow تطبيق OAuth مسجلًا مع `client_id`، وتمكين Device Flow في إعداداته. لذلك لا يجوز اختراع `client_id` أو إعادة استخدام اعتماد تكامل GitHub الخاص ببيئة البناء داخل APK. بديل التطبيق المستقل هو Fine-grained Personal Access Token محدود بمستودعات يحددها المستخدم، محفوظ بتشفير Android Keystore، مع عرض نطاق الصلاحيات وعدم إتاحته لـ JavaScript.
- أي رفع للتغييرات ينبغي أن ينشئ فرعًا جديدًا بعد مراجعة المستخدم الدقيقة للمستودع والفرع والملفات ورسالة الالتزام؛ يمنع الكتابة المباشرة للفرع الافتراضي. عمليات API المؤثرة لا تتجاوز الموافقة الصريحة.

## استعادة Hermes

- يجب أن تبقى تهيئة Hermes وملفات الحالة محلية في مساحة التطبيق الخاصة، مع تشغيل الخدمة الأمامية فقط لعمل يطلبه المستخدم، وإشعار دائم وعملية إعادة تشغيل عند استعادة Android للخدمة. مصدر Android للمتطلبات: https://developer.android.com/about/versions/14/changes/fgs-types-required
- لا يثبت البناء وجود جهاز Android فعلي أو استمرار inference بعد قتل العملية. هذه تبقى اختبارات جهاز مطلوبة ما لم تُنفذ على جهاز/محاكي فعلي.


## Additional sources checked during the 2026-10-16 implementation

- Pinned model repository at the exact revision used by the downloader: <https://huggingface.co/bartowski/Qwen2.5-0.5B-Instruct-GGUF/tree/41ba88dbac95fed2528c92514c131d73eb5a174b>
- Android foreground-service launch restrictions: <https://developer.android.com/develop/background-work/services/fgs/launch>

The Android GitHub connector uses a user-provided fine-grained Personal Access Token rather than embedding an unregistered OAuth client id. It verifies the token before storing it with Android Keystore-backed AES-GCM, and keeps the token out of JavaScript. Repository writes and workflow dispatches remain proposal-only until the user approves the target repository/branch/action in a native Android confirmation dialog.
