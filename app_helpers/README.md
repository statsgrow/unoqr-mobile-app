# Native build helpers

## Release environment check

Platform release hooks live in `android/release/` and `ios/release/`. The shared environment validation lives in `shared/`.

`shared/checkReleaseEnvironment.js` requires `EXPO_PUBLIC_API_ENV=production` in the root `.env`. It also checks Expo's production `.env` overrides and the build process environment. Missing values, development settings, and a non-production `NODE_ENV` override fail with a build error. It does not change `.env` or print secrets.

The check runs automatically for:

- Android Studio release APK/AAB builds and Gradle release builds, before native preparation and JavaScript bundling.
- Xcode Release builds and archives, through the first app build phase named `[UnoQR] Check Release Environment`.

Debug builds are unaffected. The platform plugins `android/release/withReleaseEnvironment.js` and `ios/release/withReleaseEnvironment.js` restore their native hooks after prebuild. Both checks run every release build, even when other build outputs are cached.

Android release builds also regenerate Expo's embedded asset manifest on every build. Expo's `createReleaseUpdatesResources` task does not track changes to JavaScript or asset files, so a cached manifest can omit newly added images even when those images are packaged in the APK/AAB. Regenerating it keeps release image resolution aligned with the bundled assets.

Before building a release, set this in `.env`:

```dotenv
EXPO_PUBLIC_API_ENV="production"
```

For an optional manual check without building an APK, AAB, or archive:

```bash
npm run check:release-env
```

## iOS startup

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
