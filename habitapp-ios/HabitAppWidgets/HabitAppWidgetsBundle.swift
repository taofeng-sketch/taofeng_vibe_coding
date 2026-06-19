import SwiftData
import SwiftUI
import WidgetKit

@main
struct HabitAppWidgetsBundle: WidgetBundle {
    var body: some Widget {
        TodayCheckinWidget()
        ProteinRingWidget()
        DailyBriefWidget()
        LockScreenWidget()
    }
}

enum HabitWidgetStore {
    static let appGroupID = "group.com.taofeng.habitapp"

    static func modelContext() -> ModelContext? {
        let schema = Schema([
            Habit.self,
            CheckIn.self,
            MealEntry.self,
            DailyBrief.self,
            WeeklyReview.self,
        ])
        let configuration = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: false,
            groupContainer: .identifier(appGroupID),
            cloudKitDatabase: .automatic
        )

        do {
            let container = try ModelContainer(for: schema, configurations: [configuration])
            return ModelContext(container)
        } catch {
            return nil
        }
    }

    static var today: Date {
        Calendar.current.startOfDay(for: .now)
    }
}

struct HabitWidgetRing: View {
    let progress: Double
    var color: Color = .green
    var lineWidth: CGFloat = 7

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.secondary.opacity(0.18), lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: min(max(progress, 0), 1))
                .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
    }
}

extension String {
    var widgetFirstSentence: String {
        let separators = CharacterSet(charactersIn: "。！？.!?")
        guard let range = rangeOfCharacter(from: separators) else { return self }
        return String(self[...range.lowerBound])
    }
}
