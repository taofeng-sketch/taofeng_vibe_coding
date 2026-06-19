import Foundation
import SwiftData

@MainActor
enum HabitStore {
    static let seededDefaultsKey = "hasSeededDefaultHabits"

    static func seedDefaultsIfNeeded(context: ModelContext, habits: [Habit]) {
        guard !UserDefaults.standard.bool(forKey: seededDefaultsKey), habits.isEmpty else {
            return
        }

        let defaults = [
            Habit(name: "早上排便", iconSymbol: "figure.seated.side.right", reminderHour: 7, reminderMinute: 30),
            Habit(name: "早餐 + 拍照", iconSymbol: "fork.knife.circle", reminderHour: 8, reminderMinute: 0),
            Habit(name: "中午吃饭", iconSymbol: "takeoutbag.and.cup.and.straw", reminderHour: 12, reminderMinute: 30),
            Habit(name: "健身锻炼", iconSymbol: "dumbbell.fill", reminderHour: 18, reminderMinute: 30),
        ]

        defaults.forEach(context.insert)
        try? context.save()
        UserDefaults.standard.set(true, forKey: seededDefaultsKey)

        Task {
            await NotificationService.shared.rescheduleAll(habits: defaults)
        }
    }

    static func isCheckedInToday(habit: Habit, checkIns: [CheckIn]) -> Bool {
        let today = Calendar.current.startOfDay(for: .now)
        return checkIns.contains { checkIn in
            checkIn.habit?.id == habit.id && checkIn.date == today
        }
    }

    static func checkIn(habit: Habit, context: ModelContext) {
        guard !(habit.checkIns ?? []).contains(where: { Calendar.current.isDateInToday($0.date) }) else {
            return
        }

        let checkIn = CheckIn(date: .now, habit: habit)
        context.insert(checkIn)
        try? context.save()

        Task {
            await NotificationService.shared.scheduleNext(for: habit, forceTomorrow: true)
        }
    }
}
