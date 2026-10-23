import SwiftUI

public struct TafsirLibraryView: View {
  @ObservedObject private var library: TafsirLibrary
  private let arabic: Bool
  public init(library: TafsirLibrary, arabic: Bool) {
    self.library = library
    self.arabic = arabic
  }
  public var body: some View {
    List {
      Section(arabic ? "التفاسير المتاحة" : "Available tafsirs") {
        ForEach(library.editions) { edition in
          VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top) {
              VStack(alignment: .leading, spacing: 4) {
                Text(edition.displayTitle).font(.headline)
                if let author = edition.author { Text(author).font(.subheadline) }
                Text(edition.publisher).font(.caption).foregroundStyle(.secondary)
              }
              Spacer()
              if library.selectedID == edition.id {
                Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
              }
            }
            let dateLabel =
              edition.digitalDateIsRelease == true
              ? (arabic ? "الإصدار الرقمي: " : "Digital release: ")
              : (arabic ? "الإتاحة الرقمية: " : "Digital availability: ")
            Text(
              [
                edition.sourceName, edition.sourceEdition,
                dateLabel + edition.firstDigitalPublication,
              ].compactMap { $0 }.joined(separator: " · ")
            ).font(.caption2).foregroundStyle(.secondary)
            HStack {
              if library.installedIDs.contains(edition.id) {
                Button(arabic ? "اختيار" : "Select") { library.selectedID = edition.id }
                Button(arabic ? "حذف" : "Remove", role: .destructive) { library.remove(edition) }
              } else if library.busyID == edition.id {
                ProgressView(value: library.progress ?? 0)
                Button(arabic ? "إلغاء" : "Cancel") { library.cancel() }
              } else {
                Button(arabic ? "تنزيل" : "Download") { library.download(edition) }.disabled(
                  library.busyID != nil)
              }
              Spacer()
              if let url = URL(string: edition.url) {
                Link(arabic ? "المصدر" : "Source", destination: url).font(.caption)
              }
            }
            if library.busyID == edition.id, let progress = library.progress {
              ProgressView(value: progress)
              Text("\(Int(progress * 100))%").font(.caption2)
            }
          }.padding(.vertical, 5)
        }
      }
      if let error = library.error {
        Section { Text(tafsirError(error, arabic: arabic)).foregroundStyle(.red) }
      }
    }
    .environment(\.layoutDirection, arabic ? .rightToLeft : .leftToRight)
  }
}

public struct TafsirPassageView: View {
  @ObservedObject private var library: TafsirLibrary
  private let arabic: Bool
  private let surah: Int
  private let verse: Int
  @State private var showLibrary = false
  public init(library: TafsirLibrary, arabic: Bool, surah: Int, verse: Int) {
    self.library = library
    self.arabic = arabic
    self.surah = surah
    self.verse = verse
  }
  public var body: some View {
    let selected = library.editions.first { $0.id == library.selectedID }
    let textRTL = selected?.isArabic ?? arabic
    Group {
      if library.isLoading {
        ProgressView(arabic ? "جارٍ فتح التفسير" : "Loading tafsir")
      } else if let passage = library.text(surah: surah, verse: verse) {
        VStack(alignment: .leading, spacing: 14) {
          if let selected {
            VStack(alignment: .leading, spacing: 4) {
              Text(selected.displayTitle).font(.headline)
              Text(selected.publisher).font(.caption).foregroundStyle(.secondary)
              if let source = URL(string: selected.url) {
                Link(arabic ? "المصدر" : "Source", destination: source).font(.caption)
              }
            }
          }
          Text(passage.text).textSelection(.enabled)
          if let note = passage.footnotes, !note.isEmpty {
            Text(note).font(.footnote).foregroundStyle(.secondary)
          }
          if let start = passage.start, let end = passage.end {
            Text(arabic ? "الآيات \(start)–\(end)" : "Verses \(start)–\(end)").font(.caption)
              .foregroundStyle(.secondary)
          }
        }.padding(.vertical)
      } else {
        VStack(spacing: 12) {
          ContentUnavailableView(
            arabic ? "التفسير غير متاح دون اتصال" : "Tafsir unavailable offline",
            systemImage: "book.closed",
            description: Text(
              arabic
                ? "نزّل كتاب تفسير من المكتبة لقراءته دون اتصال."
                : "Download a tafsir edition from the library to read it offline."))
          if let error = library.error {
            Text(tafsirError(error, arabic: arabic)).font(.footnote).foregroundStyle(.red)
              .multilineTextAlignment(.center).padding(.horizontal)
          }
          Button(arabic ? "فتح مكتبة التفسير" : "Open tafsir library") { showLibrary = true }
        }
      }
    }
    .navigationTitle(arabic ? "التفسير" : "Tafsir")
    .environment(\.layoutDirection, textRTL ? .rightToLeft : .leftToRight)
    .sheet(isPresented: $showLibrary) {
      NavigationStack {
        TafsirLibraryView(library: library, arabic: arabic)
          .navigationTitle(arabic ? "مكتبة التفسير" : "Tafsir library")
          .toolbar {
            ToolbarItem(placement: .confirmationAction) {
              Button(arabic ? "تم" : "Done") { showLibrary = false }
            }
          }
      }
    }
  }
}

private func tafsirError(_ message: String, arabic: Bool) -> String {
  guard arabic else { return message }
  let lower = message.lowercased()
  if lower.contains("newer release") {
    return "تغيّر إصدار الكتاب في المصدر. حدّث التطبيق قبل تنزيل النسخة الجديدة."
  }
  if lower.contains("saved") || lower.contains("unreadable") {
    return "تعذّرت قراءة النسخة المحفوظة أو التحقق منها. احذف هذا التنزيل من المكتبة ثم أعد تنزيله."
  }
  if lower.contains("checksum") || lower.contains("metadata") || lower.contains("coverage")
    || lower.contains("size") || lower.contains("validation")
  {
    return
      "لم تتطابق نسخة التفسير مع بيانات المصدر الموثّقة. لم تُثبت النسخة؛ تحقّق من المصدر أو حدّث التطبيق."
  }
  return "تعذّر تنزيل التفسير أو فتحه. تحقّق من الاتصال والمصدر ثم أعد المحاولة."
}
