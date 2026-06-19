import SwiftData

enum PreviewContainer {
    @MainActor
    static let container: ModelContainer = {
        let schema = Schema([Habit.self, CheckIn.self, MealEntry.self, DailyBrief.self, WeeklyReview.self])
        let configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
        let container = try! ModelContainer(for: schema, configurations: [configuration])

        let habits = [
            Habit(name: "Breakfast + Photo", iconSymbol: "fork.knife.circle", reminderHour: 8, reminderMinute: 0),
            Habit(name: "Strength workout", iconSymbol: "dumbbell.fill", reminderHour: 18, reminderMinute: 30),
            Habit(name: "Lunch", iconSymbol: "takeoutbag.and.cup.and.straw", reminderHour: 12, reminderMinute: 30),
            Habit(name: "Wind down", iconSymbol: "moon.stars.fill", reminderHour: 22, reminderMinute: 30),
        ]
        habits.forEach(container.mainContext.insert)
        return container
    }()
}
