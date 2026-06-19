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
    @State private var showingPaywall = false

    var body: some View {
        NavigationStack {
            Form {
                Section("HabitApp Pro") {
                    LabeledContent("状态", value: hasProAccess ? "已解锁" : "未解锁")

                    Button(hasProAccess ? "查看 Pro 权益" : "解锁 Pro 模板包") {
                        showingPaywall = true
                    }

                    Text("Pro 先解锁高压恢复包和长寿训练周包；Widget、锁屏入口和高级周报会接在下一阶段。")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("AI 教练") {
                    NavigationLink {
                        CoachMemoryView()
                    } label: {
                        Label("编辑教练记忆", systemImage: "brain.head.profile")
                    }

                    Text("DailyBrief 和周报会使用这里的目标、限制和语气偏好，让建议更像你的私人教练。")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("通知") {
                    LabeledContent("权限状态", value: notificationStatusText)

                    Button("请求通知权限") {
                        Task {
                            await NotificationService.shared.requestAuthorization()
                            await refreshAuthorizationStatus()
                        }
                    }

                    Button("打开系统设置") {
                        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
                        UIApplication.shared.open(url)
                    }
                }

                Section("iCloud") {
                    LabeledContent("同步状态", value: iCloudAvailable ? "可用" : "未登录或不可用")
                    Button("刷新状态") {
                        iCloudAvailable = FileManager.default.ubiquityIdentityToken != nil
                        NSUbiquitousKeyValueStore.default.synchronize()
                    }
                }

                Section("Phase 2：AI 卡路里分析") {
                    LabeledContent("Key 状态", value: hasAPIKey ? "已保存" : "未设置")

                    SecureField(hasAPIKey ? "输入新 key 可覆盖" : "Anthropic API Key", text: $apiKey)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                    HStack {
                        Button("保存我的密钥") {
                            saveAPIKey()
                        }
                        .disabled(apiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

                        if hasAPIKey {
                            Button("删除 Key", role: .destructive) {
                                deleteAPIKey()
                            }
                        }
                    }

                    if !apiKeyStatusMessage.isEmpty {
                        Text(apiKeyStatusMessage)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }

                    Text("你的密钥只保存在本机 Keychain，不进 UserDefaults，也不会同步到 iCloud。")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("关于") {
                    LabeledContent("版本", value: "0.1.0")
                    Text("HabitApp 只在本机和你的 iCloud 保存习惯数据。Apple Health 数据留在设备上；早餐照片只会发送到 api.anthropic.com 做单次分析，不保存到相册。")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("设置")
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
        case .authorized: "已允许"
        case .denied: "已拒绝"
        case .notDetermined: "未询问"
        case .provisional: "临时允许"
        case .ephemeral: "临时会话"
        @unknown default: "未知"
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
            apiKeyStatusMessage = "已保存我的密钥。"
        } catch {
            apiKeyStatusMessage = error.localizedDescription
        }
    }

    private func deleteAPIKey() {
        do {
            try KeychainHelper.deleteAnthropicAPIKey()
            apiKey = ""
            hasAPIKey = false
            apiKeyStatusMessage = "已删除 API key。"
        } catch {
            apiKeyStatusMessage = error.localizedDescription
        }
    }
}

#Preview {
    SettingsView()
}
