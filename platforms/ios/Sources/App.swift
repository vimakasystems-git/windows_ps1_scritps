import UIKit
import WebKit
@main class AppDelegate: UIResponder, UIApplicationDelegate {
 var window: UIWindow?
 func application(_ application: UIApplication, didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {window=UIWindow(frame: UIScreen.main.bounds);window?.rootViewController=CareController();window?.makeKeyAndVisible();return true}
}
class CareController: UIViewController, WKNavigationDelegate {
 private var web: WKWebView!
 override func viewDidLoad(){super.viewDidLoad();web=WKWebView(frame:.zero);web.navigationDelegate=self;view.addSubview(web);web.translatesAutoresizingMaskIntoConstraints=false;NSLayoutConstraint.activate([web.leadingAnchor.constraint(equalTo:view.leadingAnchor),web.trailingAnchor.constraint(equalTo:view.trailingAnchor),web.topAnchor.constraint(equalTo:view.safeAreaLayoutGuide.topAnchor),web.bottomAnchor.constraint(equalTo:view.safeAreaLayoutGuide.bottomAnchor)]);view.backgroundColor = .white;if let url=Bundle.main.url(forResource:"index",withExtension:"html",subdirectory:"www"){web.loadFileURL(url,allowingReadAccessTo:url.deletingLastPathComponent())}}
 func webView(_ webView:WKWebView,didFinish navigation:WKNavigation!){diagnose()}
 func webView(_ webView:WKWebView,decidePolicyFor navigationAction:WKNavigationAction,decisionHandler:@escaping(WKNavigationActionPolicy)->Void){guard let url=navigationAction.request.url else {decisionHandler(.cancel);return};if url.absoluteString=="vimaka://diagnose" {diagnose();decisionHandler(.cancel);return};if url.isFileURL {decisionHandler(.allow);return};if url.scheme=="https" {UIApplication.shared.open(url)};decisionHandler(.cancel)}
 private func diagnose(){UIDevice.current.isBatteryMonitoringEnabled=true;var data:[String:Any] = ["platform":UIDevice.current.systemName+" "+UIDevice.current.systemVersion,"cores":ProcessInfo.processInfo.activeProcessorCount,"memoryTotal":ProcessInfo.processInfo.physicalMemory];let battery=UIDevice.current.batteryLevel;if battery>=0 {data["battery"]=Double(battery)*100};if let url=FileManager.default.urls(for:.documentDirectory,in:.userDomainMask).first,let values=try? url.resourceValues(forKeys:[.volumeTotalCapacityKey,.volumeAvailableCapacityForImportantUsageKey]) {if let total=values.volumeTotalCapacity {data["storageTotal"]=total};if let available=values.volumeAvailableCapacityForImportantUsage {data["storageAvailable"]=available}};if let json=try? JSONSerialization.data(withJSONObject:data),let text=String(data:json,encoding:.utf8){web.evaluateJavaScript("window.receiveNativeInfo("+text+")",completionHandler:nil)}}
}
