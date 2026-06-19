import SwiftData
import SwiftUI
import UserNotifications

struct HabitListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Habit.createdAt) private var habits: [Habit]
    @State private var showingNewHabit = false
    @State private var showingHabitPacks = false
    @State private var editingHabit: Habit?

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Button {
                        showingHabitPacks = true
                    } label: {
                        HStack(spacing: 14) {
                            Image(systemName: "square.grid.2x2.fill")
                                .font(.title3)
                                .frame(width: 36, height: 36)
                                .background(Color.accentColor.opacity(0.12), in: Circle())
                                .foregroundStyle(Color.accentColor)

                            VStack(alignment: .leading, spacing: 4) {
                                Text("从模板包开始")
                                    .font(.headline)
                                Text("导入长寿基础、高蛋白、恢复和训练周系统")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()

                            Image(systemName: "chevron.right")
                                .font(.footnote.bold())
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                    .buttonStyle(.plain)
                }

                Section("我的系统") {
                    ForEach(habits) { habit in
                        Button {
                            editingHabit = habit
                        } label: {
                            HabitRow(habit: habit)
                        }
                        .buttonStyle(.plain)
                    }
                    .onDelete(perform: deleteHabits)
                }
            }
            .navigationTitle("习惯")
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button {
                        showingHabitPacks = true
                    } label: {
                        Image(systemName: "square.grid.2x2")
                    }

                    Button {
                        showingNewHabit = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingNewHabit) {
                HabitEditView(habit: nil)
            }
            .sheet(isPresented: $showingHabitPacks) {
                HabitPackLibraryView()
            }
            .sheet(item: $editingHabit) { habit in
                HabitEditView(habit: habit)
            }
        }
    }

    private func deleteHabits(at offsets: IndexSet) {
        let identifiers = offsets.map { "habit-\(habits[$0].id.uuidString)" }

        for index in offsets {
            modelContext.delete(habits[index])
        }

        try? modelContext.save()
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: identifiers)
    }
}

private struct HabitRow: View {
    let habit: Habit

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: habit.iconSymbol)
                .font(.title3)
                .frame(width: 36, height: 36)
                .background(Color.accentColor.opacity(0.12), in: Circle())
                .foregroundStyle(Color.accentColor)

            VStack(alignment: .leading, spacing: 3) {
                Text(habit.name)
                    .font(.headline)
                Text(habit.anchorText.isEmpty ? habit.reminderTimeText : "\(habit.anchorText) 后 · \(habit.reminderTimeText)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                chainDots
            }

            Spacer()

            Image(systemName: habit.isEnabled ? "bell.fill" : "bell.slash")
                .foregroundStyle(habit.isEnabled ? .green : .secondary)
        }
        .padding(.vertical, 4)
    }

    private var chainDots: some View {
        HStack(spacing: 3) {
            ForEach(lastFourteenDays(), id: \.self) { date in
                Image(systemName: hasCheckIn(on: date) ? "circle.fill" : "circle")
                    .font(.system(size: 6))
                    .foregroundStyle(hasCheckIn(on: date) ? .green : .secondary.opacity(0.45))
            }
        }
        .accessibilityLabel("最近 14 天打卡链")
    }

    private func lastFourteenDays() -> [Date] {
        let today = Calendar.current.startOfDay(for: .now)
        return (0..<14).compactMap { offset in
            Calendar.current.date(byAdding: .day, value: -13 + offset, to: today)
        }
    }

    private func hasCheckIn(on date: Date) -> Bool {
        let day = Calendar.current.startOfDay(for: date)
        return (habit.checkIns ?? []).contains { $0.date == day }
    }
}

#Preview {
    HabitListView()
        .modelContainer(PreviewContainer.container)
}
