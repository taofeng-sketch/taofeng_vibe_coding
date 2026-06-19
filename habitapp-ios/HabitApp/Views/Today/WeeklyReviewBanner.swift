import SwiftUI

struct WeeklyReviewBanner: View {
    let review: WeeklyReview
    let onDismiss: () -> Void

    @State private var showingReview = false

    private var firstParagraph: String {
        review.bodyText
            .components(separatedBy: "\n\n")
            .first?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? review.bodyText
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Label("本周复盘", systemImage: "chart.line.uptrend.xyaxis")
                    .font(.headline)
                    .foregroundStyle(.blue)
                Spacer()
                Button {
                    onDismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("本周不再显示")
            }

            Text(firstParagraph)
                .font(.subheadline)
                .fixedSize(horizontal: false, vertical: true)

            Button("展开周报") {
                showingReview = true
            }
            .font(.subheadline.bold())
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.blue.opacity(0.12), in: RoundedRectangle(cornerRadius: 16))
        .sheet(isPresented: $showingReview) {
            NavigationStack {
                ScrollView {
                    Text(review.bodyText)
                        .font(.body)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding()
                }
                .navigationTitle("本周复盘")
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("完成") {
                            showingReview = false
                        }
                    }
                }
            }
        }
    }
}

#Preview {
    WeeklyReviewBanner(
        review: WeeklyReview(bodyText: "本周你完成了第一轮系统搭建。\n\n下周只调整一件事。"),
        onDismiss: {}
    )
}
