# بحث محرك النماذج المحلية على Android

تاريخ الاطلاع: 2026-10-16. هذه الملاحظات مبنية على صفحات المصادر الرسمية المفتوحة في هذه المهمة.

## llama.cpp على Android

توضح وثائق llama.cpp الرسمية أن المشروع يتضمن مثال Android داخل `examples/llama.android`، وأن الدمج يقرأ metadata من GGUF عبر `ContentResolver` أو ملف خاص بالتطبيق، ويحمّل النموذج في مساحة التطبيق ويعيد الرموز المتدفقة عبر Kotlin `Flow`. كما توثق بناء ARM64 عبر Android NDK مع `ANDROID_ABI=arm64-v8a` و`ANDROID_PLATFORM=android-28`، مع ضرورة تعطيل `GGML_NATIVE` و`GGML_OPENMP` و`GGML_LLAMAFILE` و`LLAMA_OPENSSL` في إعداد cross-compilation الموثق. الصفحة: https://github.com/ggml-org/llama.cpp/blob/master/docs/android.md

هذا يثبت الإمكانية التقنية، لكنه لا يثبت دمجها مع Chaquopy/Hermes الحالي. يلزم بناء NDK مستقل، اختبار أداء وذاكرة على أجهزة ARM64 فعلية، وبناء جسر Kotlin/JNI يدعم نموذجًا فعليًا وtool calling قبل إعلان محرك محلي مكتمل.

## Gemma وGGUF

توثيق Google الرسمي لدمج Gemma مع llama.cpp يوضح أمثلة لتحميل نماذج Gemma بصيغة GGUF وتشغيل `llama-server` بواجهة متوافقة مع OpenAI على `http://localhost:8080/v1`: https://ai.google.dev/gemma/docs/integrations/llamacpp

لم يُنزّل أي وزن نموذج ولم يُختبر tool calling لـ Gemma داخل Hermes Arabic في هذه المهمة. يجب مراجعة ترخيص كل إصدار وزن ومصدره وحجمه منفصلًا قبل إتاحته للمستخدم.

## القرار الحالي

لا يضم هذا الفرع محرك llama.cpp أو نماذج GGUF. لا يُسوّق الاتصال بنقطة OpenAI-compatible محلية على أنه استدلال مضمّن أو تنزيل نموذج. الدمج المستقبلي يحتاج مكتبة Android ARM64 مناسبة، إدارة تنزيل/تخزين/حذف، قياس حجم وذاكرة، وقياس توافق tool-calling والسياق مع Hermes Agent.
