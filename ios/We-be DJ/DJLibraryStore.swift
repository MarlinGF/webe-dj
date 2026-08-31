import AVFoundation
import Foundation
import MediaPlayer

struct MusicLibraryImportResult {
    let importedCount: Int
    let duplicateCount: Int
    let skippedCount: Int
}

struct DJPlaylist: Identifiable, Codable, Equatable {
    let id: String
    var name: String
    var trackIDs: [String]
}

private struct DJLibrarySnapshot: Codable {
    var tracks: [DJTrack]
    var playlists: [DJPlaylist]
    var activePlaylistID: String?
}

@MainActor
final class DJLibraryStore: ObservableObject {
    @Published private(set) var tracks: [DJTrack] = []
    @Published private(set) var playlists: [DJPlaylist] = []
    @Published var activePlaylistID: String?

    private let storageDirectory: URL
    private let manifestURL: URL

    var activePlaylist: DJPlaylist? {
        guard let activePlaylistID else { return playlists.first }
        return playlists.first { $0.id == activePlaylistID } ?? playlists.first
    }

    var activePlaylistTracks: [DJTrack] {
        guard let activePlaylist else { return [] }
        return activePlaylist.trackIDs.compactMap(track)
    }

    init() {
        let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        storageDirectory = documents.appendingPathComponent("Imported Audio", isDirectory: true)
        manifestURL = documents.appendingPathComponent("webe-dj-library.json")

        try? FileManager.default.createDirectory(at: storageDirectory, withIntermediateDirectories: true)
        load()
    }

    func importFiles(from urls: [URL], maximumCount: Int? = nil) async -> Int {
        var imported = 0

        for url in urls.prefix(maximumCount ?? urls.count) {
            if await importFile(from: url) {
                imported += 1
            }
        }

        if imported > 0 {
            save()
        }

        return imported
    }

    func importMusicLibraryItems(_ items: [MPMediaItem], maximumCount: Int? = nil) -> MusicLibraryImportResult {
        var knownIDs = Set(tracks.map(\.id))
        var importedTracks: [DJTrack] = []
        var duplicateCount = 0
        var skippedCount = 0

        for item in items {
            if let maximumCount, importedTracks.count >= maximumCount {
                skippedCount += 1
                continue
            }
            guard let track = DJTrack.musicLibraryTrack(from: item) else {
                skippedCount += 1
                continue
            }

            guard !knownIDs.contains(track.id) else {
                duplicateCount += 1
                continue
            }

            knownIDs.insert(track.id)
            importedTracks.append(track)
        }

        if !importedTracks.isEmpty {
            tracks.insert(contentsOf: importedTracks, at: 0)
            save()
        }

        return MusicLibraryImportResult(
            importedCount: importedTracks.count,
            duplicateCount: duplicateCount,
            skippedCount: skippedCount
        )
    }

    func url(for track: DJTrack) -> URL? {
        switch track.source {
        case .file:
            guard let fileName = track.fileName else { return nil }
            let fileURL = storageDirectory.appendingPathComponent(fileName)
            guard FileManager.default.fileExists(atPath: fileURL.path) else { return nil }
            return fileURL
        case .musicLibrary:
            guard let persistentID = track.musicLibraryPersistentID else { return nil }
            return MusicLibraryImport.item(forPersistentID: persistentID)?.assetURL
        }
    }

    func delete(_ track: DJTrack) {
        if track.source == .file, let fileName = track.fileName {
            try? FileManager.default.removeItem(at: storageDirectory.appendingPathComponent(fileName))
        }

        tracks.removeAll { $0.id == track.id }
        playlists = playlists.map { playlist in
            var updated = playlist
            updated.trackIDs.removeAll { $0 == track.id }
            return updated
        }
        save()
    }

    func deleteAllLocalData() {
        for track in tracks where track.source == .file {
            if let fileName = track.fileName {
                try? FileManager.default.removeItem(at: storageDirectory.appendingPathComponent(fileName))
            }
        }
        try? FileManager.default.removeItem(at: manifestURL)
        tracks = []
        playlists = []
        activePlaylistID = nil
    }

    func createPlaylist(named name: String) {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }

        let playlist = DJPlaylist(id: UUID().uuidString, name: trimmedName, trackIDs: [])
        playlists.insert(playlist, at: 0)
        activePlaylistID = playlist.id
        save()
    }

    func selectPlaylist(id: String) {
        activePlaylistID = id.isEmpty ? nil : id
        save()
    }

    func add(_ track: DJTrack, to playlist: DJPlaylist?) {
        let targetPlaylist: DJPlaylist

        if let playlist {
            targetPlaylist = playlist
        } else if let firstPlaylist = playlists.first {
            targetPlaylist = firstPlaylist
        } else {
            createPlaylist(named: "Main Set")
            guard let createdPlaylist = playlists.first else { return }
            targetPlaylist = createdPlaylist
        }

        guard let index = playlists.firstIndex(where: { $0.id == targetPlaylist.id }),
              !playlists[index].trackIDs.contains(track.id) else {
            return
        }

        playlists[index].trackIDs.append(track.id)
        activePlaylistID = targetPlaylist.id
        save()
    }

    func remove(_ track: DJTrack, from playlist: DJPlaylist?) {
        guard let playlist,
              let index = playlists.firstIndex(where: { $0.id == playlist.id }) else {
            return
        }

        playlists[index].trackIDs.removeAll { $0 == track.id }
        save()
    }

    func movePlaylistTrack(fromOffsets source: IndexSet, toOffset destination: Int) {
        guard let activePlaylist,
              let index = playlists.firstIndex(where: { $0.id == activePlaylist.id }) else {
            return
        }

        playlists[index].trackIDs.move(fromOffsets: source, toOffset: destination)
        save()
    }

    private func track(for id: String) -> DJTrack? {
        tracks.first { $0.id == id }
    }

    private func importFile(from sourceURL: URL) async -> Bool {
        let hasAccess = sourceURL.startAccessingSecurityScopedResource()
        defer {
            if hasAccess {
                sourceURL.stopAccessingSecurityScopedResource()
            }
        }

        let originalName = sourceURL.lastPathComponent
        let destinationName = uniqueFileName(for: originalName)
        let destinationURL = storageDirectory.appendingPathComponent(destinationName)

        do {
            try FileManager.default.copyItem(at: sourceURL, to: destinationURL)
            let asset = AVURLAsset(url: destinationURL)
            let duration = try await asset.load(.duration).seconds
            let title = sourceURL.deletingPathExtension().lastPathComponent
            tracks.insert(.fileTrack(title: title, duration: duration, fileName: destinationName), at: 0)
            return true
        } catch {
            try? FileManager.default.removeItem(at: destinationURL)
            return false
        }
    }

    private func uniqueFileName(for fileName: String) -> String {
        let base = URL(fileURLWithPath: fileName).deletingPathExtension().lastPathComponent
        let ext = URL(fileURLWithPath: fileName).pathExtension
        let candidate = "\(UUID().uuidString)-\(base).\(ext)"
        return candidate.replacingOccurrences(of: "/", with: "-")
    }

    private func load() {
        guard let data = try? Data(contentsOf: manifestURL) else {
            return
        }

        if let snapshot = try? JSONDecoder().decode(DJLibrarySnapshot.self, from: data) {
            tracks = snapshot.tracks
            playlists = snapshot.playlists
            activePlaylistID = snapshot.activePlaylistID
            return
        }

        if let storedTracks = try? JSONDecoder().decode([DJTrack].self, from: data) {
            tracks = storedTracks
        }
    }

    private func save() {
        let snapshot = DJLibrarySnapshot(tracks: tracks, playlists: playlists, activePlaylistID: activePlaylistID)
        guard let data = try? JSONEncoder().encode(snapshot) else { return }
        try? data.write(to: manifestURL, options: [.atomic])
    }
}
