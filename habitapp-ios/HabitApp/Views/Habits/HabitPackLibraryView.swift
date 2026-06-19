import SwiftData
import SwiftUI

struct HabitPackLibraryView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Habit.createdAt) private var habits: [Habit]
    @AppStorage(EntitlementService.proAccessKey) private var hasProAccess = false

    @State private var showingPaywall = false
    @State private var importMessage = ""

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(HabitPack.library) { pack in
                        HabitPackCard(
                            pack: pack,
                            isLocked: pack.access == .pro && !hasProAccess,
                            importedCount: importedCount(for: pack)
                        ) {
                            apply(pack)
                        }
                    }
                } header: {
                    Text("模板包")
                } footer: {
                    Text("模板只会新增还不存在的习惯，不会覆盖你已经改过的提醒。")
                }

                if !importMessage.isEmpty {
                    Section {
                        Text(importMessage)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("习惯模板")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("关闭") { dismiss() }
                }
            }
            .sheet(isPresented: $showingPaywall) {
                PaywallView()
            }
        }
    }

    private func apply(_ pack: HabitPack) {
        guard pack.access == .free || hasProAccess else {
            showingPaywall = true
            return
        }

        let existingNames = Set(habits.map(\.name))
        let newHabits = pack.templates
            .filter { !existingNames.contains($0.name) }
            .map {
                Habit(
                    name: $0.name,
                    iconSymbol: $0.iconSymbol,
                    reminderHour: $0.reminderHour,
                    reminderMinute: $0.reminderMinute,
                    anchorText: $0.anchorText
                )
            }

        guard !newHabits.isEmpty else {
            importMessage = "这个模板包里的习惯已经都在你的系统里。"
            return
        }

        newHabits.forEach(modelContext.insert)
        try? modelContext.save()
        importMessage = "已导入 \(newHabits.count) 个习惯：\(pack.title)。"

        Task {
            for habit in newHabits {
                await NotificationService.shared.scheduleNext(for: habit)
            }
        }
    }

    private func importedCount(for pack: HabitPack) -> Int {
        let existingNames = Set(habits.map(\.name))
        return pack.templates.filter { existingNames.contains($0.name) }.count
    }
}

private struct HabitPackCard: View {
    let pack: HabitPack
    let isLocked: Bool
    let importedCount: Int
    let action: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(pack.title)
                            .font(.headline)
                        Text(pack.access.label)
                            .font(.caption.bold())
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(pack.access == .pro ? Color.purple.opacity(0.16) : Color.green.opacity(0.16), in: Capsule())
                    }
                    Text(pack.subtitle)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                if isLocked {
                    Image(systemName: "lock.fill")
                        .foregroundStyle(.secondary)
                }
            }

            Text(pack.identityLine)
                .font(.footnote)
                .foregroundStyle(.secondary)

            VStack(alignment: .leading, spacing: 6) {
                ForEach(pack.templates) { template in
                    Label("\(template.anchorText) 后 · \(template.name)", systemImage: template.iconSymbol)
                        .font(.footnote)
                        .foregroundStyle(.primary)
                }
            }

            HStack {
                Text("\(importedCount)/\(pack.templates.count) 已在系统")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Spacer()

                Button(isLocked ? "查看 Pro" : "导入") {
                    action()
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding(.vertical, 8)
    }
}

#Preview {
    HabitPackLibraryView()
        .modelContainer(PreviewContainer.container)
}
