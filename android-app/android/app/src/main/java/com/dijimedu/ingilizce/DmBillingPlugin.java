package com.dijimedu.ingilizce;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.google.android.play.core.review.ReviewInfo;
import com.google.android.play.core.review.ReviewManager;
import com.google.android.play.core.review.ReviewManagerFactory;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Google Play Billing köprüsü. Sadece satın alma akışını açar ve token'ı döndürür;
 * hakkı vermek ve onaylamak (acknowledge) sunucunun işidir (supabase/functions/billing).
 */
@CapacitorPlugin(name = "DmBilling")
public class DmBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private BillingClient client;
    private final Map<String, ProductDetails> details = new HashMap<>();
    private PluginCall pendingPurchase;

    @Override
    public void load() {
        client = BillingClient.newBuilder(getContext())
            .setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection()
            .build();
    }

    private interface Ready { void run(); }

    private void withConnection(PluginCall call, Ready ready) {
        if (client.isReady()) { ready.run(); return; }
        client.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult result) {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) ready.run();
                else call.reject("Google Play ödeme servisine bağlanılamadı.", String.valueOf(result.getResponseCode()));
            }
            @Override public void onBillingServiceDisconnected() { /* Otomatik yeniden bağlanma açık. */ }
        });
    }

    @PluginMethod
    public void getProducts(PluginCall call) {
        JSArray ids = call.getArray("ids");
        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        try {
            for (Object id : ids.toList()) products.add(QueryProductDetailsParams.Product.newBuilder()
                .setProductId(String.valueOf(id)).setProductType(BillingClient.ProductType.SUBS).build());
        } catch (Exception e) { call.reject("Geçersiz ürün listesi."); return; }
        if (products.isEmpty()) { call.reject("Ürün listesi boş."); return; }
        withConnection(call, () -> client.queryProductDetailsAsync(
            QueryProductDetailsParams.newBuilder().setProductList(products).build(),
            (result, queryResult) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { call.reject("Fiyatlar alınamadı.", String.valueOf(result.getResponseCode())); return; }
                JSArray out = new JSArray();
                for (ProductDetails pd : queryResult.getProductDetailsList()) {
                    details.put(pd.getProductId(), pd);
                    JSObject item = new JSObject();
                    item.put("id", pd.getProductId());
                    item.put("title", pd.getName());
                    JSArray offers = new JSArray();
                    List<ProductDetails.SubscriptionOfferDetails> list = pd.getSubscriptionOfferDetails();
                    if (list != null) for (ProductDetails.SubscriptionOfferDetails o : list) {
                        JSObject offer = new JSObject();
                        offer.put("basePlanId", o.getBasePlanId());
                        offer.put("offerId", o.getOfferId());
                        JSArray phases = new JSArray();
                        for (ProductDetails.PricingPhase p : o.getPricingPhases().getPricingPhaseList()) {
                            JSObject phase = new JSObject();
                            phase.put("price", p.getFormattedPrice());
                            phase.put("micros", p.getPriceAmountMicros());
                            phase.put("currency", p.getPriceCurrencyCode());
                            phase.put("period", p.getBillingPeriod());
                            phases.put(phase);
                        }
                        offer.put("phases", phases);
                        offers.put(offer);
                    }
                    item.put("offers", offers);
                    out.put(item);
                }
                JSObject ret = new JSObject();
                ret.put("products", out);
                call.resolve(ret);
            }));
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        String productId = call.getString("productId", "");
        String basePlanId = call.getString("basePlanId", "");
        String accountRef = call.getString("accountRef", "");
        String oldToken = call.getString("oldPurchaseToken", null);
        ProductDetails pd = details.get(productId);
        if (pd == null) { call.reject("Önce planlar yüklenmeli."); return; }
        if (accountRef == null || !accountRef.matches("^[0-9a-f]{64}$")) { call.reject("Hesap bilgisi eksik."); return; }
        if (pendingPurchase != null) { call.reject("Bir satın alma zaten açık."); return; }
        String offerToken = null;
        List<ProductDetails.SubscriptionOfferDetails> offers = pd.getSubscriptionOfferDetails();
        if (offers != null) for (ProductDetails.SubscriptionOfferDetails o : offers) {
            if (!basePlanId.equals(o.getBasePlanId())) continue;
            // Uygunsa deneme teklifini (offerId dolu) seç; yoksa temel planı kullan.
            if (offerToken == null || o.getOfferId() != null) offerToken = o.getOfferToken();
        }
        if (offerToken == null) { call.reject("Bu plan şu an satışta değil."); return; }
        List<BillingFlowParams.ProductDetailsParams> list = new ArrayList<>();
        list.add(BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(pd).setOfferToken(offerToken).build());
        BillingFlowParams.Builder flow = BillingFlowParams.newBuilder().setProductDetailsParamsList(list).setObfuscatedAccountId(accountRef);
        if (oldToken != null && !oldToken.isEmpty()) flow.setSubscriptionUpdateParams(BillingFlowParams.SubscriptionUpdateParams.newBuilder()
            .setOldPurchaseToken(oldToken)
            .setSubscriptionReplacementMode(BillingFlowParams.SubscriptionUpdateParams.ReplacementMode.CHARGE_PRORATED_PRICE)
            .build());
        withConnection(call, () -> getActivity().runOnUiThread(() -> {
            pendingPurchase = call;
            call.setKeepAlive(true);
            BillingResult r = client.launchBillingFlow(getActivity(), flow.build());
            if (r.getResponseCode() != BillingClient.BillingResponseCode.OK) finishPurchase(r, null);
        }));
    }

    @Override
    public void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        finishPurchase(result, purchases);
    }

    private void finishPurchase(BillingResult result, List<Purchase> purchases) {
        PluginCall call = pendingPurchase;
        pendingPurchase = null;
        if (call == null) { if (purchases != null) notifyListeners("purchase", purchasesJson(purchases)); return; }
        call.setKeepAlive(false);
        int code = result.getResponseCode();
        if (code == BillingClient.BillingResponseCode.USER_CANCELED) { JSObject ret = new JSObject(); ret.put("canceled", true); call.resolve(ret); return; }
        if (code == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) { JSObject ret = new JSObject(); ret.put("alreadyOwned", true); call.resolve(ret); return; }
        if (code != BillingClient.BillingResponseCode.OK || purchases == null) { call.reject("Satın alma tamamlanamadı.", String.valueOf(code)); return; }
        call.resolve(purchasesJson(purchases));
    }

    private JSObject purchasesJson(List<Purchase> purchases) {
        JSArray out = new JSArray();
        for (Purchase p : purchases) {
            JSObject item = new JSObject();
            item.put("purchaseToken", p.getPurchaseToken());
            item.put("products", new JSArray(p.getProducts()));
            item.put("state", p.getPurchaseState() == Purchase.PurchaseState.PURCHASED ? "purchased" : p.getPurchaseState() == Purchase.PurchaseState.PENDING ? "pending" : "unknown");
            item.put("acknowledged", p.isAcknowledged());
            item.put("autoRenewing", p.isAutoRenewing());
            out.put(item);
        }
        JSObject ret = new JSObject();
        ret.put("purchases", out);
        return ret;
    }

    /** Cihazdaki etkin abonelikler; sunucu doğrulaması için tekrar gönderilir (geri yükleme). */
    @PluginMethod
    public void restore(PluginCall call) {
        withConnection(call, () -> client.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build(),
            (result, purchases) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { call.reject("Abonelikler okunamadı.", String.valueOf(result.getResponseCode())); return; }
                call.resolve(purchasesJson(purchases));
            }));
    }

    /** Google Play'in abonelik yönetimi sayfası (iptal, ödeme yöntemi). */
    @PluginMethod
    public void manage(PluginCall call) {
        String productId = call.getString("productId", "");
        String url = "https://play.google.com/store/account/subscriptions?package=" + getContext().getPackageName() + (productId.isEmpty() ? "" : "&sku=" + productId);
        try {
            android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url));
            intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) { call.reject("Google Play açılamadı."); }
    }

    /** Google Play uygulama içi puanlama penceresi. Google gösterip göstermeyeceğine kendisi karar verir. */
    @PluginMethod
    public void requestReview(PluginCall call) {
        try {
            ReviewManager manager = ReviewManagerFactory.create(getContext());
            manager.requestReviewFlow().addOnCompleteListener(task -> {
                if (!task.isSuccessful() || getActivity() == null) { JSObject r = new JSObject(); r.put("shown", false); call.resolve(r); return; }
                ReviewInfo info = task.getResult();
                manager.launchReviewFlow(getActivity(), info).addOnCompleteListener(done -> { JSObject r = new JSObject(); r.put("shown", true); call.resolve(r); });
            });
        } catch (Exception e) { JSObject r = new JSObject(); r.put("shown", false); call.resolve(r); }
    }
}
