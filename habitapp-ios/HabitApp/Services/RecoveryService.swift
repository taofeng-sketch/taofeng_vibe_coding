import Foundation
import HealthKit

enum RecoveryStatus {
    case normal
    case low
    case unknown
}

actor RecoveryService {
    static let shared = RecoveryService()

    private let healthStore = HKHealthStore()

    func status() async -> RecoveryStatus {
        guard HKHealthStore.isHealthDataAvailable(),
              let type = HKObjectType.quantityType(forIdentifier: .heartRateVariabilitySDNN)
        else {
            return .unknown
        }

        async let latest = latestHRV(type: type)
        async let baseline = hrvSamples(type: type, days: 7)
        let (current, samples) = await (latest, baseline)

        guard let current, samples.count >= 3 else { return .unknown }
        let average = samples.reduce(0, +) / Double(samples.count)
        guard average > 0 else { return .unknown }
        return current < average * 0.8 ? .low : .normal
    }

    private func latestHRV(type: HKQuantityType) async -> Double? {
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        return await withCheckedContinuation { continuation in
            let query = HKSampleQuery(sampleType: type, predicate: nil, limit: 1, sortDescriptors: [sort]) { _, samples, _ in
                let sample = samples?.first as? HKQuantitySample
                continuation.resume(returning: sample?.quantity.doubleValue(for: .secondUnit(with: .milli)))
            }
            healthStore.execute(query)
        }
    }

    private func hrvSamples(type: HKQuantityType, days: Int) async -> [Double] {
        let end = Date()
        let start = Calendar.current.date(byAdding: .day, value: -days, to: end) ?? end
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end)
        return await withCheckedContinuation { continuation in
            let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, _ in
                let values = (samples as? [HKQuantitySample] ?? []).map {
                    $0.quantity.doubleValue(for: .secondUnit(with: .milli))
                }
                continuation.resume(returning: values)
            }
            healthStore.execute(query)
        }
    }
}
