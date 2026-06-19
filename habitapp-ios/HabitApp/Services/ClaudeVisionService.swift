import Foundation
import UIKit

struct MealFood: Codable, Identifiable {
    var id = UUID()
    let name: String
    let estimatedGrams: Int
    let calories: Int

    enum CodingKeys: String, CodingKey {
        case name
        case estimatedGrams = "estimated_grams"
        case calories
    }
}

struct MealAnalysis: Codable {
    let foods: [MealFood]
    let totalCalories: Int
    let proteinG: Double
    let carbsG: Double
    let fatG: Double
    let confidence: String
    let notes: String
    let rawJSON: String

    enum CodingKeys: String, CodingKey {
        case foods
        case totalCalories = "total_calories"
        case proteinG = "protein_g"
        case carbsG = "carbs_g"
        case fatG = "fat_g"
        case confidence
        case notes
    }

    init(
        foods: [MealFood],
        totalCalories: Int,
        proteinG: Double,
        carbsG: Double,
        fatG: Double,
        confidence: String,
        notes: String,
        rawJSON: String
    ) {
        self.foods = foods
        self.totalCalories = totalCalories
        self.proteinG = proteinG
        self.carbsG = carbsG
        self.fatG = fatG
        self.confidence = confidence
        self.notes = notes
        self.rawJSON = rawJSON
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        foods = try container.decode([MealFood].self, forKey: .foods)
        totalCalories = try container.decode(Int.self, forKey: .totalCalories)
        proteinG = try container.decode(Double.self, forKey: .proteinG)
        carbsG = try container.decode(Double.self, forKey: .carbsG)
        fatG = try container.decode(Double.self, forKey: .fatG)
        confidence = try container.decode(String.self, forKey: .confidence)
        notes = try container.decode(String.self, forKey: .notes)
        rawJSON = ""
    }

    var confidenceText: String {
        switch confidence.lowercased() {
        case "high": AppLanguage.text("高", "High")
        case "medium": AppLanguage.text("中", "Medium")
        case "low": AppLanguage.text("低", "Low")
        default: confidence
        }
    }
}

enum ClaudeVisionError: LocalizedError {
    case missingAPIKey
    case imageEncodingFailed
    case network(Error)
    case unauthorized
    case rateLimited
    case badStatus(Int, String)
    case emptyResponse
    case parseFailed(String)

    var errorDescription: String? {
        switch self {
        case .missingAPIKey:
            AppLanguage.text("请先在设置里添加 Anthropic API key。", "Add an Anthropic API key in Settings first.")
        case .imageEncodingFailed:
            AppLanguage.text("图片压缩失败，请重新拍照。", "Image compression failed. Please retake the photo.")
        case .network(let error):
            AppLanguage.text("网络请求失败：\(error.localizedDescription)", "Network request failed: \(error.localizedDescription)")
        case .unauthorized:
            AppLanguage.text("API key 无效或已过期，请在设置里更新。", "The API key is invalid or expired. Update it in Settings.")
        case .rateLimited:
            AppLanguage.text("Anthropic 请求过于频繁，请稍后手动重试。", "Too many Anthropic requests. Please retry later.")
        case .badStatus(let code, let body):
            "Anthropic HTTP \(code): \(body)"
        case .emptyResponse:
            AppLanguage.text("Anthropic 没有返回可解析内容。", "Anthropic did not return parseable content.")
        case .parseFailed:
            AppLanguage.text("分析返回内容不是严格 JSON，可查看原文或重新分析。", "The analysis response was not strict JSON. View the raw text or retry.")
        }
    }
}

actor ClaudeVisionService {
    static let shared = ClaudeVisionService()

    private let endpoint = URL(string: "https://api.anthropic.com/v1/messages")!
    private let model = "claude-sonnet-4-6"

    func analyzeBreakfast(image: UIImage, apiKey: String) async throws -> MealAnalysis {
        let trimmedKey = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedKey.isEmpty else {
            throw ClaudeVisionError.missingAPIKey
        }

        guard let jpegData = Self.compressedJPEGData(from: image) else {
            throw ClaudeVisionError.imageEncodingFailed
        }

        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue(trimmedKey, forHTTPHeaderField: "x-api-key")
        request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        request.httpBody = try makeRequestBody(jpegData: jpegData)

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            throw ClaudeVisionError.network(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw ClaudeVisionError.emptyResponse
        }

        guard (200..<300).contains(httpResponse.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? ""
            switch httpResponse.statusCode {
            case 401:
                throw ClaudeVisionError.unauthorized
            case 429:
                throw ClaudeVisionError.rateLimited
            default:
                throw ClaudeVisionError.badStatus(httpResponse.statusCode, body)
            }
        }

        let responseText = try parseMessageText(from: data)
        let jsonText = extractJSONObject(from: responseText) ?? responseText

        do {
            var analysis = try JSONDecoder().decode(MealAnalysis.self, from: Data(jsonText.utf8))
            analysis = MealAnalysis(
                foods: analysis.foods,
                totalCalories: analysis.totalCalories,
                proteinG: analysis.proteinG,
                carbsG: analysis.carbsG,
                fatG: analysis.fatG,
                confidence: analysis.confidence,
                notes: analysis.notes,
                rawJSON: jsonText
            )
            return analysis
        } catch {
            throw ClaudeVisionError.parseFailed(responseText)
        }
    }

    nonisolated static func compressedJPEGData(from image: UIImage) -> Data? {
        let maxLongEdge: CGFloat = 1024
        let originalSize = image.size
        let longEdge = max(originalSize.width, originalSize.height)
        let scale = longEdge > maxLongEdge ? maxLongEdge / longEdge : 1
        let targetSize = CGSize(width: originalSize.width * scale, height: originalSize.height * scale)

        let renderer = UIGraphicsImageRenderer(size: targetSize)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: targetSize))
        }

        return resized.jpegData(compressionQuality: 0.7)
    }

    private func makeRequestBody(jpegData: Data) throws -> Data {
        let prompt = """
        You are analyzing one breakfast photo for a personal habit tracker.
        Return strict JSON only, with no Markdown and no extra text.
        Estimate conservatively when uncertain. Use this exact schema:
        {
          "foods": [{"name": "...", "estimated_grams": 120, "calories": 180}],
          "total_calories": 520,
          "protein_g": 22,
          "carbs_g": 65,
          "fat_g": 18,
          "confidence": "high|medium|low",
          "notes": "..."
        }
        """

        let body: [String: Any] = [
            "model": model,
            "max_tokens": 1000,
            "messages": [
                [
                    "role": "user",
                    "content": [
                        [
                            "type": "image",
                            "source": [
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": jpegData.base64EncodedString(),
                            ],
                        ],
                        [
                            "type": "text",
                            "text": prompt,
                        ],
                    ],
                ],
            ],
        ]

        return try JSONSerialization.data(withJSONObject: body)
    }

    private func parseMessageText(from data: Data) throws -> String {
        let message = try JSONDecoder().decode(AnthropicMessageResponse.self, from: data)
        let text = message.content.compactMap(\.text).joined(separator: "\n")
        guard !text.isEmpty else {
            throw ClaudeVisionError.emptyResponse
        }
        return text
    }

    private func extractJSONObject(from text: String) -> String? {
        guard let start = text.firstIndex(of: "{"), let end = text.lastIndex(of: "}"), start <= end else {
            return nil
        }
        return String(text[start...end])
    }
}

private struct AnthropicMessageResponse: Decodable {
    let content: [Content]

    struct Content: Decodable {
        let type: String
        let text: String?
    }
}
