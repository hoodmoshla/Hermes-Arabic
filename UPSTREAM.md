# المصدر والتراخيص

## نقطة الانطلاق

- المصدر: [sesaloy/hermes-mobile](https://github.com/sesaloy/hermes-mobile)
- الفرع المنسوخ: `main`
- نسخة المصدر عند إنشاء Hermes Arabic: `5181095a0878b37adc2ccb63710b42f2fba2719a` من `sesaloy/hermes-mobile`، فرع `main`.
- رُبط المصدر محليًا باسم `upstream` للقراءة وجلب التحديثات فقط. رُبط `origin` بمستودع `hoodmoshla/Hermes-Arabic` الخاص. لا تُرسل تغييرات إلى المستودع الأصلي.
- ترخيص المشروع الأصلي: MIT. احتُفظ بنص `LICENSE` وإشعارات Nous Research وHermes Mobile، وأُضيف إشعار مساهمي Hermes Arabic دون إزالة الحقوق السابقة.

## محرك Hermes Agent

- المصدر المضمّن في `android/app/src/main/python/` من [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent).
- النسخة المضمّنة في Hermes Arabic `v0.2.6` منسوخة من [`v0.22.4`](https://github.com/NousResearch/hermes-agent/releases/tag/v0.22.4)، كائن الوسم `64dbae64747ab640a3fece06f359307c30d129da`، والـ commit `4d04303818b61bf3aa09278af48356315515965b`.
- المؤشر النصي `hermes_cli.__version__` يبقى `0.0.0` إلى أن يوجد ختم تثبيت رسمي؛ الإثبات هو سجل `scripts/upstream/upstream-pin.json` وليس هذا الرقم وحده.
- أُزيلت أشجار سطح المكتب غير اللازمة للإقلاع (`apps` و`ui-tui` و`web` و`node_modules` و`docker` و`evals`)، وأُبقيت حزم تشغيل الوكيل بما فيها `plugins/web`.
- ملف الترخيص المرفق مع الشيفرة: `android/app/src/main/python/LICENSE` (MIT، copyright Nous Research).
- تُحفظ ملفات المصدر والحقوق التابعة كما وردت في النسخة المنقولة؛ لا تُحذف ترويسات الملفات عند التعديل.
- الدمج الحالي يضم Python/Chaquopy وملفات Dashboard وNode/TUI ومكونات ARM64 الواردة في المصدر، وليس إعادة تنفيذ مستقلة لمحرك Nous.

## الاعتمادات والملفات الثنائية

| المكوّن | المصدر/التعريف | الترخيص/الحالة |
|---|---|---|
| واجهة Android وملفات الجسر المحمول | `sesaloy/hermes-mobile`، راجع رابط المصدر أعلاه | MIT بحسب `LICENSE` المصدر؛ احتفظنا بالإشعار |
| Hermes Agent Python | `NousResearch/hermes-agent` | MIT بحسب `android/app/src/main/python/LICENSE` |
| Capacitor Android/Core | حزم npm المثبتة في `package-lock.json` | راجع بيانات الحزم والإشعارات المرفقة عند البناء؛ لا تُغيّر الإصدارات دون تحديث القفل |
| AndroidX وAndroid Gradle Plugin وChaquopy | إحداثيات Maven في ملفات Gradle | تراخيص كل مكتبة تتبع ناشرها؛ يلزم توليد/مراجعة SBOM نهائي من dependency graph قبل توزيع APK |
| Node runtime وملفات `.so` التابعة | ملفات منقولة في `android/app/src/main/assets/hermes-node/` و`jniLibs/arm64-v8a/` | مصدر البناء والإصدار والترخيص لكل مكتبة أصلية لم يوثقها المصدر بما يكفي في هذه النسخة؛ يلزم إكمال التحقق قبل النشر العام |
| ADB host executable | `libadb_exec.so` مشتق بحسب `THIRD_PARTY_NOTICES.md` من LADB | شروط LADB وقيود التوزيع في الملف المرفق؛ لا تنشره على Google Play قبل استبداله |
| مهارات/إضافات Hermes | ملفات `skills/` و`plugins/` المرفقة | توجد إشعارات منفصلة لبعضها؛ راجع ملفات LICENSE/NOTICE المجاورة ولا تفترض أن الجميع MIT |

## مراجعة ما قبل النشر

1. شغّل فحص تراخيص npm/Python/Maven على الاعتماديات المبنية فعلًا، مع حفظ SBOM لكل إصدار.
2. حدّد مصدر وإصدار Node ARM64 وكل مكتبة أصلية، وارفق تراخيصها وإشعاراتها في APK والمستودع.
3. استبدل ADB المشتق من LADB ببناء مستقل مسموح بتوزيعه في القنوات المقصودة.
4. راجع تراخيص النماذج وأوزانها منفصلة عن ترخيص محرك الاستدلال؛ لا يُضمّن أي وزن نموذج في التطبيق دون موافقة صريحة على ترخيصه.

هذا الملف يسجل ما أمكن التحقق منه، ولا يُعد تصديقًا بأن جميع التبعيات اجتازت تدقيقًا قانونيًا نهائيًا.
