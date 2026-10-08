const fs = require("node:fs");
const path = require("node:path");
const { parseEnv, parseProjectEnv } = require("@expo/env");

/* ------------------ BREAK ------------------ */

// Requires production in the base .env and the effective release environment.
function checkReleaseEnvironment(projectRoot) {
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) {
    throw new Error("Missing .env. Set EXPO_PUBLIC_API_ENV=production before building a release.");
  };//if ends

  const baseEnv = parseEnv(fs.readFileSync(envPath, "utf8"));
  if (baseEnv.EXPO_PUBLIC_API_ENV !== "production") {
    throw new Error("Set EXPO_PUBLIC_API_ENV=production in .env before building a release.");
  };//if ends

  const { env } = parseProjectEnv(projectRoot, { mode: "production", silent: true });
  const apiEnvironment = process.env.EXPO_PUBLIC_API_ENV ?? env.EXPO_PUBLIC_API_ENV;
  if (apiEnvironment !== "production") {
    throw new Error("A build-process or .env override is not production. Set EXPO_PUBLIC_API_ENV=production for the release build.");
  };//if ends

  if (process.env.NODE_ENV && process.env.NODE_ENV !== "production") {
    throw new Error("Remove the build-process NODE_ENV override or set it to production before building a release.");
  };//if ends
};//func ends

/* ------------------ BREAK ------------------ */

try {
  checkReleaseEnvironment(path.resolve(process.argv[2] || path.join(__dirname, "../..")));
  console.log("UnoQR release environment check passed: production.");
} catch (error) {
  console.error(`error: UnoQR release blocked. ${error instanceof Error ? error.message : "Unable to verify the environment."}`);
  process.exitCode = 1;
};//try-catch ends
