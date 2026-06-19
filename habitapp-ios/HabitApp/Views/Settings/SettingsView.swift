import SwiftUI
import UIKit
import UserNotifications

struct SettingsView: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var authorizationStatus: UNAuthorizationStatus = .notDetermined
    @State private var apiKey = ""
    @State private var hasAPIKey = KeychainHelper.hasAnthropicAPIKey()
    @State private var apiKeyStatusMessage = ""
    @State private var iCloudAvailable = FileManager.default.ubiquityIdentityToken != nil
    @AppStorage(EntitlementService.proAccessKey) private var hasProAccess = false
    @AppStorage(AppLanguage.storageKey) private var appLanguage = AppLanguage.system.rawValue
    @State private var showingPaywall = false

    var body: some View {
        NavigationStack {
            Form {
                Section(AppLanguage.text("语言", "Language")) {
                    Picker(AppLanguage.text("应用语言", "App Language"), selection: $appLanguage) {
                        ForEach(AppLanguage.allCases) { language in
                            Text(language.displayName).tag(language.rawValue)
                        }
                    }
                    Text(AppLanguage.text("切换后主要界面会立即更新；已有习惯名称会保持你创建时的语言。", "Core screens update immediately; existing habit names stay in the language used when they were created."))
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("HabitApp Pro") {
                    LabeledContent(AppLanguage.text("状态", "Status"), value: hasProAccess ? AppLanguage.text("已解锁", "Unlocked") : AppLanguage.text("未解锁", "Locked"))

                    Button(hasProAccess ? AppLanguage.text("查看 Pro 权益", "View Pro Benefits") : AppLanguage.text("解锁 Pro 模板包", "Unlock Pro Packs")) {
                        showingPaywall = true
                    }

                    Text(AppLanguage.text("Pro 先解锁高压恢复包和长寿训练周包；Widget、锁屏入口和高级周报会接在下一阶段。", "Pro unlocks recovery and longevity training packs first; widgets, Lock Screen entry points, and advanced weekly review continue in the next phase."))
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section(AppLanguage.text("AI 教练", "AI Coach")) {
                    NavigationLink {
                        CoachMemoryView()
                    } label: {
                        Label(AppLanguage.text("编辑教练记忆", "Edit Coach Memory"), systemImage: "brain.head.profile")
                    }

                    Text(AppLanguage.text("DailyBrief 和周报会使用这里的目标、限制和语气偏好，让建议更像你的私人教练。", "Daily brief and weekly review use these goals, constraints, and tone preferences so the advice feels more personal."))
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section(AppLanguage.text("通知", "Notifications")) {
                    LabeledContent(AppLanguage.text("权限状态", "Permission"), value: notificationStatusText)

                    Button(AppLanguage.text("请求通知权限", "Request Notification Access")) {
                        Task {
                            await NotificationService.shared.requestAuthorization()
                            await refreshAuthorizationStatus()
                        }
                    }

                    Button(AppLanguage.text("打开系统设置", "Open System Settings")) {
                        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
                        UIApplication.shared.open(url)
                    }
                }

                Section("iCloud") {
                    LabeledContent(AppLanguage.text("同步状态", "Sync Status"), value: iCloudAvailable ? AppLanguage.text("可用", "Available") : AppLanguage.text("未登录或不可用", "Unavailable"))
                    Button(AppLanguage.text("刷新状态", "Refresh Status")) {
                        iCloudAvailable = FileManager.default.ubiquityIdentityToken != nil
                        NSUbiquitousKeyValueStore.default.synchronize()
                    }
                }

                Section(AppLanguage.text("Phase 2：AI 卡路里分析", "Phase 2: AI Calorie Analysis")) {
                    LabeledContent(AppLanguage.text("Key 状态", "Key Status"), value: hasAPIKey ? AppLanguage.text("已保存", "Saved") : AppLanguage.text("未设置", "Not Set"))

                    SecureField(hasAPIKey ? AppLanguage.text("输入新 key 可覆盖", "Enter a new key to replace") : "Anthropic API Key", text: $apiKey)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                    HStack {
                        Button(AppLanguage.text("保存我的密钥", "Save My Key")) {
                            saveAPIKey()
                        }
                        .disabled(apiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

                        if hasAPIKey {
                            Button(AppLanguage.text("删除 Key", "Delete Key"), role: .destructive) {
                                deleteAPIKey()
                            }
                        }
                    }

                    if !apiKeyStatusMessage.isEmpty {
                        Text(apiKeyStatusMessage)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }

                    Text(AppLanguage.text("你的密钥只保存在本机 Keychain，不进 UserDefaults，也不会同步到 iCloud。", "Your key is stored only in the local Keychain. It is not stored in UserDefaults or synced to iCloud."))
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section(AppLanguage.text("关于", "About")) {
                    LabeledContent(AppLanguage.text("版本", "Version"), value: "0.1.0")
                    Text(AppLanguage.text("HabitApp 只在本机和你的 iCloud 保存习惯数据。Apple Health 数据留在设备上；早餐照片只会发送到 api.anthropic.com 做单次分析，不保存到相册。", "HabitApp stores habit data locally and in your iCloud. Apple Health data stays on device; breakfast photos are sent only to api.anthropic.com for one-time analysis and are not saved to Photos."))
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle(AppLanguage.text("设置", "Settings"))
            .sheet(isPresented: $showingPaywall) {
                PaywallView()
            }
            .task {
                await refreshAuthorizationStatus()
                refreshAPIKeyState()
                await EntitlementService.refreshEntitlements()
                NSUbiquitousKeyValueStore.default.synchronize()
            }
            .onChange(of: scenePhase) { _, newPhase in
                guard newPhase == .active else { return }
                Task {
                    await refreshAuthorizationStatus()
                    refreshAPIKeyState()
                }
            }
        }
    }

    private var notificationStatusText: String {
        switch authorizationStatus {
        case .authorized: AppLanguage.text("已允许", "Allowed")
        case .denied: AppLanguage.text("已拒绝", "Denied")
        case .notDetermined: AppLanguage.text("未询问", "Not Asked")
        case .provisional: AppLanguage.text("临时允许", "Provisional")
        case .ephemeral: AppLanguage.text("临时会话", "Ephemeral")
        @unknown default: AppLanguage.text("未知", "Unknown")
        }
    }

    private func refreshAuthorizationStatus() async {
        authorizationStatus = await NotificationService.shared.authorizationStatus()
    }

    private func refreshAPIKeyState() {
        hasAPIKey = KeychainHelper.hasAnthropicAPIKey()
    }

    private func saveAPIKey() {
        do {
            try KeychainHelper.saveAnthropicAPIKey(apiKey)
            apiKey = ""
            hasAPIKey = true
            apiKeyStatusMessage = AppLanguage.text("已保存我的密钥。", "Saved my key.")
        } catch {
            apiKeyStatusMessage = error.localizedDescription
        }
    }

    private func deleteAPIKey() {
        do {
            try KeychainHelper.deleteAnthropicAPIKey()
            apiKey = ""
            hasAPIKey = false
            apiKeyStatusMessage = AppLanguage.text("已删除 API key。", "Deleted API key.")
        } catch {
            apiKeyStatusMessage = error.localizedDescription
        }
    }
}

#Preview {
    SettingsView()
}
