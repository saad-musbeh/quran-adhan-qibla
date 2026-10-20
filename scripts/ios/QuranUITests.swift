import XCTest

final class QuranUITests: XCTestCase {
  private let app = XCUIApplication()

  override func setUpWithError() throws {
    continueAfterFailure = false
    XCUIDevice.shared.orientation = .portrait
    app.launch()
    let quran = app.buttons["menu-quran"]
    XCTAssertTrue(quran.waitForExistence(timeout: 45), "The home menu did not finish loading")
    quran.tap()
    XCTAssertTrue(app.buttons["open-book-1"].waitForExistence(timeout: 45))
  }

  override func tearDownWithError() throws {
    if let run = testRun, run.failureCount > 0 {
      screenshot("Failure: \(name)")
      let hierarchy = XCTAttachment(string: app.debugDescription)
      hierarchy.name = "Accessibility hierarchy"
      hierarchy.lifetime = .keepAlways
      add(hierarchy)
    }
    app.terminate()
    XCUIDevice.shared.orientation = .portrait
  }

  private func screenshot(_ name: String) {
    let attachment = XCTAttachment(screenshot: app.screenshot())
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
  }

  private func settingsScroll() -> XCUIElement {
    let scroll = app.descendants(matching: .any)["overall-settings"]
    XCTAssertTrue(scroll.waitForExistence(timeout: 10))
    return scroll
  }

  func testAdhkarCollectionsAndReminders() {
    app.descendants(matching: .any)["tab-adhkar"].tap()
    for id in ["morning", "evening", "after-prayer"] {
      let book = app.buttons["adhkar-\(id)"]
      XCTAssertTrue(book.waitForExistence(timeout: 10))
      book.tap()
      let source = app.buttons["dhikr-source-\(id)-1"]
      XCTAssertTrue(source.waitForExistence(timeout: 10))
      source.tap()
      XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "حصن المسلم")).firstMatch.waitForExistence(timeout: 5))
      app.buttons["dhikr-source-close"].tap()
      app.buttons["adhkar-back"].tap()
    }
    screenshot("Adhkar three fixed collections")
    app.buttons["adhkar-reminders"].tap()
    XCTAssertTrue(app.switches["salawat-enabled"].waitForExistence(timeout: 5))
    XCTAssertTrue(app.switches["reminder-morning-enabled"].exists)
    XCTAssertTrue(app.switches["reminder-evening-enabled"].exists)
    app.buttons["reminders-close"].tap()
    app.descendants(matching: .any)["tab-quran"].tap()
  }

  private func revealReader() {
    XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 30))
    for _ in 0..<4 {
      if app.buttons["reader-library"].isHittable { return }
      app.webViews.firstMatch.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
      if app.buttons["reader-library"].waitForExistence(timeout: 2) { return }
    }
    XCTFail("Reader tools were not available")
  }

  private func ensureBookCount(_ count: Int) {
    for number in 2...count {
      let book = app.buttons["open-book-\(number)"]
      if book.exists { continue }
      let add = app.buttons["add-quran-book"]
      XCTAssertTrue(add.waitForExistence(timeout: 5))
      for _ in 0..<6 {
        if add.isHittable { break }
        app.scrollViews.firstMatch.swipeUp()
      }
      XCTAssertTrue(add.isHittable)
      let enabled = XCTNSPredicateExpectation(predicate: NSPredicate(format: "enabled == true"), object: add)
      XCTAssertEqual(XCTWaiter.wait(for: [enabled], timeout: 10), .completed)
      add.tap()
      XCTAssertTrue(book.waitForExistence(timeout: 5))
    }
  }

  private func expectSpread(_ pages: String) {
    let number = app.staticTexts["reader-page-number"]
    let spread = XCTNSPredicateExpectation(predicate: NSPredicate { _,_ in number.label.hasPrefix(pages) }, object: number)
    XCTAssertEqual(XCTWaiter.wait(for: [spread], timeout: 15), .completed)
  }

  private func turnSpread(onRightPage: Bool, forward: Bool) {
    let start = app.webViews.firstMatch.coordinate(withNormalizedOffset: CGVector(dx: onRightPage ? 0.75 : 0.25, dy: 0.5))
    start.press(forDuration: 0.01, thenDragTo: start.withOffset(CGVector(dx: 0, dy: forward ? -90 : 90)))
    revealReader()
  }

  func testTabletMainMenuAndLandscapeReading() throws {
    let size=app.windows.firstMatch.frame.size
    guard min(size.width,size.height)>=600 else { throw XCTSkip("Tablet layout requires an iPad simulator") }
    // This workflow runs the tablet test alone on a fresh simulator.
    XCTAssertFalse(app.buttons["open-book-2"].exists)
    XCTAssertTrue(app.buttons["add-quran-book"].exists)
    ensureBookCount(6)
    XCTAssertFalse(app.buttons["add-quran-book"].exists)
    XCTAssertFalse(app.buttons["open-book-7"].exists)
    app.buttons["open-main-menu"].tap()
    XCTAssertTrue(app.buttons["menu-quran"].waitForExistence(timeout: 5))
    XCTAssertTrue(app.buttons["menu-adhan"].exists)
    XCTAssertTrue(app.buttons["menu-qibla"].exists)
    screenshot("iPad home page portrait")
    app.buttons["menu-quran"].tap()
    app.buttons["open-book-6"].tap()
    revealReader()
    XCUIDevice.shared.orientation = .landscapeLeft
    defer { XCUIDevice.shared.orientation = .portrait }
    // WebKit can expose nested WebView accessibility nodes for one native view.
    let spread=XCTNSPredicateExpectation(predicate:NSPredicate { _,_ in
      self.app.descendants(matching: .any).matching(identifier: "mushaf-page").count == 1 &&
      self.app.windows.firstMatch.frame.width > self.app.windows.firstMatch.frame.height
    },object:app)
    XCTAssertEqual(XCTWaiter.wait(for:[spread],timeout:15),.completed)
    revealReader()
    expectSpread("١–٢")
    screenshot("iPad landscape two-page Mushaf")
    turnSpread(onRightPage: false, forward: true)
    expectSpread("٣–٤")
    turnSpread(onRightPage: true, forward: false)
    expectSpread("١–٢")
    turnSpread(onRightPage: true, forward: true)
    expectSpread("٣–٤")
    app.buttons["open-main-menu"].tap()
    XCTAssertTrue(app.buttons["menu-quran"].waitForExistence(timeout: 5))
    screenshot("iPad home page landscape")
    app.buttons["menu-quran"].tap()
    XCTAssertTrue(app.buttons["open-book-6"].waitForExistence(timeout: 10))
    XCTAssertTrue(app.buttons["open-book-6"].label.hasSuffix("٣"))
    XCTAssertTrue(app.buttons["open-book-5"].label.hasSuffix("١"))
    app.buttons["open-main-menu"].tap()
    screenshot("iPad home page landscape")
  }

  func testBooksKeepIndependentPagesAndNames() {
    ensureBookCount(2)
    screenshot("Quran shelf")
    app.buttons["rename-book-1"].tap()
    let name = app.textFields["book-name-input"]
    XCTAssertTrue(name.waitForExistence(timeout: 5))
    name.tap()
    // Wait for each controlled-input update before XCTest sends another key.
    // This also fails at entry if the simulator keyboard drops a character.
    var entered = ""
    for character in "Simulator reading" {
      name.typeText(String(character))
      entered.append(character)
      let value = XCTNSPredicateExpectation(predicate: NSPredicate(format: "value == %@", entered), object: name)
      XCTAssertEqual(XCTWaiter.wait(for: [value], timeout: 5), .completed)
    }
    app.buttons["save-book-name"].tap()
    app.buttons["open-book-1"].tap()
    revealReader()
    app.buttons["reader-next-page"].tap()
    revealReader()
    screenshot("Reading page 2")
    app.buttons["reader-library"].tap()
    XCTAssertTrue(app.buttons["open-book-1"].waitForExistence(timeout: 10))
    XCTAssertTrue(app.buttons["open-book-1"].label.contains("Simulator reading"))
    XCTAssertTrue(app.buttons["open-book-1"].label.hasSuffix("٢"))
    XCTAssertTrue(app.buttons["open-book-2"].label.hasSuffix("١"))
    app.buttons["open-book-2"].tap()
    revealReader()
    XCTAssertTrue(app.staticTexts["reader-page-number"].label.hasPrefix("١"))
    screenshot("Independent book 2 at Al-Fatiha")
    app.buttons["reader-library"].tap()
    app.terminate()
    app.launch()
    XCTAssertTrue(app.buttons["menu-quran"].waitForExistence(timeout: 45))
    app.buttons["menu-quran"].tap()
    XCTAssertTrue(app.buttons["open-book-1"].waitForExistence(timeout: 30))
    XCTAssertTrue(app.buttons["open-book-1"].label.contains("Simulator reading"))
    XCTAssertTrue(app.buttons["open-book-1"].label.hasSuffix("٢"))
    XCTAssertTrue(app.buttons["open-book-2"].label.hasSuffix("١"))
  }

  func testDefaultVoiceAndNativePlaybackControls() {
    ensureBookCount(2)
    app.buttons["open-book-2"].tap()
    revealReader()
    let selector = app.buttons["reader-audio-controls"]
    XCTAssertEqual(selector.label, "القارئ")
    selector.tap()
    let picker = app.buttons["audio-reciter-picker"]
    XCTAssertTrue(picker.waitForExistence(timeout: 10))
    XCTAssertTrue(picker.label.contains("محمود خليل الحصري"))
    // Opening the microphone selector already expands the reciter list.
    let defaultVoice = app.descendants(matching: .any)["reciter-husary"]
    XCTAssertTrue(defaultVoice.waitForExistence(timeout: 10))
    XCTAssertEqual(defaultVoice.label, "محمود خليل الحصري")
    defaultVoice.tap()
    let reciter = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "محمود خليل الحصري")).firstMatch
    XCTAssertTrue(reciter.waitForExistence(timeout: 10))
    app.buttons["audio-play-pause"].tap()
    let status=app.staticTexts["audio-status"]
    let playing=XCTNSPredicateExpectation(predicate:NSPredicate { _,_ in ["Playing","جارٍ التشغيل"].contains(status.label) },object:status)
    XCTAssertEqual(XCTWaiter.wait(for:[playing],timeout:20),.completed)
    let elapsed=app.staticTexts["audio-time"]
    let advances=XCTNSPredicateExpectation(predicate:NSPredicate { _,_ in
      let current = elapsed.label.split(separator: "/", maxSplits: 1).first ?? ""
      return current.compactMap { $0.wholeNumberValue }.contains { $0 > 0 }
    },object:elapsed)
    XCTAssertEqual(XCTWaiter.wait(for:[advances],timeout:10),.completed)
    app.buttons["audio-play-pause"].tap()
    let paused=XCTNSPredicateExpectation(predicate:NSPredicate { _,_ in ["Paused","متوقف مؤقتًا"].contains(status.label) },object:status)
    XCTAssertEqual(XCTWaiter.wait(for:[paused],timeout:5),.completed)
    screenshot("Al-Husary native playback paused")
    app.buttons["audio-replay"].tap()
    app.buttons["audio-stop"].tap()
    let stopped = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: status)
    XCTAssertEqual(XCTWaiter.wait(for: [stopped], timeout: 5), .completed)

    // Husary's current timing endpoint lacks canonical seven-ayah coverage.
    // Verify timed navigation with Ghamdi's complete, source-hosted timings.
    picker.tap()
    let ghamdi = app.descendants(matching: .any)["reciter-ghamdi"]
    XCTAssertTrue(ghamdi.waitForExistence(timeout: 10))
    ghamdi.tap()
    app.buttons["audio-play-pause"].tap()
    let next = app.buttons["audio-next"]
    let timedAyah = XCTNSPredicateExpectation(predicate: NSPredicate(format: "enabled == true"), object: next)
    XCTAssertEqual(XCTWaiter.wait(for: [timedAyah], timeout: 30), .completed)
    next.tap()
    app.buttons["audio-replay"].tap()
    app.buttons["audio-stop"].tap()
    let ended = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: status)
    XCTAssertEqual(XCTWaiter.wait(for: [ended], timeout: 5), .completed)
    app.terminate()
  }

  func testLocalPrayerAlertsAndDownloadManager() {
    app.buttons["open-main-menu"].tap()
    app.buttons["menu-adhan"].tap()
    app.buttons["adhan-location"].tap()
    let manual = app.buttons["location-manual"]
    for _ in 0..<3 { if manual.isHittable { break }; app.scrollViews.firstMatch.swipeUp() }
    XCTAssertTrue(manual.waitForExistence(timeout: 5))
    manual.tap()
    let example = app.buttons["location-example"]
    for _ in 0..<3 { if example.isHittable { break }; app.scrollViews.firstMatch.swipeUp() }
    example.tap()
    app.buttons["location-confirm"].tap()
    XCTAssertTrue(app.buttons["open-settings"].waitForExistence(timeout: 10))
    app.buttons["open-settings"].tap()
    XCTAssertFalse(app.descendants(matching: .any)["settings-adhan"].exists)
    let toggle = app.switches["prayer-alert-toggle"]
    XCTAssertTrue(toggle.waitForExistence(timeout: 10))
    for _ in 0..<6 { if toggle.isHittable { break }; settingsScroll().swipeUp() }
    if toggle.value as? String != "1" { toggle.tap() }
    let allow = XCUIApplication(bundleIdentifier: "com.apple.springboard").buttons["Allow"]
    if allow.waitForExistence(timeout: 5) { allow.tap() }
    let count = app.staticTexts["prayer-scheduled-count"]
    XCTAssertTrue(count.waitForExistence(timeout: 30))
    let digits = count.label.compactMap { $0.wholeNumberValue }.map { String($0) }.joined()
    let value = Int(digits) ?? 0
    XCTAssertGreaterThanOrEqual(value, 35)
    XCTAssertLessThanOrEqual(value, 40)
    screenshot("iOS scheduled prayer alerts")
    let testAlert = app.buttons["prayer-test-alert"]
    for _ in 0..<6 { if testAlert.isHittable { break }; settingsScroll().swipeUp() }
    testAlert.tap()
    XCTAssertTrue(app.staticTexts["prayer-test-sent"].waitForExistence(timeout: 10))
    Thread.sleep(forTimeInterval: 6)
    screenshot("Prayer test notification")
    for _ in 0..<6 { if toggle.isHittable { break }; settingsScroll().swipeDown() }
    toggle.tap()
    let cancelled = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: count)
    XCTAssertEqual(XCTWaiter.wait(for: [cancelled], timeout: 20), .completed)
    let downloads = app.buttons["manage-downloads"]
    for _ in 0..<8 { if downloads.isHittable { break }; settingsScroll().swipeDown() }
    downloads.tap()
    XCTAssertTrue(app.buttons["downloads-close"].waitForExistence(timeout: 10))
    XCTAssertTrue(app.staticTexts["saved-audio-ghamdi-1"].waitForExistence(timeout: 15))
    XCTAssertTrue(app.staticTexts["saved-audio-ghamdi-1"].label.contains("٧/٧"))
    screenshot("Download manager")
    app.descendants(matching: .any)["downloads-audio"].tap()
    let wholeQuran = app.buttons["download-whole-quran"]
    XCTAssertTrue(wholeQuran.waitForExistence(timeout: 5))
    let ready = XCTNSPredicateExpectation(predicate: NSPredicate(format: "enabled == true"), object: wholeQuran)
    XCTAssertEqual(XCTWaiter.wait(for: [ready], timeout: 20), .completed)
    wholeQuran.tap()
    XCTAssertTrue(app.staticTexts["whole-quran-progress"].waitForExistence(timeout: 10))
    let cancelDownload = app.buttons["audio-download-cancel"]
    XCTAssertTrue(cancelDownload.waitForExistence(timeout: 10))
    cancelDownload.tap()
    let stopped = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: app.staticTexts["whole-quran-progress"])
    XCTAssertEqual(XCTWaiter.wait(for: [stopped], timeout: 20), .completed)
    screenshot("Whole Quran download cancelled")
    app.descendants(matching: .any)["downloads-saved"].tap()
    XCTAssertTrue(app.staticTexts["saved-audio-ghamdi-1"].waitForExistence(timeout: 15))
    XCTAssertTrue(app.staticTexts["saved-audio-ghamdi-1"].label.contains("٧/٧"))
    app.buttons["downloads-close"].tap()
    app.buttons["settings-close"].tap()
  }

  func testPolishLanguageMenuAndRepeatControls() {
    app.buttons["open-languages"].tap()
    XCTAssertTrue(app.descendants(matching: .any)["language-ar"].waitForExistence(timeout: 5))
    XCTAssertTrue(app.descendants(matching: .any)["language-en"].exists)
    let search = app.textFields.firstMatch
    search.tap()
    search.typeText("French")
    XCTAssertFalse(app.descendants(matching: .any)["language-fr"].exists)
    app.buttons["language-picker-close"].tap()
    app.buttons["open-settings"].tap()
    let extra = app.buttons["settings-extra-testing"]
    for _ in 0..<14 { if extra.isHittable { break }; settingsScroll().swipeUp() }
    XCTAssertTrue(extra.isHittable)
    extra.tap()
    let toggle = app.switches["settings-testing-languages"]
    for _ in 0..<3 { if toggle.isHittable { break }; settingsScroll().swipeUp() }
    XCTAssertTrue(toggle.isHittable)
    toggle.tap()
    app.buttons["settings-close"].tap()
    app.buttons["open-languages"].tap()
    let testingSearch = app.textFields.firstMatch
    testingSearch.tap()
    testingSearch.typeText("French")
    XCTAssertTrue(app.descendants(matching: .any)["language-fr"].waitForExistence(timeout: 5))
    app.buttons["language-picker-close"].tap()
    app.buttons["open-settings"].tap()
    for _ in 0..<14 { if extra.isHittable { break }; settingsScroll().swipeUp() }
    extra.tap()
    for _ in 0..<3 { if toggle.isHittable { break }; settingsScroll().swipeUp() }
    toggle.tap()
    app.buttons["settings-close"].tap()
    app.buttons["open-book-1"].tap()
    revealReader()
    app.buttons["reader-audio-repeat"].tap()
    let start = app.buttons["repeat-start"]
    XCTAssertTrue(start.waitForExistence(timeout: 5))
    XCTAssertTrue(start.label.contains("بدء التكرار") || start.label.contains("Start repeating"))
    screenshot("Repeat control contrast")
    app.buttons["repeat-close"].tap()
  }

  func testRepeatedTabTransitions() {
    ensureBookCount(2)
    // The library must retain its dock after the normal auto-hide delay.
    Thread.sleep(forTimeInterval: 5)
    XCTAssertTrue(app.descendants(matching: .any)["tab-adhan"].isHittable)
    app.buttons["open-book-2"].tap()
    revealReader()
    XCTAssertFalse(app.descendants(matching: .any)["tab-adhan"].exists)
    app.buttons["reader-library"].tap()
    XCTAssertTrue(app.descendants(matching: .any)["tab-adhan"].waitForExistence(timeout: 5))
    for _ in 0..<6 {
      app.descendants(matching: .any)["tab-adhan"].tap()
      XCTAssertTrue(app.buttons["open-settings"].waitForExistence(timeout: 5))
      app.descendants(matching: .any)["tab-quran"].tap()
      XCTAssertTrue(app.buttons["open-book-1"].waitForExistence(timeout: 5))
      app.descendants(matching: .any)["tab-qibla"].tap()
      XCTAssertTrue(app.buttons["open-settings"].waitForExistence(timeout: 5))
      app.descendants(matching: .any)["tab-quran"].tap()
      XCTAssertTrue(app.buttons["open-book-1"].waitForExistence(timeout: 5))
    }
    screenshot("Quran after repeated tab switches")
  }
}
