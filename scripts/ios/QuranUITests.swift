import XCTest

final class QuranUITests: XCTestCase {
  private let app = XCUIApplication()

  override func setUpWithError() throws {
    continueAfterFailure = false
    app.launch()
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

  func testBooksKeepIndependentPagesAndNames() {
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
    app.terminate()
    app.launch()
    XCTAssertTrue(app.buttons["open-book-1"].waitForExistence(timeout: 30))
    XCTAssertTrue(app.buttons["open-book-1"].label.contains("Simulator reading"))
    XCTAssertTrue(app.buttons["open-book-1"].label.hasSuffix("2"))
    XCTAssertTrue(app.buttons["open-book-2"].label.hasSuffix("1"))
  }

  func testLocalPrayerAlertsAndDownloadManager() {
    app.buttons["open-location"].tap()
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
    app.buttons["settings-adhan"].tap()
    let toggle = app.switches["prayer-alert-toggle"]
    XCTAssertTrue(toggle.waitForExistence(timeout: 10))
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
    app.buttons["prayer-test-alert"].tap()
    XCTAssertTrue(app.staticTexts["prayer-test-sent"].waitForExistence(timeout: 10))
    Thread.sleep(forTimeInterval: 6)
    screenshot("Prayer test notification")
    toggle.tap()
    let cancelled = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: count)
    XCTAssertEqual(XCTWaiter.wait(for: [cancelled], timeout: 20), .completed)
    app.buttons["settings-quran"].tap()
    let downloads = app.buttons["manage-downloads"]
    for _ in 0..<8 { if downloads.isHittable { break }; app.scrollViews.firstMatch.swipeUp() }
    downloads.tap()
    XCTAssertTrue(app.buttons["downloads-close"].waitForExistence(timeout: 10))
    screenshot("Download manager")
    app.buttons["downloads-close"].tap()
    app.buttons["settings-close"].tap()
  }

  func testRepeatedTabTransitions() {
    for _ in 0..<6 {
      app.buttons["tab-adhan"].tap()
      XCTAssertTrue(app.buttons["open-settings"].waitForExistence(timeout: 5))
      app.buttons["tab-quran"].tap()
      XCTAssertTrue(app.buttons["open-book-1"].waitForExistence(timeout: 5))
      app.buttons["tab-qibla"].tap()
      XCTAssertTrue(app.buttons["open-settings"].waitForExistence(timeout: 5))
      app.buttons["tab-quran"].tap()
      XCTAssertTrue(app.buttons["open-book-1"].waitForExistence(timeout: 5))
    }
    screenshot("Quran after repeated tab switches")
  }
}
