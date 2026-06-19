import AVFoundation
import SwiftData
import SwiftUI

struct OnboardingFlow: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Habit.createdAt) private var habits: [Habit]
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false
    @AppStorage("identityTags") private var identityTagsStorage = ""
    @AppStorage("bodyMassKg") private var bodyMassKg = 75.0
    @State private var step = 0

    private let identityOptions = ["有力量的", "有体能的", "睡得好的", "吃得对的", "内心稳定的", "行动可靠的"]

    private var selectedTags: Set<String> {
        get {
            Set(identityTagsStorage.split(separator: ",").map(String.init))
        }
        nonmutating set {
            identityTagsStorage = newValue.sorted().joined(separator: ",")
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                TabView(selection: $step) {
                    WelcomeStep {
                        step = 1
                    }
                    .tag(0)

                    IdentityStep(options: identityOptions, selected: selectedTags) { tag in
                        var tags = selectedTags
                        if tags.contains(tag) {
                            tags.remove(tag)
                        } else {
                            tags.insert(tag)
                        }
                        selectedTags = tags
                    } onNext: {
                        step = 2
                    }
                    .tag(1)

                    HabitPackPickerStep(
                        packs: HabitPack.library,
                        onUsePack: { pack in
                            applyOnboardingPack(pack)
                            step = 3
                        },
                        onSkip: {
                            step = 3
                        }
                    )
                    .tag(2)

                    BodyMassStep(bodyMassKg: $bodyMassKg) {
                        step = 4
                    }
                    .tag(3)

                    PermissionsStep {
                        step = 5
                    }
                    .tag(4)

                    ReadyStep {
                        hasCompletedOnboarding = true
                    }
                    .tag(5)
                }
                .tabViewStyle(.page(indexDisplayMode: .always))
            }
            .toolbar {
                if step < 5 {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("稍后") {
                            if step < 5 {
                                step += 1
                            }
                        }
                    }
                }
            }
        }
    }

    private func applyOnboardingPack(_ pack: HabitPack) {
        guard pack.access == .free else { return }

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

        newHabits.forEach(modelContext.insert)
        try? modelContext.save()

        Task {
            for habit in newHabits {
                await NotificationService.shared.scheduleNext(for: habit)
            }
        }
    }
}

private struct WelcomeStep: View {
    let onNext: () -> Void

    var body: some View {
        OnboardingStepLayout(
            systemImage: "figure.strengthtraining.traditional",
            title: "你不是在追踪习惯",
            subtitle: "你是在打磨一个版本更好的自己。稳定的人不靠意志，靠系统。",
            primaryTitle: "开始"
        ) {
            onNext()
        }
    }
}

private struct IdentityStep: View {
    let options: [String]
    let selected: Set<String>
    let onToggle: (String) -> Void
    let onNext: () -> Void

    private let columns = [GridItem(.adaptive(minimum: 118), spacing: 10)]

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Spacer()
            Text("未来 10 年，你想成为一个 ___ 的人？")
                .font(.largeTitle.bold())
                .fixedSize(horizontal: false, vertical: true)

            LazyVGrid(columns: columns, alignment: .leading, spacing: 10) {
                ForEach(options, id: \.self) { option in
                    Button {
                        onToggle(option)
                    } label: {
                        Text(option)
                            .font(.headline)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .frame(maxWidth: .infinity)
                            .background(selected.contains(option) ? Color.accentColor : Color(.secondarySystemBackground), in: Capsule())
                            .foregroundStyle(selected.contains(option) ? .white : .primary)
                    }
                    .buttonStyle(.plain)
                }
            }

            Text("选 1-3 个就够了。身份越具体，系统越容易帮你做决定。")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Spacer()

            Button("下一步", action: onNext)
                .buttonStyle(.borderedProminent)
                .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .padding(28)
    }
}

private struct BodyMassStep: View {
    @Binding var bodyMassKg: Double
    let onNext: () -> Void
    @State private var text = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Spacer()
            Image(systemName: "scalemass.fill")
                .font(.system(size: 64))
                .foregroundStyle(Color.accentColor)
            Text("体重多少 kg？")
                .font(.largeTitle.bold())
            Text("用来计算每天的蛋白质目标。没有 Apple Health 体重数据时，我们会用这里的数字。")
                .font(.body)
                .foregroundStyle(.secondary)

            TextField("75", text: $text)
                .keyboardType(.decimalPad)
                .font(.largeTitle.bold())
                .padding()
                .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
                .onAppear {
                    text = String(format: "%.0f", bodyMassKg)
                }

            Spacer()

            Button("下一步") {
                if let value = Double(text), value > 25 {
                    bodyMassKg = value
                }
                onNext()
            }
            .buttonStyle(.borderedProminent)
            .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .padding(28)
    }
}

private struct HabitPackPickerStep: View {
    let packs: [HabitPack]
    let onUsePack: (HabitPack) -> Void
    let onSkip: () -> Void

    @State private var selectedPackID: String?

    private var selectedPack: HabitPack? {
        packs.first { $0.id == selectedPackID } ?? packs.first(where: { $0.access == .free })
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Spacer(minLength: 12)

            Text("要不要从一个习惯包开始？")
                .font(.largeTitle.bold())
                .fixedSize(horizontal: false, vertical: true)

            Text("先导入一套免费系统，后面随时可以改。Pro 包先展示方向，不会在 onboarding 里强行付费。")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            ScrollView {
                VStack(spacing: 12) {
                    ForEach(packs) { pack in
                        Button {
                            selectedPackID = pack.id
                        } label: {
                            OnboardingPackCard(pack: pack, isSelected: selectedPack?.id == pack.id)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .frame(maxHeight: 360)

            if let selectedPack {
                VStack(alignment: .leading, spacing: 6) {
                    Text("将添加")
                        .font(.caption.bold())
                        .foregroundStyle(.secondary)
                    ForEach(selectedPack.templates) { template in
                        Label(template.name, systemImage: template.iconSymbol)
                            .font(.footnote)
                    }
                }
                .padding()
                .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 14))
            }

            HStack {
                Button("我自己来", action: onSkip)
                    .buttonStyle(.bordered)

                Spacer()

                Button(selectedPack?.access == .pro ? "Pro 包稍后解锁" : "用这个") {
                    guard let selectedPack, selectedPack.access == .free else { return }
                    onUsePack(selectedPack)
                }
                .buttonStyle(.borderedProminent)
                .disabled(selectedPack?.access == .pro)
            }
        }
        .padding(28)
        .onAppear {
            if selectedPackID == nil {
                selectedPackID = packs.first(where: { $0.access == .free })?.id
            }
        }
    }
}

private struct OnboardingPackCard: View {
    let pack: HabitPack
    let isSelected: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(pack.title)
                    .font(.headline)
                Text(pack.access.label)
                    .font(.caption.bold())
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(pack.access == .pro ? Color.purple.opacity(0.16) : Color.green.opacity(0.16), in: Capsule())
                Spacer()
                if pack.access == .pro {
                    Image(systemName: "lock.fill")
                        .foregroundStyle(.secondary)
                } else if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(Color.accentColor)
                }
            }

            Text(pack.subtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Text(pack.identityLine)
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(isSelected ? Color.accentColor.opacity(0.12) : Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 14))
        .overlay {
            RoundedRectangle(cornerRadius: 14)
                .stroke(isSelected ? Color.accentColor : Color.clear, lineWidth: 1.5)
        }
    }
}

private struct PermissionsStep: View {
    let onNext: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Spacer()
            Text("三个权限，都是为了少打扰你")
                .font(.largeTitle.bold())
                .fixedSize(horizontal: false, vertical: true)

            PermissionRow(
                title: "通知",
                subtitle: "只在你设定的时间提醒习惯。",
                systemImage: "bell.badge.fill"
            ) {
                Task { await NotificationService.shared.requestAuthorization() }
            }

            PermissionRow(
                title: "相机",
                subtitle: "用于记录早餐，不保存到相册。",
                systemImage: "camera.fill"
            ) {
                AVCaptureDevice.requestAccess(for: .video) { _ in }
            }

            PermissionRow(
                title: "Apple Health",
                subtitle: "读取恢复和训练信号，写回营养记录。",
                systemImage: "heart.text.square.fill"
            ) {
                Task { _ = await HealthKitService.shared.requestAuthorization() }
            }

            Spacer()

            Button("继续") {
                onNext()
            }
            .buttonStyle(.borderedProminent)
            .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .padding(28)
    }
}

private struct ReadyStep: View {
    let onFinish: () -> Void

    var body: some View {
        OnboardingStepLayout(
            systemImage: "checkmark.seal.fill",
            title: "系统已经准备好",
            subtitle: "今天的第一个动作：记录今天的第一餐。你正在成为一个行动可靠的人。",
            primaryTitle: "进入今日"
        ) {
            UserDefaults.standard.set("today", forKey: "selectedTab")
            onFinish()
        }
    }
}

private struct PermissionRow: View {
    let title: String
    let subtitle: String
    let systemImage: String
    let action: () -> Void

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: systemImage)
                .font(.title2)
                .frame(width: 40, height: 40)
                .background(Color.accentColor.opacity(0.12), in: Circle())
                .foregroundStyle(Color.accentColor)

            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.headline)
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Button("允许", action: action)
                .buttonStyle(.bordered)
                .controlSize(.small)
        }
        .padding()
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 14))
    }
}

private struct OnboardingStepLayout: View {
    let systemImage: String
    let title: String
    let subtitle: String
    let primaryTitle: String
    let action: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Spacer()
            Image(systemName: systemImage)
                .font(.system(size: 76))
                .foregroundStyle(Color.accentColor)
            Text(title)
                .font(.largeTitle.bold())
                .fixedSize(horizontal: false, vertical: true)
            Text(subtitle)
                .font(.title3)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
            Spacer()
            Button(primaryTitle, action: action)
                .buttonStyle(.borderedProminent)
                .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .padding(28)
    }
}

#Preview {
    OnboardingFlow()
}
