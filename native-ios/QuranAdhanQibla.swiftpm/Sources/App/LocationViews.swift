import IslamicCore
import MapKit
import SwiftUI

struct LocationStrip: View {
  @EnvironmentObject private var store: AppStore
  var body: some View {
    Button {
      store.showLocation = true
    } label: {
      HStack(spacing: 12) {
        Image(systemName: "location.circle.fill").font(.title2)
        VStack(alignment: .leading, spacing: 4) {
          Text(
            store.state.location?.title(store.arabic)
              ?? store.t("اختر موقعك", "Choose your location")
          ).font(.headline)
          Text(store.t("الموقع مشترك بين الأذان والقبلة", "Shared by Adhan and Qibla")).font(
            .caption
          ).foregroundStyle(.secondary)
        }
        Spacer()
        Image(systemName: "chevron.forward")
      }.padding().background(
        Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 14))
    }.buttonStyle(.plain)
  }
}

struct LocationPickerView: View {
  @EnvironmentObject private var store: AppStore
  @Environment(\.dismiss) private var dismiss
  var body: some View { LocationPickerContent(device: store.device) }
}

struct LocationPickerContent: View {
  @EnvironmentObject private var store: AppStore
  @Environment(\.dismiss) private var dismiss
  @ObservedObject var device: DeviceLocation
  @State private var query = ""
  @State private var country = ""
  @State private var results: [City] = []
  @State private var searching = false
  @State private var searchError = false
  @State private var pending: SavedLocation?
  @State private var latitude = ""
  @State private var longitude = ""
  @State private var invalidCoordinates = false
  var body: some View {
    List {
      Section {
        Button {
          device.request()
        } label: {
          Label(store.t("استخدام موقعي", "Use my location"), systemImage: "location.fill")
        }.disabled(device.locating)
        if device.locating { ProgressView(store.t("جارٍ تحديد الموقع…", "Finding your location…")) }
        if let error = device.error {
          Text(locationError(error)).foregroundStyle(.red)
          if error == "permission" || error == "services" {
            Button(store.t("فتح إعدادات النظام", "Open system settings")) {
              if let url = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(url)
              }
            }
          } else {
            Button(store.t("إعادة المحاولة", "Retry")) { device.request() }
          }
        }
        if let location = store.state.location {
          Text(location.title(store.arabic)).font(.headline)
          Text(location.updatedAt, style: .date).font(.caption)
          if let accuracy = location.accuracy {
            Text(
              store.t(
                "دقة تقريبية: \(Int(accuracy)) متر", "Approximate accuracy: \(Int(accuracy)) m")
            ).font(.caption)
          }
        }
      } header: {
        Text(store.t("موقع الجهاز", "Device location"))
      } footer: {
        Text(
          store.t(
            "نطلب الموقع أثناء استخدام التطبيق فقط، ولا نرسله لحساب المواقيت أو القبلة.",
            "Foreground location only. Coordinates stay on your device for prayer and Qibla calculations."
          ))
      }
      Section(store.t("بحث المدن دون اتصال", "Offline city search")) {
        Picker(store.t("البلد", "Country"), selection: $country) {
          Text(store.t("جميع البلدان", "All countries")).tag("")
          ForEach(store.content.countries) { item in Text(item.label(store.arabic)).tag(item.code) }
        }
        TextField(store.t("اسم المدينة", "City name"), text: $query).textInputAutocapitalization(
          .never
        ).autocorrectionDisabled()
        if searching { ProgressView() }
        if searchError {
          Text(store.t("تعذّر قراءة دليل المدن", "Could not read the city catalogue"))
            .foregroundStyle(.red)
        }
        ForEach(results) { city in
          Button {
            pending = SavedLocation(
              point: city.point, source: "city", label: city.name + " · " + city.countryCode,
              labelAr: city.label(true) + " · " + city.countryCode, updatedAt: Date())
          } label: {
            HStack {
              Text(city.label(store.arabic))
              Spacer()
              Text(city.countryCode).foregroundStyle(.secondary)
            }
          }
        }
        if results.count == 80 {
          Text(
            store.t(
              "تظهر أول ٨٠ نتيجة. حدّد البلد أو اكتب اسماً أدق.",
              "Showing 80 results. Choose a country or refine the name.")
          ).font(.caption)
        }
      }
      Section(store.t("الخريطة", "Map")) {
        NavigationLink {
          MapLocationView { pending = $0 }
        } label: {
          Label(store.t("اختيار نقطة على الخريطة", "Choose a point on the map"), systemImage: "map")
        }
        Text(
          store.t(
            "تحتاج الخريطة إلى الإنترنت وتستخدم خرائط Apple.",
            "The map needs internet and uses Apple Maps.")
        ).font(.caption).foregroundStyle(.secondary)
      }
      Section(store.t("إحداثيات يدوية", "Manual coordinates")) {
        TextField(store.t("خط العرض من ‎−٩٠ إلى ٩٠", "Latitude −90 to 90"), text: $latitude)
          .keyboardType(.numbersAndPunctuation)
        TextField(store.t("خط الطول من ‎−١٨٠ إلى ١٨٠", "Longitude −180 to 180"), text: $longitude)
          .keyboardType(.numbersAndPunctuation)
        Button(store.t("مراجعة الإحداثيات", "Review coordinates")) {
          guard let lat = Content.number(latitude), let lon = Content.number(longitude) else {
            invalidCoordinates = true
            return
          }
          let point = GeoPoint(latitude: lat, longitude: lon)
          guard point.isValid else {
            invalidCoordinates = true
            return
          }
          pending = SavedLocation(
            point: point, source: "manual", label: String(format: "%.4f, %.4f", lat, lon),
            updatedAt: Date())
        }
      }
      Section {
        Text(
          store.t(
            "تُعرض الأوقات وفق المنطقة الزمنية للجهاز. تحقّق منها بعد السفر.",
            "Times use the device timezone. Check it after travel.")
        ).font(.footnote)
      }
    }
    .task(id: country + "\0" + query) {
      searching = true
      searchError = false
      do {
        try await Task.sleep(for: .milliseconds(180))
        let found = try await store.cities.search(query, country: country)
        guard !Task.isCancelled else { return }
        results = found
        searching = false
      } catch is CancellationError {} catch {
        results = []
        searching = false
        searchError = true
      }
    }
    .onChange(of: device.locating) { old, new in
      if old && !new && device.error == nil && store.state.location?.source == "device" {
        dismiss()
      }
    }
    .confirmationDialog(
      store.t("تأكيد الموقع", "Confirm location"),
      isPresented: Binding(get: { pending != nil }, set: { if !$0 { pending = nil } }),
      titleVisibility: .visible
    ) {
      if let pending {
        Button(store.t("استخدام هذا الموقع", "Use this location")) {
          store.state.location = pending
          self.pending = nil
          dismiss()
        }
      }
      Button(store.t("إلغاء", "Cancel"), role: .cancel) { pending = nil }
    } message: {
      Text(pending?.title(store.arabic) ?? "")
    }
    .alert(store.t("إحداثيات غير صالحة", "Invalid coordinates"), isPresented: $invalidCoordinates) {
      Button(store.t("تم", "OK")) {}
    }
  }
  private func locationError(_ error: String) -> String {
    switch error {
    case "permission":
      return store.t(
        "الوصول إلى الموقع غير مسموح. يمكنك اختيار مدينة أو السماح من الإعدادات.",
        "Location access is blocked. Choose a city or allow access in Settings.")
    case "services":
      return store.t(
        "خدمات الموقع معطّلة. اختر مدينة أو فعّلها من إعدادات النظام.",
        "Location services are off. Choose a city or enable them in system settings.")
    case "timeout":
      return store.t(
        "انتهت مهلة تحديد الموقع. حاول قرب نافذة أو اختر مدينة.",
        "Location timed out. Try near a window or choose a city.")
    default:
      return store.t(
        "تعذّر تحديد الموقع. أعد المحاولة أو اختر مدينة.",
        "Location is unavailable. Retry or choose a city.")
    }
  }
}

struct MapLocationView: View {
  @EnvironmentObject private var store: AppStore
  @Environment(\.dismiss) private var dismiss
  let select: (SavedLocation) -> Void
  @State private var position: MapCameraPosition = .automatic
  @State private var center = CLLocationCoordinate2D(latitude: 21.4225, longitude: 39.8262)
  var body: some View {
    VStack(spacing: 16) {
      Map(position: $position).mapControls {
        MapCompass()
        MapScaleView()
      }
      .onMapCameraChange(frequency: .onEnd) { center = $0.region.center }
      .overlay {
        Image(systemName: "plus.circle.fill").font(.title).foregroundStyle(.red).allowsHitTesting(
          false)
      }
      Text(String(format: "%.5f, %.5f", center.latitude, center.longitude)).monospacedDigit()
      Text(
        store.t(
          "حرّك الخريطة حتى تصبح النقطة في مركز علامة التقاطع. عند تعذّر الاتصال استخدم بحث المدن.",
          "Move the map to place your point at the crosshair. Use offline city search if the map cannot load."
        )
      ).font(.footnote).padding(.horizontal)
      Button(store.t("اختيار هذه النقطة", "Choose this point")) {
        let point = GeoPoint(latitude: center.latitude, longitude: center.longitude)
        select(
          SavedLocation(
            point: point, source: "map",
            label: String(format: "%.4f, %.4f", point.latitude, point.longitude), updatedAt: Date())
        )
        dismiss()
      }.buttonStyle(.borderedProminent).padding(.bottom)
    }
    .navigationTitle(store.t("اختيار من الخريطة", "Map selection"))
    .onAppear {
      if let point = store.state.location?.point {
        center = CLLocationCoordinate2D(latitude: point.latitude, longitude: point.longitude)
      }
      position = .region(
        MKCoordinateRegion(
          center: center, span: MKCoordinateSpan(latitudeDelta: 0.2, longitudeDelta: 0.2)))
    }
  }
}
