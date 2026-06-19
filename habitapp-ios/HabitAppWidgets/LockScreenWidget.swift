import SwiftData
import SwiftUI
import WidgetKit

struct LockScreenEntry: TimelineEntry {
    let date: Date
    let completedCount: Int
    let totalCount: Int
    let briefSnippet: String
}

struct LockScreenProvider: TimelineProvider {
    func placeholder(in context: Context) -> LockScreenEntry {
        LockScreenEntry(date: .now, completedCount: 2, totalCount: 4, briefSnippet: "先抓住第一餐。")
    }

    func getSnapshot(in context: Context, completion: @escaping (LockScreenEntry) -> Void) {
        completion(loadEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<LockScreenEntry>) -> Void) {
        let entry = loadEntry()
        let nextReload = Calendar.current.date(byAdding: .minute, value: 20, to: .now) ?? .now.addingTimeInterval(1200)
        completion(Timeline(entries: [entry], policy: .after(nextReload)))
    }

    private func loadEntry() -> LockScreenEntry {
        guard let context = HabitWidgetStore.modelContext() else {
            return LockScreenEntry(date: .now, completedCount: 0, totalCount: 1, briefSnippet: Self.fallback)
        }

        let habitDescriptor = FetchDescriptor<Habit>()
        let checkInDescriptor = FetchDescriptor<CheckIn>()
        let briefDescriptor = FetchDescriptor<DailyBrief>(sortBy: [SortDescriptor(\.generatedAt, order: .reverse)])

        let habits = ((try? context.fetch(habitDescriptor)) ?? []).filter(\.isEnabled)
        let checkIns = ((try? context.fetch(checkInDescriptor)) ?? []).filter { $0.date == HabitWidgetStore.today }
        let enabledHabitIDs = Set(habits.map(\.id))
        let completed = checkIns.filter { checkIn in
            guard let id = checkIn.habit?.id else { return false }
            return enabledHabitIDs.contains(id)
        }.count
        let briefs = (try? context.fetch(briefDescriptor)) ?? []
        let brief = briefs.first { $0.date == HabitWidgetStore.today }

        return LockScreenEntry(
            date: .now,
            completedCount: completed,
            totalCount: max(habits.count, 1),
            briefSnippet: brief?.bodyText.widgetFirstSentence ?? Self.fallback
        )
    }

    private static let fallback = "今天先完成一个小动作。"
}

struct LockScreenWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "LockScreenWidget", provider: LockScreenProvider()) { entry in
            LockScreenWidgetView(entry: entry)
        }
        .configurationDisplayName("累计")
        .description("在锁屏查看今天习惯进度和简报片段。")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular])
    }
}

private struct LockScreenWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: LockScreenEntry

    private var progress: Double {
        Double(entry.completedCount) / Double(max(entry.totalCount, 1))
    }

    var body: some View {
        switch family {
        case .accessoryCircular:
            Gauge(value: progress) {
                Image(systemName: "checkmark")
            } currentValueLabel: {
                Text("\(entry.completedCount)")
            }
            .gaugeStyle(.accessoryCircularCapacity)
        default:
            HStack(spacing: 8) {
                Gauge(value: progress) {
                    Text("今日")
                } currentValueLabel: {
                    Text("\(entry.completedCount)/\(entry.totalCount)")
                }
                .gaugeStyle(.accessoryLinearCapacity)

                Text(entry.briefSnippet)
                    .lineLimit(1)
            }
        }
    }
}
