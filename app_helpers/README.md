# Native iOS helpers

`ios/withIOSBundling.js` keeps Xcode version and build settings aligned with `app.json` and disables user script sandboxing for Expo's generated bundling phases.

The `expo-build-properties` plugin enables the UIKit scene lifecycle with `ios.enableSceneSupport`. It requires Expo SDK 57.0.23 or newer.

After changing native configuration, run:

```bash
npx expo prebuild --platform ios
npm run check:ios-startup
npm run typecheck
```

Run `npm run check:ios-startup` before archiving in Xcode. `npm run ios` also runs this check automatically. Open `ios/UnoQR.xcworkspace` after installing Pods and verify signing before archiving.

## Archive symbols

Precompiled frameworks can have matching symbols available outside the archive. After archiving, `ios/copyArchiveSymbols.mts` copies existing dSYM bundles only when their UUIDs and architectures match the embedded framework.

```bash
npm run ios:archive-symbols -- "/absolute/path/UnoQR.xcarchive" "/absolute/path/downloaded-symbols"
```

The helper also searches the local Pods, image manipulator prebuild folders, and ignored `.expo/archive-symbols` cache. Matching Release symbols for React Native 0.86.3 and Hermes 250829098.0.17 are cached locally for subsequent archives. When upgrading dependencies, download their corresponding symbols from the official React Native release artifacts. The installed `react-native/scripts/cocoapods/rncore.rb` defines the React Core dSYM URL; some release-page links point to the framework binary instead of its symbols. Rerun validation in Xcode after copying. This changes only the archive's symbols; it does not rebuild or upload the app.
