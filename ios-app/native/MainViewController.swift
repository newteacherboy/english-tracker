import UIKit
import WebKit
import Capacitor

// Uygulama içeriği canlı siteden gelir; sürüme bağlı yerel katman (reklam, üyelik, bildirim)
// paketle birlikte gelen native-runtime.js dosyasından sayfaya eklenir. Böylece eski (1.0) paketler
// bu kodu hiç çalıştırmaz, yeni paketler de web güncellemesini beklemez.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(DmBillingPlugin())
        guard let controller = webView?.configuration.userContentController else { return }
        controller.addUserScript(WKUserScript(source: "window.dmNativeRuntime=true;", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        if let url = Bundle.main.url(forResource: "native-runtime", withExtension: "js"),
           let source = try? String(contentsOf: url, encoding: .utf8) {
            controller.addUserScript(WKUserScript(source: source, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        }
    }
}
