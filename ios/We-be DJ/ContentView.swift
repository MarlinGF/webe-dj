import MediaPlayer
import SwiftUI
import UniformTypeIdentifiers

struct ContentView: View {
    @EnvironmentObject private var library: DJLibraryStore
    @EnvironmentObject private var purchases: PurchaseManager
    @StateObject private var player = DJPlayer()

    @State private var isImportingFiles = false
    @State private var isShowingMusicPicker = false
    @State private var isCreatingPlaylist = false
    @State private var newPlaylistName = ""
    @State private var importStatus = "Import audio files or sync playable iTunes songs."
    @State private var searchText = ""
    @State private var selectedLibraryTab = LibraryTab.songs
    @State private var fadeSpeed = 2.0
    @State private var continuousPlay = false
    @State private var isAutoCrossfading = false
    @State private var isShowingStore = false
    @State private var isShowingPrivacy = false

    private let freeSongLimit = 4

    private var filteredTracks: [DJTrack] {
        guard !searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return library.tracks
        }

        return library.tracks.filter {
            $0.title.localizedCaseInsensitiveContains(searchText)
                || $0.artist.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        GeometryReader { proxy in
            ZStack {
                AppColors.background.ignoresSafeArea()

                VStack(spacing: 14) {
                    header

                    if proxy.size.width > 920 {
                        desktopWorkspace
                    } else {
                        compactWorkspace
                    }
                }
                .padding(18)
            }
        }
        .preferredColorScheme(.dark)
        .fileImporter(
            isPresented: $isImportingFiles,
            allowedContentTypes: [.audio, .mp3, .mpeg4Audio, .wav],
            allowsMultipleSelection: true
        ) { result in
            Task { await handleFileImport(result) }
        }
        .sheet(isPresented: $isShowingMusicPicker) {
            MusicLibraryPicker(
                onPicked: { items in
                    isShowingMusicPicker = false
                    handleMusicLibraryItems(items)
                },
                onCancel: {
                    isShowingMusicPicker = false
                    importStatus = "iTunes import cancelled."
                }
            )
        }
        .sheet(isPresented: $isShowingStore) { purchaseSheet }
        .sheet(isPresented: $isShowingPrivacy) { privacySheet }
        .alert("New Playlist", isPresented: $isCreatingPlaylist) {
            TextField("Playlist name", text: $newPlaylistName)
            Button("Create") {
                library.createPlaylist(named: newPlaylistName)
                newPlaylistName = ""
            }
            Button("Cancel", role: .cancel) {
                newPlaylistName = ""
            }
        }
        .onChange(of: player.crossfader) { _ in
            player.applyVolumes()
        }
        .onChange(of: player.deckCompletionSerial) { _ in
            handleDeckCompletion(player.completedDeck)
        }
        .onReceive(Timer.publish(every: 0.5, on: .main, in: .common).autoconnect()) { _ in
            handleContinuousPlayTick()
        }
    }

    private var header: some View {
        HStack(spacing: 14) {
            Label("We-be DJ", systemImage: "music.note")
                .font(.system(size: 30, weight: .bold, design: .rounded))
                .foregroundStyle(AppColors.accent)

            Spacer()

            StatPill(title: "Songs", value: "\(library.tracks.count)", icon: "music.note.list")
            StatPill(title: "Set", value: "\(library.activePlaylistTracks.count)", icon: "list.bullet")

            if !purchases.hasLifetimeAccess {
                Button { isShowingStore = true } label: {
                    Label("Unlock \(purchases.displayPrice)", systemImage: "lock.open")
                }
                .buttonStyle(DJButtonStyle(prominent: true))
            }

            Button { isShowingPrivacy = true } label: {
                Image(systemName: "person.crop.circle")
            }
            .buttonStyle(DJButtonStyle())

            Menu {
                Button("On This Device", systemImage: "square.and.arrow.down") {
                    isImportingFiles = true
                }
                Button("Choose iTunes Songs", systemImage: "music.note.list") {
                    Task { await openMusicLibraryPicker() }
                }
                Button("Import Playable iTunes Library", systemImage: "square.and.arrow.down.on.square") {
                    Task { await importPlayableMusicLibrary() }
                }
            } label: {
                Label("Import", systemImage: "plus")
                    .labelStyle(.iconOnly)
                    .font(.title2.weight(.bold))
                    .frame(width: 48, height: 48)
                    .background(AppColors.accent, in: Circle())
                    .foregroundStyle(.black)
            }
        }
    }

    private var purchaseSheet: some View {
        NavigationView {
            VStack(spacing: 22) {
                Image(systemName: "infinity.circle.fill").font(.system(size: 64)).foregroundStyle(AppColors.accent)
                Text("We-be DJ Lifetime").font(.largeTitle.bold())
                Text("The free edition holds up to four songs. Unlock unlimited local songs with one non-consumable purchase.").multilineTextAlignment(.center).foregroundStyle(.secondary)
                Button("Unlock for \(purchases.displayPrice)") { Task { await purchases.purchase() } }
                    .buttonStyle(.borderedProminent).disabled(purchases.isWorking || purchases.product == nil)
                Button("Restore Purchases") { Task { await purchases.restore() } }.disabled(purchases.isWorking)
                if let message = purchases.message { Text(message).font(.footnote).multilineTextAlignment(.center) }
                Text("Payment is processed by Apple. Audio remains on this device.").font(.caption).foregroundStyle(.secondary)
                Spacer()
            }
            .padding(28)
            .navigationTitle("Upgrade")
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Done") { isShowingStore = false } } }
        }
    }

    private var privacySheet: some View {
        NavigationView {
            Form {
                Section("Your data") {
                    Text("This native app does not require a We-be account. Imported audio and playlists are stored only on this device.")
                    Text("Deleting local DJ data does not delete or affect a We-be account used in another We-be app.")
                }
                Section("Purchases") {
                    Button("Restore Purchases") { Task { await purchases.restore() } }
                }
                Section("Delete native DJ data") {
                    Button("Delete all local audio and playlists", role: .destructive) {
                        player.stop(.a)
                        player.stop(.b)
                        library.deleteAllLocalData()
                        importStatus = "All local We-be DJ data was deleted."
                    }
                    Text("Your App Store purchase history is maintained by Apple and is not deleted by clearing local app data.")
                }
            }
            .navigationTitle("Privacy & Data")
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Done") { isShowingPrivacy = false } } }
        }
    }

    private var desktopWorkspace: some View {
        VStack(spacing: 14) {
            HStack(spacing: 14) {
                DeckPanel(
                    state: player.deckA,
                    loadHint: "Load A from library or playlist",
                    onPlay: { player.toggle(.a) },
                    onStop: { player.stop(.a) },
                    onSeek: { player.seek(deck: .a, to: $0) },
                    onNudge: { player.nudge(deck: .a, by: $0) },
                    onCue: { player.setCue(.a) },
                    onVolume: {
                        player.deckA.volume = $0
                        player.applyVolumes()
                    }
                )

                MixerPanel(
                    crossfader: $player.crossfader,
                    fadeSpeed: $fadeSpeed,
                    continuousPlay: $continuousPlay,
                    importStatus: importStatus,
                    toggleContinuousPlay: toggleContinuousPlay,
                    startCrossfade: startCrossfade
                )
                .frame(width: 250)

                DeckPanel(
                    state: player.deckB,
                    loadHint: "Load B from library or playlist",
                    onPlay: { player.toggle(.b) },
                    onStop: { player.stop(.b) },
                    onSeek: { player.seek(deck: .b, to: $0) },
                    onNudge: { player.nudge(deck: .b, by: $0) },
                    onCue: { player.setCue(.b) },
                    onVolume: {
                        player.deckB.volume = $0
                        player.applyVolumes()
                    }
                )
            }
            .frame(height: 280)

            HStack(spacing: 14) {
                libraryPanel
                playlistPanel
            }
        }
    }

    private var compactWorkspace: some View {
        ScrollView {
            VStack(spacing: 14) {
                DeckPanel(
                    state: player.deckA,
                    loadHint: "Load A from library or playlist",
                    onPlay: { player.toggle(.a) },
                    onStop: { player.stop(.a) },
                    onSeek: { player.seek(deck: .a, to: $0) },
                    onNudge: { player.nudge(deck: .a, by: $0) },
                    onCue: { player.setCue(.a) },
                    onVolume: {
                        player.deckA.volume = $0
                        player.applyVolumes()
                    }
                )

                MixerPanel(
                    crossfader: $player.crossfader,
                    fadeSpeed: $fadeSpeed,
                    continuousPlay: $continuousPlay,
                    importStatus: importStatus,
                    toggleContinuousPlay: toggleContinuousPlay,
                    startCrossfade: startCrossfade
                )

                DeckPanel(
                    state: player.deckB,
                    loadHint: "Load B from library or playlist",
                    onPlay: { player.toggle(.b) },
                    onStop: { player.stop(.b) },
                    onSeek: { player.seek(deck: .b, to: $0) },
                    onNudge: { player.nudge(deck: .b, by: $0) },
                    onCue: { player.setCue(.b) },
                    onVolume: {
                        player.deckB.volume = $0
                        player.applyVolumes()
                    }
                )

                libraryPanel
                    .frame(minHeight: 420)
                playlistPanel
                    .frame(minHeight: 360)
            }
        }
    }

    private var libraryPanel: some View {
        VStack(spacing: 12) {
            HStack(spacing: 10) {
                Label("Library", systemImage: "music.note")
                    .font(.title3.weight(.bold))

                Spacer()

                Picker("", selection: $selectedLibraryTab) {
                    ForEach(LibraryTab.allCases) { tab in
                        Text(tab.title).tag(tab)
                    }
                }
                .pickerStyle(.segmented)
                .frame(width: 230)

                Button {
                    isImportingFiles = true
                } label: {
                    Label("Add Songs", systemImage: "square.and.arrow.up")
                }
                .buttonStyle(DJButtonStyle(prominent: true))

                Menu {
                    Button("Choose Songs", systemImage: "music.note.list") {
                        Task { await openMusicLibraryPicker() }
                    }
                    Button("Import Playable Library", systemImage: "square.and.arrow.down.on.square") {
                        Task { await importPlayableMusicLibrary() }
                    }
                } label: {
                    Label("Sync iTunes", systemImage: "music.quarternote.3")
                }
                .buttonStyle(DJButtonStyle())
            }

            TextField("Search songs", text: $searchText)
                .textFieldStyle(.plain)
                .padding(.horizontal, 12)
                .frame(height: 38)
                .background(AppColors.field, in: RoundedRectangle(cornerRadius: 8))

            if selectedLibraryTab == .commercials {
                EmptyState(
                    title: "Commercials Coming Next",
                    message: "The native shell is ready for a commercial library, but this pass focuses on the music deck and playlist flow."
                )
            } else if filteredTracks.isEmpty {
                EmptyState(
                    title: "No Songs Yet",
                    message: "Import audio files or sync playable iTunes songs to start mixing."
                )
            } else {
                ScrollView {
                    LazyVStack(spacing: 1) {
                        ForEach(filteredTracks) { track in
                            TrackRow(
                                track: track,
                                loadA: { load(track, into: .a) },
                                loadB: { load(track, into: .b) },
                                preview: { preview(track) },
                                addToPlaylist: { library.add(track, to: library.activePlaylist) },
                                delete: { library.delete(track) }
                            )
                        }
                    }
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(AppColors.panel, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppColors.border))
    }

    private var playlistPanel: some View {
        VStack(spacing: 12) {
            HStack(spacing: 10) {
                Label("Playlist", systemImage: "music.note.list")
                    .font(.title3.weight(.bold))

                Spacer()

                Picker("Playlist", selection: Binding(
                    get: { library.activePlaylist?.id ?? "" },
                    set: { library.selectPlaylist(id: $0) }
                )) {
                    if library.playlists.isEmpty {
                        Text("No Playlist").tag("")
                    }
                    ForEach(library.playlists) { playlist in
                        Text(playlist.name).tag(playlist.id)
                    }
                }
                .pickerStyle(.menu)
                .frame(width: 180)

                Button("New Playlist") {
                    isCreatingPlaylist = true
                }
                .buttonStyle(DJButtonStyle(prominent: true))
            }

            if library.activePlaylist == nil {
                EmptyState(title: "No Playlist", message: "Create a playlist, then add songs from the library.")
            } else if library.activePlaylistTracks.isEmpty {
                EmptyState(title: library.activePlaylist?.name ?? "Playlist", message: "Tap + on a library song to add it to this set.")
            } else {
                ScrollView {
                    LazyVStack(spacing: 1) {
                        ForEach(library.activePlaylistTracks) { track in
                            PlaylistTrackRow(
                                track: track,
                                loadA: { load(track, into: .a) },
                                loadB: { load(track, into: .b) },
                                remove: { library.remove(track, from: library.activePlaylist) }
                            )
                        }
                    }
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(AppColors.panel, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppColors.border))
    }

    private func load(_ track: DJTrack, into deck: DeckID) {
        guard let url = library.url(for: track) else {
            importStatus = "That song is no longer playable from this device."
            return
        }

        let result = player.load(track, from: url, into: deck)

        switch result {
        case .success:
            importStatus = "Loaded \(track.title) on Deck \(deck.title)."
        case .failure(let error):
            importStatus = "Could not load \(track.title): \(error.localizedDescription)"
        }
    }

    private func preview(_ track: DJTrack) {
        guard let url = library.url(for: track) else {
            importStatus = "That song is no longer playable from this device."
            return
        }

        player.preview(track, from: url)
        importStatus = "Previewing \(track.title)."
    }

    private func startCrossfade() {
        let sourceDeck: DeckID = player.crossfader < 0 ? .a : .b
        let sourceTrack = track(on: sourceDeck)
        let otherDeckTrack = track(on: sourceDeck.other)

        player.startCrossfade(duration: fadeSpeed) {
            guard let sourceTrack,
                  let nextTrack = nextPlaylistTrack(after: sourceTrack, excluding: otherDeckTrack),
                  let url = library.url(for: nextTrack) else {
                return
            }

            player.stop(sourceDeck)
            player.load(nextTrack, from: url, into: sourceDeck)
            importStatus = "Loaded \(nextTrack.title) on Deck \(sourceDeck.title) for the next mix."
        }
    }

    private func toggleContinuousPlay() {
        continuousPlay.toggle()

        guard continuousPlay else {
            isAutoCrossfading = false
            importStatus = "Continuous Play off."
            return
        }

        if activePlayingDeck() != nil {
            importStatus = "Continuous Play on."
            return
        }

        if player.deckA.track != nil {
            player.crossfader = -1
            player.applyVolumes()
            player.play(.a)
            importStatus = "Continuous Play on: Deck A."
            return
        }

        if player.deckB.track != nil {
            player.crossfader = 1
            player.applyVolumes()
            player.play(.b)
            importStatus = "Continuous Play on: Deck B."
            return
        }

        guard let firstTrack = library.activePlaylistTracks.first ?? library.tracks.first,
              let url = library.url(for: firstTrack) else {
            importStatus = "Add songs to the playlist before starting Continuous Play."
            return
        }

        switch player.load(firstTrack, from: url, into: .a) {
        case .success:
            player.crossfader = -1
            player.applyVolumes()
            player.play(.a)
            importStatus = "Continuous Play on: \(firstTrack.title)."
        case .failure(let error):
            continuousPlay = false
            importStatus = "Could not turn on Continuous Play: \(error.localizedDescription)"
        }
    }

    private func handleContinuousPlayTick() {
        guard continuousPlay,
              !isAutoCrossfading,
              let sourceDeck = activePlayingDeck(),
              let sourceTrack = track(on: sourceDeck),
              timeRemaining(on: sourceDeck) <= max(1.5, fadeSpeed + 0.5),
              let nextTrack = nextPlaylistTrack(after: sourceTrack, excluding: track(on: sourceDeck.other)),
              let url = library.url(for: nextTrack) else {
            return
        }

        let targetDeck = sourceDeck.other
        isAutoCrossfading = true

        switch player.load(nextTrack, from: url, into: targetDeck) {
        case .success:
            player.startCrossfade(duration: fadeSpeed, to: targetDeck) {
                player.stop(sourceDeck)
                isAutoCrossfading = false
                importStatus = "Continuous Play moved to Deck \(targetDeck.title)."
            }
            importStatus = "Continuous Play crossfading to \(nextTrack.title)."
        case .failure(let error):
            isAutoCrossfading = false
            importStatus = "Continuous Play could not load next song: \(error.localizedDescription)"
        }
    }

    private func handleDeckCompletion(_ deck: DeckID?) {
        guard continuousPlay,
              let deck,
              let completedTrack = track(on: deck),
              let nextTrack = nextPlaylistTrack(after: completedTrack, excluding: track(on: deck.other)),
              let url = library.url(for: nextTrack) else {
            return
        }

        let targetDeck = deck.other
        switch player.load(nextTrack, from: url, into: targetDeck) {
        case .success:
            player.crossfader = targetDeck == .a ? -1 : 1
            player.applyVolumes()
            player.play(targetDeck)
            importStatus = "Continuous Play loaded \(nextTrack.title) on Deck \(targetDeck.title)."
        case .failure(let error):
            importStatus = "Continuous Play could not load next song: \(error.localizedDescription)"
        }
    }

    private func activePlayingDeck() -> DeckID? {
        if player.deckA.isPlaying && !player.deckB.isPlaying {
            return .a
        }
        if player.deckB.isPlaying && !player.deckA.isPlaying {
            return .b
        }
        if player.deckA.isPlaying && player.deckB.isPlaying {
            return player.crossfader <= 0 ? .a : .b
        }
        return nil
    }

    private func timeRemaining(on deck: DeckID) -> TimeInterval {
        switch deck {
        case .a:
            return max(0, player.deckA.duration - player.deckA.currentTime)
        case .b:
            return max(0, player.deckB.duration - player.deckB.currentTime)
        }
    }

    private func track(on deck: DeckID) -> DJTrack? {
        switch deck {
        case .a:
            return player.deckA.track
        case .b:
            return player.deckB.track
        }
    }

    private func nextPlaylistTrack(after track: DJTrack, excluding excludedTrack: DJTrack?) -> DJTrack? {
        let playlistTracks = library.activePlaylistTracks
        guard playlistTracks.count > 1,
              let currentIndex = playlistTracks.firstIndex(where: { $0.id == track.id }) else {
            return nil
        }

        for offset in 1..<playlistTracks.count {
            let nextIndex = (currentIndex + offset) % playlistTracks.count
            let candidate = playlistTracks[nextIndex]
            if candidate.id != excludedTrack?.id {
                return candidate
            }
        }

        return nil
    }

    private func handleFileImport(_ result: Result<[URL], Error>) async {
        switch result {
        case .success(let urls):
            let remaining = purchases.hasLifetimeAccess ? urls.count : max(0, freeSongLimit - library.tracks.count)
            guard remaining > 0 else {
                importStatus = "The free edition holds four songs. Unlock Lifetime to add more."
                isShowingStore = true
                return
            }
            let count = await library.importFiles(from: urls, maximumCount: remaining)
            importStatus = count == 0 ? "No compatible audio files were imported." : "Imported \(count) audio \(count == 1 ? "file" : "files")."
        case .failure(let error):
            importStatus = "File import failed: \(error.localizedDescription)"
        }
    }

    private func openMusicLibraryPicker() async {
        guard await ensureMusicLibraryAccess() else { return }
        isShowingMusicPicker = true
    }

    private func importPlayableMusicLibrary() async {
        guard await ensureMusicLibraryAccess() else { return }
        importStatus = "Scanning playable iTunes songs..."
        handleMusicLibraryItems(MusicLibraryImport.playableLibraryItems())
    }

    private func ensureMusicLibraryAccess() async -> Bool {
        let status = await MusicLibraryImport.requestAuthorization()

        switch status {
        case .authorized:
            return true
        case .restricted:
            importStatus = "Music library access is restricted on this device."
            return false
        case .denied:
            importStatus = "Music library access was denied. Enable it in Settings to import iTunes songs."
            return false
        case .notDetermined:
            importStatus = "Music library access is needed before importing songs."
            return false
        @unknown default:
            importStatus = "Music library access is not available on this device."
            return false
        }
    }

    private func handleMusicLibraryItems(_ items: [MPMediaItem]) {
        guard !items.isEmpty else {
            importStatus = "No iTunes songs were selected."
            return
        }

        let remaining = purchases.hasLifetimeAccess ? items.count : max(0, freeSongLimit - library.tracks.count)
        guard remaining > 0 else {
            importStatus = "The free edition holds four songs. Unlock Lifetime to add more."
            isShowingStore = true
            return
        }
        let result = library.importMusicLibraryItems(items, maximumCount: remaining)
        importStatus = musicLibraryImportMessage(for: result)
    }

    private func musicLibraryImportMessage(for result: MusicLibraryImportResult) -> String {
        if result.importedCount > 0 {
            var message = "Added \(result.importedCount) iTunes \(result.importedCount == 1 ? "song" : "songs")."

            if result.duplicateCount > 0 {
                message += " \(result.duplicateCount) already in library."
            }

            if result.skippedCount > 0 {
                message += " Skipped \(result.skippedCount) cloud or protected \(result.skippedCount == 1 ? "item" : "items")."
            }

            return message
        }

        if result.duplicateCount > 0 && result.skippedCount == 0 {
            return "Those iTunes songs are already in your library."
        }

        if result.skippedCount > 0 {
            return "No playable iTunes songs were added. Skipped \(result.skippedCount) cloud or protected \(result.skippedCount == 1 ? "item" : "items")."
        }

        return "No playable iTunes songs were found."
    }
}

private enum LibraryTab: String, CaseIterable, Identifiable {
    case songs
    case commercials

    var id: String { rawValue }

    var title: String {
        switch self {
        case .songs:
            return "Songs"
        case .commercials:
            return "Commercials"
        }
    }
}

private struct DeckPanel: View {
    let state: DeckState
    let loadHint: String
    let onPlay: () -> Void
    let onStop: () -> Void
    let onSeek: (Double) -> Void
    let onNudge: (TimeInterval) -> Void
    let onCue: () -> Void
    let onVolume: (Double) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .center) {
                Text("Deck \(state.name)")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(AppColors.accent)
                Spacer()
                LiveBadge(isLive: state.isPlaying && state.effectiveVolume > 0.01)
            }

            VStack(alignment: .leading, spacing: 5) {
                Text(state.track?.title ?? "No Track Loaded")
                    .font(.system(size: 25, weight: .bold, design: .rounded))
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
                Text(state.track?.artist ?? loadHint)
                    .font(.callout)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            HStack(spacing: 10) {
                Text(state.currentTime.djTime)
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.secondary)
                Slider(value: Binding(get: { state.progress }, set: onSeek), in: 0...1)
                    .tint(AppColors.accent)
                    .disabled(state.track == nil)
                Text((state.track?.duration ?? state.duration).djTime)
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 12) {
                IconButton(systemName: "gobackward.5", disabled: state.track == nil) { onNudge(-5) }
                IconButton(systemName: state.isPlaying ? "pause.fill" : "play.fill", prominent: true, disabled: state.track == nil, action: onPlay)
                IconButton(systemName: "stop.fill", disabled: state.track == nil, action: onStop)
                IconButton(systemName: "goforward.5", disabled: state.track == nil) { onNudge(5) }
                IconButton(systemName: "mappin", disabled: state.track == nil, action: onCue)

                Spacer()

                Image(systemName: "speaker.wave.2")
                    .foregroundStyle(.secondary)
                Slider(value: Binding(get: { state.volume }, set: onVolume), in: 0...1)
                    .tint(AppColors.accent)
                    .frame(maxWidth: 150)
                LevelMeter(level: state.isPlaying ? state.effectiveVolume : 0)
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(AppColors.panel, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppColors.border))
    }
}

private struct MixerPanel: View {
    @Binding var crossfader: Double
    @Binding var fadeSpeed: Double
    @Binding var continuousPlay: Bool
    let importStatus: String
    let toggleContinuousPlay: () -> Void
    let startCrossfade: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Text("Mixer")
                .font(.title2.weight(.bold))

            HStack {
                Text("A")
                    .font(.headline)
                    .foregroundStyle(AppColors.accent)
                Slider(value: $crossfader, in: -1...1)
                    .tint(AppColors.accent)
                Text("B")
                    .font(.headline)
                    .foregroundStyle(AppColors.accent)
            }

            HStack {
                Text("Fade Speed")
                    .foregroundStyle(.secondary)
                Slider(value: $fadeSpeed, in: 1...10, step: 1)
                    .tint(AppColors.accent)
                Text("\(Int(fadeSpeed))s")
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.secondary)
            }

            Button(action: toggleContinuousPlay) {
                Label("Continuous Play", systemImage: continuousPlay ? "infinity.circle.fill" : "infinity.circle")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(DJButtonStyle(prominent: continuousPlay))

            Button(action: startCrossfade) {
                Label("Crossfade", systemImage: "arrow.left.arrow.right")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(DJButtonStyle())

            Text(importStatus)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .lineLimit(3)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(18)
        .frame(maxHeight: .infinity)
        .background(AppColors.panel, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppColors.border))
    }
}

private struct TrackRow: View {
    let track: DJTrack
    let loadA: () -> Void
    let loadB: () -> Void
    let preview: () -> Void
    let addToPlaylist: () -> Void
    let delete: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: track.source == .musicLibrary ? "music.quarternote.3" : "waveform")
                .foregroundStyle(AppColors.accent)
                .frame(width: 28)

            VStack(alignment: .leading, spacing: 3) {
                Text(track.title)
                    .font(.body.weight(.semibold))
                    .lineLimit(1)
                Text("\(track.artist) - \(track.displayDuration)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            IconButton(systemName: "headphones", action: preview)
            IconButton(systemName: "plus.circle", action: addToPlaylist)
            IconButton(systemName: "trash", destructive: true, action: delete)
            DeckLoadButton(title: "A", action: loadA)
            DeckLoadButton(title: "B", action: loadB)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 9)
        .background(AppColors.row)
    }
}

private struct PlaylistTrackRow: View {
    let track: DJTrack
    let loadA: () -> Void
    let loadB: () -> Void
    let remove: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "line.3.horizontal")
                .foregroundStyle(.secondary)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 3) {
                Text(track.title)
                    .font(.body.weight(.semibold))
                    .lineLimit(1)
                Text("\(track.source.rawValue.capitalized) - \(track.displayDuration)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            IconButton(systemName: "xmark", action: remove)
            DeckLoadButton(title: "A", action: loadA)
            DeckLoadButton(title: "B", action: loadB)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 9)
        .background(AppColors.row)
    }
}

private struct EmptyState: View {
    let title: String
    let message: String

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: "music.note")
                .font(.system(size: 42))
                .foregroundStyle(AppColors.accent.opacity(0.75))
            Text(title)
                .font(.headline)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 360)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

private struct StatPill: View {
    let title: String
    let value: String
    let icon: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
            Text(title)
                .foregroundStyle(.secondary)
            Text(value)
                .fontWeight(.bold)
        }
        .font(.callout)
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(AppColors.panel, in: Capsule())
        .overlay(Capsule().stroke(AppColors.border))
    }
}

private struct IconButton: View {
    let systemName: String
    var prominent = false
    var destructive = false
    var disabled = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 15, weight: .bold))
                .frame(width: 34, height: 34)
                .background(background, in: Circle())
                .foregroundStyle(foreground)
        }
        .buttonStyle(.plain)
        .disabled(disabled)
        .opacity(disabled ? 0.35 : 1)
    }

    private var background: Color {
        if prominent { return AppColors.accent }
        if destructive { return Color.red.opacity(0.14) }
        return AppColors.control
    }

    private var foreground: Color {
        if prominent { return .black }
        if destructive { return .red }
        return .primary
    }
}

private struct DeckLoadButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(title, action: action)
            .font(.headline)
            .frame(width: 34, height: 34)
            .background(AppColors.control, in: Circle())
            .buttonStyle(.plain)
    }
}

private struct DJButtonStyle: ButtonStyle {
    var prominent = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .padding(.horizontal, 14)
            .frame(height: 42)
            .background(prominent ? AppColors.accent : AppColors.control, in: RoundedRectangle(cornerRadius: 8))
            .foregroundStyle(prominent ? .black : .primary)
            .opacity(configuration.isPressed ? 0.75 : 1)
    }
}

private struct LiveBadge: View {
    let isLive: Bool

    var body: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(isLive ? Color.green : Color.secondary.opacity(0.45))
                .frame(width: 8, height: 8)
            Text(isLive ? "LIVE" : "CUED")
                .font(.caption2.weight(.bold))
        }
        .padding(.horizontal, 9)
        .padding(.vertical, 5)
        .background(AppColors.control, in: Capsule())
    }
}

private struct LevelMeter: View {
    let level: Double

    var body: some View {
        HStack(spacing: 2) {
            ForEach(0..<8, id: \.self) { index in
                RoundedRectangle(cornerRadius: 2)
                    .fill(Double(index) / 8.0 < level ? AppColors.accent : AppColors.control)
                    .frame(width: 5, height: CGFloat(8 + index * 4))
            }
        }
        .frame(width: 58, height: 42, alignment: .bottom)
    }
}

private enum AppColors {
    static let background = Color(red: 0.055, green: 0.035, blue: 0.07)
    static let panel = Color(red: 0.105, green: 0.075, blue: 0.125)
    static let row = Color(red: 0.13, green: 0.095, blue: 0.15)
    static let field = Color(red: 0.08, green: 0.06, blue: 0.1)
    static let control = Color.white.opacity(0.1)
    static let border = Color.white.opacity(0.14)
    static let accent = Color(red: 0.83, green: 0.24, blue: 1)
}

private extension DeckID {
    var other: DeckID {
        switch self {
        case .a:
            return .b
        case .b:
            return .a
        }
    }

    var title: String {
        switch self {
        case .a:
            return "A"
        case .b:
            return "B"
        }
    }
}

private extension TimeInterval {
    var djTime: String {
        guard isFinite, self > 0 else { return "0:00" }
        let totalSeconds = Int(rounded())
        return "\(totalSeconds / 60):\(String(format: "%02d", totalSeconds % 60))"
    }
}
