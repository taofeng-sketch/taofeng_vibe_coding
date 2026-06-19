import SwiftUI

struct CoachMemoryView: View {
    @AppStorage(AppLanguage.storageKey) private var appLanguage = AppLanguage.system.rawValue
    @AppStorage(CoachMemoryKeys.longTermGoal) private var longTermGoal = ""
    @AppStorage(CoachMemoryKeys.constraints) private var constraints = ""
    @AppStorage(CoachMemoryKeys.preferredStyle) private var preferredStyle = AppLanguage.text("直接、具体、不要鸡血", "direct, specific, no hype")
    @AppStorage(CoachMemoryKeys.avoidances) private var avoidances = ""

    var body: some View {
        Form {
            Section {
                Text(AppLanguage.text("这不是社交资料，而是给 DailyBrief 和周报用的私人上下文。写得越具体，教练越不像模板。", "This is not a social profile. It is private context for Daily Brief and Weekly Review. The more specific it is, the less generic the coach feels."))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Section(AppLanguage.text("长期方向", "Long-Term Direction")) {
                TextField(AppLanguage.text("例如：保持 80 岁还能旅行、训练和带家人出门", "Example: stay capable enough at 80 to travel, train, and take family out"), text: $longTermGoal, axis: .vertical)
                    .lineLimit(3...5)
            }

            Section(AppLanguage.text("现实限制", "Real Constraints")) {
                TextField(AppLanguage.text("例如：工作日会议密集、膝盖不能高冲击、睡眠容易被打断", "Example: meeting-heavy weekdays, no high-impact knee work, sleep is easily interrupted"), text: $constraints, axis: .vertical)
                    .lineLimit(3...5)
            }

            Section(AppLanguage.text("教练语气", "Coaching Style")) {
                TextField(AppLanguage.text("例如：直接、具体、不要鸡血", "Example: direct, specific, no hype"), text: $preferredStyle, axis: .vertical)
                    .lineLimit(2...4)
            }

            Section(AppLanguage.text("不要这样提醒我", "Avoid This")) {
                TextField(AppLanguage.text("例如：不要说泛泛的加油，不要让我一天改三件事", "Example: no generic encouragement, do not give me three changes in one day"), text: $avoidances, axis: .vertical)
                    .lineLimit(3...5)
            }

            Section {
                Button(AppLanguage.text("填入示例", "Fill Example")) {
                    longTermGoal = AppLanguage.text("保持 80 岁还能有力量、心肺和稳定性，可以旅行、爬楼、照顾家人。", "Stay strong, conditioned, and stable enough at 80 to travel, climb stairs, and care for family.")
                    constraints = AppLanguage.text("工作日会议密集，容易晚睡；训练要现实，不能依赖一整块空闲时间。", "Weekdays are meeting-heavy and sleep can slip late; training must be realistic and not depend on a full open block.")
                    preferredStyle = AppLanguage.text("直接、具体、像高级教练一样说重点，不要鸡血。", "Direct, specific, like a senior coach; no hype.")
                    avoidances = AppLanguage.text("不要泛泛夸奖，不要一次给三个以上动作，不要因为一天数据差就下结论。", "No generic praise, no more than three actions at once, and do not overread one bad day of data.")
                }

                Button(AppLanguage.text("清空记忆", "Clear Memory"), role: .destructive) {
                    longTermGoal = ""
                    constraints = ""
                    preferredStyle = ""
                    avoidances = ""
                }
            }
        }
        .navigationTitle(AppLanguage.text("AI 教练记忆", "AI Coach Memory"))
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    NavigationStack {
        CoachMemoryView()
    }
}
