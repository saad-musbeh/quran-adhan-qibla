# افتح التطبيق على iPad / Open on iPad

للتسجيل في برنامج المطور ورفع التطبيق ودعوة المختبرين، اتبع [دليل TestFlight بالعربية والإنجليزية](TESTFLIGHT-IPAD-AR-EN.md). For enrollment, upload and tester invitations, follow [the Arabic/English TestFlight guide](TESTFLIGHT-IPAD-AR-EN.md).

تستخدم النسخة المضغوطة صفحات SVG الأصلية دون فقدان الجودة، وتحتوي على جميع الصفحات دون اتصال.

هذه نسخة Swift مستقلة تضم شاشات القرآن والأذان والقبلة والأذكار والتنزيلات والإعدادات مع موارد القراءة دون اتصال. الملف مشروع مصدر لـ Swift Playground، وليس ملف تثبيت IPA أو إصداراً موقّعاً.

1. ثبّت **Swift Playground 4.7 أو أحدث** من Apple للحصول على حزمة SDK الحديثة المطلوبة للنشر.
2. هذه النسخة **١.٠.٣، البناء ٤** وتستخدم الأيقونة الحالية: مصحف كريمي وسهم ذهبي وهلال على خلفية خضراء. احفظ `QuranAdhanQibla-iPad-build4-compact.zip` في **الملفات**، ثم فك الضغط في مجلد جديد. أغلق المشروع القديم في Swift Playground وافتح المشروع من المجلد الجديد؛ لا تستخدم النسخة المستوردة سابقاً.
3. افتح `QuranAdhanQibla.swiftpm` في **Swift Playground**. إذا لم يفتحه الضغط مباشرةً، استخدم مشاركة ← فتح في Swift Playground أو استيراده من شاشة التطبيق الرئيسية.
4. اضغط **تشغيل التطبيق**. لا تحتاج إلى Node أو Rust أو Expo أو تنزيل حزم برمجية. عند نجاح التشغيل تعرض الإعدادات `1.0.3 (4)`.
5. جرّب القراءة والصوت وتحديد الموقع والأذان والقبلة والأذكار. الصوت والتفسير يحتاجان الإنترنت عند أول تشغيل/تنزيل. صفحات القرآن والأذكار ودليل المدن مضمّنة دون اتصال.

للنشر: افتح **إعدادات التطبيق** في Swift Playground، واختر حساب فريق Apple Developer ومعرّف حزمة فريداً، وتحقّق من الأيقونة المرفقة، ثم استخدم **Upload to App Store Connect**. أكمِل بيانات الخصوصية والصور والتصنيف العمري والمراجعة من App Store Connect. لا يحتوي المشروع على حساب أو بيانات توقيع خاصة بك.

اجتازت اختبارات الحسابات والموارد، وفحص SDK وبناء التطبيق وتثبيته وتشغيله واختبار القراءة على محاكي iPad عبر GitHub. يستخدم الاختبار مشروع Xcode مولّداً من مصدر التطبيق نفسه؛ لم يُختبر استيراد Swift Playground أو التوقيع أو الصوت في الخلفية والإشعارات والبوصلة على iPad فعلي بعد. ابدأ برفع نسخة TestFlight وتجربتها قبل النشر العام. يحتوي المشروع على `AppInfo.plist` يعلن تشغيل الصوت في الخلفية، ويحتاج استمرار هذا الإعداد بعد تعديل إعدادات المشروع إلى التحقق على iPad.

---

The compact edition uses losslessly compressed original SVG artwork and keeps every page available offline.

This is the complete standalone Swift source project, with Quran, Adhan, Qibla, adhkar, downloads and settings, plus offline reading resources. It is a Swift Playground project, not an installable IPA or a signed release.

1. Install Apple's **Swift Playground 4.7 or later** on your iPad for the current SDK needed for publishing.
2. This is **version 1.0.3, build 4**, with the current cream Quran, gold pointer and crescent on green icon. Save `QuranAdhanQibla-iPad-build4-compact.zip` to **Files** and unzip into a fresh folder. Close the old project in Swift Playground and open the project from the new folder; do not run the previously imported copy.
3. Open `QuranAdhanQibla.swiftpm` in **Swift Playground**. If tapping does not open it, use Share → Open in Swift Playground, or import it from the app's welcome screen.
4. Tap **Run App**. You need no Node, Rust, Expo or external Swift package downloads. Once it runs, Settings displays `1.0.3 (4)`.
5. Try reading, audio, location, prayer alerts, Qibla and adhkar. First-time streamed/downloaded recitations and tafsir require internet. Quran artwork/text, adhkar and the worldwide city catalogue are bundled offline.

To publish, open **App Settings** in Swift Playground, select your Apple Developer team and a unique bundle identifier, check the supplied custom icon, and choose **Upload to App Store Connect**. Complete privacy details, screenshots, age rating and review in App Store Connect. The project contains no account credentials or personal signing configuration.

Calculation/resource checks and an actual Apple SDK build, install, launch and reader smoke test passed on GitHub’s iPad simulator. CI uses an Xcode project generated from the same app source/resources. Swift Playground import, signing, background audio, notification delivery and physical compass remain unverified on a physical iPad. Start with TestFlight and device testing before public release. `AppInfo.plist` declares background audio; verify that the declaration survives project-setting edits on your iPad.

[GitHub build and simulator checks](https://github.com/saad-musbeh/quran-adhan-qibla/actions/runs/40036357382).

Apple's guide: https://support.apple.com/guide/playgrounds-ipad/share-a-playground-itc65b2d9a15/ipados

## عند فشل تشغيل التطبيق / If Run App fails

- إذا ظهر **Build Failed**، اضغط **Show Issues / إظهار المشكلات** (رمز التحذير) واقرأ أول خطأ. قد تكون وحدة التحكم فارغة لأن التطبيق لم يُبنَ بعد؛ سجلات التطبيق لا تستطيع تسجيل خطأ مترجم قبل التشغيل. أرسل نص أول خطأ ورقم إصدار Swift Playground وiPadOS.
- إذا بُني التطبيق لكنه تعذّر فتح المحتوى، تعرض هذه النسخة سبب الخطأ وزر **مشاركة التشخيص**. عند نجاح التشغيل يتوفر الزر أيضاً في الإعدادات. تعرض وحدة التحكم رسائل تبدأ بـ `[Quran build 4]`.
- لا تحذف بيانات التطبيق أو المصاحف المحفوظة لمعالجة خطأ البناء؛ استخدم نسخة المشروع الجديدة فقط.

- For **Build Failed**, tap **Show Issues** (the warning icon) and read the first error. An empty console can mean compilation stopped before the app ran; runtime logs cannot record compiler errors. Send the first issue text and your Swift Playground/iPadOS versions.
- If compilation succeeds but content cannot open, build 4 displays the startup error and **Share diagnostics**. The same action is available in Settings after a successful launch. Console messages start with `[Quran build 4]`.
- Keep saved app data and Qurans. Re-import the new source project; deleting saved app data cannot fix compilation.

Apple's run/issues guide: https://support.apple.com/guide/playgrounds-ipad/run-your-app-itc650868b1f/ipados
