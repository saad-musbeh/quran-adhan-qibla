import Adhan
import Foundation

public struct GeoPoint: Codable, Equatable {
  public let latitude: Double
  public let longitude: Double
  public init(latitude: Double, longitude: Double) {
    self.latitude = latitude
    self.longitude = longitude
  }
  public var isValid: Bool {
    latitude.isFinite && longitude.isFinite && (-90...90).contains(latitude)
      && (-180...180).contains(longitude)
  }
}

public struct PrayerSettings: Codable, Equatable {
  public var method: Int = 0
  public var hanafi = false
  public var ramadan = false
  public var highLatitudeRule: Int = 0
  public var allowPolarApproximation = false
  public init() {}
}

public enum PrayerID: String, Codable, CaseIterable, Identifiable {
  case fajr, sunrise, dhuhr, asr, maghrib, isha
  public var id: String { rawValue }
  public var isPrayer: Bool { self != .sunrise }
}

public struct PrayerEvent: Identifiable, Equatable {
  public let id: String
  public let prayer: PrayerID
  public let date: Date
  public init(prayer: PrayerID, date: Date) {
    self.prayer = prayer
    self.date = date
    self.id = prayer.rawValue
  }
}

public struct PrayerSchedule: Equatable {
  public let events: [PrayerEvent]
  public let approximated: Bool
  public let effectiveLatitude: Double
}

public enum IslamicCoreError: LocalizedError {
  case invalidInput, unsupportedLocation, calculationFailed
  public var errorDescription: String? {
    switch self {
    case .invalidInput: return "The location, date, or prayer settings are invalid."
    case .unsupportedLocation:
      return "Prayer times at this latitude require enabling polar approximation."
    case .calculationFailed: return "Prayer times could not be calculated for this date."
    }
  }
}

public enum PrayerCalculator {
  private static let identifiers: [PrayerID] = [.fajr, .sunrise, .dhuhr, .asr, .maghrib, .isha]
  private static let methods: [CalculationMethod] = [
    .ummAlQura, .muslimWorldLeague, .northAmerica, .egyptian, .karachi, .moonsightingCommittee,
  ]

  public static func schedule(
    point: GeoPoint, date: Date, settings: PrayerSettings, timeZone: TimeZone = .current
  ) throws -> PrayerSchedule {
    guard point.isValid, settings.method >= 0, settings.method < methods.count,
      (0...2).contains(settings.highLatitudeRule)
    else { throw IslamicCoreError.invalidInput }
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = timeZone
    let parts = calendar.dateComponents([.year, .month, .day], from: date)
    guard let year = parts.year, (1900...2100).contains(year) else {
      throw IslamicCoreError.invalidInput
    }
    guard abs(point.latitude) < 65 || settings.allowPolarApproximation else {
      throw IslamicCoreError.unsupportedLocation
    }
    let rule: HighLatitudeRule = [.middleOfTheNight, .seventhOfTheNight, .twilightAngle][
      settings.highLatitudeRule]
    func calculate(_ latitude: Double) -> PrayerTimes? {
      let coords = Coordinates(latitude: latitude, longitude: point.longitude)
      var params = methods[settings.method].params
      params.highLatitudeRule = rule
      params.madhab = settings.hanafi ? .hanafi : .shafi
      if settings.method == 0 && settings.ramadan { params.ishaInterval = 120 }
      var utc = Calendar(identifier: .gregorian)
      utc.timeZone = TimeZone(secondsFromGMT: 0)!
      let components = DateComponents(
        calendar: utc, timeZone: utc.timeZone, year: year, month: parts.month, day: parts.day)
      return PrayerTimes(coordinates: coords, date: components, calculationParameters: params)
    }
    var effective = point.latitude
    var result = calculate(effective)
    if result == nil && settings.allowPolarApproximation {
      // Find the nearest latitude toward the equator with computable sunrise and sunset.
      while abs(effective) >= 65 {
        effective -= 0.5 * (effective < 0 ? -1 : 1)
        if let candidate = calculate(effective) {
          result = candidate
          break
        }
      }
    }
    guard let times = result else { throw IslamicCoreError.calculationFailed }
    let dates = identifiers.map { times.time(for: adhanPrayer($0)) }
    guard dates.count == 6, zip(dates, dates.dropFirst()).allSatisfy({ $0.0 < $0.1 }) else {
      throw IslamicCoreError.calculationFailed
    }
    return PrayerSchedule(
      events: zip(identifiers, dates).map { PrayerEvent(prayer: $0.0, date: $0.1) },
      approximated: effective != point.latitude, effectiveLatitude: effective)
  }

  public static func nextOccurrences(
    point: GeoPoint, now: Date, settings: PrayerSettings, timeZone: TimeZone = .current
  ) throws -> [PrayerEvent] {
    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = timeZone
    let today = try schedule(point: point, date: now, settings: settings, timeZone: timeZone)
    guard let tomorrow = cal.date(byAdding: .day, value: 1, to: now) else {
      throw IslamicCoreError.calculationFailed
    }
    let next = try schedule(point: point, date: tomorrow, settings: settings, timeZone: timeZone)
    let candidates = today.events + next.events
    return PrayerID.allCases.filter(\.isPrayer).compactMap { prayer in
      candidates.filter { $0.prayer == prayer && $0.date > now }.min { $0.date < $1.date }
    }.sorted { $0.date < $1.date }
  }

  public static func qibla(from point: GeoPoint) throws -> Double {
    guard point.isValid else { throw IslamicCoreError.invalidInput }
    guard abs(point.latitude) < 90 else { throw IslamicCoreError.calculationFailed }
    let latitude = point.latitude * .pi / 180
    let longitudeDelta = (39.8261818 - point.longitude) * .pi / 180
    let kaabaLatitude = 21.4225241 * .pi / 180
    let east = sin(longitudeDelta) * cos(kaabaLatitude)
    let north =
      cos(latitude) * sin(kaabaLatitude) - sin(latitude) * cos(kaabaLatitude) * cos(longitudeDelta)
    guard hypot(east, north) >= 1e-12 else { throw IslamicCoreError.calculationFailed }
    return Qibla(coordinates: Coordinates(latitude: point.latitude, longitude: point.longitude))
      .direction
  }
  private static func adhanPrayer(_ id: PrayerID) -> Prayer {
    switch id {
    case .fajr: return .fajr
    case .sunrise: return .sunrise
    case .dhuhr: return .dhuhr
    case .asr: return .asr
    case .maghrib: return .maghrib
    case .isha: return .isha
    }
  }
}

public enum HeadingMath {
  public static func relative(target: Double, current: Double) -> Double {
    signedDelta(from: normalize(current), to: normalize(target))
  }
  public static func unwrap(previous: Double, next: Double) -> Double {
    previous + signedDelta(from: normalize(previous), to: normalize(next))
  }
  public static func usableTrueHeading(heading: Double, accuracy: Double) -> Double? {
    guard heading.isFinite, (0.0..<360.0).contains(heading), accuracy.isFinite, accuracy >= 0,
      accuracy <= 20
    else { return nil }
    return heading
  }
  private static func normalize(_ value: Double) -> Double {
    let result = value.truncatingRemainder(dividingBy: 360)
    return result < 0 ? result + 360 : result
  }
  private static func signedDelta(from: Double, to: Double) -> Double {
    var delta = (to - from).truncatingRemainder(dividingBy: 360)
    if delta >= 180 { delta -= 360 }
    if delta < -180 { delta += 360 }
    return delta
  }
}

public struct AlertCandidate: Identifiable, Equatable {
  public let id: String
  public let date: Date
  public let isPrayer: Bool
  public init(id: String, date: Date, isPrayer: Bool) {
    self.id = id
    self.date = date
    self.isPrayer = isPrayer
  }
}

public enum AlertBudget {
  public static func select(
    _ candidates: [AlertCandidate], now: Date, capacity: Int = 62, reservedPrayers: Int = 12
  ) -> [AlertCandidate] {
    let limit = max(0, capacity)
    guard limit > 0 else { return [] }
    let chronological = candidates.filter { $0.date > now }.sorted {
      $0.date == $1.date ? $0.id < $1.id : $0.date < $1.date
    }
    var seen = Set<String>()
    let unique = chronological.filter { seen.insert($0.id).inserted }
    let prayerLimit = min(limit, max(0, reservedPrayers))
    let reserved = Array(unique.filter(\.isPrayer).prefix(prayerLimit))
    let reservedIDs = Set(reserved.map(\.id))
    let remaining = unique.filter { !reservedIDs.contains($0.id) }.prefix(limit - reserved.count)
    return (reserved + remaining).sorted { $0.date == $1.date ? $0.id < $1.id : $0.date < $1.date }
  }
}

public enum ReminderClock {
  /// Resolves a wall-clock reminder on the civil date containing `day`.
  /// Nonexistent DST times return nil; repeated times select the earlier instant.
  public static func date(day: Date, hour: Int, minute: Int, timeZone: TimeZone = .current) -> Date?
  {
    guard (0...23).contains(hour), (0...59).contains(minute) else { return nil }
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = timeZone
    let dayParts = calendar.dateComponents([.year, .month, .day], from: day)
    guard let dayStart = calendar.date(from: dayParts),
      let searchStart = calendar.date(byAdding: .second, value: -1, to: dayStart)
    else { return nil }
    var match = DateComponents()
    match.year = dayParts.year
    match.month = dayParts.month
    match.day = dayParts.day
    match.hour = hour
    match.minute = minute
    match.second = 0
    return calendar.nextDate(
      after: searchStart, matching: match, matchingPolicy: .strict, repeatedTimePolicy: .first,
      direction: .forward)
  }
}
