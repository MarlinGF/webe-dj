import AVFoundation
import Foundation

@MainActor
final class DJPlayer: NSObject, ObservableObject, AVAudioPlayerDelegate {
    @Published var deckA = DeckState(name: "A")
    @Published var deckB = DeckState(name: "B")
    @Published var crossfader: Double = 0
    @Published private(set) var deckCompletionSerial = 0
    private(set) var completedDeck: DeckID?

    private var playerA = DeckPlayback()
    private var playerB = DeckPlayback()
    private var previewPlayer: AVAudioPlayer?
    private var previewAVPlayer: AVPlayer?
    private var timer: Timer?
    private var crossfadeTimer: Timer?
    private var completionObservers: [DeckID: NSObjectProtocol] = [:]

    override init() {
        super.init()
        configureAudioSession()
        startTimer()
    }

    @discardableResult
    func load(_ track: DJTrack, from url: URL, into deck: DeckID) -> Result<Void, DJPlayerError> {
        stop(deck)
        clearPlayback(for: deck)

        do {
            guard !url.isFileURL || FileManager.default.fileExists(atPath: url.path) else {
                throw DJPlayerError.fileMissing
            }

            let playback = try makePlayback(for: url, deck: deck)

            switch deck {
            case .a:
                deckA.track = track
                deckA.duration = playback.duration > 0 ? playback.duration : track.duration
                deckA.currentTime = 0
                deckA.cueTime = 0
                deckA.isPlaying = false
                playerA = playback
            case .b:
                deckB.track = track
                deckB.duration = playback.duration > 0 ? playback.duration : track.duration
                deckB.currentTime = 0
                deckB.cueTime = 0
                deckB.isPlaying = false
                playerB = playback
            }

            applyVolumes()
            return .success(())
        } catch {
            let playerError = error as? DJPlayerError ?? .loadFailed(error.localizedDescription)
            print("Failed to load audio:", playerError.localizedDescription)
            setPlaying(false, for: deck)
            return .failure(playerError)
        }
    }

    func toggle(_ deck: DeckID) {
        guard hasPlayback(for: deck) else { return }

        if deckState(for: deck).isPlaying {
            pause(deck)
            setPlaying(false, for: deck)
        } else {
            if currentTime(for: deck) >= max(0, duration(for: deck) - 0.15) {
                setPlaybackTime(cueTime(for: deck), for: deck)
                setCurrentTime(cueTime(for: deck), for: deck)
            }
            configureAudioSession()
            applyVolumes()
            playPlayback(deck)
            setPlaying(true, for: deck)
        }
    }

    func play(_ deck: DeckID) {
        guard hasPlayback(for: deck) else { return }
        if currentTime(for: deck) >= max(0, duration(for: deck) - 0.15) {
            setPlaybackTime(cueTime(for: deck), for: deck)
            setCurrentTime(cueTime(for: deck), for: deck)
        }
        configureAudioSession()
        applyVolumes()
        playPlayback(deck)
        setPlaying(true, for: deck)
    }

    func stop(_ deck: DeckID) {
        guard hasPlayback(for: deck) else {
            setPlaying(false, for: deck)
            return
        }

        pause(deck)
        setPlaybackTime(cueTime(for: deck), for: deck)
        setPlaying(false, for: deck)
        setCurrentTime(cueTime(for: deck), for: deck)
    }

    func seek(deck: DeckID, to progress: Double) {
        guard hasPlayback(for: deck) else { return }
        let duration = duration(for: deck)
        let newTime = max(0, min(duration, duration * progress))
        setPlaybackTime(newTime, for: deck)
        setCurrentTime(newTime, for: deck)
    }

    func nudge(deck: DeckID, by seconds: TimeInterval) {
        guard hasPlayback(for: deck) else { return }
        let duration = duration(for: deck)
        let newTime = max(0, min(duration, playbackTime(for: deck) + seconds))
        setPlaybackTime(newTime, for: deck)
        setCurrentTime(newTime, for: deck)
    }

    func setCue(_ deck: DeckID) {
        guard hasPlayback(for: deck) else { return }

        switch deck {
        case .a:
            deckA.cueTime = playbackTime(for: deck)
        case .b:
            deckB.cueTime = playbackTime(for: deck)
        }
    }

    func preview(_ track: DJTrack, from url: URL) {
        previewPlayer?.pause()
        previewAVPlayer?.pause()
        configureAudioSession()
        do {
            if url.isFileURL {
                previewPlayer = try AVAudioPlayer(contentsOf: url)
                previewPlayer?.volume = 0.7
                previewPlayer?.prepareToPlay()
                previewPlayer?.play()
            } else {
                previewAVPlayer = AVPlayer(url: url)
                previewAVPlayer?.volume = 0.7
                previewAVPlayer?.play()
            }
        } catch {
            print("Failed to preview audio:", error.localizedDescription)
        }
    }

    func startCrossfade(duration: TimeInterval, to targetDeck: DeckID? = nil, completion: @escaping () -> Void) {
        crossfadeTimer?.invalidate()

        let target: Double
        if let targetDeck {
            target = targetDeck == .b ? 1.0 : -1.0
        } else {
            target = crossfader <= 0 ? 1.0 : -1.0
        }
        play(target > 0 ? .b : .a)

        let start = crossfader
        let totalSteps = max(1, Int(duration / 0.05))
        var step = 0

        crossfadeTimer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] timer in
            Task { @MainActor in
                guard let self else {
                    timer.invalidate()
                    return
                }

                step += 1
                let progress = min(1, Double(step) / Double(totalSteps))
                self.crossfader = start + ((target - start) * progress)
                self.applyVolumes()

                if progress >= 1 {
                    timer.invalidate()
                    completion()
                }
            }
        }
    }

    func applyVolumes() {
        let aBlend = cos(((crossfader + 1) / 2) * .pi / 2)
        let bBlend = cos((1 - ((crossfader + 1) / 2)) * .pi / 2)
        playerA.volume = Float(deckA.volume * aBlend)
        playerB.volume = Float(deckB.volume * bBlend)
        deckA.effectiveVolume = deckA.volume * aBlend
        deckB.effectiveVolume = deckB.volume * bBlend
    }

    private func configureAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("Failed to configure audio session:", error.localizedDescription)
        }
    }

    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 0.2, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.syncProgress()
            }
        }
    }

    private func syncProgress() {
        if playerA.hasPlayer {
            deckA.currentTime = playerA.currentTime
        }

        if playerB.hasPlayer {
            deckB.currentTime = playerB.currentTime
        }
    }

    private func hasPlayback(for deck: DeckID) -> Bool {
        playback(for: deck).hasPlayer
    }

    private func playback(for deck: DeckID) -> DeckPlayback {
        deck == .a ? playerA : playerB
    }

    private func makePlayback(for url: URL, deck: DeckID) throws -> DeckPlayback {
        if url.isFileURL {
            do {
                let player = try AVAudioPlayer(contentsOf: url)
                player.delegate = self
                player.prepareToPlay()
                player.currentTime = 0
                player.enableRate = true
                return DeckPlayback(audioPlayer: player)
            } catch {
                print("AVAudioPlayer could not open \(url.lastPathComponent), falling back to AVPlayer:", error.localizedDescription)
            }
        }

        let player = AVPlayer(url: url)
        let observer = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: player.currentItem,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.handleDeckFinished(deck)
            }
        }
        completionObservers[deck] = observer
        return DeckPlayback(avPlayer: player)
    }

    private func clearPlayback(for deck: DeckID) {
        if let observer = completionObservers.removeValue(forKey: deck) {
            NotificationCenter.default.removeObserver(observer)
        }

        switch deck {
        case .a:
            playerA = DeckPlayback()
        case .b:
            playerB = DeckPlayback()
        }
    }

    private func pause(_ deck: DeckID) {
        switch deck {
        case .a:
            playerA.pause()
        case .b:
            playerB.pause()
        }
    }

    private func playPlayback(_ deck: DeckID) {
        switch deck {
        case .a:
            playerA.play()
        case .b:
            playerB.play()
        }
    }

    private func playbackTime(for deck: DeckID) -> TimeInterval {
        playback(for: deck).currentTime
    }

    private func setPlaybackTime(_ time: TimeInterval, for deck: DeckID) {
        switch deck {
        case .a:
            playerA.currentTime = time
        case .b:
            playerB.currentTime = time
        }
    }

    private func duration(for deck: DeckID) -> TimeInterval {
        switch deck {
        case .a:
            return deckA.duration
        case .b:
            return deckB.duration
        }
    }

    private func currentTime(for deck: DeckID) -> TimeInterval {
        switch deck {
        case .a:
            return deckA.currentTime
        case .b:
            return deckB.currentTime
        }
    }

    private func deckState(for deck: DeckID) -> DeckState {
        switch deck {
        case .a:
            return deckA
        case .b:
            return deckB
        }
    }

    nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        Task { @MainActor in
            if player === self.playerA.audioPlayer {
                self.handleDeckFinished(.a)
            } else if player === self.playerB.audioPlayer {
                self.handleDeckFinished(.b)
            }
        }
    }

    private func handleDeckFinished(_ deck: DeckID) {
        setPlaying(false, for: deck)
        setCurrentTime(duration(for: deck), for: deck)
        completedDeck = deck
        deckCompletionSerial += 1
    }

    private func cueTime(for deck: DeckID) -> TimeInterval {
        switch deck {
        case .a:
            return deckA.cueTime
        case .b:
            return deckB.cueTime
        }
    }

    private func setPlaying(_ isPlaying: Bool, for deck: DeckID) {
        switch deck {
        case .a:
            deckA.isPlaying = isPlaying
        case .b:
            deckB.isPlaying = isPlaying
        }
    }

    private func setCurrentTime(_ currentTime: TimeInterval, for deck: DeckID) {
        switch deck {
        case .a:
            deckA.currentTime = currentTime
        case .b:
            deckB.currentTime = currentTime
        }
    }
}

enum DJPlayerError: LocalizedError {
    case fileMissing
    case loadFailed(String)

    var errorDescription: String? {
        switch self {
        case .fileMissing:
            return "The audio file cannot be found on this device."
        case .loadFailed(let details):
            return details
        }
    }
}

enum DeckID: Hashable {
    case a
    case b
}

private struct DeckPlayback {
    var audioPlayer: AVAudioPlayer?
    var avPlayer: AVPlayer?

    var hasPlayer: Bool {
        audioPlayer != nil || avPlayer != nil
    }

    var duration: TimeInterval {
        if let audioPlayer {
            return audioPlayer.duration
        }

        guard let seconds = avPlayer?.currentItem?.asset.duration.seconds,
              seconds.isFinite else {
            return 0
        }
        return seconds
    }

    var currentTime: TimeInterval {
        get {
            if let audioPlayer {
                return audioPlayer.currentTime
            }

            guard let seconds = avPlayer?.currentTime().seconds,
                  seconds.isFinite else {
                return 0
            }
            return seconds
        }
        set {
            if let audioPlayer {
                audioPlayer.currentTime = newValue
            } else {
                avPlayer?.seek(to: CMTime(seconds: newValue, preferredTimescale: 600))
            }
        }
    }

    var volume: Float {
        get {
            audioPlayer?.volume ?? avPlayer?.volume ?? 0
        }
        set {
            audioPlayer?.volume = newValue
            avPlayer?.volume = newValue
        }
    }

    func play() {
        if let audioPlayer {
            audioPlayer.play()
        } else {
            avPlayer?.play()
        }
    }

    func pause() {
        audioPlayer?.pause()
        avPlayer?.pause()
    }
}

struct DeckState {
    let name: String
    var track: DJTrack?
    var isPlaying = false
    var currentTime: TimeInterval = 0
    var duration: TimeInterval = 0
    var volume: Double = 0.85
    var effectiveVolume: Double = 0
    var cueTime: TimeInterval = 0

    var progress: Double {
        guard duration > 0 else { return 0 }
        return currentTime / duration
    }
}
