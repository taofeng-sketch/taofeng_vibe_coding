import AVFoundation
import SwiftData
import SwiftUI

@main
struct HabitAppApp: App {
    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            Habit.self,
            CheckIn.self,
            MealEntry.self,
            DailyBrief.self,
            WeeklyReview.self,
        ])
        let configuration = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: false,
            groupContainer: .identifier("group.com.taofeng.habitapp"),
            cloudKitDatabase: .automatic
        )

        do {
            return try ModelContainer(for: schema, configurations: [configuration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            AppBootstrapView()
        }
        .modelContainer(sharedModelContainer)
    }
}

private struct AppBootstrapView: View {
    @Environment(\.modelContext) private var modelContext
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false
    @AppStorage("bodyMassKg") private var bodyMassKg = 75.0
    @AppStorage("identityTags") private var identityTags = ""
    @AppStorage(CoachMemoryKeys.longTermGoal) private var coachLongTermGoal = ""
    @AppStorage(CoachMemoryKeys.constraints) private var coachConstraints = ""
    @AppStorage(CoachMemoryKeys.preferredStyle) private var coachPreferredStyle = ""
    @AppStorage(CoachMemoryKeys.avoidances) private var coachAvoidances = ""
    @Query(sort: \DailyBrief.date, order: .reverse) private var dailyBriefs: [DailyBrief]
    @Query(sort: \WeeklyReview.weekStartDate, order: .reverse) private var weeklyReviews: [WeeklyReview]
    @Query(sort: \Habit.createdAt) private var habits: [Habit]
    @Query(sort: \CheckIn.completedAt, order: .reverse) private var checkIns: [CheckIn]
    @Query(sort: \MealEntry.date, order: .reverse) private var meals: [MealEntry]

    var body: some View {
        Group {
            if hasCompletedOnboarding {
                ContentView()
            } else {
                OnboardingFlow()
            }
        }
            .task {
                guard hasCompletedOnboarding else { return }
                await NotificationService.shared.requestAuthorization()
                await requestCameraAccessIfNeeded()
                _ = await HealthKitService.shared.requestAuthorization()
                await EntitlementService.refreshEntitlements()
                await DailyBriefService.shared.generateIfNeeded(
                    context: modelContext,
                    existingBriefs: dailyBriefs,
                    habits: habits,
                    checkIns: checkIns,
                    meals: meals,
                    fallbackBodyMassKg: bodyMassKg,
                    coachMemory: coachMemory
                )
                await WeeklyReviewService.shared.generateIfNeeded(
                    context: modelContext,
                    existingReviews: weeklyReviews,
                    habits: habits,
                    checkIns: checkIns,
                    meals: meals,
                    proteinTargetG: Int((bodyMassKg * 1.6).rounded()),
                    identityTags: identityTags,
                    coachMemory: coachMemory
                )
            }
    }

    private var coachMemory: CoachMemory {
        CoachMemory(
            longTermGoal: coachLongTermGoal,
            constraints: coachConstraints,
            preferredStyle: coachPreferredStyle,
            avoidances: coachAvoidances
        )
    }

    private func requestCameraAccessIfNeeded() async {
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        guard status == .notDetermined else { return }
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            AVCaptureDevice.requestAccess(for: .video) { _ in
                continuation.resume()
            }
        }
    }
}
