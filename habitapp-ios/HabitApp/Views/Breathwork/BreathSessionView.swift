import SwiftUI
import UIKit

struct BreathSessionView: View {
    @Environment(\.dismiss) private var dismiss
    @AppStorage("breathMode") private var breathModeRaw = BreathMode.box.rawValue
    @AppStorage(AppLanguage.storageKey) private var appLanguage = AppLanguage.system.rawValue

    @State private var phaseIndex = 0
    @State private var cycleIndex = 0
    @State private var secondsRemaining = BreathMode.box.phases[0].duration
    @State private var isComplete = false

    private let totalCycles = 4
    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    private var mode: BreathMode {
        BreathMode(rawValue: breathModeRaw) ?? .box
    }

    private var phase: BreathPhase {
        mode.phases[phaseIndex]
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 26) {
                Picker(AppLanguage.text("呼吸模式", "Breathing Mode"), selection: $breathModeRaw) {
                    ForEach(BreathMode.allCases) { mode in
                        Text(mode.title).tag(mode.rawValue)
                    }
                }
                .pickerStyle(.segmented)
                .onChange(of: breathModeRaw) { _, _ in
                    reset()
                }

                phaseDots

                ZStack {
                    breathingTrack

                    movingDot

                    VStack(spacing: 8) {
                        Text(phase.label)
                            .font(.title.bold())
                        Text("\(secondsRemaining)")
                            .font(.system(size: 72, weight: .bold, design: .rounded))
                            .monospacedDigit()
                    }
                }
                .frame(width: 300, height: 300)
                .background(phase.color.opacity(0.12), in: RoundedRectangle(cornerRadius: 24))

                Text(isComplete ? AppLanguage.text("注意你的肩膀和下颌是不是放松了。", "Notice whether your shoulders and jaw have softened.") : AppLanguage.text("第 \(cycleIndex + 1)/\(totalCycles) 轮", "Round \(cycleIndex + 1)/\(totalCycles)"))
                    .font(.headline)
                    .foregroundStyle(.secondary)

                Spacer()

                Button(isComplete ? AppLanguage.text("完成", "Done") : AppLanguage.text("结束", "End")) {
                    dismiss()
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
            }
            .padding()
            .navigationTitle(AppLanguage.text("呼吸调节", "Breathwork"))
            .navigationBarTitleDisplayMode(.inline)
            .onAppear(perform: reset)
            .onReceive(timer) { _ in
                tick()
            }
        }
    }

    private var phaseDots: some View {
        HStack(spacing: 5) {
            ForEach(0..<(totalCycles * mode.phases.count), id: \.self) { index in
                Circle()
                    .fill(isComplete || index <= cycleIndex * mode.phases.count + phaseIndex ? Color.accentColor : Color.secondary.opacity(0.2))
                    .frame(width: 7, height: 7)
            }
        }
        .accessibilityLabel(AppLanguage.text("呼吸阶段进度", "Breathing phase progress"))
    }

    @ViewBuilder
    private var breathingTrack: some View {
        if mode == .fourSevenEight {
            TriangleTrack()
                .stroke(Color.secondary.opacity(0.25), style: StrokeStyle(lineWidth: 2, lineJoin: .round))
                .frame(width: 280, height: 280)
        } else {
            RoundedRectangle(cornerRadius: 18)
                .stroke(Color.secondary.opacity(0.25), lineWidth: 2)
                .frame(width: 280, height: 280)
        }
    }

    private var movingDot: some View {
        let sideProgress = 1 - Double(secondsRemaining) / Double(max(phase.duration, 1))
        let point = dotPoint(phaseIndex: phaseIndex, progress: sideProgress)
        return Circle()
            .fill(phase.color)
            .frame(width: 20, height: 20)
            .offset(x: point.x, y: point.y)
            .animation(.easeInOut(duration: 0.8), value: secondsRemaining)
    }

    private func tick() {
        guard !isComplete else { return }
        if secondsRemaining > 1 {
            secondsRemaining -= 1
            return
        }

        advancePhase()
    }

    private func advancePhase() {
        UIImpactFeedbackGenerator(style: .soft).impactOccurred()
        if phaseIndex < mode.phases.count - 1 {
            phaseIndex += 1
        } else if cycleIndex < totalCycles - 1 {
            phaseIndex = 0
            cycleIndex += 1
        } else {
            isComplete = true
            return
        }
        secondsRemaining = mode.phases[phaseIndex].duration
    }

    private func reset() {
        phaseIndex = 0
        cycleIndex = 0
        secondsRemaining = mode.phases[0].duration
        isComplete = false
    }

    private func dotPoint(phaseIndex: Int, progress: Double) -> CGPoint {
        let half = 140.0
        let clamped = max(0, min(progress, 1))
        if mode == .fourSevenEight {
            return triangleDotPoint(phaseIndex: phaseIndex, progress: clamped)
        }
        switch phaseIndex {
        case 0:
            return CGPoint(x: -half + clamped * 280, y: -half)
        case 1:
            return CGPoint(x: half, y: -half + clamped * 280)
        case 2:
            return CGPoint(x: half - clamped * 280, y: half)
        default:
            return CGPoint(x: -half, y: half - clamped * 280)
        }
    }

    private func triangleDotPoint(phaseIndex: Int, progress: Double) -> CGPoint {
        let top = CGPoint(x: 0, y: -140)
        let right = CGPoint(x: 122, y: 88)
        let left = CGPoint(x: -122, y: 88)

        switch phaseIndex {
        case 0:
            return interpolate(from: left, to: top, progress: progress)
        case 1:
            return interpolate(from: top, to: right, progress: progress)
        default:
            return interpolate(from: right, to: left, progress: progress)
        }
    }

    private func interpolate(from start: CGPoint, to end: CGPoint, progress: Double) -> CGPoint {
        CGPoint(
            x: start.x + (end.x - start.x) * progress,
            y: start.y + (end.y - start.y) * progress
        )
    }
}

private struct TriangleTrack: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let top = CGPoint(x: rect.midX, y: rect.minY)
        let right = CGPoint(x: rect.maxX, y: rect.maxY * 0.82)
        let left = CGPoint(x: rect.minX, y: rect.maxY * 0.82)

        path.move(to: left)
        path.addLine(to: top)
        path.addLine(to: right)
        path.addLine(to: left)
        return path
    }
}

private enum BreathMode: String, CaseIterable, Identifiable {
    case box
    case fourSevenEight

    var id: String { rawValue }

    var title: String {
        switch self {
        case .box: "Box"
        case .fourSevenEight: "4-7-8"
        }
    }

    var phases: [BreathPhase] {
        switch self {
        case .box:
            [
                BreathPhase(label: AppLanguage.text("吸气", "Inhale"), duration: 4, color: .green),
                BreathPhase(label: AppLanguage.text("屏息", "Hold"), duration: 4, color: .yellow),
                BreathPhase(label: AppLanguage.text("呼气", "Exhale"), duration: 4, color: .red),
                BreathPhase(label: AppLanguage.text("屏息", "Hold"), duration: 4, color: .purple),
            ]
        case .fourSevenEight:
            [
                BreathPhase(label: AppLanguage.text("吸气", "Inhale"), duration: 4, color: .green),
                BreathPhase(label: AppLanguage.text("屏息", "Hold"), duration: 7, color: .yellow),
                BreathPhase(label: AppLanguage.text("呼气", "Exhale"), duration: 8, color: .red),
            ]
        }
    }
}

private struct BreathPhase {
    let label: String
    let duration: Int
    let color: Color
}

#Preview {
    BreathSessionView()
}
