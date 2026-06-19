import Foundation
import SwiftData

@Model
final class CheckIn {
    var id: UUID = UUID()
    var date: Date = Calendar.current.startOfDay(for: Date())
    var completedAt: Date = Date()
    var habit: Habit?

    init(
        id: UUID = UUID(),
        date: Date,
        completedAt: Date = .now,
        habit: Habit? = nil
    ) {
        self.id = id
        self.date = Calendar.current.startOfDay(for: date)
        self.completedAt = completedAt
        self.habit = habit
    }
}
