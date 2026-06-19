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
            return AppLanguage.text("本周已达标", "Target met this week")
        }
        if unit == "次" || unit == "x" {
            return AppLanguage.text("本周还差 \(Int(ceil(remaining))) 次", "\(Int(ceil(remaining))) sessions left this week")
        }
        return AppLanguage.text("本周还差 \(Int(ceil(remaining))) 分钟", "\(Int(ceil(remaining))) minutes left this week")
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
                title: AppLanguage.text("力量", "Strength"),
                subtitle: AppLanguage.text("3 次力量训练", "3 strength sessions"),
                current: Double(strength.count),
                target: 3,
                unit: AppLanguage.text("次", "x"),
                sourceWorkouts: strength.map(Self.summary)
            ),
            DecathlonPillarProgress(
                id: "zone2",
                title: AppLanguage.text("有氧基础", "Aerobic Base"),
                subtitle: AppLanguage.text("4 次 45 分钟 Zone 2", "4 x 45-min Zone 2"),
                current: Double(zone2.count),
                target: 4,
                unit: AppLanguage.text("次", "x"),
                sourceWorkouts: zone2.map(Self.summary)
            ),
            DecathlonPillarProgress(
                id: "vo2",
                title: AppLanguage.text("无氧爆发", "VO2 Max"),
                subtitle: AppLanguage.text("1 次 30 分钟 VO2 max", "1 x 30-min VO2 max"),
                current: Double(vo2.count),
                target: 1,
                unit: AppLanguage.text("次", "x"),
                sourceWorkouts: vo2.map(Self.summary)
            ),
            DecathlonPillarProgress(
                id: "stability",
                title: AppLanguage.text("稳定性", "Stability"),
                subtitle: AppLanguage.text("60 分钟稳定性/灵活性", "60 min stability / mobility"),
                current: stabilityMinutes,
                target: 60,
                unit: AppLanguage.text("分钟", "min"),
                sourceWorkouts: stability.map(Self.summary)
            ),
        ]
    }

    nonisolated static func fallbackDecathlonProgress() -> [DecathlonPillarProgress] {
        [
            DecathlonPillarProgress(id: "strength", title: AppLanguage.text("力量", "Strength"), subtitle: AppLanguage.text("3 次力量训练", "3 strength sessions"), current: 0, target: 3, unit: AppLanguage.text("次", "x"), sourceWorkouts: []),
            DecathlonPillarProgress(id: "zone2", title: AppLanguage.text("有氧基础", "Aerobic Base"), subtitle: AppLanguage.text("4 次 45 分钟 Zone 2", "4 x 45-min Zone 2"), current: 0, target: 4, unit: AppLanguage.text("次", "x"), sourceWorkouts: []),
            DecathlonPillarProgress(id: "vo2", title: AppLanguage.text("无氧爆发", "VO2 Max"), subtitle: AppLanguage.text("1 次 30 分钟 VO2 max", "1 x 30-min VO2 max"), current: 0, target: 1, unit: AppLanguage.text("次", "x"), sourceWorkouts: []),
            DecathlonPillarProgress(id: "stability", title: AppLanguage.text("稳定性", "Stability"), subtitle: AppLanguage.text("60 分钟稳定性/灵活性", "60 min stability / mobility"), current: 0, target: 60, unit: AppLanguage.text("分钟", "min"), sourceWorkouts: []),
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
        case .traditionalStrengthTraining: AppLanguage.text("力量训练", "Strength Training")
        case .functionalStrengthTraining: AppLanguage.text("功能力量", "Functional Strength")
        case .running: AppLanguage.text("跑步", "Running")
        case .cycling: AppLanguage.text("骑行", "Cycling")
        case .walking: AppLanguage.text("步行", "Walking")
        case .hiking: AppLanguage.text("徒步", "Hiking")
        case .elliptical: AppLanguage.text("椭圆机", "Elliptical")
        case .highIntensityIntervalTraining: "HIIT"
        case .rowing: AppLanguage.text("划船", "Rowing")
        case .yoga: AppLanguage.text("瑜伽", "Yoga")
        case .mindAndBody: AppLanguage.text("身心", "Mind and Body")
        case .flexibility: AppLanguage.text("灵活性", "Flexibility")
        case .pilates: AppLanguage.text("普拉提", "Pilates")
        default: AppLanguage.text("训练", "Workout")
        }
    }
}
