import SwiftData
import SwiftUI
import WidgetKit

struct ProteinRingEntry: TimelineEntry {
    let date: Date
    let proteinG: Double
    let targetG: Int
}

struct ProteinRingProvider: TimelineProvider {
    func placeholder(in context: Context) -> ProteinRingEntry {
        ProteinRingEntry(date: .now, proteinG: 68, targetG: 120)
    }

    func getSnapshot(in context: Context, completion: @escaping (ProteinRingEntry) -> Void) {
        completion(loadEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ProteinRingEntry>) -> Void) {
        let entry = loadEntry()
        let nextReload = Calendar.current.date(byAdding: .minute, value: 30, to: .now) ?? .now.addingTimeInterval(1800)
        completion(Timeline(entries: [entry], policy: .after(nextReload)))
    }

    private func loadEntry() -> ProteinRingEntry {
        let bodyMassKg = UserDefaults(suiteName: HabitWidgetStore.appGroupID)?.double(forKey: "bodyMassKg") ?? 75
        let target = Int((bodyMassKg * 1.6).rounded())

        guard let context = HabitWidgetStore.modelContext() else {
            return ProteinRingEntry(date: .now, proteinG: 0, targetG: target)
        }

        let descriptor = FetchDescriptor<MealEntry>(sortBy: [SortDescriptor(\.date, order: .reverse)])
        let meals = ((try? context.fetch(descriptor)) ?? []).filter { $0.date == HabitWidgetStore.today }
        let protein = meals.reduce(0) { $0 + $1.proteinG }
        return ProteinRingEntry(date: .now, proteinG: protein, targetG: max(target, 1))
    }
}

struct ProteinRingWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ProteinRingWidget", provider: ProteinRingProvider()) { entry in
            ProteinRingWidgetView(entry: entry)
        }
        .configurationDisplayName("蛋白质")
        .description("查看今天蛋白质目标进度。")
        .supportedFamilies([.systemSmall])
    }
}

private struct ProteinRingWidgetView: View {
    let entry: ProteinRingEntry

    private var progress: Double {
        entry.proteinG / Double(max(entry.targetG, 1))
    }

    var body: some View {
        VStack(spacing: 10) {
            ZStack {
                HabitWidgetRing(progress: progress, color: .green, lineWidth: 10)
                VStack(spacing: 2) {
                    Image(systemName: "fork.knife")
                        .font(.headline)
                    Text("\(Int(entry.proteinG.rounded()))g")
                        .font(.title3.bold().monospacedDigit())
                }
            }

            Text("目标 \(entry.targetG)g")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .containerBackground(.fill.tertiary, for: .widget)
        .widgetURL(URL(string: "habitapp://today"))
    }
}
