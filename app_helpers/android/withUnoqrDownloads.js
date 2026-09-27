const fs = require("fs");
const path = require("path");
const { withDangerousMod, withMainApplication } = require("expo/config-plugins");

const MODULE_FILES = ["UnoqrDownloadsModule.kt", "UnoqrDownloadsPackage.kt"];

// Registers the Downloads bridge and copies its Kotlin sources during Android prebuild.
function withUnoqrDownloads(config) {
  config = withMainApplication(config, (nativeConfig) => {
    if (nativeConfig.modResults.language !== "kt") {
      throw new Error("UnoqrDownloads requires a Kotlin MainApplication file.");
    }

    const registration = "add(UnoqrDownloadsPackage())";
    if (!nativeConfig.modResults.contents.includes(registration)) {
      const packageList = /PackageList\(this\)\.packages\.apply\s*\{/;
      if (!packageList.test(nativeConfig.modResults.contents)) {
        throw new Error("Unable to find the React Native package list in MainApplication.kt.");
      }
      nativeConfig.modResults.contents = nativeConfig.modResults.contents.replace(
        packageList,
        (match) => `${match}\n          ${registration}`
      );
    }
    return nativeConfig;
  });

  return withDangerousMod(config, ["android", async (nativeConfig) => {
    const packageName = nativeConfig.android?.package;
    if (!packageName) throw new Error("Set expo.android.package before installing UnoqrDownloads.");

    const sourceDirectory = path.join(nativeConfig.modRequest.projectRoot, "app_helpers", "android");
    const targetDirectory = path.join(
      nativeConfig.modRequest.platformProjectRoot,
      "app", "src", "main", "java", ...packageName.split(".")
    );
    await fs.promises.mkdir(targetDirectory, { recursive: true });

    for (const fileName of MODULE_FILES) {
      const source = await fs.promises.readFile(path.join(sourceDirectory, fileName), "utf8");
      const configured = source.replace(/^package\s+[^\r\n]+/m, `package ${packageName}`);
      await fs.promises.writeFile(path.join(targetDirectory, fileName), configured);
    }
    return nativeConfig;
  }]);
}

module.exports = withUnoqrDownloads;
