const { IOSConfig, withXcodeProject } = require("expo/config-plugins");

/* ------------------ BREAK ------------------ */

const phaseName = "[UnoQR] Check Release Environment";
const iosScript = `set -e
# Development builds remain available without production settings.
case "$CONFIGURATION" in *Debug*) exit 0 ;; esac

# Use the same Node executable configured for Expo's Xcode bundling.
if [ -f "$PROJECT_DIR/.xcode.env" ]; then . "$PROJECT_DIR/.xcode.env"; fi
if [ -f "$PROJECT_DIR/.xcode.env.local" ]; then . "$PROJECT_DIR/.xcode.env.local"; fi
if [ -z "$NODE_BINARY" ]; then NODE_BINARY=node; fi
"$NODE_BINARY" "$PROJECT_DIR/../app_helpers/shared/checkReleaseEnvironment.js"
`;

/* ------------------ BREAK ------------------ */

// Preserves the iOS release environment check through Expo prebuild.
function withReleaseEnvironment(config) {
  return withXcodeProject(config, (nativeConfig) => {
    installIOSCheck(nativeConfig.modResults);
    return nativeConfig;
  });
};//func ends

// Adds an always-running check before each application's native build phases.
function installIOSCheck(project) {
  const targets = IOSConfig.Target.getNativeTargets(project).filter(
    ([, target]) => IOSConfig.Target.isTargetOfType(target, IOSConfig.Target.TargetType.APPLICATION)
  );
  if (targets.length === 0) throw new Error("Unable to find an iOS app target for the release environment check.");
  for (const [targetId, target] of targets) {
    let phase = target.buildPhases.find((entry) => entry.comment === phaseName);
    if (!phase) {
      project.addBuildPhase([], "PBXShellScriptBuildPhase", phaseName, targetId, { shellPath: "/bin/sh", shellScript: iosScript });
      phase = target.buildPhases.find((entry) => entry.comment === phaseName);
    };//if ends
    const scriptPhase = project.hash.project.objects.PBXShellScriptBuildPhase[phase.value];
    scriptPhase.shellScript = '"' + iosScript.replace(/"/g, '\\"') + '"';
    scriptPhase.alwaysOutOfDate = 1;
    scriptPhase.showEnvVarsInLog = 0;
    target.buildPhases = [phase, ...target.buildPhases.filter((entry) => entry.value !== phase.value)];
  };//for ends
};//func ends

module.exports = withReleaseEnvironment;
module.exports.installIOSCheck = installIOSCheck;
