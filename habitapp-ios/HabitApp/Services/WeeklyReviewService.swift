import Foundation
import SwiftData

struct WeeklyReviewInput {
    let habitCompletionText: String
    let proteinHitDays: Int
    let proteinTargetG: Int
    let sleepAverage: Double
    let hrvAverage: Double
    let decathlonText: String
    let identityTags: String
    let coachMemory: CoachMemory
}

actor WeeklyReviewService {
    static let shared = WeeklyReviewService()

    private let endpoint = URL(string: "https://api.anthropic.com/v1/messages")!
    private let model = "claude-sonnet-4-6"

    @MainActor
    func generateIfNeeded(
        context: ModelContext,
        existingReviews: [WeeklyReview],
        habits: [Habit],
        checkIns: [CheckIn],
        meals: [MealEntry],
        proteinTargetG: Int,
        identityTags: String,
        coachMemory: CoachMemory = CoachMemory(longTermGoal: "", constraints: "", preferredStyle: "", avoidances: "")
    ) async {
        let now = Date()
        guard Self.shouldGenerate(on: now) else { return }

        let weekStart = Self.weekStart(for: now)
        guard !existingReviews.contains(where: { $0.weekStartDate == weekStart }) else { return }

        let enabledHabits = habits.filter(\.isEnabled)
        let weekDays = (0..<7).compactMap { Calendar.current.date(byAdding: .day, value: $0, to: weekStart) }
        let completedThisWeek = checkIns.filter { checkIn in
            weekDays.contains(checkIn.date) && checkIn.habit?.isEnabled == true
        }.count
        let totalPossible = max(enabledHabits.count * 7, 1)

        let proteinHitDays = weekDays.filter { day in
            meals
                .filter { $0.date == day }
                .reduce(0) { $0 + $1.proteinG } >= Double(proteinTargetG)
        }.count

        let snapshot = await HealthKitService.shared.snapshot()
        let pillars = await HealthKitService.shared.weeklyDecathlonProgress()
        let input = WeeklyReviewInput(
            habitCompletionText: "\(completedThisWeek)/\(totalPossible)",
            proteinHitDays: proteinHitDays,
            proteinTargetG: proteinTargetG,
            sleepAverage: snapshot.sleepSevenDayAverage,
            hrvAverage: snapshot.hrvSevenDayAverage,
            decathlonText: pillars.map { "\($0.title) \(Int($0.current))/\(Int($0.target))\($0.unit)" }.joined(separator: ", "),
            identityTags: identityTags.isEmpty ? "行动可靠的" : identityTags.replacingOccurrences(of: ",", with: "、"),
            coachMemory: coachMemory
        )

        let bodyText = await makeReview(input: input)
        let review = WeeklyReview(weekStartDate: weekStart, bodyText: bodyText)
        context.insert(review)
        try? context.save()
    }

    nonisolated static func shouldGenerate(on date: Date) -> Bool {
        let calendar = Calendar.current
        let weekday = calendar.component(.weekday, from: date)
        let hour = calendar.component(.hour, from: date)
        return weekday == 1 && hour >= 14
    }

    nonisolated static func weekStart(for date: Date) -> Date {
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: date)
        let weekday = calendar.component(.weekday, from: startOfDay)
        return calendar.date(byAdding: .day, value: -(weekday - 1), to: startOfDay) ?? startOfDay
    }

    private func makeReview(input: WeeklyReviewInput) async -> String {
        guard UserDefaults.standard.bool(forKey: EntitlementService.proAccessKey) else {
            return fallbackReview(input: input)
        }

        guard let apiKey = try? KeychainHelper.loadAnthropicAPIKey(), !apiKey.isEmpty else {
            return fallbackReview(input: input)
        }

        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        request.setValue("application/json", forHTTPHeaderField: "content-type")

        let prompt = """
        You are reviewing the past 7 days of a 38-year-old man's habit + health data for a personal app.

        \(input.coachMemory.promptContext)

        Data:
        - Habit completion this week: \(input.habitCompletionText)
        - Days he hit protein target: \(input.proteinHitDays)/7 (target \(input.proteinTargetG)g)
        - Sleep avg: \(input.sleepAverage.formatted(.number.precision(.fractionLength(1))))h
        - HRV avg: \(Int(input.hrvAverage))ms
        - Decathlon weekly progress: \(input.decathlonText)
        - Identity tags: \(input.identityTags)

        Write a Chinese 周报 in 4 short paragraphs:
        1. One specific win this week (call out the data point)
        2. One trend to keep an eye on (don't sugarcoat, but be compassionate)
        3. One concrete action to adjust next week (single sentence)
        4. Identity-affirming close ("你正在成为...")

        Use the user memory when it changes what advice is realistic.
        No emoji. No "great job" / "good work" — be specific.
        """

        let body: [String: Any] = [
            "model": model,
            "max_tokens": 700,
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
                return fallbackReview(input: input)
            }
            let message = try JSONDecoder().decode(AnthropicWeeklyTextResponse.self, from: data)
            let text = message.content.compactMap(\.text).joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
            return text.isEmpty ? fallbackReview(input: input) : text
        } catch {
            return fallbackReview(input: input)
        }
    }

    private func fallbackReview(input: WeeklyReviewInput) -> String {
        """
        本周最值得保留的是你已经把系统搭起来了：习惯、蛋白质、训练和恢复都开始进入同一个节奏。

        需要留意的是，数据还不完整时，不要急着从一天判断自己。先让 Apple Health 和打卡记录积累一周，趋势会比情绪更可靠。

        下周只调整一件事：每天第一餐先靠近 \(input.proteinTargetG)g 蛋白质目标。

        你正在成为一个\(input.identityTags.replacingOccurrences(of: ",", with: "、"))的人。
        """
    }
}

private struct AnthropicWeeklyTextResponse: Decodable {
    let content: [Content]

    struct Content: Decodable {
        let text: String?
    }
}
