import XCTest

final class SwiftPortSmokeTests: XCTestCase {
  func testBundledQuranOpensAndTurnsPagesOnIPad() {
    XCUIDevice.shared.orientation = .portrait
    let app = XCUIApplication()
    app.launchArguments = ["-ui-testing"]
    app.launch()

    let startupFailure = app.staticTexts[
      "تعذّر فتح التطبيق / Unable to open app"
    ]
    let continueReading = app.buttons["home.continueReading"]
    let readQuran = app.buttons.matching(
      NSPredicate(format: "label CONTAINS %@", "قراءة القرآن")
    ).firstMatch

    XCTAssertTrue(
      waitForAny([continueReading, readQuran, startupFailure], timeout: 30),
      "App never reached its home screen or startup error.\n\(app.debugDescription)"
    )
    XCTAssertFalse(startupFailure.exists, "Offline app startup failed: \(app.debugDescription)")

    if continueReading.exists {
      continueReading.tap()
    } else {
      readQuran.tap()
      let firstBook = app.buttons.matching(
        NSPredicate(format: "label CONTAINS %@", "المصحف")
      ).firstMatch
      XCTAssertTrue(firstBook.waitForExistence(timeout: 10), app.debugDescription)
      firstBook.tap()
    }

    let pageOne = app.descendants(matching: .any)["quran.page.ready.1"]
    let pageOneFailure = app.descendants(matching: .any)["quran.page.failed.1"]
    XCTAssertTrue(
      waitForAny([pageOne, pageOneFailure], timeout: 30),
      "The first bundled Quran page did not finish loading.\n\(app.debugDescription)"
    )
    XCTAssertTrue(pageOne.exists, "The first bundled Quran page failed to render.\n\(app.debugDescription)")
    attachScreenshot(named: "Reader portrait, page 1", app: app)

    let nextPage = app.buttons["quran.reader.nextPage"]
    let nextPageFallback = app.buttons.matching(
      NSPredicate(format: "label CONTAINS %@", "التالية")
    ).firstMatch
    let turnButton = nextPage.exists ? nextPage : nextPageFallback
    XCTAssertTrue(turnButton.waitForExistence(timeout: 10), app.debugDescription)
    turnButton.tap()

    let pageTwo = app.descendants(matching: .any)["quran.page.ready.2"]
    let pageTwoFailure = app.descendants(matching: .any)["quran.page.failed.2"]
    XCTAssertTrue(
      waitForAny([pageTwo, pageTwoFailure], timeout: 20),
      "Tapping Next did not show the next verified Quran page.\n\(app.debugDescription)"
    )
    XCTAssertTrue(pageTwo.exists, "Page 2 failed to render after tapping Next.\n\(app.debugDescription)")
    attachScreenshot(named: "Reader portrait, page 2", app: app)

    XCUIDevice.shared.orientation = .landscapeLeft
    let pageOneLandscape = app.descendants(matching: .any)["quran.page.ready.1"]
    let pageTwoLandscape = app.descendants(matching: .any)["quran.page.ready.2"]
    XCTAssertTrue(pageOneLandscape.waitForExistence(timeout: 15), app.debugDescription)
    XCTAssertTrue(pageTwoLandscape.waitForExistence(timeout: 15), app.debugDescription)
    attachScreenshot(named: "Reader landscape, pages 1–2", app: app)
    XCUIDevice.shared.orientation = .portrait
  }

  private func waitForAny(_ elements: [XCUIElement], timeout: TimeInterval) -> Bool {
    let deadline = Date().addingTimeInterval(timeout)
    while Date() < deadline {
      if elements.contains(where: \.exists) { return true }
      RunLoop.current.run(until: Date().addingTimeInterval(0.2))
    }
    return elements.contains(where: \.exists)
  }

  private func attachScreenshot(named name: String, app: XCUIApplication) {
    let attachment = XCTAttachment(screenshot: app.screenshot())
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
  }
}
