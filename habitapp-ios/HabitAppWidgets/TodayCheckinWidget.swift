import SwiftData
import SwiftUI
import WidgetKit

struct TodayCheckinEntry: TimelineEntry {
    let date: Date
    let habits: [TodayCheckinHabit]
}

struct TodayCheckinHabit: Identifiable {
    let id: UUID
    let name: String
    let iconSymbol: String
    let reminderText: String
    let isComplete: Bool
}

struct TodayCheckinProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodayCheckinEntry {
        TodayCheckinEntry(date: .now, habits: Self.placeholderHabits)
    }

    func getSnapshot(in context: Context, completion: @escaping (TodayCheckinEntry) -> Void) {
        completion(loadEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayCheckinEntry>) -> Void) {
        let entry = loadEntry()
        let nextReload = Calendar.current.date(byAdding: .minute, value: 20, to: .now) ?? .now.addingTimeInterval(1200)
        completion(Timeline(entries: [entry], policy: .after(nextReload)))
    }

    private func loadEntry() -> TodayCheckinEntry {
        guard let context = HabitWidgetStore.modelContext() else {
            return TodayCheckinEntry(date: .now, habits: Self.placeholderHabits)
        }

        let habitDescriptor = FetchDescriptor<Habit>(sortBy: [SortDescriptor(\.createdAt)])
        let checkInDescriptor = FetchDescriptor<CheckIn>()

        let habits = ((try? context.fetch(habitDescriptor)) ?? []).filter(\.isEnabled)
        let checkIns = ((try? context.fetch(checkInDescriptor)) ?? []).filter { $0.date == HabitWidgetStore.today }
        let completedHabitIDs = Set(checkIns.compactMap { $0.habit?.id })

        let rows = habits.prefix(4).map {
            TodayCheckinHabit(
                id: $0.id,
                name: $0.name,
                iconSymbol: $0.iconSymbol,
                reminderText: $0.reminderTimeText,
                isComplete: completedHabitIDs.contains($0.id)
            )
        }

        return TodayCheckinEntry(date: .now, habits: rows.isEmpty ? Self.placeholderHabits : rows)
    }

    private static let placeholderHabits = [
        TodayCheckinHabit(id: UUID(), name: "第一餐", iconSymbol: "fork.knife.circle", reminderText: "08:00", isComplete: true),
        TodayCheckinHabit(id: UUID(), name: "力量训练", iconSymbol: "dumbbell.fill", reminderText: "18:30", isComplete: false),
        TodayCheckinHabit(id: UUID(), name: "睡前降速", iconSymbol: "moon.stars.fill", reminderText: "22:30", isComplete: false),
    ]
}

struct TodayCheckinWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "TodayCheckinWidget", provider: TodayCheckinProvider()) { entry in
            TodayCheckinWidgetView(entry: entry)
        }
        .configurationDisplayName("今日打卡")
        .description("查看今天最多 4 个核心习惯的完成状态。")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

private struct TodayCheckinWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: TodayCheckinEntry

    private var completedCount: Int {
        entry.habits.filter(\.isComplete).count
    }

    var body: some View {
        if family == .systemSmall {
            smallView
        } else {
            mediumView
        }
    }

    private var smallView: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("今日")
                .font(.headline)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 2), spacing: 10) {
                ForEach(entry.habits.prefix(4)) { habit in
                    ZStack {
                        HabitWidgetRing(progress: habit.isComplete ? 1 : 0, color: habit.isComplete ? .green : .secondary)
                        Image(systemName: habit.iconSymbol)
                            .font(.caption.bold())
                    }
                }
            }
            Text("\(completedCount)/\(max(entry.habits.count, 1)) 已完成")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .containerBackground(.fill.tertiary, for: .widget)
        .widgetURL(URL(string: "habitapp://today"))
    }

    private var mediumView: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("今日系统")
                    .font(.headline)
                Spacer()
                Text("\(completedCount)/\(max(entry.habits.count, 1))")
                    .font(.headline.monospacedDigit())
                    .foregroundStyle(.green)
            }

            HStack(spacing: 12) {
                ForEach(entry.habits.prefix(4)) { habit in
                    VStack(spacing: 6) {
                        ZStack {
                            HabitWidgetRing(progress: habit.isComplete ? 1 : 0, color: habit.isComplete ? .green : .orange)
                            Image(systemName: habit.iconSymbol)
                                .font(.caption.bold())
                        }
                        .frame(width: 34, height: 34)
                        Text(habit.name)
                            .font(.caption2)
                            .lineLimit(1)
                        Text(habit.reminderText)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .containerBackground(.fill.tertiary, for: .widget)
        .widgetURL(URL(string: "habitapp://today"))
    }
}
