# نشر نسخة تجريبية من iPad / TestFlight from iPad

آخر تحقق من تعليمات Apple: 24 أكتوبر 2026. / Apple instructions checked: 24 October 2026.

دليل لتطبيق **قرآن · أذان · قبلة**، نسخة Swift **1.0.3 (4)**. يمكنك تنفيذ الخطوات على iPad باستخدام Swift Playground وSafari. قد تختلف أسماء الأزرار حسب لغة الواجهة وتحديثات Apple.

Guide for **Quran · Adhan · Qibla**, Swift version **1.0.3 (4)**. Use Swift Playground and Safari on your iPad. Button names may vary with Apple's updates and your interface language.

- [العربية](#العربية)
- [English](#english)

## العربية

### 1. الاشتراك في Apple Developer Program

تحتاج عضوية فعّالة لتوزيع التطبيق عبر TestFlight. السعر المعلن **99 دولاراً أمريكياً سنوياً**، أو السعر المحلي الذي تعرضه Apple. للتسجيل كفرد، يجب بلوغ السن القانونية في بلدك، واستخدام اسمك القانوني؛ يظهر هذا الاسم كبائع في App Store. إذا أردت النشر باسم شركة، اختر مسار المؤسسات واستوفِ متطلباته، ومنها D‑U‑N‑S عادةً. [شروط العضوية](https://developer.apple.com/programs/enroll/)

1. فعّل المصادقة الثنائية لحساب Apple، وحدّث الاسم والعنوان ورقم الهاتف.
2. سجّل الدخول إلى iCloud على iPad، وفعّل رمز الدخول أو Face ID أو Touch ID.
3. ثبّت تطبيق **Apple Developer** من App Store وافتحه.
4. اختر **Account / الحساب** وسجّل الدخول بحسابك.
5. اضغط **Enroll Now / التسجيل الآن**، ثم تابع.
6. أدخل البيانات القانونية، وأكمل التحقق بالهوية الحكومية إذا طُلب. استخدم الجهاز نفسه طوال التسجيل.
7. اختر **Individual / فرد** إذا كنت تنشر باسمك، وراجع الاتفاقية.
8. أكمل شراء العضوية بالمبلغ المعروض. انتظر تفعيل العضوية قبل المتابعة.

إذا لم يظهر التسجيل داخل التطبيق في منطقتك، افتح [صفحة التسجيل](https://developer.apple.com/programs/enroll/) في Safari واتبع المسار المتاح. [دليل التسجيل عبر تطبيق Apple Developer](https://developer.apple.com/help/account/membership/enrolling-in-the-app)

### 2. تجهيز المشروع ومعرّف الحزمة

1. فك ضغط `QuranAdhanQibla-iPad-build4-compact.zip` في مجلد جديد داخل **الملفات**.
2. افتح `QuranAdhanQibla.swiftpm` في Swift Playground، واضغط **Run App**. تحقّق من ظهور `1.0.3 (4)` في إعدادات التطبيق.
3. افتح الشريط الجانبي ثم **App Settings / إعدادات التطبيق**، وسجّل الدخول إلى فريق عضويتك.
4. تحقّق من الأيقونة الجديدة، وإصدار `1.0.3`، والبناء `4`، والحد الأدنى `17.0`، وفئة **Reference**.
5. اختر معرّف حزمة فريداً تملكه في فريقك. القيمة الحالية في المشروع هي `org.saadmusbeh.quranadhanqibla.swift`. احتفظ بها إذا كانت مسجلة لفريقك، أو استبدلها قبل أول رفع.

إذا لم يظهر المعرّف في App Store Connect، سجّله أولاً:

1. في Safari افتح [حساب المطور](https://developer.apple.com/account/) ثم **Certificates, Identifiers & Profiles → Identifiers → +**.
2. اختر **App IDs → App** ثم تابع.
3. أدخل وصفاً، واختر **Explicit**، واكتب معرّف الحزمة نفسه.
4. راجع الاختيارات ثم **Continue → Register**. استخدم المعرّف نفسه في المشروع وسجل التطبيق؛ لا يمكن تغييره لسجل التطبيق بعد رفع بناء. [تسجيل App ID](https://developer.apple.com/help/account/identifiers/register-an-app-id)

### 3. إنشاء سجل التطبيق في Safari

1. افتح [App Store Connect](https://appstoreconnect.apple.com/) وسجّل الدخول بحساب الفريق نفسه.
2. اقبل أي اتفاقية جديدة يطلبها الحساب. اختر **Apps → + → New App**.
3. املأ الحقول التالية ثم اضغط **Create**:

| الحقل | ما تكتبه أو تختاره |
| --- | --- |
| Platforms | **iOS**، ويشمل تطبيق iPad |
| Name | اسم متاح، مثل `قرآن · أذان · قبلة` |
| Primary Language | **Arabic** |
| Bundle ID | المعرّف المسجل نفسه الموجود في Swift Playground |
| SKU | رمز داخلي مثل `quran-adhan-qibla-swift` |
| User Access | الصلاحيات المناسبة لفريقك |

يُنشأ السجل قبل رفع البناء. إذا كانت الخيارات غير متاحة، استخدم دور **Account Holder** أو **Admin** أو **App Manager**. [إنشاء سجل التطبيق](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/)

### 4. رفع البناء من Swift Playground

1. عُد إلى المشروع وافتح **App Settings**.
2. تأكد من الفريق ومعرّف الحزمة والإصدار والأيقونة المخصصة.
3. اضغط **Upload to App Store Connect** وأكمل الخطوات التي يعرضها التطبيق.
4. بعد نجاح الرفع، افتح سجل التطبيق في Safari ثم **TestFlight**، وانتظر انتهاء معالجة Apple للبناء.

اختر `1.0.3 (4)` عند ظهوره. إذا فشل البناء داخل Swift Playground، افتح **Show Issues** واقرأ أول خطأ. [تعليمات Apple للرفع](https://support.apple.com/guide/playgrounds-ipad/share-a-playground-itc65b2d9a15/ipados)

### 5. إنشاء مجموعة داخلية أولاً

تشترط Apple وجود مجموعة داخلية قبل إنشاء مجموعة خارجية.

1. افتح **Apps → تطبيقك → TestFlight**.
2. بجانب **Internal Testing** اضغط **+**.
3. سمِّ المجموعة `Internal` واضغط **Create**.
4. لتجربته بنفسك، استخدم **Add Builds** لإضافة البناء، و**Invite Testers** لإضافة حسابك المؤهل من الفريق.

لا تحتاج إلى إضافة أصدقائك كمستخدمين في فريق App Store Connect؛ استخدم الاختبار الخارجي لهم. [المجموعات الداخلية](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers)

### 6. وصف النسخة ومعلومات التواصل والمراجعة

1. من **TestFlight → Additional → Test Information** اختر اللغة.
2. أدخل **Beta App Description** و**Feedback Email**؛ استخدم بريداً حقيقياً تتابعه.
3. احفظ، وأضف العربية والإنجليزية إذا ظهرت خيارات الترجمة. [معلومات الاختبار](https://developer.apple.com/help/app-store-connect/test-a-beta-version/provide-test-information/)
4. في **Beta App Review Information** أو نموذج معلومات المراجعة، أدخل اسم جهة التواصل ورقم الهاتف مع مفتاح الدولة والبريد.
5. هذا التطبيق لا يطلب حساباً للدخول؛ اترك **Sign-in required** غير مفعّل. أضف ملاحظات المراجعة أدناه بعد التأكد من مطابقتها للبناء. [معلومات المراجعة](https://developer.apple.com/help/app-store-connect/reference/app-review-information)

**وصف مقترح للنسخة التجريبية — Beta App Description:**

> نسخة تجريبية لتطبيق قرآن وأذان وقبلة. تضم قراءة القرآن بالعربية دون اتصال، والإشارات المرجعية، وتلاوات صوتية، وتفاسير منشورة اختيارية، وحساب مواقيت الصلاة حسب الموقع، واتجاه القبلة، والأذكار. الواجهة بالعربية والإنجليزية. تحتاج التلاوات والتفاسير إلى الإنترنت أول مرة، ويمكن تنزيل المحتوى المدعوم للاستخدام دون اتصال. لا يلزم إنشاء حساب.

**تعليمات مقترحة — What to Test:**

> اختبر فتح القرآن دون اتصال، وتقليب الصفحات والتكبير والوضع الأفقي، وحفظ الموضع والإشارات بعد إعادة التشغيل. جرّب التلاوة والإيقاف والتكرار والتنزيل، والتفسير الاختياري، والعربية والإنجليزية. اختبر اختيار المدينة والموقع ومواقيت الصلاة والقبلة والإشعارات والأذكار. عند حدوث مشكلة، أرسل طراز الجهاز وإصدار iOS أو iPadOS وخطوات تكرارها عبر TestFlight. اختبر الصوت والإشعارات على جهاز فعلي، بما في ذلك قفل الشاشة وSilent Mode وFocus.

**ملاحظات مقترحة للمراجع — Review Notes:**

> No sign-in is required. Quran pages, adhkar and the city catalogue are bundled offline. Audio and optional tafsir need internet for first use/download. Location permission is optional: a city or manual coordinates can be selected instead. Prayer notifications are opt-in. Live Qibla depends on reliable true-north heading; fixed mode is available. Please test notifications and heading on a physical device.

### 7. المجموعة الخارجية وإضافة البناء وإرساله للمراجعة

1. بجانب **External Testing** اضغط **+**، وسمِّ المجموعة `Public Beta`، ثم **Create**.
2. افتح المجموعة → **Add Builds**، واختر iOS ثم `1.0.3 (4)` وأكّد الإضافة. [إضافة البناء إلى مجموعة](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-testers-to-builds/)
3. أدخل **What to Test**، وأكمل أي بيانات تواصل ناقصة.
4. فعّل **Automatically notify testers** إن أردت الإشعار التلقائي بعد القبول.
5. اضغط **Submit Review / Submit for Review** حسب الزر الظاهر.

يحتاج أول بناء خارجي إلى مراجعة Apple. راقب الحالة؛ عند الرفض اقرأ السبب في قسم **App Review** وعالجه. إذا قُبل البناء ولم تفعّل الإشعار التلقائي، استخدم **Notify Testers / Start Testing**. [خطوات الاختبار الخارجي](https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers)

### 8. دعوة المختبرين بعد القبول

**بالبريد الإلكتروني:**

1. افتح **TestFlight → External Testing → Public Beta**.
2. اختر **Invite Testers** أو **+** بجانب **Testers → Email**.
3. أدخل بيانات المختبرين وأرسل الدعوات. [الدعوات البريدية](https://developer.apple.com/testflight/)

**برابط عام:**

1. في المجموعة افتح تبويب المختبرين واضغط **Create Public Link**.
2. اختر **Open to Anyone**، أو **Filter by Criteria** لتحديد الأجهزة وإصدارات النظام. التطبيق يتطلب iOS/iPadOS 17 فأحدث.
3. حدّد سقفاً للمختبرين إن رغبت، وأكّد ثم انسخ الرابط وشاركه.
4. لتعديل الشروط أو تعطيل الرابط، استخدم **Manage** بجانب **Public Link**. [إعداد الرابط العام](https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers)

### 9. خطوات المختبر والمتابعة

1. يثبّت المختبر **TestFlight** من App Store.
2. يفتح الدعوة أو الرابط على جهازه، ويقبل المشاركة ثم يضغط **Install**.
3. يرسل الملاحظات من TestFlight؛ تابعها في قسم الملاحظات والأعطال داخل App Store Connect.

البناء متاح للاختبار حتى **90 يوماً**. نشره في App Store للعامة يحتاج إجراءً منفصلاً. [دليل TestFlight](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/)

## English

### 1. Join the Apple Developer Program

TestFlight distribution requires active membership. Apple lists **US$99 per membership year**, with regional pricing shown during enrollment. Individuals must be the legal age of majority and use their legal name, which appears as the App Store seller. For a company seller name, use organization enrollment and meet its requirements, usually including a D‑U‑N‑S number. [Membership requirements](https://developer.apple.com/programs/enroll/)

1. Enable two-factor authentication and update your Apple Account's name, address and phone.
2. Sign in to iCloud on your iPad and enable a passcode, Face ID or Touch ID.
3. Install and open **Apple Developer** from the App Store.
4. Open **Account**, sign in, then tap **Enroll Now**.
5. Provide your legal details and complete any requested government-ID verification. Use the same device throughout enrollment.
6. Select **Individual** if publishing under your own name; review the agreement.
7. Complete the membership purchase at the displayed price and wait for activation.

If in-app enrollment is unavailable in your region, follow the available route on [Apple's enrollment website](https://developer.apple.com/programs/enroll/) in Safari. [Apple Developer app enrollment](https://developer.apple.com/help/account/membership/enrolling-in-the-app)

### 2. Prepare the project and bundle ID

1. Unzip `QuranAdhanQibla-iPad-build4-compact.zip` into a fresh folder in **Files**.
2. Open `QuranAdhanQibla.swiftpm` in Swift Playground and tap **Run App**. Confirm Settings shows `1.0.3 (4)`.
3. Open the sidebar → **App Settings**, sign in and select your developer team.
4. Check the new custom icon, version `1.0.3`, build `4`, minimum OS `17.0`, and **Reference** category.
5. Choose a unique bundle ID registered to your team. The project uses `org.saadmusbeh.quranadhanqibla.swift`; keep it if your team owns it, otherwise replace it before the first upload.

If the identifier is missing from App Store Connect, register it first:

1. In Safari, open your [developer account](https://developer.apple.com/account/) → **Certificates, Identifiers & Profiles → Identifiers → +**.
2. Choose **App IDs → App** and continue.
3. Enter a description, select **Explicit**, and enter the same bundle ID.
4. Review, then **Continue → Register**. Match the ID in the project and app record; it cannot be changed for that record after uploading a build. [Register an App ID](https://developer.apple.com/help/account/identifiers/register-an-app-id)

### 3. Create the app record in Safari

1. Sign in to [App Store Connect](https://appstoreconnect.apple.com/) with the same team account.
2. Accept any outstanding account agreement. Open **Apps → + → New App**.
3. Complete these fields and tap **Create**:

| Field | Value |
| --- | --- |
| Platforms | **iOS**, including the iPad app |
| Name | An available name, such as `قرآن · أذان · قبلة` |
| Primary Language | **Arabic** |
| Bundle ID | The registered ID matching Swift Playground |
| SKU | An internal identifier, e.g. `quran-adhan-qibla-swift` |
| User Access | Appropriate access for your team |

Create this record before uploading. Creating apps requires the **Account Holder**, **Admin** or **App Manager** role. [Create an app record](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/)

### 4. Upload from Swift Playground

1. Return to the project → **App Settings**.
2. Confirm the team, bundle ID, version and custom icon.
3. Tap **Upload to App Store Connect** and complete the displayed prompts.
4. After upload succeeds, open the app record → **TestFlight** in Safari and wait for Apple to process it.

Select `1.0.3 (4)` when available. For compilation failures, open **Show Issues** in Swift Playground and read the first error. [Apple's upload instructions](https://support.apple.com/guide/playgrounds-ipad/share-a-playground-itc65b2d9a15/ipados)

### 5. Create an internal group first

Apple requires an internal group before you create an external group.

1. Open **Apps → your app → TestFlight**.
2. Tap **+** beside **Internal Testing**.
3. Name it `Internal` and tap **Create**.
4. To test yourself, use **Add Builds** and **Invite Testers** to add the build and your eligible team account.

Friends can use external testing without becoming App Store Connect team members. [Internal testing](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers)

### 6. Complete beta description, contact and review information

1. Open **TestFlight → Additional → Test Information** and select a language.
2. Enter **Beta App Description** and a monitored **Feedback Email**.
3. Save; add Arabic and English localizations where offered. [Test information](https://developer.apple.com/help/app-store-connect/test-a-beta-version/provide-test-information/)
4. Under **Beta App Review Information**, or the review-information prompt, provide your contact name, phone with country code and email.
5. This app has no account login: leave **Sign-in required** unchecked. Add the suggested review notes after confirming they match your build. [Review information](https://developer.apple.com/help/app-store-connect/reference/app-review-information)

**Suggested Beta App Description:**

> Beta of a Quran, prayer-time and Qibla app. Includes offline Arabic Quran reading, bookmarks, recitations, optional published tafsir, location-based prayer calculations, Qibla guidance and adhkar. Menus support Arabic and English. Audio and tafsir need internet initially; supported downloads can then be used offline. No account is required.

**Suggested What to Test:**

> Test offline Quran opening, page turns, zoom, landscape, and saved reading position/bookmarks after relaunch. Try recitation, pause, loops, downloads, optional tafsir, and Arabic/English menus. Check city selection, location, prayer times, Qibla, notifications and adhkar. Report your device model, OS version and reproduction steps through TestFlight. Test audio and notifications on physical devices, including locked-screen playback, Silent Mode and Focus.

**Suggested Review Notes:**

> No sign-in is required. Quran pages, adhkar and the city catalogue are bundled offline. Audio and optional tafsir need internet for first use/download. Location permission is optional: a city or manual coordinates can be selected instead. Prayer notifications are opt-in. Live Qibla depends on reliable true-north heading; fixed mode is available. Please test notifications and heading on a physical device.

### 7. Create an external group, add the build and submit

1. Tap **+** beside **External Testing**, name the group `Public Beta`, and **Create**.
2. Open it → **Add Builds**. Select iOS and `1.0.3 (4)`; confirm. [Assign a build to a group](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-testers-to-builds/)
3. Enter **What to Test** and any missing contact details.
4. Select **Automatically notify testers** if desired.
5. Tap **Submit Review / Submit for Review**, as displayed.

Apple reviews the first external build. Monitor its status; resolve any rejection under **App Review**. After approval, use **Notify Testers / Start Testing** if automatic notification was disabled. [External testing instructions](https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers)

### 8. Invite people after approval

**Email invitations:**

1. Open **TestFlight → External Testing → Public Beta**.
2. Choose **Invite Testers**, or **+** beside **Testers → Email**.
3. Enter tester details and send invitations. [Email invitations](https://developer.apple.com/testflight/)

**Public link:**

1. In the group's testers tab, tap **Create Public Link**.
2. Choose **Open to Anyone** or **Filter by Criteria** for device/OS requirements. This app requires iOS/iPadOS 17 or later.
3. Optionally set a tester limit, confirm, copy and share the link.
4. Use **Manage** beside **Public Link** to change criteria or disable it. [Public-link settings](https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers)

### 9. Tester installation and follow-up

1. Testers install **TestFlight** from the App Store.
2. They open the invitation or public link on their device, accept, and tap **Install**.
3. They submit feedback through TestFlight; review feedback and crashes in App Store Connect.

Each uploaded build can be tested for up to **90 days**. Public App Store release is a separate submission. [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/)

## حدود التحقق / Verification limits

اجتاز المصدر بناء Apple SDK والتثبيت والتشغيل واختبار القراءة على محاكي iPad عبر [GitHub](https://github.com/saad-musbeh/quran-adhan-qibla/actions/runs/40036357382). لم يُتحقق بعد من استيراد Swift Playground والتوقيع ورفع App Store Connect أو السلوك على جهاز فعلي. استخدم TestFlight للتحقق منها قبل النشر العام.

The source passed an Apple SDK build, installation, launch and reader checks on [GitHub's iPad simulator](https://github.com/saad-musbeh/quran-adhan-qibla/actions/runs/40036357382). Swift Playground import, signing, App Store Connect upload and physical-device behavior remain unverified. Use TestFlight to verify these before public release.
