# Why this file is no longer empty
#
# Google Play reports this app's DEX obfuscation at 1%, under the 25% it wants,
# and limits visibility and publishing for apps that stay below it. Obfuscation
# is a side effect of running R8, which this build had switched off entirely, so
# the fix is to turn minification on — and then keep the handful of things that
# are reached by name at runtime, which renaming would otherwise break.
#
# React Native ships its own rules (ReactAndroid/proguard-rules.pro) and they
# already cover the bridge: everything implementing NativeModule, every native
# method, @ReactProp setters, ViewManager names, and the DoNotStrip
# annotations. Nearly every library in this app leans on those instead of
# shipping rules of its own, so what follows is only what they do not reach.

# Hermes and the JNI layer it is called over. Entry points come from C++ rather
# than from Java, so nothing in Java references them and R8 would otherwise see
# them as dead.
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Nitro generates JNI bindings — used by react-native-iap — whose Java side is
# resolved from C++ by its fully qualified name.
-keep class com.margelo.nitro.** { *; }

# Keychain picks its cipher implementation by class name at runtime, so the
# name has to survive. Losing this locks every signed-in learner out: the
# session token lives here.
-keep class com.oblador.keychain.** { *; }

# react-native-config publishes the .env values through BuildConfig, which is
# read by name from the JS side.
-keep class us.languify.app.BuildConfig { *; }

# Optional dependencies that are absent from this build. R8 fails on an
# unresolved reference unless it is told the absence is expected.
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
