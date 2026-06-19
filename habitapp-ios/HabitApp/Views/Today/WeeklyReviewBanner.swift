import SwiftUI

struct WeeklyReviewBanner: View {
    let review: WeeklyReview
    let onDismiss: () -> Void

    @State private var showingReview = false
    @AppStorage(AppLanguage.storageKey) private var appLanguage = AppLanguage.system.rawValue

    private var firstParagraph: String {
        review.bodyText
            .components(separatedBy: "\n\n")
            .first?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? review.bodyText
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Label(AppLanguage.text("本周复盘", "Weekly Review"), systemImage: "chart.line.uptrend.xyaxis")
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
                .accessibilityLabel(AppLanguage.text("本周不再显示", "Hide this week"))
            }

            Text(firstParagraph)
                .font(.subheadline)
                .fixedSize(horizontal: false, vertical: true)

            Button(AppLanguage.text("展开周报", "Open Review")) {
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
                .navigationTitle(AppLanguage.text("本周复盘", "Weekly Review"))
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button(AppLanguage.text("完成", "Done")) {
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
        review: WeeklyReview(bodyText: "You completed the first version of the system this week.\n\nNext week, adjust only one thing."),
        onDismiss: {}
    )
}
