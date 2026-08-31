import SwiftUI

@main
struct WeBeDJApp: App {
    @StateObject private var library = DJLibraryStore()
    @StateObject private var purchases = PurchaseManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(library)
                .environmentObject(purchases)
        }
    }
}
