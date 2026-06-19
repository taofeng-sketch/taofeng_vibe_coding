import Foundation

struct CoachMemory {
    var longTermGoal: String
    var constraints: String
    var preferredStyle: String
    var avoidances: String

    var isEmpty: Bool {
        [longTermGoal, constraints, preferredStyle, avoidances]
            .allSatisfy { $0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }

    var promptContext: String {
        guard !isEmpty else {
            return "No additional user memory yet."
        }

        return """
        User memory:
        - Long-term goal: \(longTermGoal.isEmpty ? "not specified" : longTermGoal)
        - Constraints: \(constraints.isEmpty ? "not specified" : constraints)
        - Preferred coaching style: \(preferredStyle.isEmpty ? "direct, calm, specific" : preferredStyle)
        - Things to avoid: \(avoidances.isEmpty ? "not specified" : avoidances)
        """
    }
}

enum CoachMemoryKeys {
    static let longTermGoal = "coachMemoryLongTermGoal"
    static let constraints = "coachMemoryConstraints"
    static let preferredStyle = "coachMemoryPreferredStyle"
    static let avoidances = "coachMemoryAvoidances"
}
