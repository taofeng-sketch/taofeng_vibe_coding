import SwiftUI

struct CoachMemoryView: View {
    @AppStorage(CoachMemoryKeys.longTermGoal) private var longTermGoal = ""
    @AppStorage(CoachMemoryKeys.constraints) private var constraints = ""
    @AppStorage(CoachMemoryKeys.preferredStyle) private var preferredStyle = "直接、具体、不要鸡血"
    @AppStorage(CoachMemoryKeys.avoidances) private var avoidances = ""

    var body: some View {
        Form {
            Section {
                Text("这不是社交资料，而是给 DailyBrief 和周报用的私人上下文。写得越具体，教练越不像模板。")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Section("长期方向") {
                TextField("例如：保持 80 岁还能旅行、训练和带家人出门", text: $longTermGoal, axis: .vertical)
                    .lineLimit(3...5)
            }

            Section("现实限制") {
                TextField("例如：工作日会议密集、膝盖不能高冲击、睡眠容易被打断", text: $constraints, axis: .vertical)
                    .lineLimit(3...5)
            }

            Section("教练语气") {
                TextField("例如：直接、具体、不要鸡血", text: $preferredStyle, axis: .vertical)
                    .lineLimit(2...4)
            }

            Section("不要这样提醒我") {
                TextField("例如：不要说泛泛的加油，不要让我一天改三件事", text: $avoidances, axis: .vertical)
                    .lineLimit(3...5)
            }

            Section {
                Button("填入示例") {
                    longTermGoal = "保持 80 岁还能有力量、心肺和稳定性，可以旅行、爬楼、照顾家人。"
                    constraints = "工作日会议密集，容易晚睡；训练要现实，不能依赖一整块空闲时间。"
                    preferredStyle = "直接、具体、像高级教练一样说重点，不要鸡血。"
                    avoidances = "不要泛泛夸奖，不要一次给三个以上动作，不要因为一天数据差就下结论。"
                }

                Button("清空记忆", role: .destructive) {
                    longTermGoal = ""
                    constraints = ""
                    preferredStyle = ""
                    avoidances = ""
                }
            }
        }
        .navigationTitle("AI 教练记忆")
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    NavigationStack {
        CoachMemoryView()
    }
}
