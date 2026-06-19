import SwiftData
import SwiftUI

struct HabitEditView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @AppStorage(AppLanguage.storageKey) private var appLanguage = AppLanguage.system.rawValue

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
                Section(AppLanguage.text("基本信息", "Basic Info")) {
                    TextField(AppLanguage.text("名称", "Name"), text: $name)

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

                Section(AppLanguage.text("提醒", "Reminder")) {
                    DatePicker(AppLanguage.text("提醒时间", "Reminder Time"), selection: $reminderDate, displayedComponents: .hourAndMinute)
                    Toggle(AppLanguage.text("启用通知", "Enable Notifications"), isOn: $isEnabled)
                }

                Section(AppLanguage.text("习惯结构（Tiny Habits）", "Habit Structure (Tiny Habits)")) {
                    TextField(AppLanguage.text("锚点（已有的可靠日常）", "Anchor (existing reliable routine)"), text: $anchorText)
                    Text(AppLanguage.text("公式：After [锚点], I will [\(name.isEmpty ? "这个习惯" : name)]. 例如“刷牙后我会做 5 次深蹲”。", "Formula: After [anchor], I will [\(name.isEmpty ? "this habit" : name)]. Example: after brushing teeth, I will do five squats."))
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle(habit == nil ? AppLanguage.text("新习惯", "New Habit") : AppLanguage.text("编辑习惯", "Edit Habit"))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(AppLanguage.text("取消", "Cancel")) { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(AppLanguage.text("保存", "Save"), action: save)
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
