import AVFoundation
import SwiftData
import SwiftUI
import UIKit

struct TodayView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Habit.createdAt) private var habits: [Habit]
    @Query(sort: \CheckIn.completedAt, order: .reverse) private var checkIns: [CheckIn]
    @Query(sort: \MealEntry.date, order: .reverse) private var mealEntries: [MealEntry]
    @Query(sort: \DailyBrief.date, order: .reverse) private var dailyBriefs: [DailyBrief]
    @Query(sort: \WeeklyReview.weekStartDate, order: .reverse) private var weeklyReviews: [WeeklyReview]
    @AppStorage("bodyMassKg") private var bodyMassKg = 75.0
    @AppStorage("dismissedDailyBriefDate") private var dismissedDailyBriefDate = ""
    @AppStorage("dismissedWeeklyReviewWeekStart") private var dismissedWeeklyReviewWeekStart = ""
    @AppStorage(EntitlementService.proAccessKey) private var hasProAccess = false
    @State private var hasAPIKey = KeychainHelper.hasAnthropicAPIKey()
    @State private var showingImagePicker = false
    @State private var showingProteinSheet = false
    @State private var recoveryStatus: RecoveryStatus = .unknown
    @State private var showingBreathSession = false
    @State private var showingPaywall = false
    @State private var isAnalyzingBreakfast = false
    @State private var pendingBreakfastHabit: Habit?
    @State private var lastBreakfastImage: UIImage?
    @State private var mealAnalysis: MealAnalysis?
    @State private var mealRawText: String?
    @State private var showingMealResult = false
    @State private var alertMessage = ""
    @State private var showingAlert = false
    @State private var alertAllowsManualCheckIn = false
    @State private var alertOpensSettings = false

    private var enabledHabits: [Habit] {
        habits.filter(\.isEnabled)
    }

    private var completedCount: Int {
        enabledHabits.filter { HabitStore.isCheckedInToday(habit: $0, checkIns: checkIns) }.count
    }

    private var today: Date {
        Calendar.current.startOfDay(for: .now)
    }

    private var todayBrief: DailyBrief? {
        dailyBriefs.first { $0.date == today }
    }

    private var proteinTargetG: Int {
        todayBrief?.proteinTargetG ?? Int((bodyMassKg * 1.6).rounded())
    }

    private var todayProteinG: Double {
        mealEntries
            .filter { $0.date == today }
            .reduce(0) { $0 + $1.proteinG }
    }

    private var todayKey: String {
        String(Int(today.timeIntervalSince1970))
    }

    private var shouldShowDailyBrief: Bool {
        dismissedDailyBriefDate != todayKey
    }

    private var currentWeeklyReview: WeeklyReview? {
        let weekStart = WeeklyReviewService.weekStart(for: .now)
        guard WeeklyReviewService.shouldGenerate(on: .now) else { return nil }
        guard dismissedWeeklyReviewWeekStart != String(Int(weekStart.timeIntervalSince1970)) else { return nil }
        return weeklyReviews.first { $0.weekStartDate == weekStart }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    if shouldShowDailyBrief {
                        dailyBriefBanner
                    }
                    if let currentWeeklyReview {
                        WeeklyReviewBanner(review: currentWeeklyReview) {
                            dismissedWeeklyReviewWeekStart = String(Int(currentWeeklyReview.weekStartDate.timeIntervalSince1970))
                        }
                    }
                    if recoveryStatus == .low {
                        recoveryCard
                    }
                    summaryHeader

                    if enabledHabits.isEmpty {
                        ContentUnavailableView("等你做第一件事", systemImage: "plus.circle", description: Text("先建立一个小到不会失败的系统。"))
                            .padding(.top, 48)
                    } else {
                        LazyVStack(spacing: 14) {
                            ForEach(enabledHabits) { habit in
                                HabitCardView(
                                    habit: habit,
                                    isCompleted: HabitStore.isCheckedInToday(habit: habit, checkIns: checkIns),
                                    canAnalyzeBreakfast: hasAPIKey,
                                    onPhotoCheckIn: {
                                        startBreakfastCapture(for: habit)
                                    }
                                ) {
                                    HabitStore.checkIn(habit: habit, context: modelContext)
                                }
                            }
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("今日")
            .task {
                HabitStore.seedDefaultsIfNeeded(context: modelContext, habits: habits)
                refreshAPIKeyState()
                recoveryStatus = await RecoveryService.shared.status()
            }
            .onReceive(NotificationCenter.default.publisher(for: .triggerBreakfastCamera)) { _ in
                guard let breakfast = enabledHabits.first(where: { $0.name == "早餐 + 拍照" }) else { return }
                startBreakfastCapture(for: breakfast)
            }
            .sheet(isPresented: $showingImagePicker) {
                ImagePicker(sourceType: .camera) { image in
                    Task {
                        await analyzeBreakfastImage(image)
                    }
                }
            }
            .sheet(isPresented: $showingProteinSheet) {
                ProteinLogSheet { grams in
                    addManualProtein(grams)
                }
            }
            .sheet(isPresented: $showingMealResult) {
                MealResultView(
                    analysis: mealAnalysis,
                    rawText: mealRawText,
                    onRetry: retryBreakfastAnalysis,
                    onDone: finishMealResult
                )
            }
            .sheet(isPresented: $showingBreathSession) {
                BreathSessionView()
            }
            .sheet(isPresented: $showingPaywall) {
                PaywallView()
            }
            .overlay {
                if isAnalyzingBreakfast {
                    ZStack {
                        Color.black.opacity(0.25)
                            .ignoresSafeArea()
                        VStack(spacing: 14) {
                            ProgressView()
                            Text("正在分析早餐...")
                                .font(.headline)
                        }
                        .padding(24)
                        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
                    }
                }
            }
            .alert("早餐拍照", isPresented: $showingAlert) {
                if alertAllowsManualCheckIn {
                    Button("手动打卡") {
                        if let pendingBreakfastHabit {
                            HabitStore.checkIn(habit: pendingBreakfastHabit, context: modelContext)
                        }
                    }
                }
                if alertOpensSettings {
                    Button("打开系统设置") {
                        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
                        UIApplication.shared.open(url)
                    }
                }
                Button("好", role: .cancel) {}
            } message: {
                Text(alertMessage)
            }
        }
    }

    private var dailyBriefBanner: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("晨间简报", systemImage: "sun.max.fill")
                .font(.headline)
                .foregroundStyle(.orange)
            HStack(alignment: .top) {
                Text(todayBrief?.bodyText ?? "你是一个把健康当作长期资产的人。今天先抓住一个小动作：第一餐优先补足蛋白质，然后把训练留给未来的自己。")
                    .font(.subheadline)
                    .foregroundStyle(.primary)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 10)
                Button {
                    dismissedDailyBriefDate = todayKey
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("今天不再显示晨间简报")
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.orange.opacity(0.12), in: RoundedRectangle(cornerRadius: 16))
    }

    private var recoveryCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("恢复信号偏低", systemImage: "wind")
                .font(.headline)
                .foregroundStyle(.purple)
            Text("你是一个会听身体信号的人。来 4 分钟呼吸调节，先把肩膀和下颌松下来。")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Button("开始呼吸") {
                if hasProAccess {
                    showingBreathSession = true
                } else {
                    showingPaywall = true
                }
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.purple.opacity(0.12), in: RoundedRectangle(cornerRadius: 16))
    }

    private var summaryHeader: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("今天已完成 \(completedCount)/\(enabledHabits.count)")
                .font(.title.bold())
            Text("稳定的人不靠意志，靠系统")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            ProgressView(value: enabledHabits.isEmpty ? 0 : Double(completedCount), total: Double(max(enabledHabits.count, 1)))
                .tint(.green)
            Text(Date.now, format: .dateTime.weekday(.wide).month().day())
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Divider()
                .padding(.vertical, 4)

            HStack(spacing: 12) {
                ProteinProgressRing(progress: min(todayProteinG / Double(max(proteinTargetG, 1)), 1))
                    .frame(width: 44, height: 44)

                VStack(alignment: .leading, spacing: 2) {
                    Text("今日蛋白质")
                        .font(.headline)
                    Text("\(Int(todayProteinG.rounded())) / \(proteinTargetG) g")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Button("+ 加一餐") {
                    showingProteinSheet = true
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding()
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }

    private func refreshAPIKeyState() {
        hasAPIKey = KeychainHelper.hasAnthropicAPIKey()
    }

    private func startBreakfastCapture(for habit: Habit) {
        pendingBreakfastHabit = habit
        refreshAPIKeyState()

        guard hasAPIKey else {
            showAlert("前往设置添加 Anthropic API key 后再拍照分析。", allowsManualCheckIn: false)
            return
        }

        guard ensureCameraAccess() else { return }

        showingImagePicker = true
    }

    private func ensureCameraAccess() -> Bool {
        guard UIImagePickerController.isSourceTypeAvailable(.camera) else {
            showAlert("当前设备没有可用相机。请在真机上运行，或先手动打卡。", allowsManualCheckIn: true)
            return false
        }

        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            return true
        case .notDetermined:
            Task {
                let granted = await withCheckedContinuation { continuation in
                    AVCaptureDevice.requestAccess(for: .video) { granted in
                        continuation.resume(returning: granted)
                    }
                }
                await MainActor.run {
                    if granted {
                        showingImagePicker = true
                    } else {
                        showAlert("相机权限未开启。请在系统设置里允许相机访问，或先手动打卡。", allowsManualCheckIn: true, opensSettings: true)
                    }
                }
            }
            return false
        case .denied, .restricted:
            showAlert("相机权限已关闭。请在系统设置里允许相机访问，或先手动打卡。", allowsManualCheckIn: true, opensSettings: true)
            return false
        @unknown default:
            showAlert("无法确认相机权限。请检查系统设置，或先手动打卡。", allowsManualCheckIn: true, opensSettings: true)
            return false
        }
    }

    @MainActor
    private func analyzeBreakfastImage(_ image: UIImage) async {
        lastBreakfastImage = image
        isAnalyzingBreakfast = true
        mealAnalysis = nil
        mealRawText = nil

        do {
            guard let apiKey = try KeychainHelper.loadAnthropicAPIKey(), !apiKey.isEmpty else {
                throw ClaudeVisionError.missingAPIKey
            }

            let analysis = try await ClaudeVisionService.shared.analyzeBreakfast(image: image, apiKey: apiKey)
            mealAnalysis = analysis
            mealRawText = analysis.rawJSON
            saveMealEntry(analysis: analysis, rawText: analysis.rawJSON)

            if let pendingBreakfastHabit {
                HabitStore.checkIn(habit: pendingBreakfastHabit, context: modelContext)
            }

            isAnalyzingBreakfast = false
            showingMealResult = true
        } catch ClaudeVisionError.parseFailed(let rawText) {
            mealRawText = rawText
            isAnalyzingBreakfast = false
            showingMealResult = true
        } catch {
            isAnalyzingBreakfast = false
            showAlert(error.localizedDescription, allowsManualCheckIn: true)
        }
    }

    private func retryBreakfastAnalysis() {
        showingMealResult = false
        guard let lastBreakfastImage else {
            guard let pendingBreakfastHabit else { return }
            startBreakfastCapture(for: pendingBreakfastHabit)
            return
        }

        Task {
            await analyzeBreakfastImage(lastBreakfastImage)
        }
    }

    private func finishMealResult() {
        if mealAnalysis == nil, let pendingBreakfastHabit {
            HabitStore.checkIn(habit: pendingBreakfastHabit, context: modelContext)
        }
        showingMealResult = false
    }

    @discardableResult
    private func saveMealEntry(analysis: MealAnalysis?, rawText: String?) -> MealEntry? {
        guard let analysis else { return nil }
        let entry = MealEntry(
            date: .now,
            totalCalories: analysis.totalCalories,
            proteinG: analysis.proteinG,
            carbsG: analysis.carbsG,
            fatG: analysis.fatG,
            rawJSON: rawText
        )
        modelContext.insert(entry)
        try? modelContext.save()
        Task {
            await HealthKitService.shared.writeNutrition(for: entry)
        }
        return entry
    }

    private func addManualProtein(_ grams: Double) {
        let entry = MealEntry(
            date: .now,
            totalCalories: Int((grams * 4).rounded()),
            proteinG: grams,
            carbsG: 0,
            fatG: 0,
            rawJSON: "manual protein entry"
        )
        modelContext.insert(entry)
        try? modelContext.save()
        Task {
            await HealthKitService.shared.writeNutrition(for: entry)
        }
    }

    private func showAlert(_ message: String, allowsManualCheckIn: Bool, opensSettings: Bool = false) {
        alertMessage = message
        alertAllowsManualCheckIn = allowsManualCheckIn
        alertOpensSettings = opensSettings
        showingAlert = true
    }
}

#Preview {
    TodayView()
        .modelContainer(PreviewContainer.container)
}

private struct ImagePicker: UIViewControllerRepresentable {
    let sourceType: UIImagePickerController.SourceType
    let onImagePicked: (UIImage) -> Void

    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = sourceType
        picker.allowsEditing = false
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(dismiss: dismiss, onImagePicked: onImagePicked)
    }

    final class Coordinator: NSObject, UINavigationControllerDelegate, UIImagePickerControllerDelegate {
        private let dismiss: DismissAction
        private let onImagePicked: (UIImage) -> Void

        init(dismiss: DismissAction, onImagePicked: @escaping (UIImage) -> Void) {
            self.dismiss = dismiss
            self.onImagePicked = onImagePicked
        }

        func imagePickerController(
            _ picker: UIImagePickerController,
            didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
        ) {
            if let image = info[.originalImage] as? UIImage {
                onImagePicked(image)
            }
            dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            dismiss()
        }
    }
}

private struct ProteinProgressRing: View {
    let progress: Double

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.secondary.opacity(0.18), lineWidth: 6)
            Circle()
                .trim(from: 0, to: progress)
                .stroke(Color.green, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Image(systemName: "fork.knife")
                .font(.caption.bold())
                .foregroundStyle(.green)
        }
    }
}

private struct ProteinLogSheet: View {
    let onSave: (Double) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var gramsText = ""

    private var grams: Double {
        Double(gramsText.trimmingCharacters(in: .whitespacesAndNewlines)) ?? 0
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("手动记录蛋白质") {
                    TextField("蛋白质克数", text: $gramsText)
                        .keyboardType(.decimalPad)
                    Text("用于午餐、晚餐或加餐。会把蛋白质和估算热量写回 Apple Health。")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("+ 加一餐")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") {
                        onSave(grams)
                        dismiss()
                    }
                    .disabled(grams <= 0)
                }
            }
        }
    }
}
