import StoreKit
import SwiftUI

struct PaywallView: View {
    @Environment(\.dismiss) private var dismiss
    @AppStorage(EntitlementService.proAccessKey) private var hasProAccess = false

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
                    Button("关闭") { dismiss() }
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
            Text("把这个系统变成每天都会打开的产品。")
                .font(.title2.bold())
            Text("Pro 解锁高压恢复包、长寿训练周包，以及后续的 Widget、锁屏入口和高级周报。")
                .foregroundStyle(.secondary)
        }
    }

    private var benefits: some View {
        VStack(alignment: .leading, spacing: 12) {
            PaywallBenefit(icon: "square.grid.2x2.fill", title: "Pro 习惯模板包", subtitle: "一键导入经过设计的训练、恢复和饮食系统。")
            PaywallBenefit(icon: "chart.line.uptrend.xyaxis", title: "更深的周复盘", subtitle: "把习惯、蛋白质、HealthKit 和身份目标连成下一周动作。")
            PaywallBenefit(icon: "widget.small", title: "桌面和锁屏入口", subtitle: "Widget / Live Activity 会在下一轮接入。")
        }
    }

    private var productsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            if hasProAccess {
                Label("Pro 已解锁", systemImage: "checkmark.seal.fill")
                    .font(.headline)
                    .foregroundStyle(.green)
            } else if isLoading {
                ProgressView("正在读取 App Store 商品")
            } else if products.isEmpty {
                ContentUnavailableView(
                    "商品还没配置",
                    systemImage: "shippingbox",
                    description: Text("创建 App Store Connect 商品后，这里会自动显示价格。免费模板包已经可以使用。")
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
            Button("恢复购买") {
                Task {
                    await EntitlementService.refreshEntitlements()
                    statusMessage = hasProAccess ? "已恢复 Pro 权限。" : "没有找到可恢复的购买。"
                }
            }
            .buttonStyle(.bordered)

            Text("购买状态只来自 StoreKit 交易，不会把付费状态写进 iCloud。")
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
            statusMessage = hasProAccess ? "Pro 已解锁。" : "购买未完成。"
        } catch {
            statusMessage = "购买失败：\(error.localizedDescription)"
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
