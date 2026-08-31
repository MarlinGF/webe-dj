import AVFoundation

enum AudioSessionManager {
    static func activatePlayback() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("Audio session activation failed:", error.localizedDescription)
        }
    }
}
