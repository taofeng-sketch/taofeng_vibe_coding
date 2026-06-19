import Foundation
import SwiftData

@Model
final class DailyBrief {
    var id: UUID = UUID()
    var date: Date = Calendar.current.startOfDay(for: Date())
    var bodyText: String = ""
    var proteinTargetG: Int = 0
    var sleepHours: Double = 0
    var hrvMs: Double = 0
    var generatedAt: Date = Date()

    init(
        id: UUID = UUID(),
        date: Date = .now,
        bodyText: String = "",
        proteinTargetG: Int = 0,
        sleepHours: Double = 0,
        hrvMs: Double = 0,
        generatedAt: Date = .now
    ) {
        self.id = id
        self.date = Calendar.current.startOfDay(for: date)
        self.bodyText = bodyText
        self.proteinTargetG = proteinTargetG
        self.sleepHours = sleepHours
        self.hrvMs = hrvMs
        self.generatedAt = generatedAt
    }
}
