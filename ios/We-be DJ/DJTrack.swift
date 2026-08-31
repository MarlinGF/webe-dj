import Foundation
import MediaPlayer

enum DJTrackSource: String, Codable {
    case file
    case musicLibrary
}

struct DJTrack: Identifiable, Codable, Equatable {
    let id: String
    var title: String
    var artist: String
    var duration: TimeInterval
    var source: DJTrackSource
    var fileName: String?
    var musicLibraryPersistentID: UInt64?

    var displayDuration: String {
        guard duration.isFinite, duration > 0 else { return "--:--" }
        let totalSeconds = Int(duration.rounded())
        return "\(totalSeconds / 60):\(String(format: "%02d", totalSeconds % 60))"
    }

    static func fileTrack(title: String, artist: String = "On This Device", duration: TimeInterval, fileName: String) -> DJTrack {
        DJTrack(
            id: "file-\(fileName)",
            title: title,
            artist: artist,
            duration: duration,
            source: .file,
            fileName: fileName,
            musicLibraryPersistentID: nil
        )
    }

    static func musicLibraryTrack(from item: MPMediaItem) -> DJTrack? {
        guard MusicLibraryImport.isPlayable(item) else { return nil }

        return DJTrack(
            id: "music-\(item.persistentID)",
            title: item.title?.isEmpty == false ? item.title! : "Untitled Song",
            artist: item.artist?.isEmpty == false ? item.artist! : "Unknown Artist",
            duration: item.playbackDuration,
            source: .musicLibrary,
            fileName: nil,
            musicLibraryPersistentID: item.persistentID
        )
    }
}
