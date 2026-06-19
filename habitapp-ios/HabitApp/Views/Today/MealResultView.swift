import SwiftUI

struct MealResultView: View {
    let analysis: MealAnalysis?
    let rawText: String?
    let onRetry: () -> Void
    let onDone: () -> Void

    var body: some View {
        NavigationStack {
            List {
                if let analysis {
                    Section(AppLanguage.text("总览", "Summary")) {
                        LabeledContent(AppLanguage.text("总热量", "Calories"), value: "\(analysis.totalCalories) kcal")
                        LabeledContent(AppLanguage.text("蛋白质", "Protein"), value: "\(analysis.proteinG.formatted(.number.precision(.fractionLength(0...1)))) g")
                        LabeledContent(AppLanguage.text("碳水", "Carbs"), value: "\(analysis.carbsG.formatted(.number.precision(.fractionLength(0...1)))) g")
                        LabeledContent(AppLanguage.text("脂肪", "Fat"), value: "\(analysis.fatG.formatted(.number.precision(.fractionLength(0...1)))) g")
                        LabeledContent(AppLanguage.text("置信度", "Confidence"), value: analysis.confidenceText)
                    }

                    Section(AppLanguage.text("识别食物", "Detected Foods")) {
                        ForEach(analysis.foods) { food in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(food.name)
                                    .font(.headline)
                                Text("\(food.estimatedGrams)g · \(food.calories) kcal")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }

                    if !analysis.notes.isEmpty {
                        Section(AppLanguage.text("备注", "Notes")) {
                            Text(analysis.notes)
                        }
                    }
                } else {
                    Section(AppLanguage.text("分析未识别", "Analysis Not Parsed")) {
                        Text(AppLanguage.text("Claude 返回内容不是严格 JSON。可以重新分析，或查看原文后完成打卡。", "Claude did not return strict JSON. You can retry, or review the raw response and complete the check-in."))
                            .foregroundStyle(.secondary)

                        if let rawText, !rawText.isEmpty {
                            DisclosureGroup(AppLanguage.text("查看原文", "View Raw Response")) {
                                Text(rawText)
                                    .font(.footnote.monospaced())
                                    .textSelection(.enabled)
                            }
                        }
                    }
                }
            }
            .navigationTitle(AppLanguage.text("早餐分析", "Breakfast Analysis"))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(AppLanguage.text("重新分析", "Retry"), action: onRetry)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(AppLanguage.text("完成", "Done"), action: onDone)
                        .fontWeight(.semibold)
                }
            }
        }
    }
}

#Preview {
    MealResultView(
        analysis: MealAnalysis(
            foods: [MealFood(name: "Eggs", estimatedGrams: 100, calories: 155)],
            totalCalories: 155,
            proteinG: 13,
            carbsG: 1,
            fatG: 11,
            confidence: "medium",
            notes: "Sample result",
            rawJSON: "{}"
        ),
        rawText: nil,
        onRetry: {},
        onDone: {}
    )
}
