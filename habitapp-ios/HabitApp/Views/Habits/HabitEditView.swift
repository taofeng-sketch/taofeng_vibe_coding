import SwiftData
import SwiftUI

struct HabitEditView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

    let habit: Habit?

    @State private var name: String
    @State private var iconSymbol: String
    @State private var reminderDate: Date
    @State private var isEnabled: Bool
    @State private var anchorText: String

    private let symbols = [
        "figure.run", "dumbbell.fill", "fork.knife.circle", "takeoutbag.and.cup.and.straw",
        "figure.seated.side.right", "book.fill", "drop.fill", "bed.double.fill",
        "heart.fill", "pills.fill", "leaf.fill", "moon.stars.fill",
    ]

    init(habit: Habit?) {
        self.habit = habit
        _name = State(initialValue: habit?.name ?? "")
        _iconSymbol = State(initialValue: habit?.iconSymbol ?? "figure.run")
        _isEnabled = State(initialValue: habit?.isEnabled ?? true)
        _anchorText = State(initialValue: habit?.anchorText ?? "")

        var components = DateComponents()
        components.hour = habit?.reminderHour ?? 8
        components.minute = habit?.reminderMinute ?? 0
        _reminderDate = State(initialValue: Calendar.current.date(from: components) ?? .now)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("基本信息") {
                    TextField("名称", text: $name)

                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 4), spacing: 12) {
                        ForEach(symbols, id: \.self) { symbol in
                            Button {
                                iconSymbol = symbol
                            } label: {
                                Image(systemName: symbol)
                                    .font(.title2)
                                    .frame(width: 44, height: 44)
                                    .background(iconSymbol == symbol ? Color.accentColor : Color(.secondarySystemBackground), in: Circle())
                                    .foregroundStyle(iconSymbol == symbol ? .white : .primary)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 6)
                }

                Section("提醒") {
                    DatePicker("提醒时间", selection: $reminderDate, displayedComponents: .hourAndMinute)
                    Toggle("启用通知", isOn: $isEnabled)
                }

                Section("习惯结构（Tiny Habits）") {
                    TextField("锚点（已有的可靠日常）", text: $anchorText)
                    Text("公式：After [锚点], I will [\(name.isEmpty ? "这个习惯" : name)]. 例如“刷牙后我会做 5 次深蹲”。")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle(habit == nil ? "新习惯" : "编辑习惯")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存", action: save)
                        .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }

    private func save() {
        let time = Calendar.current.dateComponents([.hour, .minute], from: reminderDate)

        let savedHabit: Habit
        if let habit {
            habit.name = name.trimmingCharacters(in: .whitespacesAndNewlines)
            habit.iconSymbol = iconSymbol
            habit.reminderHour = time.hour ?? 8
            habit.reminderMinute = time.minute ?? 0
            habit.isEnabled = isEnabled
            habit.anchorText = anchorText.trimmingCharacters(in: .whitespacesAndNewlines)
            savedHabit = habit
        } else {
            let habit = Habit(
                name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                iconSymbol: iconSymbol,
                reminderHour: time.hour ?? 8,
                reminderMinute: time.minute ?? 0,
                isEnabled: isEnabled,
                anchorText: anchorText.trimmingCharacters(in: .whitespacesAndNewlines)
            )
            modelContext.insert(habit)
            savedHabit = habit
        }

        try? modelContext.save()
        Task {
            await NotificationService.shared.scheduleNext(for: savedHabit)
        }
        dismiss()
    }
}

#Preview {
    HabitEditView(habit: nil)
        .modelContainer(PreviewContainer.container)
}
