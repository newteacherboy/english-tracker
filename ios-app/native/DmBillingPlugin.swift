import Foundation
import UIKit
import Capacitor
import StoreKit

// Diji Medu abonelikleri (App Store, StoreKit 2).
// JS tarafı Android'deki DmBilling ile aynı arayüzü kullanır (android-app/src/billing.js):
//   getProducts({ids})            → {products:[{id, offers:[{basePlanId, offerId, phases:[{price, micros}]}]}]}
//   purchase({productId, basePlanId, accountRef}) → {purchases:[…]} | {canceled:true}
//   restore()                     → {purchases:[…]}   (etkin abonelikler)
//   manage()                      → Apple'ın abonelik yönetim ekranı
//   "purchase" olayı              → yenileme, onay bekleyen ödeme vb.
// App Store ürün kimliği = "<ürün>_<dönem>", ör. diji_pro_aylik. Sunucu imzalı işlemi (JWS) Apple zinciriyle doğrular.
@objc(DmBillingPlugin)
public class DmBillingPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "DmBillingPlugin"
    public let jsName = "DmBilling"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "manage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestReview", returnType: CAPPluginReturnPromise)
    ]
    private static let periods = ["aylik", "yillik"]
    private var updates: Task<Void, Never>?

    override public func load() {
        updates = Task.detached { [weak self] in
            for await result in Transaction.updates {
                guard case .verified(let tx) = result else { continue }
                await tx.finish()
                self?.notifyListeners("purchase", data: ["purchases": [DmBillingPlugin.describe(tx, jws: result.jwsRepresentation)]])
            }
        }
    }
    deinit { updates?.cancel() }

    private static func split(_ storeId: String) -> (String, String)? {
        for p in periods where storeId.hasSuffix("_" + p) { return (String(storeId.dropLast(p.count + 1)), p) }
        return nil
    }
    private static func describe(_ tx: Transaction, jws: String) -> [String: Any] {
        let base = split(tx.productID)?.0 ?? tx.productID
        let active = tx.revocationDate == nil && (tx.expirationDate.map { $0 > Date() } ?? true)
        return ["products": [base], "state": active ? "purchased" : "expired", "purchaseToken": jws, "storeProductId": tx.productID]
    }
    private static func micros(_ d: Decimal) -> Int { NSDecimalNumber(decimal: d * 1_000_000).intValue }
    // accountRef (64 hex) → App Store appAccountToken (UUID). Sunucu aynı dönüşümü yapar.
    private static func accountToken(_ ref: String) -> UUID? {
        let h = Array(ref.lowercased().filter { $0.isHexDigit })
        guard h.count >= 32 else { return nil }
        let s = String(h[0..<8]) + "-" + String(h[8..<12]) + "-" + String(h[12..<16]) + "-" + String(h[16..<20]) + "-" + String(h[20..<32])
        return UUID(uuidString: s)
    }

    @objc func getProducts(_ call: CAPPluginCall) {
        let ids = (call.getArray("ids", String.self) ?? [])
        let storeIds = ids.flatMap { id in DmBillingPlugin.periods.map { id + "_" + $0 } }
        Task {
            do {
                let found = try await Product.products(for: storeIds)
                var byBase: [String: [[String: Any]]] = [:]
                for p in found {
                    guard let (base, period) = DmBillingPlugin.split(p.id) else { continue }
                    let paid: [String: Any] = ["price": p.displayPrice, "micros": DmBillingPlugin.micros(p.price)]
                    byBase[base, default: []].append(["basePlanId": period, "phases": [paid]])
                    if let intro = p.subscription?.introductoryOffer, intro.paymentMode == .freeTrial,
                       await p.subscription?.isEligibleForIntroOffer == true {
                        byBase[base, default: []].append(["basePlanId": period, "offerId": "deneme",
                            "phases": [["price": "Ücretsiz", "micros": 0], paid]])
                    }
                }
                call.resolve(["products": byBase.map { ["id": $0.key, "offers": $0.value] }])
            } catch {
                call.reject("Ürünler alınamadı.")
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId"), let period = call.getString("basePlanId"),
              DmBillingPlugin.periods.contains(period) else { call.reject("Geçersiz ürün."); return }
        let token = DmBillingPlugin.accountToken(call.getString("accountRef") ?? "")
        Task { @MainActor in
            do {
                guard let product = try await Product.products(for: [productId + "_" + period]).first else {
                    call.reject("Bu plan şu an App Store'da yok."); return
                }
                var options: Set<Product.PurchaseOption> = []
                if let token = token { options.insert(.appAccountToken(token)) }
                let result: Product.PurchaseResult
                if #available(iOS 17.0, *), let scene = self.bridge?.viewController?.view.window?.windowScene {
                    result = try await product.purchase(confirmIn: scene, options: options)
                } else {
                    result = try await product.purchase(options: options)
                }
                switch result {
                case .success(let verification):
                    guard case .verified(let tx) = verification else { call.reject("Satın alma doğrulanamadı."); return }
                    await tx.finish()
                    call.resolve(["purchases": [DmBillingPlugin.describe(tx, jws: verification.jwsRepresentation)]])
                case .pending:
                    call.resolve(["purchases": [["products": [productId], "state": "pending"]]])
                case .userCancelled:
                    call.resolve(["canceled": true])
                @unknown default:
                    call.resolve(["canceled": true])
                }
            } catch {
                call.reject("Satın alma tamamlanamadı.")
            }
        }
    }

    @objc func restore(_ call: CAPPluginCall) {
        Task {
            var list: [[String: Any]] = []
            for await result in Transaction.currentEntitlements {
                guard case .verified(let tx) = result, tx.productType == .autoRenewable else { continue }
                list.append(DmBillingPlugin.describe(tx, jws: result.jwsRepresentation))
            }
            call.resolve(["purchases": list])
        }
    }

    @objc func manage(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let scene = self.bridge?.viewController?.view.window?.windowScene else { call.reject("Ekran hazır değil."); return }
            do { try await AppStore.showManageSubscriptions(in: scene); call.resolve() }
            catch { call.reject("Abonelik ekranı açılamadı.") }
        }
    }

    // App Store puanlama penceresi (Apple yılda en fazla 3 kez gösterir, ne zaman göstereceğine kendisi karar verir).
    @objc func requestReview(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let scene = UIApplication.shared.connectedScenes.first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene else {
                call.resolve(["shown": false]); return
            }
            if #available(iOS 16.0, *) { AppStore.requestReview(in: scene) } else { SKStoreReviewController.requestReview(in: scene) }
            call.resolve(["shown": true])
        }
    }
}
