import Foundation
import StoreKit

enum EntitlementService {
    static let proAccessKey = "hasProAccess"
    static let productIDs: Set<String> = [
        "com.taofeng.habitapp.pro.monthly",
        "com.taofeng.habitapp.pro.yearly",
        "com.taofeng.habitapp.pro.lifetime",
    ]

    static func products() async -> [Product] {
        do {
            return try await Product.products(for: Array(productIDs))
                .sorted { $0.price < $1.price }
        } catch {
            return []
        }
    }

    @MainActor
    static func purchase(_ product: Product) async throws {
        let result = try await product.purchase()

        switch result {
        case .success(let verification):
            let transaction = try checkVerified(verification)
            UserDefaults.standard.set(true, forKey: proAccessKey)
            await transaction.finish()
        case .pending, .userCancelled:
            break
        @unknown default:
            break
        }
    }

    @MainActor
    static func refreshEntitlements() async {
        var hasProAccess = false

        for await entitlement in Transaction.currentEntitlements {
            guard let transaction = try? checkVerified(entitlement) else { continue }
            if productIDs.contains(transaction.productID) {
                hasProAccess = true
            }
        }

        UserDefaults.standard.set(hasProAccess, forKey: proAccessKey)
    }

    private static func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .verified(let safe):
            return safe
        case .unverified:
            throw StoreKitError.notAvailableInStorefront
        }
    }
}
