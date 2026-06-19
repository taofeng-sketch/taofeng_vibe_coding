import Foundation
import SwiftData

@Model
final class WeeklyReview {
    var id: UUID = UUID()
    var weekStartDate: Date = Calendar.current.startOfDay(for: Date())
    var bodyText: String = ""
    var generatedAt: Date = Date()

    init(
        id: UUID = UUID(),
        weekStartDate: Date = .now,
        bodyText: String = "",
        generatedAt: Date = .now
    ) {
        self.id = id
        self.weekStartDate = Calendar.current.startOfDay(for: weekStartDate)
        self.bodyText = bodyText
        self.generatedAt = generatedAt
    }
}
