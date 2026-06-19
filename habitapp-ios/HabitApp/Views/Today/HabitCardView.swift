import SwiftUI

struct HabitCardView: View {
    let habit: Habit
    let isCompleted: Bool
    let canAnalyzeBreakfast: Bool
    let onPhotoCheckIn: (() -> Void)?
    let onCheckIn: () -> Void

    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: habit.iconSymbol)
                .font(.title2)
                .foregroundStyle(isCompleted ? Color.white : Color.accentColor)
                .frame(width: 44, height: 44)
                .background(iconBackground, in: Circle())

            VStack(alignment: .leading, spacing: 4) {
                Text(habit.name)
                    .font(.headline)
                if habit.anchorText.isEmpty {
                    Label(habit.reminderTimeText, systemImage: "bell")
                        .font(.subheadline)
                        .foregroundStyle(isCompleted ? .white.opacity(0.9) : .secondary)
                } else {
                    Text(AppLanguage.text("\(habit.anchorText) 后 · \(habit.reminderTimeText)", "After \(habit.anchorText) · \(habit.reminderTimeText)"))
                        .font(.subheadline)
                        .foregroundStyle(isCompleted ? .white.opacity(0.9) : .secondary)
                }
                if isBreakfastPhotoHabit, !isCompleted, !canAnalyzeBreakfast {
                    Text(AppLanguage.text("前往设置添加 API key", "Add API key in Settings"))
                        .font(.caption)
                        .foregroundStyle(.orange)
                }
            }

            Spacer()

            if isBreakfastPhotoHabit, !isCompleted {
                Button {
                    onPhotoCheckIn?()
                } label: {
                    Label(AppLanguage.text("记录第一餐", "Log First Meal"), systemImage: "camera.fill")
                        .font(.subheadline.bold())
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
            } else {
                Button(action: onCheckIn) {
                    Image(systemName: isCompleted ? "checkmark" : "circle")
                        .font(.title.bold())
                        .frame(width: 48, height: 48)
                }
                .buttonStyle(.plain)
                .foregroundStyle(isCompleted ? Color.white : Color.accentColor)
                .disabled(isCompleted)
                .accessibilityLabel(isCompleted ? AppLanguage.text("已打卡", "Checked In") : AppLanguage.text("打卡", "Check In"))
            }
        }
        .padding()
        .background(cardBackground, in: RoundedRectangle(cornerRadius: 18))
        .overlay {
            RoundedRectangle(cornerRadius: 18)
                .stroke(isCompleted ? Color.clear : Color.gray.opacity(0.25), lineWidth: 1)
        }
    }

    private var cardBackground: Color {
        isCompleted ? .green : Color(.secondarySystemBackground)
    }

    private var iconBackground: Color {
        isCompleted ? .white.opacity(0.2) : .accentColor.opacity(0.12)
    }

    private var isBreakfastPhotoHabit: Bool {
        habit.isBreakfastPhotoHabit
    }
}

#Preview {
    HabitCardView(
        habit: Habit(name: "Strength workout", iconSymbol: "dumbbell.fill", reminderHour: 18, reminderMinute: 30),
        isCompleted: false,
        canAnalyzeBreakfast: true,
        onPhotoCheckIn: {},
        onCheckIn: {}
    )
    .padding()
}
