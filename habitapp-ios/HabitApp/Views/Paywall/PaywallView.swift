import StoreKit
import SwiftUI

struct PaywallView: View {
    @Environment(\.dismiss) private var dismiss
    @AppStorage(EntitlementService.proAccessKey) private var hasProAccess = false
    @AppStorage(AppLanguage.storageKey) private var appLanguage = AppLanguage.system.rawValue

    @State private var products: [Product] = []
    @State private var isLoading = true
    @State private var statusMessage = ""
    @State private var purchasingProductID: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    header
                    benefits
                    productsSection
                    restoreSection
                }
                .padding(20)
            }
            .navigationTitle("HabitApp Pro")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(AppLanguage.text("关闭", "Close")) { dismiss() }
                }
            }
            .task {
                await loadProducts()
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            Image(systemName: "sparkles")
                .font(.largeTitle)
                .foregroundStyle(Color.accentColor)
            Text(AppLanguage.text("把这个系统变成每天都会打开的产品。", "Turn this system into something you open every day."))
                .font(.title2.bold())
            Text(AppLanguage.text("Pro 解锁高压恢复包、长寿训练周包，以及后续的 Widget、锁屏入口和高级周报。", "Pro unlocks recovery packs, longevity training packs, and future widgets, Lock Screen entry points, and advanced weekly reviews."))
                .foregroundStyle(.secondary)
        }
    }

    private var benefits: some View {
        VStack(alignment: .leading, spacing: 12) {
            PaywallBenefit(icon: "square.grid.2x2.fill", title: AppLanguage.text("Pro 习惯模板包", "Pro Habit Packs"), subtitle: AppLanguage.text("一键导入经过设计的训练、恢复和饮食系统。", "Import designed training, recovery, and nutrition systems in one tap."))
            PaywallBenefit(icon: "chart.line.uptrend.xyaxis", title: AppLanguage.text("更深的周复盘", "Deeper Weekly Review"), subtitle: AppLanguage.text("把习惯、蛋白质、HealthKit 和身份目标连成下一周动作。", "Connect habits, protein, HealthKit, and identity goals into next week's actions."))
            PaywallBenefit(icon: "widget.small", title: AppLanguage.text("桌面和锁屏入口", "Home and Lock Screen Entry Points"), subtitle: AppLanguage.text("Widget / Live Activity 会在下一轮接入。", "Widgets and Live Activities continue in the next iteration."))
        }
    }

    private var productsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            if hasProAccess {
                Label(AppLanguage.text("Pro 已解锁", "Pro Unlocked"), systemImage: "checkmark.seal.fill")
                    .font(.headline)
                    .foregroundStyle(.green)
            } else if isLoading {
                ProgressView(AppLanguage.text("正在读取 App Store 商品", "Loading App Store products"))
            } else if products.isEmpty {
                ContentUnavailableView(
                    AppLanguage.text("商品还没配置", "Products Not Configured Yet"),
                    systemImage: "shippingbox",
                    description: Text(AppLanguage.text("创建 App Store Connect 商品后，这里会自动显示价格。免费模板包已经可以使用。", "After App Store Connect products are created, prices will appear here automatically. Free packs already work."))
                )
            } else {
                ForEach(products, id: \.id) { product in
                    Button {
                        Task {
                            await buy(product)
                        }
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(product.displayName)
                                    .font(.headline)
                                Text(product.description)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            if purchasingProductID == product.id {
                                ProgressView()
                            } else {
                                Text(product.displayPrice)
                                    .font(.headline)
                            }
                        }
                        .padding()
                        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
                    }
                    .buttonStyle(.plain)
                    .disabled(purchasingProductID != nil)
                }
            }

            if !statusMessage.isEmpty {
                Text(statusMessage)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var restoreSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Button(AppLanguage.text("恢复购买", "Restore Purchases")) {
                Task {
                    await EntitlementService.refreshEntitlements()
                    statusMessage = hasProAccess ? AppLanguage.text("已恢复 Pro 权限。", "Pro access restored.") : AppLanguage.text("没有找到可恢复的购买。", "No restorable purchase found.")
                }
            }
            .buttonStyle(.bordered)

            Text(AppLanguage.text("购买状态只来自 StoreKit 交易，不会把付费状态写进 iCloud。", "Purchase state comes only from StoreKit transactions and is not written to iCloud."))
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
    }

    private func loadProducts() async {
        products = await EntitlementService.products()
        await EntitlementService.refreshEntitlements()
        isLoading = false
    }

    private func buy(_ product: Product) async {
        purchasingProductID = product.id
        defer { purchasingProductID = nil }

        do {
            try await EntitlementService.purchase(product)
            statusMessage = hasProAccess ? AppLanguage.text("Pro 已解锁。", "Pro unlocked.") : AppLanguage.text("购买未完成。", "Purchase not completed.")
        } catch {
            statusMessage = AppLanguage.text("购买失败：\(error.localizedDescription)", "Purchase failed: \(error.localizedDescription)")
        }
    }
}

private struct PaywallBenefit: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .frame(width: 30, height: 30)
                .background(Color.accentColor.opacity(0.12), in: Circle())
                .foregroundStyle(Color.accentColor)

            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.headline)
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

#Preview {
    PaywallView()
}
