const { IOSConfig, withXcodeProject } = require("expo/config-plugins");

// Keeps iOS bundling and Xcode's visible version settings aligned with Expo config.
function withIOSBundling(config) {
  return withXcodeProject(config, (nativeConfig) => {
    const project = nativeConfig.modResults;
    const iosVersion = nativeConfig.ios?.version ?? nativeConfig.version;
    const iosBuildNumber = nativeConfig.ios?.buildNumber;
    const applicationTargets = IOSConfig.Target.getNativeTargets(project).filter(
      ([, target]) => IOSConfig.Target.isTargetOfType(target, IOSConfig.Target.TargetType.APPLICATION)
    );

    if (applicationTargets.length === 0) {
      throw new Error("Unable to find the iOS application target for Expo bundling.");
    }

    for (const [, target] of applicationTargets) {
      const configurations = IOSConfig.XcodeUtils.getBuildConfigurationsForListId(
        project,
        target.buildConfigurationList
      );
      for (const [, configuration] of configurations) {
        configuration.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = "NO";
        if (iosVersion) {
          configuration.buildSettings.MARKETING_VERSION = iosVersion;
        }
        if (iosBuildNumber) {
          configuration.buildSettings.CURRENT_PROJECT_VERSION = iosBuildNumber;
        }
      }
    }

    return nativeConfig;
  });
};//func ends

module.exports = withIOSBundling;
