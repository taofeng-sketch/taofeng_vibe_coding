import Foundation
import SwiftData

@Model
final class MealEntry {
    var id: UUID = UUID()
    var date: Date = Calendar.current.startOfDay(for: Date())
    var imageData: Data?
    var totalCalories: Int = 0
    var proteinG: Double = 0
    var carbsG: Double = 0
    var fatG: Double = 0
    var rawJSON: String?

    init(
        id: UUID = UUID(),
        date: Date = .now,
        imageData: Data? = nil,
        totalCalories: Int = 0,
        proteinG: Double = 0,
        carbsG: Double = 0,
        fatG: Double = 0,
        rawJSON: String? = nil
    ) {
        self.id = id
        self.date = Calendar.current.startOfDay(for: date)
        self.imageData = imageData
        self.totalCalories = totalCalories
        self.proteinG = proteinG
        self.carbsG = carbsG
        self.fatG = fatG
        self.rawJSON = rawJSON
    }
}
