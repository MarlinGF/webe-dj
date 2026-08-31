import Foundation
import StoreKit

@MainActor
final class PurchaseManager: ObservableObject {
    static let lifetimeProductID = "com.webe.dj.lifetime"

    @Published private(set) var product: Product?
    @Published private(set) var hasLifetimeAccess = false
    @Published private(set) var isWorking = false
    @Published var message: String?

    private var updatesTask: Task<Void, Never>?

    init() {
        updatesTask = listenForTransactions()
        Task {
            await loadProduct()
            await refreshEntitlements()
        }
    }

    deinit { updatesTask?.cancel() }

    var displayPrice: String { product?.displayPrice ?? "$9.99" }

    func purchase() async {
        guard let product else {
            message = "The lifetime purchase is not available right now."
            return
        }
        isWorking = true
        defer { isWorking = false }
        do {
            switch try await product.purchase() {
            case .success(let result):
                let transaction = try verified(result)
                hasLifetimeAccess = true
                await transaction.finish()
                message = "Lifetime access is unlocked."
            case .pending:
                message = "Your purchase is pending approval."
            case .userCancelled:
                message = nil
            @unknown default:
                message = "The purchase could not be completed."
            }
        } catch {
            message = "The purchase could not be completed: \(error.localizedDescription)"
        }
    }

    func restore() async {
        isWorking = true
        defer { isWorking = false }
        do {
            try await AppStore.sync()
            await refreshEntitlements()
            message = hasLifetimeAccess ? "Lifetime access was restored." : "No previous lifetime purchase was found."
        } catch {
            message = "Purchases could not be restored: \(error.localizedDescription)"
        }
    }

    func refreshEntitlements() async {
        var entitled = false
        for await result in Transaction.currentEntitlements {
            guard let transaction = try? verified(result) else { continue }
            if transaction.productID == Self.lifetimeProductID && transaction.revocationDate == nil {
                entitled = true
            }
        }
        hasLifetimeAccess = entitled
    }

    private func loadProduct() async {
        do {
            product = try await Product.products(for: [Self.lifetimeProductID]).first
        } catch {
            message = "App Store pricing is temporarily unavailable."
        }
    }

    private func listenForTransactions() -> Task<Void, Never> {
        Task { [weak self] in
            for await result in Transaction.updates {
                guard let self, let transaction = try? self.verified(result) else { continue }
                await self.refreshEntitlements()
                await transaction.finish()
            }
        }
    }

    private func verified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .verified(let value): return value
        case .unverified: throw StoreError.failedVerification
        }
    }

    private enum StoreError: Error { case failedVerification }
}
