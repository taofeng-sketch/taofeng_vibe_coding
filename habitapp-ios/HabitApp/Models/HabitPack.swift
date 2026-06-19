import Foundation

struct HabitTemplate: Hashable, Identifiable {
    var id: String { name }
    let name: String
    let iconSymbol: String
    let reminderHour: Int
    let reminderMinute: Int
    let anchorText: String
}

struct HabitPack: Hashable, Identifiable {
    enum Access: String {
        case free
        case pro

        var label: String {
            switch self {
            case .free: AppLanguage.text("免费", "Free")
            case .pro: "Pro"
            }
        }
    }

    let id: String
    let title: String
    let subtitle: String
    let identityLine: String
    let access: Access
    let templates: [HabitTemplate]
}

extension HabitPack {
    static var library: [HabitPack] {
        AppLanguage.isEnglish ? englishLibrary : chineseLibrary
    }

    private static let chineseLibrary: [HabitPack] = [
        HabitPack(
            id: "longevity-starter",
            title: "长寿基础包",
            subtitle: "早餐、训练、睡前恢复，先把一天撑起来。",
            identityLine: "你正在成为一个有系统的人。",
            access: .free,
            templates: [
                HabitTemplate(name: "记录今天的第一餐", iconSymbol: "fork.knife.circle", reminderHour: 8, reminderMinute: 0, anchorText: "起床喝水"),
                HabitTemplate(name: "力量训练", iconSymbol: "dumbbell.fill", reminderHour: 18, reminderMinute: 30, anchorText: "下班换衣服"),
                HabitTemplate(name: "睡前降速", iconSymbol: "moon.stars.fill", reminderHour: 22, reminderMinute: 30, anchorText: "刷牙"),
            ]
        ),
        HabitPack(
            id: "protein-reset",
            title: "高蛋白重启包",
            subtitle: "把蛋白质目标拆成一天里可执行的三次动作。",
            identityLine: "吃得对的人，不靠临时补救。",
            access: .free,
            templates: [
                HabitTemplate(name: "早餐蛋白质", iconSymbol: "fork.knife.circle", reminderHour: 8, reminderMinute: 15, anchorText: "拍早餐照"),
                HabitTemplate(name: "午餐先吃蛋白", iconSymbol: "takeoutbag.and.cup.and.straw", reminderHour: 12, reminderMinute: 30, anchorText: "坐下吃饭"),
                HabitTemplate(name: "晚间补足蛋白", iconSymbol: "pills.fill", reminderHour: 20, reminderMinute: 30, anchorText: "洗完餐盘"),
            ]
        ),
        HabitPack(
            id: "executive-recovery",
            title: "高压恢复包",
            subtitle: "给忙碌工作日留出 HRV、呼吸和睡眠的缓冲。",
            identityLine: "稳定的人会主动恢复，而不是等身体报警。",
            access: .pro,
            templates: [
                HabitTemplate(name: "中午 4 分钟呼吸", iconSymbol: "wind", reminderHour: 12, reminderMinute: 5, anchorText: "合上电脑"),
                HabitTemplate(name: "晚间散步", iconSymbol: "figure.walk", reminderHour: 20, reminderMinute: 0, anchorText: "吃完晚饭"),
                HabitTemplate(name: "睡前不刷短视频", iconSymbol: "bed.double.fill", reminderHour: 22, reminderMinute: 15, anchorText: "手机充电"),
            ]
        ),
        HabitPack(
            id: "centenarian-week",
            title: "长寿训练周包",
            subtitle: "围绕力量、Zone 2、VO2 和稳定性安排一周。",
            identityLine: "你训练的不是今天的数字，是 80 岁的自由度。",
            access: .pro,
            templates: [
                HabitTemplate(name: "Zone 2 有氧", iconSymbol: "figure.mixed.cardio", reminderHour: 7, reminderMinute: 0, anchorText: "穿上运动鞋"),
                HabitTemplate(name: "稳定性训练", iconSymbol: "figure.core.training", reminderHour: 17, reminderMinute: 45, anchorText: "结束会议"),
                HabitTemplate(name: "VO2 刺激", iconSymbol: "bolt.heart.fill", reminderHour: 18, reminderMinute: 0, anchorText: "完成热身"),
            ]
        ),
    ]

    private static let englishLibrary: [HabitPack] = [
        HabitPack(
            id: "longevity-starter",
            title: "Longevity Starter",
            subtitle: "Breakfast, training, and evening recovery to hold the day together.",
            identityLine: "You are becoming a person with a system.",
            access: .free,
            templates: [
                HabitTemplate(name: "First Meal", iconSymbol: "fork.knife.circle", reminderHour: 8, reminderMinute: 0, anchorText: "after drinking water"),
                HabitTemplate(name: "Strength Training", iconSymbol: "dumbbell.fill", reminderHour: 18, reminderMinute: 30, anchorText: "after changing clothes"),
                HabitTemplate(name: "Evening Wind Down", iconSymbol: "moon.stars.fill", reminderHour: 22, reminderMinute: 30, anchorText: "after brushing teeth"),
            ]
        ),
        HabitPack(
            id: "protein-reset",
            title: "Protein Reset",
            subtitle: "Split your daily protein target into three executable moments.",
            identityLine: "People who eat well do not rely on last-minute repair.",
            access: .free,
            templates: [
                HabitTemplate(name: "Breakfast Protein", iconSymbol: "fork.knife.circle", reminderHour: 8, reminderMinute: 15, anchorText: "after taking breakfast photo"),
                HabitTemplate(name: "Protein First at Lunch", iconSymbol: "takeoutbag.and.cup.and.straw", reminderHour: 12, reminderMinute: 30, anchorText: "after sitting down to eat"),
                HabitTemplate(name: "Close Protein Gap", iconSymbol: "pills.fill", reminderHour: 20, reminderMinute: 30, anchorText: "after clearing dishes"),
            ]
        ),
        HabitPack(
            id: "executive-recovery",
            title: "High-Pressure Recovery",
            subtitle: "Build HRV, breath, and sleep buffers into demanding workdays.",
            identityLine: "Stable people recover proactively instead of waiting for warning signs.",
            access: .pro,
            templates: [
                HabitTemplate(name: "4-Minute Breathing", iconSymbol: "wind", reminderHour: 12, reminderMinute: 5, anchorText: "after closing laptop"),
                HabitTemplate(name: "Evening Walk", iconSymbol: "figure.walk", reminderHour: 20, reminderMinute: 0, anchorText: "after dinner"),
                HabitTemplate(name: "No Short Videos Before Bed", iconSymbol: "bed.double.fill", reminderHour: 22, reminderMinute: 15, anchorText: "when phone is charging"),
            ]
        ),
        HabitPack(
            id: "centenarian-week",
            title: "Longevity Training Week",
            subtitle: "Plan the week around strength, Zone 2, VO2, and stability.",
            identityLine: "You are training for freedom at 80, not today's vanity number.",
            access: .pro,
            templates: [
                HabitTemplate(name: "Zone 2 Cardio", iconSymbol: "figure.mixed.cardio", reminderHour: 7, reminderMinute: 0, anchorText: "after putting on training shoes"),
                HabitTemplate(name: "Stability Training", iconSymbol: "figure.core.training", reminderHour: 17, reminderMinute: 45, anchorText: "after final meeting"),
                HabitTemplate(name: "VO2 Stimulus", iconSymbol: "bolt.heart.fill", reminderHour: 18, reminderMinute: 0, anchorText: "after warm-up"),
            ]
        ),
    ]
}
