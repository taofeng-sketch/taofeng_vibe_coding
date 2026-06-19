import SwiftData
import SwiftUI
import WidgetKit

struct DailyBriefWidgetEntry: TimelineEntry {
    let date: Date
    let briefText: String
}

struct DailyBriefWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> DailyBriefWidgetEntry {
        DailyBriefWidgetEntry(date: .now, briefText: AppLanguage.text("你是一个把健康当作长期资产的人。今天先抓住第一餐。", "You are treating health as a long-term asset. Start with the first meal."))
    }

    func getSnapshot(in context: Context, completion: @escaping (DailyBriefWidgetEntry) -> Void) {
        completion(loadEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<DailyBriefWidgetEntry>) -> Void) {
        let entry = loadEntry()
        let nextReload = Calendar.current.date(byAdding: .hour, value: 2, to: .now) ?? .now.addingTimeInterval(7200)
        completion(Timeline(entries: [entry], policy: .after(nextReload)))
    }

    private func loadEntry() -> DailyBriefWidgetEntry {
        guard let context = HabitWidgetStore.modelContext() else {
            return DailyBriefWidgetEntry(date: .now, briefText: Self.fallback)
        }

        let descriptor = FetchDescriptor<DailyBrief>(sortBy: [SortDescriptor(\.generatedAt, order: .reverse)])
        let briefs = (try? context.fetch(descriptor)) ?? []
        let brief = briefs.first { $0.date == HabitWidgetStore.today }
        let text = brief?.bodyText.widgetFirstSentence ?? Self.fallback
        return DailyBriefWidgetEntry(date: .now, briefText: text)
    }

    private static let fallback = AppLanguage.text("你是一个把健康当作长期资产的人。今天先做一个小动作。", "You are treating health as a long-term asset. Do one small action today.")
}

struct DailyBriefWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DailyBriefWidget", provider: DailyBriefWidgetProvider()) { entry in
            DailyBriefWidgetView(entry: entry)
        }
        .configurationDisplayName(AppLanguage.text("晨间简报", "Morning Brief"))
        .description(AppLanguage.text("在桌面查看今天晨间简报的第一句话。", "View the first sentence of today's morning brief."))
        .supportedFamilies([.systemMedium])
    }
}

private struct DailyBriefWidgetView: View {
    let entry: DailyBriefWidgetEntry

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: "sun.max.fill")
                .font(.title)
                .foregroundStyle(.orange)
                .frame(width: 42, height: 42)
                .background(Color.orange.opacity(0.14), in: Circle())

            VStack(alignment: .leading, spacing: 8) {
                Text(AppLanguage.text("晨间简报", "Morning Brief"))
                    .font(.headline)
                Text(entry.briefText)
                    .font(.body)
                    .foregroundStyle(.primary)
                    .lineLimit(3)
                Text(AppLanguage.text("打开 HabitApp 继续今天的系统", "Open HabitApp to continue today's system"))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
        .containerBackground(.fill.tertiary, for: .widget)
        .widgetURL(URL(string: "habitapp://today"))
    }
}
