import Foundation
import CallKit

/// Bridges the app and the Call Directory extension. The app records
/// "this masked number means this person", then asks iOS to reload the
/// extension so the native incoming-call screen shows that name.
enum CallerIDDirectory {
    static let appGroup = "group.app.fancall.demo"
    static let extensionID = "app.fancall.demo.FanCallDemo.CallDirectory"

    /// Label a Dialbridge masked number (e.g. "+918071961202") with a name and
    /// reload the extension. On the device, when that number rings, iOS shows the label.
    static func register(maskedNumber: String, label: String) {
        guard let number = phoneToInt64(maskedNumber) else { return }
        let defaults = UserDefaults(suiteName: appGroup)

        var list = (defaults?.array(forKey: "callerLabels") as? [[String: Any]]) ?? []
        list.removeAll { ($0["number"] as? NSNumber)?.int64Value == number }
        list.append(["number": NSNumber(value: number), "label": label])
        defaults?.set(list, forKey: "callerLabels")

        CXCallDirectoryManager.sharedInstance.reloadExtension(withIdentifier: extensionID) { error in
            if let error { NSLog("reload Call Directory failed: \(error.localizedDescription)") }
        }
    }

    /// "+918071961202" → 918071961202 (digits only, as CallKit expects).
    private static func phoneToInt64(_ s: String) -> Int64? {
        Int64(s.filter(\.isNumber))
    }
}
