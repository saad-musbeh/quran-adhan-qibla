import IslamicCore
import SwiftUI

struct PrayerView: View {
  @EnvironmentObject private var store: AppStore
  var body: some View {
    ScrollView {
      VStack(spacing: 22) {
        LocationStrip()
        TimelineView(.periodic(from: .now, by: 60)) { context in
          PrayerScheduleContent(now: context.date)
        }
        Button {
          store.showSettings = true
        } label: {
          Label(
            store.t("إعدادات الحساب وتنبيهات الأذان", "Calculation & Adhan settings"),
            systemImage: "slider.horizontal.3")
        }.buttonStyle(.bordered)
      }.padding(20).frame(maxWidth: 900)
    }.frame(maxWidth: .infinity)
  }
}

struct PrayerScheduleContent: View {
  @EnvironmentObject private var store: AppStore
  let now: Date
  var body: some View {
    if let location = store.state.location {
      let schedule = Result {
        try PrayerCalculator.schedule(
          point: location.point, date: now, settings: store.state.preferences.prayers)
      }
      switch schedule {
      case .success(let today):
        let occurrences =
          (try? PrayerCalculator.nextOccurrences(
            point: location.point, now: now, settings: store.state.preferences.prayers)) ?? []
        VStack(spacing: 18) {
          if let next = occurrences.first {
            VStack(spacing: 10) {
              Text(store.t("الصلاة القادمة", "Next prayer")).font(.subheadline)
              Text(next.prayer.label(store.arabic)).font(.largeTitle).bold()
              Text(next.date, style: .time).font(.title2).monospacedDigit()
              Text(remaining(until: next.date)).font(.headline)
              if !Calendar.current.isDate(next.date, inSameDayAs: now) {
                Text(next.date, style: .date).font(.caption)
              }
            }.frame(maxWidth: .infinity).padding(24).background(
              store.accent.opacity(0.1), in: RoundedRectangle(cornerRadius: 20))
          }
          HStack {
            Text(now, style: .date)
            Spacer()
            Text(TimeZone.current.identifier).font(.caption).foregroundStyle(.secondary)
          }
          ForEach(today.events) { event in
            let nextOccurrence = occurrences.first { $0.prayer == event.prayer }
            HStack {
              VStack(alignment: .leading, spacing: 6) {
                Text(event.prayer.label(store.arabic)).font(.headline)
                if let upcoming = nextOccurrence {
                  Text(remaining(until: upcoming.date)).font(.caption).foregroundStyle(.secondary)
                  if !Calendar.current.isDate(upcoming.date, inSameDayAs: now) {
                    Text(
                      store.t("غداً: ", "Tomorrow: ")
                        + upcoming.date.formatted(date: .abbreviated, time: .shortened)
                    ).font(.caption).foregroundStyle(.secondary)
                  }
                } else if event.prayer == .sunrise {
                  Text(store.t("الشروق ليس صلاة", "Sunrise is not a prayer")).font(.caption)
                    .foregroundStyle(.secondary)
                }
              }
              Spacer()
              Text(event.date, style: .time).font(.title3).monospacedDigit()
            }.padding().background(
              occurrences.first?.prayer == event.prayer
                ? store.accent.opacity(0.08) : Color(.secondarySystemBackground),
              in: RoundedRectangle(cornerRadius: 12))
          }
          if today.approximated {
            Label(
              store.t(
                "تقريب للمناطق القطبية باستخدام خط عرض أقرب قابل للحساب: \(today.effectiveLatitude.formatted(.number.precision(.fractionLength(2))))°",
                "Polar approximation using nearest usable latitude: \(today.effectiveLatitude.formatted(.number.precision(.fractionLength(2))))°"
              ), systemImage: "info.circle"
            ).font(.footnote)
          }
          Text(
            methodLabel(store.state.preferences.prayers.method, arabic: store.arabic) + " · "
              + twilightLabel(
                store.state.preferences.prayers.highLatitudeRule, arabic: store.arabic)
          ).font(.footnote).foregroundStyle(.secondary)
        }
      case .failure:
        ContentUnavailableView {
          Label(
            store.t("تعذّر حساب المواقيت", "Prayer times unavailable"),
            systemImage: "sun.max.trianglebadge.exclamationmark")
        } description: {
          Text(
            store.t(
              "راجع الموقع والتاريخ وإعدادات خطوط العرض العالية. عند خط عرض ٦٥° أو أكثر يلزم تفعيل التقريب القطبي صراحةً.",
              "Check location, date and high-latitude settings. At latitude 65° or above, explicitly enable polar approximation."
            ))
        }
      }
    } else {
      ContentUnavailableView {
        Label(
          store.t("اختر موقعاً لحساب الصلاة", "Choose a location for prayer times"),
          systemImage: "location")
      } description: {
        Text(
          store.t(
            "استخدم موقع الجهاز أو اختر مدينة من الدليل دون اتصال.",
            "Use device location or choose an offline city."))
      } actions: {
        Button(store.t("اختيار الموقع", "Choose location")) { store.showLocation = true }
      }
    }
  }
  private func remaining(until date: Date) -> String {
    let minutes = max(0, Int(ceil(date.timeIntervalSince(now) / 60)))
    return store.t(
      "متبقٍ \(minutes / 60) س و\(minutes % 60) د", "In \(minutes / 60) h \(minutes % 60) min")
  }
}

func methodLabel(_ method: Int, arabic: Bool) -> String {
  let labels =
    arabic
    ? [
      "أم القرى — مكة المكرمة", "رابطة العالم الإسلامي", "أمريكا الشمالية — ISNA", "الهيئة المصرية",
      "جامعة كراتشي", "لجنة رؤية الهلال",
    ]
    : [
      "Umm al-Qura — Makkah", "Muslim World League", "North America — ISNA", "Egyptian", "Karachi",
      "Moonsighting Committee",
    ]
  return labels[min(5, max(0, method))]
}
func twilightLabel(_ rule: Int, arabic: Bool) -> String {
  let labels =
    arabic
    ? ["منتصف الليل", "سُبع الليل", "زاوية الشفق"]
    : ["Middle of the night", "Seventh of the night", "Twilight angle"]
  return labels[min(2, max(0, rule))]
}

struct QiblaView: View {
  @EnvironmentObject private var store: AppStore
  var body: some View { QiblaContent(device: store.device) }
}

struct QiblaContent: View {
  @EnvironmentObject private var store: AppStore
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @ObservedObject var device: DeviceLocation
  @State private var rotation = 0.0
  var body: some View {
    ScrollView {
      VStack(spacing: 24) {
        LocationStrip()
        if let location = store.state.location,
          let bearing = try? PrayerCalculator.qibla(from: location.point)
        {
          let live = !store.state.preferences.fixedCompass && device.heading != nil
          Text(bearing, format: .number.precision(.fractionLength(1))).font(
            .system(size: 50, weight: .semibold)
          ).monospacedDigit()
            .overlay(alignment: .topTrailing) { Text("°").font(.title).offset(x: 22, y: 4) }
          Text(store.t("مع عقارب الساعة من الشمال الحقيقي", "Clockwise from true north")).font(
            .footnote
          ).foregroundStyle(.secondary)
          ZStack {
            Circle().stroke(store.accent.opacity(0.2), lineWidth: 18)
            ForEach(0..<36) { tick in
              Rectangle().fill(store.accent.opacity(tick % 9 == 0 ? 1 : 0.35)).frame(
                width: tick % 9 == 0 ? 3 : 1, height: tick % 9 == 0 ? 20 : 8
              ).offset(y: -130).rotationEffect(.degrees(Double(tick) * 10))
            }
            VStack {
              Text(store.t("ش", "N")).font(.headline)
              Spacer()
              Text(store.t("ج", "S")).font(.headline)
            }.padding(34)
            HStack {
              Text(store.t("غ", "W")).font(.headline)
              Spacer()
              Text(store.t("ق", "E")).font(.headline)
            }.padding(34)
            VStack(spacing: 2) {
              Image(systemName: "location.north.fill").font(.system(size: 70))
              Text(store.t("الكعبة", "Kaaba")).font(.caption).bold()
            }.foregroundStyle(store.accent).offset(y: -65).rotationEffect(.degrees(bearing))
            Circle().fill(store.accent).frame(width: 12, height: 12)
          }.frame(width: 300, height: 300).rotationEffect(.degrees(rotation))
            .animation(reduceMotion ? nil : .easeOut(duration: 0.12), value: rotation)
            .environment(\.layoutDirection, .leftToRight)
            .accessibilityElement(children: .ignore).accessibilityLabel(
              store.t("اتجاه القبلة \(Int(bearing)) درجة", "Qibla bearing \(Int(bearing)) degrees"))
          Picker(
            store.t("وضع البوصلة", "Compass mode"), selection: $store.state.preferences.fixedCompass
          ) {
            Text(store.t("مباشر", "Live")).tag(false)
            Text(store.t("شمال ثابت", "Fixed north")).tag(true)
          }.pickerStyle(.segmented).frame(maxWidth: 400)
          Text(
            live
              ? store.t(
                "بوصلة مباشرة من الشمال الحقيقي. أبقِ الجهاز مسطحاً وبعيداً عن المعادن.",
                "Live compass using true north. Keep the device flat and away from metal.")
              : store.t(
                "عرض ثابت: الشمال في الأعلى. وجّه جهازك للشمال الحقيقي بنفسك؛ هذا العرض لا يتتبع اتجاهه.",
                "Fixed view: north is at the top. Align the device with true north yourself; this view does not track its heading."
              )
          ).multilineTextAlignment(.center)
          if !store.state.preferences.fixedCompass && device.heading == nil {
            Label(
              store.t(
                "لا تتوفر قراءة دقيقة للشمال الحقيقي. حرّك الجهاز للمعايرة أو استخدم العرض الثابت.",
                "No reliable true heading. Move the device to calibrate or use the fixed view."),
              systemImage: "info.circle"
            ).font(.footnote).foregroundStyle(.secondary)
          }
          if let heading = device.heading, live {
            let relative = HeadingMath.relative(target: bearing, current: heading)
            Text(
              abs(relative) <= 8
                ? store.t("أنت تواجه القبلة تقريباً", "You are approximately facing Qibla")
                : store.t(
                  "الفارق عن القبلة: \(Int(abs(relative)))°",
                  "Turn toward Qibla: \(Int(abs(relative)))°")
            ).font(.headline).foregroundStyle(store.accent)
          }
        } else {
          ContentUnavailableView(
            store.t("اختر موقعك لعرض القبلة", "Choose a location for Qibla"),
            systemImage: "location.north.circle")
        }
      }.padding(24).frame(maxWidth: 800)
    }.frame(maxWidth: .infinity)
      .onChange(of: device.heading) { _, value in updateRotation(value) }
      .onChange(of: store.state.preferences.fixedCompass) { _, _ in updateRotation(device.heading) }
      .onAppear { updateRotation(device.heading) }
  }
  private func updateRotation(_ heading: Double?) {
    let target = store.state.preferences.fixedCompass ? 0 : -(heading ?? 0)
    rotation = HeadingMath.unwrap(previous: rotation, next: target)
  }
}
