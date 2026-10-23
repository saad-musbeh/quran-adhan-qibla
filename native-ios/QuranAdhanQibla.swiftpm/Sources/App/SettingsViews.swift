import IslamicCore
import SwiftUI

struct SettingsView: View {
  @EnvironmentObject private var store: AppStore
  @EnvironmentObject private var audio: QuranAudio
  @EnvironmentObject private var tafsir: TafsirLibrary
  var body: some View {
    Form {
      Section(store.t("اللغة والمظهر", "Language & appearance")) {
        Picker(store.t("اللغة", "Language"), selection: $store.state.preferences.language) {
          Text("العربية").tag("ar")
          Text("English").tag("en")
        }
        Toggle(store.t("المظهر الداكن", "Dark appearance"), isOn: $store.state.preferences.dark)
        Picker(store.t("لون التطبيق", "App color"), selection: $store.state.preferences.color) {
          Text(store.t("أخضر", "Green")).tag("green")
          Text(store.t("عنابي", "Maroon")).tag("maroon")
          Text(store.t("أزرق", "Blue")).tag("blue")
          Text(store.t("أسود", "Black")).tag("black")
          Text(store.t("بني", "Brown")).tag("brown")
        }
        VStack(alignment: .leading) {
          Text(store.t("حجم النص", "Text size"))
          Slider(value: $store.state.preferences.textScale, in: 0.8...1.8, step: 0.1)
          Button(store.t("الحجم الافتراضي", "Default size")) {
            store.state.preferences.textScale = 1
          }
        }
        Toggle(
          store.t("بدء التطبيق بالرئيسية", "Open Home at startup"),
          isOn: $store.state.preferences.showHome)
      }
      Section(store.t("القرآن والأذكار", "Quran & adhkar")) {
        NavigationLink {
          AudioDownloadsView(audio: audio, arabic: store.arabic)
        } label: {
          Label(
            store.t("إدارة تنزيلات التلاوة", "Manage recitation downloads"),
            systemImage: "arrow.down.circle")
        }
        NavigationLink {
          TafsirLibraryView(library: tafsir, arabic: store.arabic)
        } label: {
          Label(store.t("مكتبة التفسير", "Tafsir library"), systemImage: "books.vertical")
        }
        Toggle(
          store.t("إظهار عدّادات الأذكار", "Show adhkar counters"),
          isOn: $store.state.preferences.dhikrCounters)
        NavigationLink {
          ReminderSettingsView()
        } label: {
          Label(
            store.t("تذكيرات الأذكار والصلاة على النبي", "Adhkar & Salawat reminders"),
            systemImage: "bell")
        }
      }
      Section(store.t("مواقيت الصلاة", "Prayer calculation")) {
        Picker(
          store.t("طريقة الحساب", "Calculation method"),
          selection: $store.state.preferences.prayers.method
        ) { ForEach(0..<6, id: \.self) { Text(methodLabel($0, arabic: store.arabic)).tag($0) } }
        Toggle(store.t("العصر الحنفي", "Hanafi Asr"), isOn: $store.state.preferences.prayers.hanafi)
        if store.state.preferences.prayers.method == 0 {
          Toggle(
            store.t(
              "رمضان: العشاء بعد المغرب بـ١٢٠ دقيقة", "Ramadan: Isha 120 minutes after Maghrib"),
            isOn: $store.state.preferences.prayers.ramadan)
          Text(
            store.t(
              "تُفعّل رمضان بنفسك؛ لا نستنتجه من تقويم غير موثّق.",
              "Select Ramadan yourself; the app does not infer it from an unverified calendar.")
          ).font(.caption)
        }
        Picker(
          store.t("خطوط العرض العالية", "High-latitude rule"),
          selection: $store.state.preferences.prayers.highLatitudeRule
        ) { ForEach(0..<3, id: \.self) { Text(twilightLabel($0, arabic: store.arabic)).tag($0) } }
        Toggle(
          store.t(
            "المناطق القطبية: أقرب خط عرض قابل للحساب", "Polar regions: nearest usable latitude"),
          isOn: $store.state.preferences.prayers.allowPolarApproximation)
        Text(
          store.t(
            "عند ٦٥° أو أكثر يلزم هذا الاختيار. عند غياب الشروق أو الغروب نستخدم خط عرض أقرب نحو خط الاستواء مع إبقاء التاريخ وخط الطول.",
            "Required at 65° or beyond. If sunrise or sunset is unavailable, the approximation moves toward the equator while preserving date and longitude."
          )
        ).font(.caption).foregroundStyle(.secondary)
        NavigationLink {
          AlertsSettingsView(alerts: store.alerts)
        } label: {
          Label(store.t("تنبيهات الأذان", "Adhan alerts"), systemImage: "speaker.wave.2")
        }
      }
      Section(store.t("الموقع والقبلة", "Location & Qibla")) {
        NavigationLink {
          LocationPickerView()
        } label: {
          Label(
            store.state.location?.title(store.arabic)
              ?? store.t("اختيار الموقع", "Choose location"), systemImage: "location")
        }
        Toggle(
          store.t("عرض القبلة بشمال ثابت", "Fixed true-north Qibla view"),
          isOn: $store.state.preferences.fixedCompass)
      }
      Section {
        NavigationLink {
          PrivacyView()
        } label: {
          Label(store.t("الخصوصية", "Privacy"), systemImage: "hand.raised")
        }
        NavigationLink {
          CreditsView()
        } label: {
          Label(store.t("المصادر والتراخيص", "Sources & licenses"), systemImage: "info.circle")
        }
        ShareLink(item: AppDiagnostics.shared.report) {
          Label(
            store.t("مشاركة تشخيص التشغيل", "Share startup diagnostics"),
            systemImage: "square.and.arrow.up")
        }
        Text(
          store.t("قرآن · أذان · قبلة", "Quran · Adhan · Qibla")
            + " — \(BuildIdentity.version) (\(BuildIdentity.number))"
        ).font(.caption)
          .foregroundStyle(.secondary)
      }
    }
  }
}

struct AlertsSettingsView: View {
  @EnvironmentObject private var store: AppStore
  @ObservedObject var alerts: PrayerAlerts
  @State private var requesting = false
  var body: some View {
    Form {
      Section {
        Toggle(
          store.t("تشغيل تنبيهات الأذان", "Enable prayer alerts"),
          isOn: Binding(
            get: { store.state.preferences.alertsEnabled },
            set: { enabled in
              if enabled {
                requesting = true
                Task {
                  let allowed = await alerts.requestPermission()
                  store.state.preferences.alertsEnabled = allowed
                  requesting = false
                  store.refreshAlerts(force: true)
                }
              } else {
                store.state.preferences.alertsEnabled = false
              }
            })
        ).disabled(requesting || store.state.location == nil)
        Text(permissionText).font(.footnote)
        Button(store.t("فتح إعدادات الإشعارات", "Open notification settings")) {
          if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
          }
        }
        Text(
          store.t(
            "تنبيهات مجدولة: \(alerts.scheduledCount)", "Scheduled alerts: \(alerts.scheduledCount)"
          ))
        if let until = alerts.lastPrayerDate {
          Text(
            store.t("آخر صلاة مجدولة: ", "Last scheduled prayer: ")
              + until.formatted(date: .abbreviated, time: .shortened)
          ).font(.caption)
        }
        if let error = alerts.error { Text(error).foregroundStyle(.red).font(.footnote) }
        if store.state.location == nil {
          NavigationLink(
            store.t("اختر موقعاً لحساب مواقيت الصلاة", "Choose a location for prayer times")
          ) { LocationPickerView() }
        }
      } footer: {
        Text(
          store.t(
            "تستخدم التنبيهات مقتطفات أقصر من ٣٠ ثانية وتتبع الوضع الصامت والتركيز وإعدادات الصوت. افتح التطبيق أسبوعياً لتجديد المواقيت، ويومياً عند استخدام تذكيرات متكررة.",
            "Alerts use excerpts under 30 seconds and follow Silent Mode, Focus and sound settings. Open weekly to replenish times, or daily with frequent reminders."
          ))
      }
      ForEach(PrayerID.allCases.filter(\.isPrayer)) { prayer in
        Section(prayer.label(store.arabic)) {
          Toggle(store.t("الصوت", "Sound"), isOn: soundBinding(prayer))
          Picker(store.t("صوت الأذان", "Adhan voice"), selection: voiceBinding(prayer)) {
            ForEach(PrayerAlerts.voices, id: \.id) { voice in
              Text(store.arabic ? voice.ar : voice.en).tag(voice.id)
            }
          }
          Button(store.t("تجربة بعد خمس ثوانٍ", "Test in five seconds")) {
            Task {
              await alerts.test(
                prayer: prayer,
                choice: store.state.preferences.sounds[prayer.rawValue] ?? PrayerSound(),
                arabic: store.arabic)
            }
          }
        }
      }
    }.navigationTitle(store.t("تنبيهات الأذان", "Adhan alerts"))
      .task { store.refreshAlerts(force: true) }
  }
  private func soundBinding(_ prayer: PrayerID) -> Binding<Bool> {
    Binding(
      get: { store.state.preferences.sounds[prayer.rawValue]?.sound ?? true },
      set: { store.state.preferences.sounds[prayer.rawValue, default: PrayerSound()].sound = $0 })
  }
  private func voiceBinding(_ prayer: PrayerID) -> Binding<String> {
    Binding(
      get: { store.state.preferences.sounds[prayer.rawValue]?.voice ?? "short" },
      set: { store.state.preferences.sounds[prayer.rawValue, default: PrayerSound()].voice = $0 })
  }
  private var permissionText: String {
    switch alerts.authorization {
    case "authorized": return store.t("الإشعارات مسموحة", "Notifications allowed")
    case "silent":
      return store.t(
        "الإشعارات مسموحة لكن الصوت معطّل في النظام",
        "Notifications allowed; sound disabled in system settings")
    case "quiet":
      return store.t(
        "تُسلّم الإشعارات بهدوء وفق إعدادات النظام",
        "Notifications are delivered quietly by system settings")
    case "denied":
      return store.t(
        "الإشعارات غير مسموحة. غيّرها من إعدادات النظام.",
        "Notifications are blocked. Change permission in system settings.")
    default:
      return store.t(
        "سيُطلب إذن الإشعارات عند تفعيل التنبيهات",
        "Notification permission is requested when you enable alerts")
    }
  }
}

struct ReminderSettingsView: View {
  @EnvironmentObject private var store: AppStore
  @State private var draft: Reminder?
  var body: some View {
    List {
      Section {
        ForEach(store.state.preferences.reminders) { reminder in
          Button {
            draft = reminder
          } label: {
            HStack {
              VStack(alignment: .leading) {
                Text(reminderTitle(reminder.kind, arabic: store.arabic))
                Text(
                  reminder.intervalMinutes > 0
                    ? store.t(
                      "كل \(reminder.intervalMinutes) دقيقة بين \(reminder.startHour) و\(reminder.endHour)",
                      "Every \(reminder.intervalMinutes) min, \(reminder.startHour):00–\(reminder.endHour):00"
                    ) : String(format: "%02d:%02d", reminder.hour, reminder.minute)
                ).font(.caption).foregroundStyle(.secondary)
              }
              Spacer()
              Image(systemName: reminder.enabled ? "bell.fill" : "bell.slash").foregroundStyle(
                reminder.enabled ? store.accent : .secondary)
            }
          }
        }.onDelete { indices in store.state.preferences.reminders.remove(atOffsets: indices) }
        Button {
          draft = Reminder()
        } label: {
          Label(store.t("إضافة تذكير", "Add reminder"), systemImage: "plus")
        }.disabled(store.state.preferences.reminders.count >= 12)
      } footer: {
        Text(
          store.t(
            "التذكيرات اختيارية وتشارك سعة الإشعارات مع الصلاة. مع التكرار المتقارب افتح التطبيق يومياً. تُحفظ الإعدادات عند الضغط على حفظ فقط.",
            "Reminders are optional and share notification capacity with prayers. Open the app daily with frequent repeats. Changes are saved only when you tap Save."
          ))
      }
    }
    .navigationTitle(store.t("تذكيرات الأذكار", "Devotional reminders"))
    .sheet(item: $draft) { value in ReminderEditor(reminder: value) }
  }
}

func reminderTitle(_ kind: String, arabic: Bool) -> String {
  switch kind {
  case "morning": return arabic ? "أذكار الصباح" : "Morning adhkar"
  case "evening": return arabic ? "أذكار المساء" : "Evening adhkar"
  default: return arabic ? "الصلاة على النبي" : "Salawat"
  }
}

struct ReminderEditor: View {
  @EnvironmentObject private var store: AppStore
  @Environment(\.dismiss) private var dismiss
  @State var reminder: Reminder
  @State private var saving = false
  @State private var permissionDenied = false
  private let sounds: [(String, String, String)] = [
    ("", "بدون صوت", "Silent"), ("reminder_chime.wav", "نغمة تذكير", "Reminder chime"),
    ("reminder_salawat_muhammad.wav", "اللهم صل على محمد", "Salawat — Muhammad"),
    ("reminder_salawat_prophet.wav", "صلوا على النبي", "Salawat — Prophet"),
    ("reminder_salawat_rasul.wav", "الصلاة على رسول الله", "Salawat — Rasul"),
    ("reminder_salawat_sallallahu.wav", "صلى الله عليه وسلم", "Sallallahu alayhi wa sallam"),
    ("reminder_salawat_english.wav", "تذكير باللغة الإنجليزية", "English reminder"),
  ]
  var body: some View {
    NavigationStack {
      Form {
        Toggle(store.t("تفعيل التذكير", "Enable reminder"), isOn: $reminder.enabled)
        Picker(store.t("التذكير", "Reminder"), selection: $reminder.kind) {
          ForEach(["morning", "evening", "salawat"], id: \.self) {
            Text(reminderTitle($0, arabic: store.arabic)).tag($0)
          }
        }
        DatePicker(
          store.t("الوقت", "Time"),
          selection: Binding(
            get: {
              Calendar.current.date(
                from: DateComponents(
                  year: 2026, month: 1, day: 1, hour: reminder.hour, minute: reminder.minute))
                ?? .now
            },
            set: { value in
              reminder.hour = Calendar.current.component(.hour, from: value)
              reminder.minute = Calendar.current.component(.minute, from: value)
            }), displayedComponents: .hourAndMinute)
        Picker(
          store.t("التكرار خلال النهار", "Daytime repeat"), selection: $reminder.intervalMinutes
        ) {
          Text(store.t("مرة يومياً", "Once daily")).tag(0)
          ForEach([30, 60, 120], id: \.self) {
            Text(store.t("كل \($0) دقيقة", "Every \($0) minutes")).tag($0)
          }
        }
        if reminder.intervalMinutes > 0 {
          Stepper(
            store.t("من الساعة \(reminder.startHour)", "From hour \(reminder.startHour)"),
            value: $reminder.startHour, in: 0...reminder.endHour)
          Stepper(
            store.t("إلى الساعة \(reminder.endHour)", "Through hour \(reminder.endHour)"),
            value: $reminder.endHour, in: reminder.startHour...23)
        }
        Picker(store.t("الصوت", "Sound"), selection: $reminder.sound) {
          ForEach(sounds, id: \.0) { sound in Text(store.arabic ? sound.1 : sound.2).tag(sound.0) }
        }
      }
      .navigationTitle(store.t("تحرير التذكير", "Edit reminder"))
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button(store.t("إلغاء", "Cancel")) { dismiss() }
        }
        ToolbarItem(placement: .confirmationAction) {
          Button(store.t("حفظ", "Save")) {
            saving = true
            Task {
              if reminder.enabled, !(await store.alerts.requestPermission()) {
                saving = false
                permissionDenied = true
                return
              }
              if let index = store.state.preferences.reminders.firstIndex(where: {
                $0.id == reminder.id
              }) {
                store.state.preferences.reminders[index] = reminder
              } else {
                store.state.preferences.reminders.append(reminder)
              }
              saving = false
              dismiss()
            }
          }.disabled(saving)
        }
      }
      .alert(
        store.t("الإشعارات غير مسموحة", "Notifications are blocked"), isPresented: $permissionDenied
      ) {
        Button(store.t("فتح الإعدادات", "Open settings")) {
          if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
          }
        }
        Button(store.t("تم", "OK"), role: .cancel) {}
      } message: {
        Text(
          store.t(
            "اسمح بالإشعارات أو عطّل التذكير لحفظه دون تفعيل.",
            "Allow notifications, or turn off this reminder to save it disabled."))
      }
    }
  }
}

struct PrivacyView: View {
  @EnvironmentObject private var store: AppStore
  var body: some View {
    List {
      Text(
        store.t(
          "نحفظ المصاحف والمحـفوظات والإعدادات والموقع والتنزيلات في مساحة التطبيق الخاصة. لا توجد حسابات أو إعلانات أو تحليلات مضافة.",
          "Qurans, bookmarks, settings, location and downloads are stored in the app’s private space. The app adds no accounts, ads or analytics."
        ))
      Text(
        store.t(
          "حساب مواقيت الصلاة والقبلة وبحث المدن دون اتصال ولا يرفع إحداثياتك. تستخدم خدمات الموقع الخاصة بالنظام المساعدة الشبكية عند الحاجة.",
          "Prayer times, Qibla and city search work offline without uploading coordinates. System location services may use network assistance."
        ))
      Text(
        store.t(
          "التلاوات والتفاسير تُطلب من المصادر المعروضة عند التشغيل أو التنزيل، فتتلقى تلك الخدمات عنوان IP ومعلومات الطلب. الخريطة الاختيارية تستخدم خرائط Apple ومنطقتها المعروضة.",
          "Recitation and tafsir requests go to their displayed sources, which receive your IP address and request details. The optional map uses Apple Maps and the area you view."
        ))
      Text(
        store.t(
          "إذن الموقع أثناء الاستخدام والإشعارات اختياريان. لا نطلب موقع الخلفية أو الكاميرا أو جهات الاتصال.",
          "Foreground location and notification permissions are optional. The app does not request background location, camera or contacts."
        ))
      Text(
        store.t(
          "تنزيلات الصوت والتفسير اختيارية ويمكن حذفها من صفحات إدارتها. إزالة التطبيق تزيل بياناته المحلية. قد تدخل بيانات التطبيق ضمن نسخ النظام الاحتياطية وفق إعدادات جهازك.",
          "Audio and tafsir downloads are optional and removable in their management pages. Uninstalling removes local app data. System backups may include app data according to your device settings."
        ))
    }.navigationTitle(store.t("الخصوصية", "Privacy"))
  }
}

struct CreditsView: View {
  @EnvironmentObject private var store: AppStore
  private let files = [
    "APP-LICENSE.txt", "QURAN-DATA.txt", "QURAN-AUDIO.txt", "MUSHAF-LICENSE.txt",
    "MUSHAF-PROVENANCE.txt",
    "MUSHAF-UPSTREAM-PROVENANCE.txt", "FONT-LICENSE.txt", "ADHAN-LICENSE.txt",
    "ADHAN-PROVENANCE.txt", "CITY-ATTRIBUTION.txt", "TAFSIR.txt", "TAFSIR-TERMS.txt",
    "QURANPEDIA-LICENSE.txt", "TAFSIR-MIRROR-LICENSE.txt", "ADHKAR.txt", "ADHKAR-LICENSE.txt",
  ]
  var body: some View {
    List {
      Section {
        Text("Tanzil Quran Text · CC BY 3.0")
        Link("Tanzil.net", destination: URL(string: "https://tanzil.net")!)
        Text(store.content.quran.attribution).font(.caption).textSelection(.enabled)
        Text("Adhan Swift · Batoul Apps · MIT")
        Link("Adhan Swift", destination: URL(string: "https://github.com/batoulapps/adhan-swift")!)
        Text("GeoNames cities500 · CC BY 4.0")
        Text(
          store.t(
            "تظل نصوص القرآن وأسماء السور بالعربية. لا يتضمن التطبيق ترجمات الآيات.",
            "Quran text and surah names remain Arabic. The app does not include verse translations."
          ))
      }
      ForEach(files, id: \.self) { file in
        NavigationLink(file) {
          ScrollView {
            Text(
              (try? String(
                contentsOf: store.content.root.appendingPathComponent("Credits/\(file)"),
                encoding: .utf8)) ?? ""
            ).font(.footnote).textSelection(.enabled).frame(
              maxWidth: .infinity, alignment: .leading
            ).padding()
          }.navigationTitle(file)
        }
      }
    }.navigationTitle(store.t("المصادر والتراخيص", "Sources & licenses"))
  }
}
