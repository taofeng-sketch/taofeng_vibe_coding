import SwiftData

enum PreviewContainer {
    @MainActor
    static let container: ModelContainer = {
        let schema = Schema([Habit.self, CheckIn.self, MealEntry.self, DailyBrief.self, WeeklyReview.self])
        let configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
        let container = try! ModelContainer(for: schema, configurations: [configuration])

        let habits = [
            Habit(name: "早上排便", iconSymbol: "figure.seated.side.right", reminderHour: 7, reminderMinute: 30),
            Habit(name: "早餐 + 拍照", iconSymbol: "fork.knife.circle", reminderHour: 8, reminderMinute: 0),
            Habit(name: "中午吃饭", iconSymbol: "takeoutbag.and.cup.and.straw", reminderHour: 12, reminderMinute: 30),
            Habit(name: "健身锻炼", iconSymbol: "dumbbell.fill", reminderHour: 18, reminderMinute: 30),
        ]
        habits.forEach(container.mainContext.insert)
        return container
    }()
}
