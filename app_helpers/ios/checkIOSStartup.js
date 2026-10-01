const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const appConfig = require(path.join(root, "app.json"));
const expoVersion = require(path.join(root, "node_modules/expo/package.json")).version;
const buildPropertiesVersion = require(path.join(root, "node_modules/expo-build-properties/package.json")).version;
const buildProperties = appConfig.expo.plugins.find(
  (plugin) => Array.isArray(plugin) && plugin[0] === "expo-build-properties"
);

// Stops a simulator build before native compilation when iOS scene support is missing.
function checkIOSStartup() {
  const expoMajor = Number(expoVersion.split(".")[0]);
  const expoPatch = Number(expoVersion.split(".")[2]);
  const buildPropertiesMajor = Number(buildPropertiesVersion.split(".")[0]);
  const buildPropertiesPatch = Number(buildPropertiesVersion.split(".")[2]);

  if (
    !buildProperties?.[1]?.ios?.enableSceneSupport ||
    expoMajor < 57 ||
    (expoMajor === 57 && expoPatch < 23) ||
    buildPropertiesMajor < 57 ||
    (buildPropertiesMajor === 57 && buildPropertiesPatch < 20)
  ) {
    throw new Error("iOS scene support needs Expo 57.0.23+, current expo-build-properties, and ios.enableSceneSupport: true.");
  }

  const infoPlistPath = path.join(root, "ios/UnoQR/Info.plist");
  const appDelegatePath = path.join(root, "ios/UnoQR/AppDelegate.swift");
  if (!fs.existsSync(infoPlistPath) && !fs.existsSync(appDelegatePath)) {
    console.log("iOS native project is absent; Expo will generate it with scene support.");
    return;
  }

  const infoPlist = fs.readFileSync(infoPlistPath, "utf8");
  const appDelegate = fs.readFileSync(appDelegatePath, "utf8");
  if (
    !infoPlist.includes("<key>UIApplicationSceneManifest</key>") ||
    !infoPlist.includes("<string>EXExpoAppSceneDelegate</string>") ||
    !appDelegate.includes("ExpoReactNativeFactoryProvider") ||
    appDelegate.includes("factory.startReactNative(")
  ) {
    throw new Error("Generated iOS project lacks scene startup. Run npx expo prebuild --platform ios, then retry.");
  }

  console.log("iOS scene startup configuration is present.");
};//func ends

checkIOSStartup();
