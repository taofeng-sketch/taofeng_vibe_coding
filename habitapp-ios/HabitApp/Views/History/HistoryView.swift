import SwiftData
import SwiftUI

struct HistoryView: View {
    @Query(sort: \Habit.createdAt) private var habits: [Habit]
    @Query(sort: \CheckIn.date, order: .reverse) private var checkIns: [CheckIn]

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: 7)
    private var enabledHabits: [Habit] { habits.filter(\.isEnabled) }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    monthGrid
                    streakSection
                }
                .padding()
            }
            .navigationTitle("历史")
        }
    }

    private var monthGrid: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(Date.now, format: .dateTime.year().month())
                .font(.title2.bold())

            LazyVGrid(columns: columns, spacing: 10) {
                ForEach(["一", "二", "三", "四", "五", "六", "日"], id: \.self) { day in
                    Text(day)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                ForEach(monthPadding(), id: \.self) { _ in
                    Color.clear.frame(height: 32)
                }

                ForEach(daysInCurrentMonth(), id: \.self) { date in
                    dayCell(date)
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 18))
    }

    private var streakSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("连续打卡")
                .font(.title2.bold())

            ForEach(enabledHabits) { habit in
                HStack {
                    Image(systemName: habit.iconSymbol)
                        .frame(width: 28)
                    Text(habit.name)
                    Spacer()
                    Text("\(currentStreak(for: habit)) 天")
                        .font(.headline)
                        .foregroundStyle(.green)
                }
                .padding()
                .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 14))
            }
        }
    }

    private func dayCell(_ date: Date) -> some View {
        let state = completionState(for: date)
        return VStack(spacing: 4) {
            Text("\(Calendar.current.component(.day, from: date))")
                .font(.callout)
                .frame(width: 32, height: 28)
            Circle()
                .fill(state.color)
                .frame(width: 7, height: 7)
        }
        .foregroundStyle(Calendar.current.isDateInToday(date) ? Color.accentColor : Color.primary)
    }

    private func completionState(for date: Date) -> CompletionState {
        guard !enabledHabits.isEmpty else { return .none }
        let completed = enabledHabits.filter { habit in
            hasCheckIn(for: habit, on: date)
        }.count

        if completed == enabledHabits.count { return .complete }
        if completed > 0 { return .partial }
        return .none
    }

    private func hasCheckIn(for habit: Habit, on date: Date) -> Bool {
        let day = Calendar.current.startOfDay(for: date)
        return checkIns.contains { $0.habit?.id == habit.id && $0.date == day }
    }

    private func currentStreak(for habit: Habit) -> Int {
        var streak = 0
        var cursor = Calendar.current.startOfDay(for: .now)

        while hasCheckIn(for: habit, on: cursor) {
            streak += 1
            guard let previous = Calendar.current.date(byAdding: .day, value: -1, to: cursor) else {
                break
            }
            cursor = previous
        }

        return streak
    }

    private func daysInCurrentMonth() -> [Date] {
        let calendar = Calendar.current
        let start = calendar.date(from: calendar.dateComponents([.year, .month], from: .now)) ?? .now
        let range = calendar.range(of: .day, in: .month, for: start) ?? 1..<1
        return range.compactMap { day in
            calendar.date(byAdding: .day, value: day - 1, to: start)
        }
    }

    private func monthPadding() -> [Int] {
        let calendar = Calendar.current
        let start = calendar.date(from: calendar.dateComponents([.year, .month], from: .now)) ?? .now
        let weekday = calendar.component(.weekday, from: start)
        let mondayBasedOffset = (weekday + 5) % 7
        return Array(0..<mondayBasedOffset)
    }
}

private enum CompletionState {
    case complete
    case partial
    case none

    var color: Color {
        switch self {
        case .complete: .green
        case .partial: .yellow
        case .none: .gray.opacity(0.35)
        }
    }
}

#Preview {
    HistoryView()
        .modelContainer(PreviewContainer.container)
}
