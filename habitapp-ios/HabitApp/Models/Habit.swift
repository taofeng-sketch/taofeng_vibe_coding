import Foundation
import SwiftData

@Model
final class Habit {
    var id: UUID = UUID()
    var name: String = ""
    var iconSymbol: String = "checkmark.circle"
    var reminderHour: Int = 8
    var reminderMinute: Int = 0
    var isEnabled: Bool = true
    var createdAt: Date = Date()
    var anchorText: String = ""

    @Relationship(deleteRule: .cascade, inverse: \CheckIn.habit)
    var checkIns: [CheckIn]?

    init(
        id: UUID = UUID(),
        name: String,
        iconSymbol: String,
        reminderHour: Int,
        reminderMinute: Int,
        isEnabled: Bool = true,
        createdAt: Date = .now,
        anchorText: String = "",
        checkIns: [CheckIn]? = nil
    ) {
        self.id = id
        self.name = name
        self.iconSymbol = iconSymbol
        self.reminderHour = reminderHour
        self.reminderMinute = reminderMinute
        self.isEnabled = isEnabled
        self.createdAt = createdAt
        self.anchorText = anchorText
        self.checkIns = checkIns
    }
}

extension Habit {
    var reminderTimeText: String {
        String(format: "%02d:%02d", reminderHour, reminderMinute)
    }
}
