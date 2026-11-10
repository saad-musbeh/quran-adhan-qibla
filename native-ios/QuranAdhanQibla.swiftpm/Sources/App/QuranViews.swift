import IslamicCore
import SwiftUI

struct QuranLibraryView: View {
  @EnvironmentObject private var store: AppStore
  @State private var search = ""
  var body: some View {
    List {
      Section(store.t("مصاحفي", "My Qurans")) {
        ForEach(Array(store.state.books.enumerated()), id: \.element.id) { index, book in
          HStack {
            Button {
              store.open(book)
            } label: {
              Label {
                VStack(alignment: .leading, spacing: 6) {
                  Text(
                    book.name.isEmpty
                      ? store.t("المصحف \(index + 1)", "Quran \(index + 1)") : book.name
                  ).font(.headline)
                  Text(store.t("صفحة \(book.page)", "Page \(book.page)")).font(.caption)
                    .foregroundStyle(.secondary)
                }
              } icon: {
                Image(systemName: "book.closed.fill").font(.title).padding(.trailing, 8)
              }
            }.buttonStyle(.plain)
            Spacer()
            NavigationLink {
              BookSettingsView(bookID: book.id)
            } label: {
              Image(systemName: "pencil")
            }.accessibilityLabel(store.t("تحرير المصحف", "Edit Quran"))
          }.padding(.vertical, 10)
        }
        Button {
          store.addBook()
        } label: {
          Label(store.t("إضافة مصحف", "Add Quran"), systemImage: "plus")
        }.disabled(store.state.books.count >= 6)
      }
      Section(store.t("السور", "Surahs")) {
        ForEach(
          store.content.quran.surahs.filter {
            search.isEmpty || Content.normalized($0.arabicName).contains(Content.normalized(search))
              || $0.transliteration.localizedCaseInsensitiveContains(search)
              || String($0.number) == search
          }
        ) { surah in
          Button {
            guard let book = store.state.books.first else { return }
            store.turnBook(book.id, to: surah.startPage)
            store.open(store.book(book.id) ?? book)
          } label: {
            HStack {
              Text("\(surah.number)").monospacedDigit().foregroundStyle(.secondary).frame(
                minWidth: 30)
              Text(surah.arabicName).font(.title3)
              Spacer()
              Text(store.t("\(surah.verseCount) آية", "\(surah.verseCount) ayahs")).font(.caption)
                .foregroundStyle(.secondary)
            }
          }
        }
      }
    }.searchable(text: $search, prompt: store.t("البحث عن سورة", "Find a surah"))
  }
}

struct BookSettingsView: View {
  @EnvironmentObject private var store: AppStore
  @Environment(\.dismiss) private var dismiss
  let bookID: String
  var body: some View {
    Form {
      if let book = store.book(bookID) {
        TextField(
          store.t("اسم المصحف", "Quran name"),
          text: Binding(
            get: { store.book(bookID)?.name ?? "" },
            set: { value in store.updateBook(bookID) { $0.name = String(value.prefix(80)) } }))
        Text(store.t("آخر صفحة: \(book.page)", "Last page: \(book.page)"))
        Button(store.t("فتح المصحف", "Open Quran")) { store.open(book) }
        Button(store.t("حذف هذا المصحف", "Remove this Quran"), role: .destructive) {
          store.deleteBook(bookID)
          dismiss()
        }.disabled(store.state.books.count <= 1)
      }
    }.navigationTitle(store.t("إعدادات المصحف", "Quran settings"))
  }
}

struct QuranReaderView: View {
  @EnvironmentObject private var store: AppStore
  @EnvironmentObject private var audio: QuranAudio
  @EnvironmentObject private var tafsir: TafsirLibrary
  let bookID: String
  @State private var pageInput = ""
  @State private var juzInput = ""
  @State private var showNavigation = false
  @State private var showVerses = false
  @State private var showPlayer = false
  @State private var showSettings = false
  @State private var selectedVerse: Verse?
  @State private var inputError = false
  @State private var zoom: Double?
  private var book: QuranBook? { store.book(bookID) }
  private var page: Int { book?.page ?? 1 }
  private var firstVerse: Verse? { store.content.verses(page).first }
  private var surah: Int { firstVerse?.surah ?? 114 }
  var body: some View {
    presentReader(
      NavigationStack {
        GeometryReader { geometry in
          let spread = isSpread(width: geometry.size.width, height: geometry.size.height)
          let leafPages = visiblePages(spread: spread)
          VStack(spacing: 8) {
            readerPageTools
            readerLeaves(leafPages, spread: spread)
            ReaderPageNavigation(page: page, spread: spread) { turn(by: $0) }
            ReaderPageJumpFields(pageInput: $pageInput, juzInput: $juzInput) { value, isJuz in
              jump(value, juz: isJuz)
            }
            ReaderAudioFooter(audio: audio, showPlayer: $showPlayer, surah: surah)
          }
          .background(store.isDark ? Color(.systemBackground) : store.accent.opacity(0.035))
          .accessibilityAction(named: Text(store.t("الصفحة التالية", "Next page"))) { turn(by: 1) }
          .accessibilityAction(named: Text(store.t("الصفحة السابقة", "Previous page"))) {
            turn(by: -1)
          }
        }
        .navigationTitle(readerTitle)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { readerToolbar }
      })
  }
  private var readerTitle: String {
    page <= 604 ? store.content.surah(surah).arabicName : store.t("دعاء ختم القرآن", "Khatm dua")
  }
  private func isSpread(width: CGFloat, height: CGFloat) -> Bool {
    width > height && width > 700 && page <= 604
  }
  private func visiblePages(spread: Bool) -> [Int] {
    guard spread else { return [page] }
    let anchor = page.isMultiple(of: 2) ? page - 1 : page
    return [anchor, min(604, anchor + 1)]
  }
  private var readerPageTools: some View {
    HStack {
      Button {
        showNavigation = true
      } label: {
        Label(store.t("السور والبحث", "Navigate & search"), systemImage: "list.bullet")
      }
      Spacer()
      Button {
        store.togglePageBookmark(bookID)
      } label: {
        Image(systemName: book?.pageBookmarks.contains(page) == true ? "bookmark.fill" : "bookmark")
      }.accessibilityLabel(store.t("حفظ الصفحة", "Bookmark page"))
      Button {
        showVerses = true
      } label: {
        Label(store.t("الآيات", "Ayahs"), systemImage: "text.alignright")
      }
    }.font(.callout).padding(.horizontal)
  }
  private func readerLeaves(_ leafPages: [Int], spread: Bool) -> some View {
    HStack(spacing: 12) {
      ForEach(Array(Set(leafPages)).sorted(), id: \.self) { leaf in
        readerLeaf(leaf, spread: spread)
      }
    }.padding(.horizontal, 10)
  }
  private func readerLeaf(_ leaf: Int, spread: Bool) -> some View {
    SVGLeaf(
      url: store.content.pageURL(leaf),
      hitmapURL: store.content.root.appendingPathComponent("page-hitmaps.json"),
      pageNumber: leaf, scale: zoom ?? store.scale,
      highlightedKey: audio.currentVerse.map { "\(audio.currentSurah):\($0)" },
      onTurn: { turn(by: $0 * (spread ? 2 : 1)) },
      onZoom: { value in if abs((zoom ?? store.scale) - value) > 0.02 { zoom = value } }
    ) { key in
      if let key, let verse = store.content.byKey[key] {
        selectedVerse = verse
      } else {
        showVerses = true
      }
    }
    .modifier(NightPaper(enabled: store.isDark))
    .background(store.isDark ? Color.black : Color(red: 0.99, green: 0.98, blue: 0.94))
    .clipShape(RoundedRectangle(cornerRadius: 8))
    .overlay(RoundedRectangle(cornerRadius: 8).stroke(store.accent.opacity(0.6), lineWidth: 1))
  }
  @ToolbarContentBuilder private var readerToolbar: some ToolbarContent {
    ToolbarItemGroup(placement: .topBarLeading) {
      Button {
        store.activeBookID = nil
      } label: {
        Image(systemName: "house")
      }
      .accessibilityLabel(store.t("العودة للمكتبة", "Back to library"))
      Button {
        store.state.preferences.language = store.arabic ? "en" : "ar"
      } label: {
        Text(store.arabic ? "EN" : "ع")
      }
    }
    ToolbarItemGroup(placement: .topBarTrailing) {
      Button {
        store.state.preferences.dark.toggle()
      } label: {
        Image(systemName: store.isDark ? "sun.max" : "moon")
      }.accessibilityLabel(store.t("المظهر", "Appearance"))
      Button {
        showSettings = true
      } label: {
        Image(systemName: "gearshape")
      }
      .accessibilityLabel(store.t("الإعدادات", "Settings"))
    }
  }
  private func presentReader<Content: View>(_ content: Content) -> some View {
    content
      .sheet(isPresented: $showNavigation) {
        SheetFrame(title: store.t("انتقال وبحث", "Navigate & search")) {
          ReaderNavigationView(bookID: bookID)
        }
      }
      .sheet(isPresented: $showVerses) {
        SheetFrame(title: store.t("آيات الصفحة", "Page ayahs")) { pageVerses }
      }
      .sheet(isPresented: $showPlayer) {
        SheetFrame(title: store.t("الصوت والتكرار", "Audio & loops")) {
          ScrollView {
            AudioControlsView(
              audio: audio, arabic: store.arabic, surah: surah, verse: firstVerse?.number ?? 1,
              verseCount: store.content.surah(surah).verseCount)
          }
        }
      }
      .sheet(isPresented: $showSettings) {
        SheetFrame(title: store.t("الإعدادات", "Settings")) { SettingsView() }
      }
      .sheet(item: $selectedVerse) { verse in
        SheetFrame(title: "\(store.content.surah(verse.surah).arabicName) · \(verse.number)") {
          VerseActionsView(bookID: bookID, verse: verse)
        }
      }
      .alert(store.t("رقم غير صالح", "Invalid number"), isPresented: $inputError) {
        Button(store.t("تم", "OK"), role: .cancel) {}
      } message: {
        Text(
          store.t(
            "اختر صفحة من ١ إلى ٦٠٦ أو جزءاً من ١ إلى ٣٠.",
            "Choose a page from 1–606 or a juz from 1–30."))
      }
      .onChange(of: audio.currentVerse) { _, value in
        if let value, let verse = store.content.byKey["\(audio.currentSurah):\(value)"] {
          store.turnBook(bookID, to: verse.page)
        }
      }
      .onChange(of: store.scale) { _, _ in zoom = nil }
  }
  private var pageVerses: some View {
    List {
      if page > 604 {
        Text(
          store.t("دعاء ختم القرآن — ملحق بعد الصفحة ٦٠٤.", "Khatm dua — appendix after page 604."))
      }
      ForEach(store.content.verses(page)) { verse in
        Button {
          showVerses = false
          DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { selectedVerse = verse }
        } label: {
          VStack(alignment: .trailing, spacing: 10) {
            Text(verse.text).font(.custom("AmiriQuran-Regular", size: 26 * store.scale)).frame(
              maxWidth: .infinity, alignment: .trailing
            ).environment(\.layoutDirection, .rightToLeft)
            Text("\(store.content.surah(verse.surah).arabicName) · \(verse.number)").font(.caption)
              .foregroundStyle(.secondary)
          }.padding(.vertical, 8)
        }
      }
    }
  }
  private func turn(by step: Int) {
    let anchor = abs(step) == 2 && page.isMultiple(of: 2) ? page - 1 : page
    store.turnBook(bookID, to: min(606, max(1, anchor + step)))
  }
  private func jump(_ value: String, juz: Bool) {
    guard let number = Content.number(value), number.rounded() == number,
      (juz ? 1...30 : 1...606).contains(Int(number))
    else {
      inputError = true
      return
    }
    store.turnBook(bookID, to: juz ? store.content.juzPages[Int(number)] ?? page : Int(number))
    pageInput = ""
    juzInput = ""
  }
}

private struct ReaderPageNavigation: View {
  @EnvironmentObject private var store: AppStore
  let page: Int
  let spread: Bool
  let onTurn: (Int) -> Void
  var body: some View {
    HStack {
      Button {
        onTurn(spread ? -2 : -1)
      } label: {
        Label(store.t("السابقة", "Previous"), systemImage: "chevron.backward")
      }.disabled(page <= 1)
      Spacer()
      Text(store.t("صفحة \(page) من ٦٠٦", "Page \(page) of 606"))
        .monospacedDigit().font(.caption)
      Spacer()
      Button {
        onTurn(spread ? 2 : 1)
      } label: {
        Label(store.t("التالية", "Next"), systemImage: "chevron.forward")
      }.disabled(page >= 606).accessibilityIdentifier("quran.reader.nextPage")
    }.padding(.horizontal)
  }
}

private struct ReaderPageJumpFields: View {
  @EnvironmentObject private var store: AppStore
  @Binding var pageInput: String
  @Binding var juzInput: String
  let onJump: (String, Bool) -> Void
  var body: some View {
    HStack {
      TextField(store.t("صفحة", "Page"), text: $pageInput).keyboardType(.numberPad)
        .textFieldStyle(.roundedBorder)
      Button(store.t("انتقال", "Go")) { onJump(pageInput, false) }
      TextField(store.t("جزء", "Juz"), text: $juzInput).keyboardType(.numberPad)
        .textFieldStyle(.roundedBorder)
      Button(store.t("انتقال", "Go")) { onJump(juzInput, true) }
    }.padding(.horizontal).frame(maxWidth: 550)
  }
}

private struct ReaderAudioFooter: View {
  @EnvironmentObject private var store: AppStore
  @ObservedObject var audio: QuranAudio
  @Binding var showPlayer: Bool
  let surah: Int
  var body: some View {
    HStack {
      Button {
        audio.toggle(surah: surah)
      } label: {
        Label(
          audio.isPlaying
            ? store.t("إيقاف مؤقت", "Pause") : store.t("تشغيل السورة", "Play surah"),
          systemImage: audio.isPlaying ? "pause.fill" : "play.fill")
      }.buttonStyle(.borderedProminent)
      Button {
        audio.stop()
      } label: {
        Image(systemName: "stop.fill")
      }
      .buttonStyle(.bordered).accessibilityLabel(store.t("إيقاف", "Stop"))
      Button {
        showPlayer = true
      } label: {
        Label(store.t("القارئ والتكرار", "Reciter & loops"), systemImage: "mic")
      }.buttonStyle(.bordered)
    }.padding(.bottom, 6)
  }
}

struct NightPaper: ViewModifier {
  let enabled: Bool
  @ViewBuilder func body(content: SwiftUI._ViewModifier_Content<Self>) -> some View {
    if enabled { content.colorInvert() } else { content }
  }
}

struct ReaderNavigationView: View {
  @EnvironmentObject private var store: AppStore
  @Environment(\.dismiss) private var dismiss
  let bookID: String
  @State private var query = ""
  @State private var section = 0
  var body: some View {
    VStack {
      Picker(store.t("انتقال", "Navigate"), selection: $section) {
        Text(store.t("السور", "Surahs")).tag(0)
        Text(store.t("الأجزاء", "Juz")).tag(1)
        Text(store.t("المحفوظات", "Bookmarks")).tag(2)
        Text(store.t("بحث", "Search")).tag(3)
      }.pickerStyle(.segmented).padding()
      List {
        if section == 0 {
          ForEach(store.content.quran.surahs) { surah in
            Button("\(surah.number) · \(surah.arabicName)") { go(surah.startPage) }
          }
        } else if section == 1 {
          ForEach(1...30, id: \.self) { juz in
            Button(store.t("الجزء \(juz)", "Juz \(juz)")) { go(store.content.juzPages[juz] ?? 1) }
          }
        } else if section == 2 {
          if let book = store.book(bookID) {
            ForEach(book.pageBookmarks.sorted(), id: \.self) { page in
              Button(store.t("صفحة \(page)", "Page \(page)")) { go(page) }
            }
            ForEach(book.verseBookmarks.sorted(), id: \.self) { key in
              if let verse = store.content.byKey[key] {
                Button("\(store.content.surah(verse.surah).arabicName) · \(verse.number)") {
                  go(verse.page)
                }
              }
            }
            if book.pageBookmarks.isEmpty && book.verseBookmarks.isEmpty {
              Text(store.t("لا توجد محفوظات بعد", "No bookmarks yet"))
            }
          }
        } else {
          TextField(
            store.t(
              "ابحث في النص العربي أو برقم الآية مثل ٢:٢٥٥",
              "Search Arabic text or an ayah such as 2:255"), text: $query)
          ForEach(store.content.search(query)) { verse in
            Button {
              go(verse.page)
            } label: {
              VStack(alignment: .trailing) {
                Text(verse.text).font(.custom("AmiriQuran-Regular", size: 23))
                Text(verse.id).font(.caption)
              }
            }
          }
          if !query.isEmpty {
            Text(store.t("تظهر أول ١٥٠ نتيجة", "Showing up to 150 results")).font(.caption)
              .foregroundStyle(.secondary)
          }
        }
      }
    }
  }
  private func go(_ page: Int) {
    store.turnBook(bookID, to: page)
    dismiss()
  }
}

struct VerseActionsView: View {
  @EnvironmentObject private var store: AppStore
  @EnvironmentObject private var audio: QuranAudio
  @EnvironmentObject private var tafsir: TafsirLibrary
  let bookID: String
  let verse: Verse
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 22) {
        Text(verse.text).font(.custom("AmiriQuran-Regular", size: 30 * store.scale)).frame(
          maxWidth: .infinity, alignment: .trailing
        ).environment(\.layoutDirection, .rightToLeft).textSelection(.enabled)
        Button {
          audio.playVerse(surah: verse.surah, verse: verse.number)
        } label: {
          Label(store.t("تشغيل الآية", "Play ayah"), systemImage: "play")
        }
        Button {
          audio.loop(
            surah: verse.surah, start: verse.number,
            end: store.content.surah(verse.surah).verseCount)
        } label: {
          Label(store.t("بدء التكرار من هنا", "Start loop here"), systemImage: "repeat")
        }
        Button {
          store.toggleVerseBookmark(bookID, verse: verse.id)
        } label: {
          Label(
            store.book(bookID)?.verseBookmarks.contains(verse.id) == true
              ? store.t("إزالة حفظ الآية", "Remove ayah bookmark")
              : store.t("حفظ الآية", "Bookmark ayah"), systemImage: "bookmark")
        }
        Divider()
        TafsirPassageView(
          library: tafsir, arabic: store.arabic, surah: verse.surah, verse: verse.number)
      }.padding(24)
    }
  }
}
