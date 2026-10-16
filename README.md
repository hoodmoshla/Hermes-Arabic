# هيرمس العربي | Hermes Arabic

تطبيق Android ARM64 مستقل بهوية عربية، يضم Hermes Agent وHermes Mobile محليًا عبر Python/Chaquopy. لا يتطلب تثبيت Termux أو VPS. مصدر الواجهة في `www/` ومصدر Android في `android/`؛ التراخيص والإشعارات محفوظة.

> **حالة الإصدار 0.2.0:** أضيف مسار llama.cpp محلي لتنزيل نموذج GGUF موثق والتحقق منه وتشغيله، وأضيف موصل GitHub أصلي للقراءة ومقترحات التغيير وطلب تشغيل GitHub Actions بعد موافقة أصلية منفصلة، وأضيف خدمة Android أمامية لاستعادة Hermes. تفاصيل نتائج البناء والاختبار والقيود في [PROJECT_STATUS.md](PROJECT_STATUS.md). هذه الميزات لم تُختبر على هاتف Android فعلي في بيئة البناء؛ لا يُعد نجاح البناء دليلًا على عمل الاستدلال أو استمرار المهام على كل جهاز.

## الوظائف المضافة

### نموذج محلي بلا API خارجي

تتيح صفحة **الإعدادات ← النماذج المحلية** تنزيل `Qwen2.5 0.5B Instruct Q4_K_M` (نحو 379 MiB) إلى مجلد التطبيق الخاص، واستئناف التنزيل وإلغاؤه، والتحقق من الحجم وSHA-256، ثم تشغيل llama.cpp عبر AAR لـ Android على loopback. عند تشغيله يختار Hermes نقطة OpenAI-compatible المحلية؛ وعند إيقافه يستعيد إعداد النموذج السابق. أوزان النموذج ليست ضمن APK. راجع `MODEL_RUNTIME_RESEARCH.md` للتثبيت والترخيص.

### GitHub

يربط المستخدم Fine-grained Personal Access Token من صفحة GitHub؛ يجري التحقق منه قبل حفظه مشفرًا بـ AES-GCM مع مفتاح Android Keystore. لا يُخزّن الرمز في `localStorage` ولا يُتاح لأدوات JavaScript. صلاحيات القراءة والكتابة مقتصرة على المستودعات التي يحددها المستخدم.

تسجل Hermes أدوات الوكيل لعرض المستودعات وملفاتها وقراءتها وتجهيز مقترح commit، وكذلك استعراض workflows ونتائج Actions وتجهيز طلب `workflow_dispatch`. لا ترفع الأداة تغييرات ولا تبدأ CI بنفسها: يعرض Android تفاصيل المقترح أو workflow والفرع وSHA والمدخلات، ولا يتم commit أو تشغيل الاختبارات إلا بعد موافقة Android أصلية. عند استهداف الفرع الافتراضي يُنشأ فرع `hermes/*` منفصل بعد الموافقة، ولا توجد كتابة مباشرة للفرع الافتراضي. يلزم Fine-grained PAT بصلاحيات Contents: read/write وMetadata: read، ويحتاج عرض النتائج Actions: read وتشغيل workflow Actions: write. حجم القراءة والرفع محدود كما توضحه الواجهة. لا يتضمن APK OAuth Client ID؛ يلزم PAT محدود يقدمه المستخدم.

### Hermes في الخلفية

توجد خدمة Android أمامية بإشعار دائم، ومستقبل إقلاع، ومسار استعادة للنموذج المحلي وتهيئة Hermes. يمكن للمستخدم إيقاف الخدمة صراحةً من التطبيق. تحتاج أهلية الإطلاق والاستعادة بعد قتل العملية والتصرف مع قيود البطارية إلى اختبار على Android 14+ وأجهزة الشركات المصنّعة.

## الأمان والخصوصية

- التطبيق يمنع النسخ الاحتياطي التلقائي، ويعطّل cleartext افتراضيًا ويستثني loopback فقط.
- أسرار مزود النموذج وGitHub تحفظ عبر Android Keystore؛ لا تضع كلمات مرور أو keystore أو APK في Git.
- يقتصر GitHub API على `https://api.github.com`، ويُفحص الفرع قبل تنفيذ التغيير وتُرفض التغييرات إذا تحرك SHA الأساسي منذ المراجعة.
- إعداد Hermes يُحفظ داخل مساحة التطبيق الخاصة ويطبق المصدر `0600` على `config.yaml`.
- لم يثبت البناء وحده سلوك كل سجلّ أو مزود على الهاتف؛ راجع قائمة الاختبارات في `PROJECT_STATUS.md`.

## البناء المحلي

المتطلبات: JDK 21، Android SDK 36 وBuild Tools 36، Node.js 22، Python 3.11 ومساحة لتبعيات Chaquopy. يُنتج APK واحد لمعمارية `arm64-v8a` فقط.

```bash
npm ci
npx cap sync android
npm test
cd android
./gradlew testDebugUnitTest assembleRelease --console=plain
```

يتطلب توقيع Release المتغيرات `ANDROID_KEYSTORE_PATH` و`ANDROID_KEYSTORE_PASSWORD` و`ANDROID_KEY_ALIAS` و`ANDROID_KEY_PASSWORD`. لا تضعها في المستودع. الناتج `android/app/build/outputs/apk/release/app-release.apk`.

## CI والتراخيص

يشغّل `.github/workflows/android.yml` اختبارات المستودع وبناء Android. بناء Release موقّع في CI يتطلب الأسرار المحددة في ملف workflow. لا تدخل هذه الأسرار ضمن تاريخ Git. راجع `LICENSE` و`THIRD_PARTY_NOTICES.md` و`UPSTREAM.md`؛ ما زال تدقيق التوزيع التجاري/المتجر والمكوّنات الثنائية مسؤولية منفصلة.
