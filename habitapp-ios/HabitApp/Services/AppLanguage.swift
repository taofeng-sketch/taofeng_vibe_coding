import Foundation

enum AppLanguage: String, CaseIterable, Identifiable {
    case system
    case english
    case chinese

    static let storageKey = "appLanguage"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .system: "System"
        case .english: "English"
        case .chinese: "中文"
        }
    }

    static var current: AppLanguage {
        let raw = UserDefaults.standard.string(forKey: storageKey) ?? AppLanguage.system.rawValue
        return AppLanguage(rawValue: raw) ?? .system
    }

    static var isEnglish: Bool {
        switch current {
        case .english:
            return true
        case .chinese:
            return false
        case .system:
            let code = Locale.preferredLanguages.first?.lowercased() ?? ""
            return !code.hasPrefix("zh")
        }
    }

    static func text(_ chinese: String, _ english: String) -> String {
        isEnglish ? english : chinese
    }
}
