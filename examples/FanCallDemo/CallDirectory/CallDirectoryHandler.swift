import Foundation
import CallKit

/// Adds caller-ID labels for Dialbridge masked numbers. It does NOT draw the
/// incoming-call screen — iOS shows that natively for the real cellular call.
/// This only makes that native screen say e.g. "FanCall — Aanya Sharma" instead
/// of a bare number. The app writes the number→label map into the shared App
/// Group; iOS asks this extension to load it.
class CallDirectoryHandler: CXCallDirectoryProvider {
    private let appGroup = "group.app.fancall.demo"

    override func beginRequest(with context: CXCallDirectoryExtensionContext) {
        context.delegate = self

        // Identification entries MUST be added in ascending numerical order.
        for entry in loadEntries().sorted(by: { $0.number < $1.number }) {
            context.addIdentificationEntry(withNextSequentialPhoneNumber: entry.number, label: entry.label)
        }

        context.completeRequest()
    }

    private func loadEntries() -> [(number: Int64, label: String)] {
        guard
            let defaults = UserDefaults(suiteName: appGroup),
            let raw = defaults.array(forKey: "callerLabels") as? [[String: Any]]
        else { return [] }

        return raw.compactMap { item in
            guard
                let number = (item["number"] as? NSNumber)?.int64Value,
                let label = item["label"] as? String
            else { return nil }
            return (number, label)
        }
    }
}

extension CallDirectoryHandler: CXCallDirectoryExtensionContextDelegate {
    func requestFailed(for extensionContext: CXCallDirectoryExtensionContext, withError error: Error) {
        // Reset and try again on next reload; iOS handles the retry.
        NSLog("CallDirectory request failed: \(error.localizedDescription)")
    }
}
