import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import FirebaseCore
import RNBootSplash

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Before React Native starts, so the messaging module finds an initialised
    // app when JS asks it for a token. Reads GoogleService-Info.plist; without
    // that file this traps on launch, which is the right failure — push that
    // silently never arrives is far harder to notice than a crash on the first
    // run after a misconfigured checkout.
    FirebaseApp.configure()

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "LinguispathNative",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  /// Hands a `languify://` URL to React Native.
  ///
  /// This is how the OAuth redirect gets back into the app: the backend sends
  /// the browser to `languify://oauth?token=…`, iOS opens us with it, and the
  /// authentication session that started the flow resolves with that URL.
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return RCTLinkingManager.application(app, open: url, options: options)
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }

  /// Keeps the launch storyboard over the root view after React Native has
  /// attached it, so the splash stays up until JS says to hide it.
  ///
  /// Without this the splash goes the instant the root view appears, which is
  /// before the first screen has drawn — a white flash between the logo and the
  /// app. `SplashScreen.jsx` calls `BootSplash.hide` once it has painted.
  override func customize(_ rootView: UIView) {
    super.customize(rootView)
    RNBootSplash.initWithStoryboard("BootSplash", rootView: rootView)
  }
}
