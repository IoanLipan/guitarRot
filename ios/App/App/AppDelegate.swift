import UIKit
import AVFoundation
import Capacitor
#if canImport(FirebaseCore)
import FirebaseCore
#endif

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        configureAudioSession()
        configureFirebase()
        return true
    }

    /// Firebase (accounts, sync, opt-in analytics) exists only in a build that has the project's
    /// GoogleService-Info.plist inside the app. Without it the app is the offline app it always
    /// was: nothing is configured, nothing is sent, and the web side finds its cloud features off.
    /// This mirrors Android, where the google-services plugin is applied only if
    /// google-services.json is there. Analytics collection is off in Info.plist until the player
    /// says yes (src/cloud/analytics.ts).
    private func configureFirebase() {
        #if canImport(FirebaseCore)
        guard Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil else {
            NSLog("[guitarRot] No GoogleService-Info.plist in the app: Firebase is off.")
            return
        }
        FirebaseApp.configure()
        #endif
    }

    /// One audio session for the whole app, set before the web view makes a sound.
    ///
    /// The tuner and the "play this note" checks listen through the microphone while lessons
    /// play, so the category has to allow both from the start: switching to record when the
    /// mic opens would cut the sound off. Play-and-record on its own sends sound to the quiet
    /// earpiece and obeys the ringer switch the way a game does, so:
    ///  - defaultToSpeaker: output on the loudspeaker (headphones and Bluetooth still win);
    ///  - allowBluetoothA2DP: AirPods and other headphones keep their full-quality output
    ///    while the phone's own mic listens, instead of dropping to the hands-free profile;
    ///  - mixWithOthers: opening the app does not stop the player's music or a backing track.
    private func configureAudioSession() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetoothA2DP, .mixWithOthers])
            try session.setActive(true)
        } catch {
            NSLog("[guitarRot] Could not set up the audio session: %@", error.localizedDescription)
        }
        #if DEBUG
        // Where the sound goes, in the Xcode console (NSLog: CAPLog is not switched on this early):
        // "Speaker" is right, "Receiver" is the earpiece.
        let logRoute = {
            let outputs = session.currentRoute.outputs.map { $0.portType.rawValue }.joined(separator: ", ")
            NSLog("[guitarRot] Audio: %@ to %@", session.category.rawValue, outputs.isEmpty ? "nothing yet" : outputs)
        }
        logRoute()
        NotificationCenter.default.addObserver(forName: AVAudioSession.routeChangeNotification, object: nil, queue: .main) { _ in logRoute() }
        #endif
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
