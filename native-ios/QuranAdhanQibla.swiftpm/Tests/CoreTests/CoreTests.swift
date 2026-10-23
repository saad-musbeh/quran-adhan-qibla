import IslamicCore
import XCTest

final class CoreTests: XCTestCase {
  private let utc = TimeZone(secondsFromGMT: 0)!
  private func date(_ y: Int, _ m: Int, _ d: Int, _ zone: TimeZone? = nil) -> Date {
    var c = Calendar(identifier: .gregorian)
    c.timeZone = zone ?? utc
    return c.date(from: DateComponents(year: y, month: m, day: d))!
  }

  private func assertTimes(
    _ schedule: PrayerSchedule, _ expected: [(Int, Int)], timezone: TimeZone,
    file: StaticString = #filePath, line: UInt = #line
  ) {
    XCTAssertEqual(schedule.events.count, 6, file: file, line: line)
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = timezone
    for (event, (hour, minute)) in zip(schedule.events, expected) {
      let parts = calendar.dateComponents([.hour, .minute], from: event.date)
      let actualMinutes = (parts.hour ?? 0) * 60 + (parts.minute ?? 0)
      let expectedMinutes = hour * 60 + minute
      let difference = min(
        (actualMinutes - expectedMinutes + 1440) % 1440,
        (expectedMinutes - actualMinutes + 1440) % 1440)
      XCTAssertLessThanOrEqual(
        difference, 2,
        "\(event.prayer): expected \(hour):\(minute), got \(parts.hour ?? -1):\(parts.minute ?? -1)",
        file: file, line: line)
    }
    XCTAssertTrue(
      zip(schedule.events, schedule.events.dropFirst()).allSatisfy { $0.0.date < $0.1.date },
      file: file, line: line)
  }

  func testRustReferenceSchedules() throws {
    let makkah = try PrayerCalculator.schedule(
      point: GeoPoint(latitude: 21.427009, longitude: 39.828685), date: date(2016, 1, 5),
      settings: PrayerSettings(), timeZone: utc)
    assertTimes(
      makkah, [(5, 38), (7, 0), (12, 26), (15, 31), (17, 52), (19, 22)],
      timezone: TimeZone(secondsFromGMT: 3 * 3600)!)

    var londonSettings = PrayerSettings()
    londonSettings.method = 5
    londonSettings.hanafi = true
    let london = try PrayerCalculator.schedule(
      point: GeoPoint(latitude: 51.507194, longitude: -0.116711), date: date(2016, 1, 1),
      settings: londonSettings, timeZone: utc)
    assertTimes(london, [(6, 25), (8, 6), (12, 9), (14, 15), (16, 5), (17, 38)], timezone: utc)

    var mwl = PrayerSettings()
    mwl.method = 1
    let sydneyZone = TimeZone(identifier: "Australia/Sydney")!
    let sydney = try PrayerCalculator.schedule(
      point: GeoPoint(latitude: -33.8688, longitude: 151.2093), date: date(2026, 6, 21, sydneyZone),
      settings: mwl, timeZone: sydneyZone)
    assertTimes(
      sydney, [(5, 30), (7, 0), (11, 57), (14, 36), (16, 54), (18, 18)], timezone: sydneyZone)

    let santiagoZone = TimeZone(identifier: "America/Santiago")!
    let santiago = try PrayerCalculator.schedule(
      point: GeoPoint(latitude: -33.4489, longitude: -70.6693),
      date: date(2025, 9, 7, santiagoZone), settings: mwl, timeZone: santiagoZone)
    assertTimes(
      santiago, [(6, 30), (7, 53), (13, 41), (16, 59), (19, 29), (20, 46)], timezone: santiagoZone)
  }
  func testMethodRamadanAsrAndPolarOptIn() throws {
    let point = GeoPoint(latitude: 24.7136, longitude: 46.6753)
    let day = date(2026, 3, 1)
    let base = try PrayerCalculator.schedule(point: point, date: day, settings: PrayerSettings())
    var hanafi = PrayerSettings()
    hanafi.hanafi = true
    let h = try PrayerCalculator.schedule(point: point, date: day, settings: hanafi)
    XCTAssertGreaterThan(h.events[3].date, base.events[3].date)
    var ramadan = PrayerSettings()
    ramadan.ramadan = true
    let r = try PrayerCalculator.schedule(point: point, date: day, settings: ramadan)
    XCTAssertEqual(
      r.events[5].date.timeIntervalSince(r.events[4].date)
        - (base.events[5].date.timeIntervalSince(base.events[4].date)), 1800, accuracy: 1)
    let polar = GeoPoint(latitude: 69.6492, longitude: 18.9553)
    XCTAssertThrowsError(
      try PrayerCalculator.schedule(
        point: polar, date: date(2026, 6, 21), settings: PrayerSettings()))
    var allowed = PrayerSettings()
    allowed.allowPolarApproximation = true
    let approximate = try PrayerCalculator.schedule(
      point: polar, date: date(2026, 6, 21), settings: allowed)
    XCTAssertTrue(approximate.approximated)
    XCTAssertLessThan(abs(approximate.effectiveLatitude), abs(polar.latitude))
  }
  func testInvalidMethodRuleAndYearAreRejected() {
    let point = GeoPoint(latitude: 0, longitude: 0)
    var badMethod = PrayerSettings()
    badMethod.method = 6
    XCTAssertThrowsError(
      try PrayerCalculator.schedule(point: point, date: date(2026, 1, 1), settings: badMethod))
    var badRule = PrayerSettings()
    badRule.highLatitudeRule = 3
    XCTAssertThrowsError(
      try PrayerCalculator.schedule(point: point, date: date(2026, 1, 1), settings: badRule))
    XCTAssertThrowsError(
      try PrayerCalculator.schedule(
        point: point, date: date(2101, 1, 1), settings: PrayerSettings()))
  }
  func testNextOccurrencesAfterIshaUsesTomorrowAndDSTCivilDay() throws {
    let zone = TimeZone(identifier: "America/Santiago")!
    let point = GeoPoint(latitude: -33.4489, longitude: -70.6693)
    var settings = PrayerSettings()
    settings.method = 1
    let day = date(2025, 9, 6, zone)
    let schedule = try PrayerCalculator.schedule(
      point: point, date: day, settings: settings, timeZone: zone)
    let afterIsha = schedule.events[5].date.addingTimeInterval(1)
    let next = try PrayerCalculator.nextOccurrences(
      point: point, now: afterIsha, settings: settings, timeZone: zone)
    XCTAssertEqual(next.count, 5)
    XCTAssertEqual(next.first?.prayer, .fajr)
    XCTAssertEqual(
      Calendar(identifier: .gregorian).dateComponents(in: zone, from: next[0].date).day, 7)
  }
  func testValidationQiblaAndHeadingWrap() throws {
    XCTAssertFalse(GeoPoint(latitude: .nan, longitude: 0).isValid)
    XCTAssertThrowsError(try PrayerCalculator.qibla(from: GeoPoint(latitude: 91, longitude: 0)))
    XCTAssertEqual(
      try PrayerCalculator.qibla(from: GeoPoint(latitude: 51.507194, longitude: -0.116711)), 119.0,
      accuracy: 0.1)
    XCTAssertThrowsError(
      try PrayerCalculator.qibla(from: GeoPoint(latitude: 21.4225241, longitude: 39.8261818)))
    XCTAssertEqual(HeadingMath.relative(target: 5, current: 355), 10, accuracy: 0.001)
    XCTAssertEqual(HeadingMath.relative(target: 355, current: 5), -10, accuracy: 0.001)
    XCTAssertEqual(HeadingMath.relative(target: 180, current: 0), -180, accuracy: 0.001)
    XCTAssertEqual(HeadingMath.unwrap(previous: 359, next: 1), 361, accuracy: 0.001)
    XCTAssertNil(HeadingMath.usableTrueHeading(heading: -1, accuracy: 20))
    XCTAssertNil(HeadingMath.usableTrueHeading(heading: 360, accuracy: 20))
    XCTAssertNil(HeadingMath.usableTrueHeading(heading: 1, accuracy: 21))
  }

  func testAlertBudgetReservesPrayerSlotsAndDeduplicatesDeterministically() {
    let now = date(2026, 1, 1)
    let prayers = (0..<14).map {
      AlertCandidate(
        id: "p\($0)", date: now.addingTimeInterval(Double(($0 + 1) * 600)), isPrayer: true)
    }
    let reminders = (0..<80).map {
      AlertCandidate(id: "r\($0)", date: now.addingTimeInterval(Double($0 + 1)), isPrayer: false)
    }
    let dup = AlertCandidate(id: "p0", date: now.addingTimeInterval(5000), isPrayer: false)
    let selected = AlertBudget.select(reminders + prayers + [dup], now: now)
    XCTAssertEqual(selected.count, 62)
    XCTAssertEqual(selected.filter(\.isPrayer).count, 12)
    XCTAssertEqual(Set(selected.map(\.id)).count, selected.count)
    XCTAssertEqual(selected.filter(\.isPrayer).map(\.id), prayers.prefix(12).map(\.id))
    XCTAssertEqual(
      selected, AlertBudget.select(Array((reminders + prayers + [dup]).reversed()), now: now))
    XCTAssertTrue(
      AlertBudget.select(prayers, now: now, capacity: 3, reservedPrayers: 99).allSatisfy(\.isPrayer)
    )
    XCTAssertTrue(AlertBudget.select(prayers, now: now, capacity: -1).isEmpty)
    XCTAssertTrue(
      AlertBudget.select(reminders + prayers, now: now, capacity: 3, reservedPrayers: -4).allSatisfy
      { !$0.isPrayer })
  }

  func testReminderClockRejectsDSTGapAndChoosesFirstRepeatedTime() throws {
    let zone = TimeZone(identifier: "America/New_York")!
    let springDay = date(2025, 3, 9, zone)
    XCTAssertNil(ReminderClock.date(day: springDay, hour: 2, minute: 30, timeZone: zone))
    XCTAssertNil(ReminderClock.date(day: springDay, hour: 24, minute: 0, timeZone: zone))

    let fallDay = date(2025, 11, 2, zone)
    let first = try XCTUnwrap(ReminderClock.date(day: fallDay, hour: 1, minute: 30, timeZone: zone))
    var utcCalendar = Calendar(identifier: .gregorian)
    utcCalendar.timeZone = utc
    let expectedFirst = utcCalendar.date(
      from: DateComponents(year: 2025, month: 11, day: 2, hour: 5, minute: 30))!
    XCTAssertEqual(first, expectedFirst)
    var local = Calendar(identifier: .gregorian)
    local.timeZone = zone
    let localParts = local.dateComponents([.year, .month, .day, .hour, .minute], from: first)
    XCTAssertEqual(localParts.hour, 1)
    XCTAssertEqual(localParts.minute, 30)
    XCTAssertEqual(localParts.day, 2)
  }
}
