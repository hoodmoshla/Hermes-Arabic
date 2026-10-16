# إشعارات المكونات الخارجية

يجب توزيع هذا الملف مع أي نسخة مبنية. يحتفظ المشروع بنصوص التراخيص الأصلية حيثما كانت موجودة. راجع أيضًا [UPSTREAM.md](UPSTREAM.md) و`LICENSE`.

## Hermes Mobile وHermes Agent

- واجهة تطبيق Android ومكونات الجسر مأخوذة من [sesaloy/hermes-mobile](https://github.com/sesaloy/hermes-mobile)، وترخيص المصدر MIT. احتفظنا بإشعار Hermes Mobile ومؤلفيه.
- مصدر Hermes Agent المضمّن من [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent)، وترخيصه MIT؛ نسخة الترخيص موجودة في `android/app/src/main/python/LICENSE`.
- تتضمن شجرة Python بعض الإضافات والمهارات ذات تراخيص وإشعارات خاصة بها؛ تحفظ الملفات الموجودة بجانبها، مثل `LICENSE` و`NOTICE`، دون دمجها في ترخيص موحد.

## Android وJavaScript وPython

- Capacitor Core وCapacitor Android وحزم npm: الإصدارات المثبتة في `package-lock.json`. افحص حقل `license` لكل حزمة وملف الترخيص المنشور معها عند تحديث القفل.
- AndroidX وAndroid Gradle Plugin وChaquopy: تأتي من مستودعات Maven المحددة في Gradle؛ ينبغي إنشاء قائمة SBOM دقيقة من dependency graph لكل APK قبل التوزيع العام.
- حزم Python المباشرة مدونة في `android/app/src/main/python/requirements-hermes-android.txt`. تتضمن المتطلبات حزمًا من مؤلفين مختلفين؛ تراخيصها لا تصبح MIT لمجرد تضمينها مع Hermes.

## الملفات الثنائية ARM64

- `android/app/src/main/jniLibs/arm64-v8a/libadb_exec.so` مشتق بحسب المصدر من مشروع LADB. إشعار LADB الكامل مرفق في `android/app/src/main/assets/licenses/LADB_LICENSE.txt`. يتضمن الترخيص شروطًا خاصة وقيودًا على رفع نسخ غير رسمية إلى Google Play؛ **لا توزّع هذا الملف على Google Play قبل استبداله ببناء مستقل متوافق والتحقق القانوني منه**.
- `libnode_exec.so` ومكتبات Node/OpenSSL/ICU/zlib المرفقة داخل `assets/hermes-node/` ملفات ثنائية منقولة من مصدر Hermes Mobile. يلزم استكمال توثيق مصدر كل ملف وإصداره وترخيصه من المصدر الذي بناه قبل نشر APK على نطاق عام؛ لا نفترض أن جميعها تتبع ترخيص التطبيق.

## أوزان النماذج

لا يتضمن المستودع أوزان نماذج. ترخيص النموذج وشروط تنزيله وتوزيعه منفصلة عن ترخيص llama.cpp أو Hermes Agent؛ يجب عرضها للمستخدم والتحقق منها قبل تمكين التنزيل أو إعادة التوزيع.
