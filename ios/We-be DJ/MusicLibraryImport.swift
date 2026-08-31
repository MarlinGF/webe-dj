import MediaPlayer
import SwiftUI

enum MusicLibraryImport {
    static func requestAuthorization() async -> MPMediaLibraryAuthorizationStatus {
        let status = MPMediaLibrary.authorizationStatus()

        guard status == .notDetermined else {
            return status
        }

        return await withCheckedContinuation { continuation in
            MPMediaLibrary.requestAuthorization { status in
                continuation.resume(returning: status)
            }
        }
    }

    static func playableLibraryItems() -> [MPMediaItem] {
        (MPMediaQuery.songs().items ?? []).filter(isPlayable)
    }

    static func item(forPersistentID persistentID: MPMediaEntityPersistentID) -> MPMediaItem? {
        let query = MPMediaQuery.songs()
        let predicate = MPMediaPropertyPredicate(
            value: NSNumber(value: persistentID),
            forProperty: MPMediaItemPropertyPersistentID
        )
        query.addFilterPredicate(predicate)
        return query.items?.first(where: isPlayable)
    }

    static func isPlayable(_ item: MPMediaItem) -> Bool {
        item.assetURL != nil && !item.isCloudItem && !item.hasProtectedAsset
    }
}

struct MusicLibraryPicker: UIViewControllerRepresentable {
    let onPicked: ([MPMediaItem]) -> Void
    let onCancel: () -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onPicked: onPicked, onCancel: onCancel)
    }

    func makeUIViewController(context: Context) -> MPMediaPickerController {
        let picker = MPMediaPickerController(mediaTypes: .music)
        picker.allowsPickingMultipleItems = true
        picker.showsCloudItems = false
        picker.showsItemsWithProtectedAssets = false
        picker.prompt = "Choose songs to add to We-be DJ."
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: MPMediaPickerController, context: Context) {}

    final class Coordinator: NSObject, MPMediaPickerControllerDelegate {
        private let onPicked: ([MPMediaItem]) -> Void
        private let onCancel: () -> Void

        init(onPicked: @escaping ([MPMediaItem]) -> Void, onCancel: @escaping () -> Void) {
            self.onPicked = onPicked
            self.onCancel = onCancel
        }

        func mediaPicker(_ mediaPicker: MPMediaPickerController, didPickMediaItems mediaItemCollection: MPMediaItemCollection) {
            onPicked(mediaItemCollection.items)
        }

        func mediaPickerDidCancel(_ mediaPicker: MPMediaPickerController) {
            onCancel()
        }
    }
}
