import SwiftUI

struct ContentView: View {
    @AppStorage("selectedTab") private var selectedTab = "today"
    @AppStorage(AppLanguage.storageKey) private var appLanguage = AppLanguage.system.rawValue

    var body: some View {
        TabView(selection: $selectedTab) {
            TodayView()
                .tabItem {
                    Label(AppLanguage.text("今日", "Today"), systemImage: "checkmark.circle.fill")
                }
                .tag("today")

            HabitListView()
                .tabItem {
                    Label(AppLanguage.text("习惯", "Habits"), systemImage: "list.bullet")
                }
                .tag("habits")

            DecathlonView()
                .tabItem {
                    Label(AppLanguage.text("长寿训练", "Longevity"), systemImage: "figure.mixed.cardio")
                }
                .tag("decathlon")

            HistoryView()
                .tabItem {
                    Label(AppLanguage.text("历史", "History"), systemImage: "calendar")
                }
                .tag("history")

            SettingsView()
                .tabItem {
                    Label(AppLanguage.text("设置", "Settings"), systemImage: "gearshape.fill")
                }
                .tag("settings")
        }
        .onReceive(NotificationCenter.default.publisher(for: .triggerBreakfastCamera)) { _ in
            selectedTab = "today"
        }
    }
}

#Preview {
    ContentView()
        .modelContainer(PreviewContainer.container)
}
