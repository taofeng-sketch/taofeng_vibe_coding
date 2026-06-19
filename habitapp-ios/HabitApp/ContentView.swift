import SwiftUI

struct ContentView: View {
    @AppStorage("selectedTab") private var selectedTab = "today"

    var body: some View {
        TabView(selection: $selectedTab) {
            TodayView()
                .tabItem {
                    Label("今日", systemImage: "checkmark.circle.fill")
                }
                .tag("today")

            HabitListView()
                .tabItem {
                    Label("习惯", systemImage: "list.bullet")
                }
                .tag("habits")

            DecathlonView()
                .tabItem {
                    Label("长寿训练", systemImage: "figure.mixed.cardio")
                }
                .tag("decathlon")

            HistoryView()
                .tabItem {
                    Label("历史", systemImage: "calendar")
                }
                .tag("history")

            SettingsView()
                .tabItem {
                    Label("设置", systemImage: "gearshape.fill")
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
