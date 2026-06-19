import SwiftUI

struct DecathlonView: View {
    @AppStorage(EntitlementService.proAccessKey) private var hasProAccess = false
    @AppStorage(AppLanguage.storageKey) private var appLanguage = AppLanguage.system.rawValue
    @State private var pillars = HealthKitService.fallbackDecathlonProgress()
    @State private var selectedPillar: DecathlonPillarProgress?
    @State private var showingPaywall = false

    var body: some View {
        NavigationStack {
            Group {
                if hasProAccess {
                    List {
                        Section {
                            Text(AppLanguage.text("目标不是今天拼命，而是让 80 岁的你还保有力量、心肺和稳定性。", "The goal is not to crush today. It is to keep strength, cardio, and stability at 80."))
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }

                        ForEach(pillars) { pillar in
                            Button {
                                selectedPillar = pillar
                            } label: {
                                PillarRow(pillar: pillar)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                } else {
                    DecathlonPaywallTeaser {
                        showingPaywall = true
                    }
                }
            }
            .navigationTitle(AppLanguage.text("长寿训练", "Longevity Training"))
            .task {
                await EntitlementService.refreshEntitlements()
                guard hasProAccess else { return }
                _ = await HealthKitService.shared.requestAuthorization()
                pillars = await HealthKitService.shared.weeklyDecathlonProgress()
            }
            .sheet(item: $selectedPillar) { pillar in
                NavigationStack {
                    List {
                        if pillar.sourceWorkouts.isEmpty {
                            ContentUnavailableView(
                                AppLanguage.text("本周还没有来源训练", "No source workouts this week"),
                                systemImage: "figure.run",
                                description: Text(AppLanguage.text("完成相关训练后，这里会从 Apple Health 自动填充。", "After relevant workouts are completed, this fills from Apple Health."))
                            )
                        } else {
                            ForEach(pillar.sourceWorkouts) { workout in
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(workout.title)
                                        .font(.headline)
                                    Text(AppLanguage.text("\(workout.durationMinutes) 分钟 · \(workout.date.formatted(date: .abbreviated, time: .omitted))", "\(workout.durationMinutes) min · \(workout.date.formatted(date: .abbreviated, time: .omitted))"))
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                    .navigationTitle(pillar.title)
                }
            }
            .sheet(isPresented: $showingPaywall) {
                PaywallView()
            }
        }
    }
}

private struct DecathlonPaywallTeaser: View {
    let action: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Image(systemName: "figure.strengthtraining.traditional")
                .font(.system(size: 48))
                .foregroundStyle(Color.accentColor)

            VStack(alignment: .leading, spacing: 8) {
                Text(AppLanguage.text("长寿训练是 Pro 功能", "Longevity Training is a Pro feature"))
                    .font(.title2.bold())
                Text(AppLanguage.text("解锁力量、Zone 2、VO2 和稳定性四个支柱，把训练从“今天运动了吗”变成一套能复利的系统。", "Unlock strength, Zone 2, VO2, and stability pillars, turning exercise into a system that compounds."))
                    .font(.body)
                    .foregroundStyle(.secondary)
            }

            Button(AppLanguage.text("解锁 Pro", "Unlock Pro")) {
                action()
            }
            .buttonStyle(.borderedProminent)

            Spacer()
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct PillarRow: View {
    let pillar: DecathlonPillarProgress

    var body: some View {
        HStack(spacing: 16) {
            DecathlonProgressRing(progress: pillar.progress)
                .frame(width: 44, height: 44)

            VStack(alignment: .leading, spacing: 4) {
                Text(pillar.title)
                    .font(.headline)
                Text(pillar.subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text(pillar.remainingText)
                    .font(.caption)
                    .foregroundStyle(pillar.progress >= 1 ? .green : .orange)
            }

            Spacer()

            Text("\(Int(pillar.current))/\(Int(pillar.target)) \(pillar.unit)")
                .font(.subheadline.bold())
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 6)
    }
}

private struct DecathlonProgressRing: View {
    let progress: Double

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.secondary.opacity(0.18), lineWidth: 6)
            Circle()
                .trim(from: 0, to: progress)
                .stroke(progress >= 1 ? Color.green : Color.orange, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Text("\(Int((progress * 100).rounded()))%")
                .font(.caption2.bold())
                .foregroundStyle(.secondary)
        }
    }
}

#Preview {
    DecathlonView()
}
