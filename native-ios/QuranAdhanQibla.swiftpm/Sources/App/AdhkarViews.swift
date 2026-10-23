import SwiftUI

struct AdhkarView: View {
  @EnvironmentObject private var store: AppStore
  private var collection: String { store.adhkarCollection }
  var body: some View {
    VStack {
      Picker(store.t("المجموعة", "Collection"), selection: $store.adhkarCollection) {
        Text(store.t("الصباح", "Morning")).tag("morning")
        Text(store.t("المساء", "Evening")).tag("evening")
        Text(store.t("بعد الصلاة", "After prayer")).tag("after-prayer")
      }.pickerStyle(.segmented).padding()
      ScrollViewReader { proxy in
        ScrollView {
          LazyVStack(spacing: 20) {
            ForEach(store.content.adhkar[collection] ?? []) { entry in
              DhikrCard(entry: entry, showCounter: store.state.preferences.dhikrCounters).id(
                entry.id)
            }
          }.padding(20).frame(maxWidth: 900)
        }.frame(maxWidth: .infinity)
          .onChange(of: collection) { _, _ in
            if let first = store.content.adhkar[collection]?.first {
              proxy.scrollTo(first.id, anchor: .top)
            }
          }
      }
    }
  }
}

struct DhikrCard: View {
  @EnvironmentObject private var store: AppStore
  let entry: Dhikr
  let showCounter: Bool
  @State private var count = 0
  @State private var showReference = false
  var body: some View {
    VStack(alignment: .leading, spacing: 18) {
      Text(entry.text).font(.custom("AmiriQuran-Regular", size: 27 * store.scale)).lineSpacing(8)
        .frame(maxWidth: .infinity, alignment: .trailing).environment(
          \.layoutDirection, .rightToLeft
        ).textSelection(.enabled)
      HStack {
        Text(store.t("عدد المرات: \(entry.count)", "Repetitions: \(entry.count)")).font(.caption)
          .foregroundStyle(.secondary)
        Spacer()
        Button(store.t("المصدر", "Reference")) { showReference.toggle() }.font(.caption)
      }
      if showReference {
        Text(entry.reference).font(.footnote).environment(\.layoutDirection, .rightToLeft)
          .textSelection(.enabled)
      }
      if showCounter {
        HStack {
          Button {
            count = min(entry.count, count + 1)
          } label: {
            Label(
              "\(count) / \(entry.count)",
              systemImage: count == entry.count ? "checkmark.circle.fill" : "plus.circle")
          }.buttonStyle(.borderedProminent)
          Button(store.t("إعادة", "Reset")) { count = 0 }.buttonStyle(.bordered)
        }
      }
    }.padding(22).background(
      Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 18))
  }
}
