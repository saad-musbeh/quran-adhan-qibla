# JNI resolves this exact class/method name from the Rust shared library.
-keep class expo.modules.islamiccore.IslamicCoreModule { *; }

# Registered by reflection through React Native's ViewManagerOnDemandReactPackage:
# R8 must keep the package and its on-demand text view manager from release builds.
-keep class expo.modules.islamiccore.TextLayoutPackage { *; }
-keep class expo.modules.islamiccore.MatchingTextViewManager { *; }
