import Foundation
import HealthKit

struct WorkoutSummary: Identifiable, Hashable {
    let id: UUID
    let date: Date
    let title: String
    let durationMinutes: Int
}

struct DecathlonPillarProgress: Identifiable {
    let id: String
    let title: String
    let subtitle: String
    let current: Double
    let target: Double
    let unit: String
    let sourceWorkouts: [WorkoutSummary]

    var progress: Double {
        guard target > 0 else { return 0 }
        return min(current / target, 1)
    }

    var remainingText: String {
        let remaining = max(target - current, 0)
        if remaining == 0 {
            return "本周已达标"
        }
        if unit == "次" {
            return "本周还差 \(Int(ceil(remaining))) 次"
        }
        return "本周还差 \(Int(ceil(remaining))) 分钟"
    }
}

struct HealthSnapshot {
    let sleepHours: Double
    let sleepSevenDayAverage: Double
    let hrvMs: Double
    let hrvSevenDayAverage: Double
    let activeEnergyKcal: Double
    let bodyMassKg: Double?

    var hasAnyHealthMetrics: Bool {
        sleepHours > 0 || hrvMs > 0 || activeEnergyKcal > 0 || bodyMassKg != nil
    }
}

actor HealthKitService {
    static let shared = HealthKitService()

    private let healthStore = HKHealthStore()

    func requestAuthorization() async -> Bool {
        guard HKHealthStore.isHealthDataAvailable() else { return false }

        let readTypes = healthReadTypes()
        let shareTypes = healthShareTypes()

        return await withCheckedContinuation { continuation in
            healthStore.requestAuthorization(toShare: shareTypes, read: readTypes) { success, _ in
                continuation.resume(returning: success)
            }
        }
    }

    func snapshot() async -> HealthSnapshot {
        async let sleep = sleepHours(forLastDays: 1)
        async let sleepAverage = sleepHours(forLastDays: 7)
        async let hrv = latestQuantity(identifier: .heartRateVariabilitySDNN, unit: .secondUnit(with: .milli))
        async let hrvAverage = averageQuantity(identifier: .heartRateVariabilitySDNN, unit: .secondUnit(with: .milli), days: 7)
        async let activeEnergy = sumQuantity(identifier: .activeEnergyBurned, unit: .kilocalorie(), days: 1)
        async let bodyMass = latestQuantity(identifier: .bodyMass, unit: .gramUnit(with: .kilo))

        return await HealthSnapshot(
            sleepHours: sleep,
            sleepSevenDayAverage: sleepAverage / 7,
            hrvMs: hrv ?? 0,
            hrvSevenDayAverage: hrvAverage,
            activeEnergyKcal: activeEnergy,
            bodyMassKg: bodyMass
        )
    }

    func writeNutrition(for meal: MealEntry) async {
        guard HKHealthStore.isHealthDataAvailable() else { return }

        let samples: [HKQuantitySample] = [
            nutritionSample(identifier: .dietaryEnergyConsumed, unit: .kilocalorie(), value: Double(meal.totalCalories), date: meal.date),
            nutritionSample(identifier: .dietaryProtein, unit: .gram(), value: meal.proteinG, date: meal.date),
            nutritionSample(identifier: .dietaryCarbohydrates, unit: .gram(), value: meal.carbsG, date: meal.date),
            nutritionSample(identifier: .dietaryFatTotal, unit: .gram(), value: meal.fatG, date: meal.date),
        ].compactMap { $0 }

        guard !samples.isEmpty else { return }

        try? await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            healthStore.save(samples) { _, error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume()
                }
            }
        }
    }

    func weeklyDecathlonProgress() async -> [DecathlonPillarProgress] {
        let workouts = await workoutsPastSevenDays()

        let strength = workouts.filter { workout in
            workout.workoutActivityType == .traditionalStrengthTraining ||
                workout.workoutActivityType == .functionalStrengthTraining
        }
        let zone2 = workouts.filter { workout in
            [.running, .cycling, .walking, .hiking, .elliptical].contains(workout.workoutActivityType) &&
                workout.duration >= 45 * 60
        }
        let vo2 = workouts.filter { workout in
            workout.workoutActivityType == .highIntensityIntervalTraining ||
                workout.duration >= 30 * 60 && [.running, .cycling, .rowing].contains(workout.workoutActivityType)
        }
        let stability = workouts.filter { workout in
            [.yoga, .mindAndBody, .flexibility, .pilates].contains(workout.workoutActivityType)
        }
        let stabilityMinutes = stability.reduce(0) { $0 + $1.duration / 60 }

        return [
            DecathlonPillarProgress(
                id: "strength",
                title: "力量",
                subtitle: "3 次力量训练",
                current: Double(strength.count),
                target: 3,
                unit: "次",
                sourceWorkouts: strength.map(Self.summary)
            ),
            DecathlonPillarProgress(
                id: "zone2",
                title: "有氧基础",
                subtitle: "4 次 45 分钟 Zone 2",
                current: Double(zone2.count),
                target: 4,
                unit: "次",
                sourceWorkouts: zone2.map(Self.summary)
            ),
            DecathlonPillarProgress(
                id: "vo2",
                title: "无氧爆发",
                subtitle: "1 次 30 分钟 VO2 max",
                current: Double(vo2.count),
                target: 1,
                unit: "次",
                sourceWorkouts: vo2.map(Self.summary)
            ),
            DecathlonPillarProgress(
                id: "stability",
                title: "稳定性",
                subtitle: "60 分钟稳定性/灵活性",
                current: stabilityMinutes,
                target: 60,
                unit: "分钟",
                sourceWorkouts: stability.map(Self.summary)
            ),
        ]
    }

    nonisolated static func fallbackDecathlonProgress() -> [DecathlonPillarProgress] {
        [
            DecathlonPillarProgress(id: "strength", title: "力量", subtitle: "3 次力量训练", current: 0, target: 3, unit: "次", sourceWorkouts: []),
            DecathlonPillarProgress(id: "zone2", title: "有氧基础", subtitle: "4 次 45 分钟 Zone 2", current: 0, target: 4, unit: "次", sourceWorkouts: []),
            DecathlonPillarProgress(id: "vo2", title: "无氧爆发", subtitle: "1 次 30 分钟 VO2 max", current: 0, target: 1, unit: "次", sourceWorkouts: []),
            DecathlonPillarProgress(id: "stability", title: "稳定性", subtitle: "60 分钟稳定性/灵活性", current: 0, target: 60, unit: "分钟", sourceWorkouts: []),
        ]
    }

    private func healthReadTypes() -> Set<HKObjectType> {
        var types: Set<HKObjectType> = [HKObjectType.workoutType()]
        [
            HKObjectType.categoryType(forIdentifier: .sleepAnalysis),
            HKObjectType.quantityType(forIdentifier: .heartRateVariabilitySDNN),
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned),
            HKObjectType.quantityType(forIdentifier: .bodyMass),
        ].compactMap { $0 }.forEach { types.insert($0) }
        return types
    }

    private func healthShareTypes() -> Set<HKSampleType> {
        [
            HKObjectType.quantityType(forIdentifier: .dietaryEnergyConsumed),
            HKObjectType.quantityType(forIdentifier: .dietaryProtein),
            HKObjectType.quantityType(forIdentifier: .dietaryCarbohydrates),
            HKObjectType.quantityType(forIdentifier: .dietaryFatTotal),
        ].compactMap { $0 }.reduce(into: Set<HKSampleType>()) { $0.insert($1) }
    }

    private func latestQuantity(identifier: HKQuantityTypeIdentifier, unit: HKUnit) async -> Double? {
        guard let type = HKObjectType.quantityType(forIdentifier: identifier), HKHealthStore.isHealthDataAvailable() else {
            return nil
        }

        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        return await withCheckedContinuation { continuation in
            let query = HKSampleQuery(sampleType: type, predicate: nil, limit: 1, sortDescriptors: [sort]) { _, samples, _ in
                let sample = samples?.first as? HKQuantitySample
                continuation.resume(returning: sample?.quantity.doubleValue(for: unit))
            }
            healthStore.execute(query)
        }
    }

    private func averageQuantity(identifier: HKQuantityTypeIdentifier, unit: HKUnit, days: Int) async -> Double {
        guard let type = HKObjectType.quantityType(forIdentifier: identifier), HKHealthStore.isHealthDataAvailable() else {
            return 0
        }

        let predicate = datePredicate(days: days)
        return await withCheckedContinuation { continuation in
            let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .discreteAverage) { _, stats, _ in
                continuation.resume(returning: stats?.averageQuantity()?.doubleValue(for: unit) ?? 0)
            }
            healthStore.execute(query)
        }
    }

    private func sumQuantity(identifier: HKQuantityTypeIdentifier, unit: HKUnit, days: Int) async -> Double {
        guard let type = HKObjectType.quantityType(forIdentifier: identifier), HKHealthStore.isHealthDataAvailable() else {
            return 0
        }

        let predicate = datePredicate(days: days)
        return await withCheckedContinuation { continuation in
            let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, stats, _ in
                continuation.resume(returning: stats?.sumQuantity()?.doubleValue(for: unit) ?? 0)
            }
            healthStore.execute(query)
        }
    }

    private func sleepHours(forLastDays days: Int) async -> Double {
        guard let type = HKObjectType.categoryType(forIdentifier: .sleepAnalysis), HKHealthStore.isHealthDataAvailable() else {
            return 0
        }

        let predicate = datePredicate(days: days)
        return await withCheckedContinuation { continuation in
            let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, _ in
                let seconds = (samples as? [HKCategorySample] ?? []).reduce(0.0) { total, sample in
                    let asleepValues = [
                        HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue,
                        HKCategoryValueSleepAnalysis.asleepCore.rawValue,
                        HKCategoryValueSleepAnalysis.asleepDeep.rawValue,
                        HKCategoryValueSleepAnalysis.asleepREM.rawValue,
                    ]
                    guard asleepValues.contains(sample.value) else { return total }
                    return total + sample.endDate.timeIntervalSince(sample.startDate)
                }
                continuation.resume(returning: seconds / 3600)
            }
            healthStore.execute(query)
        }
    }

    private func workoutsPastSevenDays() async -> [HKWorkout] {
        guard HKHealthStore.isHealthDataAvailable() else { return [] }
        let predicate = datePredicate(days: 7)
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)

        return await withCheckedContinuation { continuation in
            let query = HKSampleQuery(sampleType: HKObjectType.workoutType(), predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: [sort]) { _, samples, _ in
                continuation.resume(returning: samples as? [HKWorkout] ?? [])
            }
            healthStore.execute(query)
        }
    }

    private func nutritionSample(identifier: HKQuantityTypeIdentifier, unit: HKUnit, value: Double, date: Date) -> HKQuantitySample? {
        guard value > 0, let type = HKObjectType.quantityType(forIdentifier: identifier) else { return nil }
        let quantity = HKQuantity(unit: unit, doubleValue: value)
        return HKQuantitySample(type: type, quantity: quantity, start: date, end: date)
    }

    private func datePredicate(days: Int) -> NSPredicate {
        let end = Date()
        let start = Calendar.current.date(byAdding: .day, value: -days, to: end) ?? end
        return HKQuery.predicateForSamples(withStart: start, end: end)
    }

    private nonisolated static func summary(_ workout: HKWorkout) -> WorkoutSummary {
        WorkoutSummary(
            id: workout.uuid,
            date: workout.startDate,
            title: workout.workoutActivityType.displayName,
            durationMinutes: Int(workout.duration / 60)
        )
    }
}

private extension HKWorkoutActivityType {
    var displayName: String {
        switch self {
        case .traditionalStrengthTraining: "力量训练"
        case .functionalStrengthTraining: "功能力量"
        case .running: "跑步"
        case .cycling: "骑行"
        case .walking: "步行"
        case .hiking: "徒步"
        case .elliptical: "椭圆机"
        case .highIntensityIntervalTraining: "HIIT"
        case .rowing: "划船"
        case .yoga: "瑜伽"
        case .mindAndBody: "身心"
        case .flexibility: "灵活性"
        case .pilates: "普拉提"
        default: "训练"
        }
    }
}
