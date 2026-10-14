import XCTest

final class QuranUITests: XCTestCase {
  private let app = XCUIApplication()

  override func setUpWithError() throws {
    continueAfterFailure = false
    app.launch()
    if app.buttons["menu-quran"].waitForExistence(timeout: 3) { app.buttons["menu-quran"].tap() }
    XCTAssertTrue(app.buttons["open-book-1"].waitForExistence(timeout: 45))
  }

  private func screenshot(_ name: String) {
    let attachment = XCTAttachment(screenshot: app.screenshot())
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
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
    let spread=XCTNSPredicateExpectation(predicate:NSPredicate { _,_ in self.app.webViews.count==1 },object:app)
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
    XCTAssertTrue(app.buttons["open-book-6"].label.hasSuffix("3"))
    XCTAssertTrue(app.buttons["open-book-5"].label.hasSuffix("1"))
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
    name.typeText("Simulator reading")
    app.buttons["save-book-name"].tap()
    app.buttons["open-book-1"].tap()
    revealReader()
    app.buttons["reader-next-page"].tap()
    revealReader()
    screenshot("Reading page 2")
    app.buttons["reader-library"].tap()
    XCTAssertTrue(app.buttons["open-book-1"].waitForExistence(timeout: 10))
    XCTAssertTrue(app.buttons["open-book-1"].label.contains("Simulator reading"))
    XCTAssertTrue(app.buttons["open-book-1"].label.hasSuffix("2"))
    XCTAssertTrue(app.buttons["open-book-2"].label.hasSuffix("1"))
    app.buttons["open-book-2"].tap()
    revealReader()
    XCTAssertTrue(app.staticTexts["reader-page-number"].label.hasPrefix("١"))
    screenshot("Independent book 2 at Al-Fatiha")
    app.buttons["reader-library"].tap()
    app.terminate()
    app.launch()
    XCTAssertTrue(app.buttons["open-book-1"].waitForExistence(timeout: 30))
    XCTAssertTrue(app.buttons["open-book-1"].label.contains("Simulator reading"))
    XCTAssertTrue(app.buttons["open-book-1"].label.hasSuffix("2"))
    XCTAssertTrue(app.buttons["open-book-2"].label.hasSuffix("1"))
  }

  func testDefaultVoiceAndNativePlaybackControls() {
    ensureBookCount(2)
    app.buttons["open-book-2"].tap()
    revealReader()
    let selector = app.buttons["reader-audio-controls"]
    XCTAssertEqual(selector.label, "القارئ")
    selector.tap()
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
    let advances=XCTNSPredicateExpectation(predicate:NSPredicate { _,_ in !elapsed.label.hasPrefix("0:00") },object:elapsed)
    XCTAssertEqual(XCTWaiter.wait(for:[advances],timeout:10),.completed)
    app.buttons["audio-play-pause"].tap()
    let paused=XCTNSPredicateExpectation(predicate:NSPredicate { _,_ in ["Paused","متوقف مؤقتًا"].contains(status.label) },object:status)
    XCTAssertEqual(XCTWaiter.wait(for:[paused],timeout:5),.completed)
    screenshot("Al-Husary native playback paused")
    app.buttons["audio-next"].tap()
    app.buttons["audio-replay"].tap()
    app.buttons["audio-stop"].tap()
    let stopped = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: status)
    XCTAssertEqual(XCTWaiter.wait(for: [stopped], timeout: 5), .completed)
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
    for _ in 0..<6 { if toggle.isHittable { break }; app.scrollViews["overall-settings"].swipeUp() }
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
    for _ in 0..<6 { if testAlert.isHittable { break }; app.scrollViews["overall-settings"].swipeUp() }
    testAlert.tap()
    XCTAssertTrue(app.staticTexts["prayer-test-sent"].waitForExistence(timeout: 10))
    Thread.sleep(forTimeInterval: 6)
    screenshot("Prayer test notification")
    for _ in 0..<6 { if toggle.isHittable { break }; app.scrollViews["overall-settings"].swipeDown() }
    toggle.tap()
    let cancelled = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: count)
    XCTAssertEqual(XCTWaiter.wait(for: [cancelled], timeout: 20), .completed)
    let downloads = app.buttons["manage-downloads"]
    for _ in 0..<8 { if downloads.isHittable { break }; app.scrollViews["overall-settings"].swipeDown() }
    downloads.tap()
    XCTAssertTrue(app.buttons["downloads-close"].waitForExistence(timeout: 10))
    XCTAssertTrue(app.staticTexts["saved-audio-ghamdi-1"].waitForExistence(timeout: 15))
    XCTAssertTrue(app.staticTexts["saved-audio-ghamdi-1"].label.contains("7/7"))
    screenshot("Download manager")
    app.descendants(matching: .any)["downloads-audio"].tap()
    let wholeQuran = app.buttons["download-whole-quran"]
    XCTAssertTrue(wholeQuran.waitForExistence(timeout: 5))
    wholeQuran.tap()
    XCTAssertTrue(app.staticTexts["whole-quran-progress"].waitForExistence(timeout: 10))
    screenshot("Whole Quran download progress")
    app.buttons["audio-download-cancel"].tap()
    let stopped = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: app.staticTexts["whole-quran-progress"])
    XCTAssertEqual(XCTWaiter.wait(for: [stopped], timeout: 20), .completed)
    app.descendants(matching: .any)["downloads-saved"].tap()
    XCTAssertTrue(app.staticTexts["saved-audio-ghamdi-1"].waitForExistence(timeout: 15))
    XCTAssertTrue(app.staticTexts["saved-audio-ghamdi-1"].label.contains("7/7"))
    app.buttons["downloads-close"].tap()
    app.buttons["settings-close"].tap()
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
