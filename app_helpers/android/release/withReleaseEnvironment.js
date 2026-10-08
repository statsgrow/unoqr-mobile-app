const { withAppBuildGradle } = require("expo/config-plugins");

/* ------------------ BREAK ------------------ */

const androidHook = 'apply from: new File(rootDir, "../app_helpers/android/release/checkReleaseEnvironment.gradle")';

// Preserves the Android release environment check through Expo prebuild.
function withReleaseEnvironment(config) {
  return withAppBuildGradle(config, (nativeConfig) => {
    if (!nativeConfig.modResults.contents.includes(androidHook)) {
      nativeConfig.modResults.contents += `\n// Verify production settings before any release build.\n${androidHook}\n`;
    };//if ends
    return nativeConfig;
  });
};//func ends

module.exports = withReleaseEnvironment;
