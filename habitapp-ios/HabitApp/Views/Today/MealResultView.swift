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
                    Section("总览") {
                        LabeledContent("总热量", value: "\(analysis.totalCalories) kcal")
                        LabeledContent("蛋白质", value: "\(analysis.proteinG.formatted(.number.precision(.fractionLength(0...1)))) g")
                        LabeledContent("碳水", value: "\(analysis.carbsG.formatted(.number.precision(.fractionLength(0...1)))) g")
                        LabeledContent("脂肪", value: "\(analysis.fatG.formatted(.number.precision(.fractionLength(0...1)))) g")
                        LabeledContent("置信度", value: analysis.confidenceText)
                    }

                    Section("识别食物") {
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
                        Section("备注") {
                            Text(analysis.notes)
                        }
                    }
                } else {
                    Section("分析未识别") {
                        Text("Claude 返回内容不是严格 JSON。可以重新分析，或查看原文后完成打卡。")
                            .foregroundStyle(.secondary)

                        if let rawText, !rawText.isEmpty {
                            DisclosureGroup("查看原文") {
                                Text(rawText)
                                    .font(.footnote.monospaced())
                                    .textSelection(.enabled)
                            }
                        }
                    }
                }
            }
            .navigationTitle("早餐分析")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("重新分析", action: onRetry)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("完成", action: onDone)
                        .fontWeight(.semibold)
                }
            }
        }
    }
}

#Preview {
    MealResultView(
        analysis: MealAnalysis(
            foods: [MealFood(name: "鸡蛋", estimatedGrams: 100, calories: 155)],
            totalCalories: 155,
            proteinG: 13,
            carbsG: 1,
            fatG: 11,
            confidence: "medium",
            notes: "示例结果",
            rawJSON: "{}"
        ),
        rawText: nil,
        onRetry: {},
        onDone: {}
    )
}
