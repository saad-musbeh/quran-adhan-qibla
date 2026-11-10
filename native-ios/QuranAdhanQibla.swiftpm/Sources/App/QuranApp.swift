import IslamicCore
import SwiftUI

@main struct QuranApp: App {
  @StateObject private var startup = Startup()
  var body: some Scene {
    WindowGroup {
      if let store = startup.store {
        ConfiguredRootView(store: store)
      } else if startup.failure == nil {
        ProgressView("جارٍ فتح التطبيق / Opening app…")
          .task { await startup.load() }
      } else {
        ContentUnavailableView {
          Label("تعذّر فتح التطبيق / Unable to open app", systemImage: "exclamationmark.triangle")
        } description: {
          Text(
            "افتح نسخة Swift Playground الكاملة التي تحتوي على الموارد.\nOpen the complete Swift Playground archive including its resources.\n\(startup.failure ?? "")"
          )
        } actions: {
          Button("إعادة المحاولة / Retry") { Task { await startup.load() } }
          ShareLink(item: AppDiagnostics.shared.report) {
            Label("مشاركة التشخيص / Share diagnostics", systemImage: "square.and.arrow.up")
          }
        }
      }
    }
  }
}

struct ConfiguredRootView: View {
  @ObservedObject var store: AppStore
  var body: some View {
    RootView().environmentObject(store)
      .environmentObject(store.audio).environmentObject(store.tafsir)
      .environment(\.layoutDirection, store.arabic ? .rightToLeft : .leftToRight)
      .environment(\.locale, Locale(identifier: store.arabic ? "ar" : "en"))
      .environment(
        \.dynamicTypeSize,
        store.scale < 0.9
          ? .small : store.scale < 1.1 ? .large : store.scale < 1.4 ? .xxLarge : .accessibility1
      )
      .preferredColorScheme(store.isDark ? .dark : .light).tint(store.accent)
  }
}

@MainActor final class Startup: ObservableObject {
  @Published var store: AppStore?
  @Published var failure: String?
  private var loading = false
  func load() async {
    guard !loading, store == nil else { return }
    loading = true
    defer { loading = false }
    failure = nil
    AppDiagnostics.shared.record("App entry point reached; opening offline resources.")
    await Task.yield()
    do {
      let root = try ResourceLocator.locate()
      AppDiagnostics.shared.record("Offline resources found: \(root.lastPathComponent).")
      let support = try FileManager.default.url(
        for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true
      ).appendingPathComponent("QuranAdhanQibla", isDirectory: true)
      store = try AppStore(resources: root, support: support)
      AppDiagnostics.shared.record(
        "Content, saved settings, audio, and tafsir services initialized.")
      failure = nil
    } catch {
      failure = error.localizedDescription
      let detail = error as NSError
      AppDiagnostics.shared.record(
        "Startup failed: \(detail.domain) (\(detail.code)): \(detail.localizedDescription)")
    }
  }
}

struct RootView: View {
  var body: some View { RootContent() }
}

struct RootContent: View {
  @EnvironmentObject private var store: AppStore
  @EnvironmentObject private var audio: QuranAudio
  @EnvironmentObject private var tafsir: TafsirLibrary
  @Environment(\.scenePhase) private var phase
  private var title: String {
    [
      store.t("الرئيسية", "Home"), store.t("القرآن الكريم", "Quran"), store.t("الأذان", "Adhan"),
      store.t("القبلة", "Qibla"), store.t("أذكار وأدعية", "Adhkar & dua"),
    ][min(4, max(0, store.selectedTab))]
  }
  var body: some View {
    presentedNavigation
      .onAppear {
        store.resume()
        store.alerts.onOpen = { kind in
          store.activeBookID = nil
          if ["morning", "evening"].contains(kind) { store.adhkarCollection = kind }
          store.selectedTab = kind == "prayer" ? 2 : 4
        }
      }
      .onChange(of: phase) { _, value in
        if value == .active { store.resume() }
        store.device.setCompass(active: value == .active && store.selectedTab == 3)
      }
      .onChange(of: store.selectedTab) { _, value in
        store.device.setCompass(active: phase == .active && value == 3)
      }
      .onChange(of: audio.selectedReciterID) { _, value in store.state.preferences.reciterID = value
      }
      .onChange(of: audio.rate) { _, value in store.state.preferences.playbackRate = value }
      .onChange(of: tafsir.selectedID) { _, value in store.state.preferences.tafsirID = value }
      .onReceive(NotificationCenter.default.publisher(for: .NSSystemTimeZoneDidChange)) { _ in
        store.resume()
      }
      .onReceive(Timer.publish(every: 60, on: .main, in: .common).autoconnect()) { _ in
        if phase == .active { store.refreshAlerts() }
      }
      .alert(
        store.t("تعذّر حفظ البيانات", "Saved data needs attention"),
        isPresented: Binding(get: { store.storageWarning != nil }, set: { _ in })
      ) {
        Button(store.t("الاحتفاظ بالملف والمتابعة", "Keep file and continue")) {
          store.storageWarning = nil
        }
        Button(store.t("نسخ احتياطي وإعادة الضبط", "Back up and reset"), role: .destructive) {
          store.resetSavedState()
        }
      } message: {
        Text(
          store.t(
            "لن نستبدل بياناتك المحفوظة. التغييرات الجديدة لن تُحفظ حتى إعادة الضبط. ",
            "Your saved file is protected. New changes cannot be saved until reset. ")
            + (store.storageWarning ?? ""))
      }
  }

  private var navigationContent: some View {
    NavigationStack {
      TabView(selection: $store.selectedTab) {
        HomeView().tabItem { Label(store.t("الرئيسية", "Home"), systemImage: "house") }.tag(0)
        QuranLibraryView().tabItem { Label(store.t("القرآن", "Quran"), systemImage: "book.closed") }
          .tag(1)
        PrayerView().tabItem { Label(store.t("الأذان", "Adhan"), systemImage: "sun.horizon") }.tag(
          2)
        QiblaView().tabItem {
          Label(store.t("القبلة", "Qibla"), systemImage: "location.north.circle")
        }.tag(3)
        AdhkarView().tabItem { Label(store.t("الأذكار", "Adhkar"), systemImage: "hands.sparkles") }
          .tag(4)
      }
      .navigationTitle(title).navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItemGroup(placement: .topBarLeading) {
          Button {
            store.selectedTab = 0
          } label: {
            Image(systemName: "house")
          }.accessibilityLabel(store.t("الرئيسية", "Home"))
          Button {
            store.state.preferences.language = store.arabic ? "en" : "ar"
          } label: {
            Text(store.arabic ? "EN" : "ع")
          }.accessibilityLabel(store.t("اللغة الإنجليزية", "Arabic language"))
        }
        ToolbarItemGroup(placement: .topBarTrailing) {
          Button {
            store.state.preferences.dark.toggle()
          } label: {
            Image(systemName: store.isDark ? "sun.max" : "moon")
          }.accessibilityLabel(store.t("المظهر", "Appearance"))
          Button {
            store.showSettings = true
          } label: {
            Image(systemName: "gearshape")
          }.accessibilityLabel(store.t("الإعدادات", "Settings"))
        }
      }
    }
  }

  private var presentedNavigation: some View {
    navigationContent
      .sheet(isPresented: $store.showSettings) {
        SheetFrame(title: store.t("الإعدادات", "Settings")) { SettingsView() }
      }
      .sheet(isPresented: $store.showLocation) {
        SheetFrame(title: store.t("اختيار الموقع", "Choose location")) { LocationPickerView() }
      }
      .sheet(isPresented: $store.showDownloads) {
        SheetFrame(title: store.t("التنزيلات", "Downloads")) {
          AudioDownloadsView(audio: audio, arabic: store.arabic)
        }
      }
      .sheet(isPresented: $store.showTafsirLibrary) {
        SheetFrame(title: store.t("مكتبة التفسير", "Tafsir library")) {
          TafsirLibraryView(library: tafsir, arabic: store.arabic)
        }
      }
      .fullScreenCover(
        isPresented: Binding(
          get: { store.activeBookID != nil }, set: { if !$0 { store.activeBookID = nil } })
      ) {
        if let id = store.activeBookID { QuranReaderView(bookID: id) }
      }
  }
}

struct SheetFrame<ContentView: View>: View {
  let title: String
  @ViewBuilder var content: () -> ContentView
  @Environment(\.dismiss) private var dismiss
  @EnvironmentObject private var store: AppStore
  var body: some View {
    NavigationStack {
      content().navigationTitle(title).navigationBarTitleDisplayMode(.inline).toolbar {
        ToolbarItem(placement: .confirmationAction) { Button(store.t("تم", "Done")) { dismiss() } }
      }
    }
  }
}

struct HomeView: View {
  @EnvironmentObject private var store: AppStore
  var body: some View {
    ScrollView {
      VStack(spacing: 24) {
        Image(systemName: "book.closed.fill").font(.system(size: 56)).foregroundStyle(store.accent)
          .padding(.top, 32)
        Text("قرآن · أذان · قبلة").font(.largeTitle).bold().multilineTextAlignment(.center)
        Text(
          store.t(
            "القرآن الكريم والأذكار دون اتصال. مواقيت الصلاة والقبلة بحسابات على جهازك.",
            "Offline Quran and adhkar. Prayer times and Qibla calculated on your device.")
        ).foregroundStyle(.secondary).multilineTextAlignment(.center)
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 180))], spacing: 16) {
          homeButton(1, "book", store.t("قراءة القرآن", "Read Quran"))
          homeButton(2, "sun.horizon", store.t("مواقيت الصلاة", "Prayer times"))
          homeButton(3, "location.north.circle", store.t("اتجاه القبلة", "Qibla direction"))
          homeButton(4, "hands.sparkles", store.t("أذكار وأدعية", "Adhkar & dua"))
        }
        if let book = store.state.books.first {
          Button {
            store.open(book)
          } label: {
            Label(
              store.t("متابعة القراءة — صفحة \(book.page)", "Continue reading — page \(book.page)"),
              systemImage: "bookmark")
          }.buttonStyle(.bordered).accessibilityIdentifier("home.continueReading")
        }
        LocationStrip()
        HStack {
          Button {
            store.showDownloads = true
          } label: {
            Label(store.t("التنزيلات", "Downloads"), systemImage: "arrow.down.circle")
          }
          Spacer()
          Button {
            store.showTafsirLibrary = true
          } label: {
            Label(store.t("التفسير", "Tafsir"), systemImage: "books.vertical")
          }
        }
      }.padding(24).frame(maxWidth: 850)
    }.frame(maxWidth: .infinity)
  }
  private func homeButton(_ tab: Int, _ icon: String, _ title: String) -> some View {
    Button {
      store.selectedTab = tab
    } label: {
      VStack(spacing: 12) {
        Image(systemName: icon).font(.largeTitle)
        Text(title).font(.headline)
      }
      .frame(maxWidth: .infinity, minHeight: 120).background(
        store.accent.opacity(0.08), in: RoundedRectangle(cornerRadius: 18))
    }.buttonStyle(.plain)
  }
}
