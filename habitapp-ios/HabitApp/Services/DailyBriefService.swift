import Foundation
import SwiftData

struct DailyBriefInput {
    let sleepHours: Double
    let sleepAverage: Double
    let hrvMs: Double
    let hrvAverage: Double
    let habitCompletionText: String
    let proteinG: Int
    let proteinTargetG: Int
    let identityTags: String
}

actor DailyBriefService {
    static let shared = DailyBriefService()

    private let endpoint = URL(string: "https://api.anthropic.com/v1/messages")!
    private let model = "claude-sonnet-4-6"

    @MainActor
    func generateIfNeeded(
        context: ModelContext,
        existingBriefs: [DailyBrief],
        habits: [Habit],
        checkIns: [CheckIn],
        meals: [MealEntry],
        fallbackBodyMassKg: Double = 75,
        coachMemory: CoachMemory = CoachMemory(longTermGoal: "", constraints: "", preferredStyle: "", avoidances: "")
    ) async {
        let today = Calendar.current.startOfDay(for: .now)
        guard !existingBriefs.contains(where: { $0.date == today }) else { return }

        let snapshot = await HealthKitService.shared.snapshot()
        let target = Int(((snapshot.bodyMassKg ?? fallbackBodyMassKg) * 1.6).rounded())
        let yesterday = Calendar.current.date(byAdding: .day, value: -1, to: today) ?? today
        let enabledHabits = habits.filter(\.isEnabled)
        let completedYesterday = enabledHabits.filter { habit in
            checkIns.contains { $0.habit?.id == habit.id && $0.date == yesterday }
        }.count
        let yesterdayProtein = meals
            .filter { $0.date == yesterday }
            .reduce(0) { $0 + Int($1.proteinG.rounded()) }

        let input = DailyBriefInput(
            sleepHours: snapshot.sleepHours,
            sleepAverage: snapshot.sleepSevenDayAverage,
            hrvMs: snapshot.hrvMs,
            hrvAverage: snapshot.hrvSevenDayAverage,
            habitCompletionText: "\(completedYesterday)/\(max(enabledHabits.count, 1))",
            proteinG: yesterdayProtein,
            proteinTargetG: target,
            identityTags: Self.identityTagsText()
        )

        let bodyText = await makeBrief(input: input, hasHealthMetrics: snapshot.hasAnyHealthMetrics, coachMemory: coachMemory)
        let brief = DailyBrief(
            date: today,
            bodyText: bodyText,
            proteinTargetG: target,
            sleepHours: snapshot.sleepHours,
            hrvMs: snapshot.hrvMs
        )
        context.insert(brief)
        try? context.save()
    }

    private func makeBrief(input: DailyBriefInput, hasHealthMetrics: Bool, coachMemory: CoachMemory) async -> String {
        guard UserDefaults.standard.bool(forKey: EntitlementService.proAccessKey) else {
            return fallbackBrief(input: input)
        }

        guard let apiKey = try? KeychainHelper.loadAnthropicAPIKey(), !apiKey.isEmpty else {
            return fallbackBrief(input: input)
        }

        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        request.setValue("application/json", forHTTPHeaderField: "content-type")

        let prompt: String
        if hasHealthMetrics {
            prompt = """
        You are a longevity-minded morning coach for a 38-year-old man.
        He is training for Peter Attia's Centenarian Decathlon.
        He identifies with: \(input.identityTags)

        \(coachMemory.promptContext)

        Yesterday's data:
        - Sleep: \(input.sleepHours.formatted(.number.precision(.fractionLength(1))))h (vs 7d avg \(input.sleepAverage.formatted(.number.precision(.fractionLength(1))))h)
        - HRV: \(Int(input.hrvMs))ms (vs 7d avg \(Int(input.hrvAverage))ms)
        - Habit completion: \(input.habitCompletionText)
        - Protein: \(input.proteinG)g (target \(input.proteinTargetG)g = body mass kg x 1.6)

        Write a 2-3 sentence morning brief in \(AppLanguage.isEnglish ? "English" : "Chinese").
        - Identity-based language ("你是一个 X 的人") not transactional
        - One concrete suggestion for today
        - Compassionate, not pushy
        - Use the user memory when it changes the advice
        - No emoji
        """
        } else {
            prompt = """
        You are a longevity-minded morning coach for a 38-year-old man.
        He is training for Peter Attia's Centenarian Decathlon.
        He identifies with: \(input.identityTags)

        \(coachMemory.promptContext)

        This is his first day using the app, or Apple Health data is not available yet.
        His protein target is \(input.proteinTargetG)g based on body mass kg x 1.6.

        Write a 2-3 sentence morning brief in \(AppLanguage.isEnglish ? "English" : "Chinese").
        - Identity-based language ("你是一个 X 的人") not transactional
        - One concrete suggestion for today
        - Compassionate, not pushy
        - Use the user memory when it changes the advice
        - Do not mention missing data
        - No emoji
        """
        }

        let body: [String: Any] = [
            "model": model,
            "max_tokens": 500,
            "messages": [
                [
                    "role": "user",
                    "content": [
                        ["type": "text", "text": prompt],
                    ],
                ],
            ],
        ]

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                return fallbackBrief(input: input)
            }
            let message = try JSONDecoder().decode(AnthropicTextResponse.self, from: data)
            return message.content.compactMap(\.text).joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
        } catch {
            return fallbackBrief(input: input)
        }
    }

    private func fallbackBrief(input: DailyBriefInput) -> String {
        AppLanguage.text(
            "你是一个把健康当作长期资产的人。今天先抓住一个具体动作：在第一餐里优先补足蛋白质，向 \(input.proteinTargetG)g 的目标靠近。",
            "You are treating health as a long-term asset. Start with one concrete action today: prioritize protein in your first meal and move toward your \(input.proteinTargetG)g target."
        )
    }

    nonisolated private static func identityTagsText() -> String {
        let raw = UserDefaults.standard.string(forKey: "identityTags") ?? ""
        let text = raw.replacingOccurrences(of: ",", with: "、")
        return text.isEmpty ? AppLanguage.text("行动可靠的", "reliable") : text
    }
}

private struct AnthropicTextResponse: Decodable {
    let content: [Content]

    struct Content: Decodable {
        let type: String
        let text: String?
    }
}
