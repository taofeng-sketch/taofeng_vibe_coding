import Foundation
import UserNotifications

@MainActor
final class NotificationService: NSObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationService()

    private override init() {
        super.init()
        UNUserNotificationCenter.current().delegate = self
        registerCategories()
    }

    func requestAuthorization() async {
        registerCategories()
        do {
            try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound])
        } catch {
            print("Notification authorization failed: \(error)")
        }
    }

    func authorizationStatus() async -> UNAuthorizationStatus {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        return settings.authorizationStatus
    }

    func scheduleNext(for habit: Habit, forceTomorrow: Bool = false) async {
        guard habit.isEnabled else {
            await cancel(for: habit)
            return
        }

        await cancel(for: habit)

        var components = DateComponents()
        components.hour = habit.reminderHour
        components.minute = habit.reminderMinute

        let calendar = Calendar.current
        let now = Date()
        var fireDate = calendar.nextDate(after: now, matching: components, matchingPolicy: .nextTime) ?? now
        if forceTomorrow || fireDate <= now {
            fireDate = calendar.date(byAdding: .day, value: 1, to: fireDate) ?? fireDate
        }

        let content = UNMutableNotificationContent()
        content.title = habit.name
        content.body = isBreakfastPhotoHabit(habit) ? "拍一张早餐照片，顺手完成打卡。" : "该完成今天的习惯了。"
        content.sound = .default
        content.userInfo = [
            "habitId": habit.id.uuidString,
            "habitName": habit.name,
            "triggerBreakfastCamera": isBreakfastPhotoHabit(habit),
        ]
        if isBreakfastPhotoHabit(habit) {
            content.categoryIdentifier = NotificationConstants.breakfastCategoryIdentifier
        }

        let triggerDate = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: fireDate)
        let trigger = UNCalendarNotificationTrigger(dateMatching: triggerDate, repeats: false)
        let request = UNNotificationRequest(
            identifier: notificationIdentifier(for: habit),
            content: content,
            trigger: trigger
        )

        try? await UNUserNotificationCenter.current().add(request)
    }

    func rescheduleAll(habits: [Habit]) async {
        for habit in habits where habit.isEnabled {
            await scheduleNext(for: habit)
        }
    }

    func cancel(for habit: Habit) async {
        UNUserNotificationCenter.current().removePendingNotificationRequests(
            withIdentifiers: [notificationIdentifier(for: habit)]
        )
    }

    private func notificationIdentifier(for habit: Habit) -> String {
        "habit-\(habit.id.uuidString)"
    }

    private func isBreakfastPhotoHabit(_ habit: Habit) -> Bool {
        habit.name == "早餐 + 拍照"
    }

    private func registerCategories() {
        let takePhotoAction = UNNotificationAction(
            identifier: NotificationConstants.takeBreakfastPhotoActionIdentifier,
            title: "立即拍照",
            options: [.foreground]
        )
        let breakfastCategory = UNNotificationCategory(
            identifier: NotificationConstants.breakfastCategoryIdentifier,
            actions: [takePhotoAction],
            intentIdentifiers: [],
            options: []
        )
        UNUserNotificationCenter.current().setNotificationCategories([breakfastCategory])
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        let userInfo = response.notification.request.content.userInfo
        let isBreakfastNotification = (userInfo["triggerBreakfastCamera"] as? Bool) == true
        let isTakePhotoAction = response.actionIdentifier == NotificationConstants.takeBreakfastPhotoActionIdentifier
        let isDefaultOpen = response.actionIdentifier == UNNotificationDefaultActionIdentifier

        guard isTakePhotoAction || (isBreakfastNotification && isDefaultOpen) else {
            return
        }

        await MainActor.run {
            UserDefaults.standard.set("today", forKey: "selectedTab")
            NotificationCenter.default.post(name: .triggerBreakfastCamera, object: nil)
        }
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .sound]
    }
}

private enum NotificationConstants {
    static let breakfastCategoryIdentifier = "BREAKFAST_PHOTO_CATEGORY"
    static let takeBreakfastPhotoActionIdentifier = "TAKE_BREAKFAST_PHOTO"
}

extension Notification.Name {
    static let triggerBreakfastCamera = Notification.Name("TriggerBreakfastCamera")
}
