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
        TodayCheckinHabit(id: UUID(), name: AppLanguage.text("第一餐", "First Meal"), iconSymbol: "fork.knife.circle", reminderText: "08:00", isComplete: true),
        TodayCheckinHabit(id: UUID(), name: AppLanguage.text("力量训练", "Strength"), iconSymbol: "dumbbell.fill", reminderText: "18:30", isComplete: false),
        TodayCheckinHabit(id: UUID(), name: AppLanguage.text("睡前降速", "Wind Down"), iconSymbol: "moon.stars.fill", reminderText: "22:30", isComplete: false),
    ]
}

struct TodayCheckinWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "TodayCheckinWidget", provider: TodayCheckinProvider()) { entry in
            TodayCheckinWidgetView(entry: entry)
        }
        .configurationDisplayName(AppLanguage.text("今日打卡", "Today Check-In"))
        .description(AppLanguage.text("查看今天最多 4 个核心习惯的完成状态。", "View completion for up to four core habits today."))
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
            Text(AppLanguage.text("今日", "Today"))
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
            Text(AppLanguage.text("\(completedCount)/\(max(entry.habits.count, 1)) 已完成", "\(completedCount)/\(max(entry.habits.count, 1)) complete"))
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .containerBackground(.fill.tertiary, for: .widget)
        .widgetURL(URL(string: "habitapp://today"))
    }

    private var mediumView: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(AppLanguage.text("今日系统", "Today's System"))
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
