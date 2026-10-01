import { execFileSync } from "node:child_process";
import { cpSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

type BinaryUUID = { uuid: string; architecture: string };

/* ------------------ BREAK ------------------ */

// Adds matching framework symbols to an existing Xcode archive without changing its app binary.
function copyArchiveSymbols(): void {
  const archive = process.argv[2];
  if (!archive || !existsSync(path.join(archive, "Products/Applications/UnoQR.app"))) {
    throw new Error("Pass the path to your UnoQR .xcarchive, followed by any downloaded symbol folders.");
  };//if ends

  const roots = [
    "ios/Pods",
    "node_modules/expo-image-manipulator/prebuilds",
    ".expo/archive-symbols",
    ...process.argv.slice(3),
  ];
  const symbols = roots.flatMap((root) => findSymbols(root));
  const frameworks = path.join(archive, "Products/Applications/UnoQR.app/Frameworks");
  const destination = path.join(archive, "dSYMs");
  const missing: string[] = [];

  for (const framework of readdirSync(frameworks).filter((name) => name.endsWith(".framework"))) {
    const name = framework.replace(/\.framework$/, "");
    const binaryUUIDs = getUUIDs(path.join(frameworks, framework, name));
    const target = path.join(destination, `${framework}.dSYM`);
    if (existsSync(target) && matchesUUIDs(binaryUUIDs, getUUIDs(target))) continue;

    // Reject symbols from another build or simulator slice before copying them.
    const source = symbols.find((symbol) => path.basename(symbol) === `${framework}.dSYM` && matchesUUIDs(binaryUUIDs, getUUIDs(symbol)));
    if (!source) {
      missing.push(name);
      continue;
    };//if ends

    cpSync(source, target, { recursive: true });
    console.log(`Added matching symbols: ${name}`);
  }

  if (missing.length) throw new Error(`Matching symbols still missing: ${missing.join(", ")}`);
  console.log("All embedded framework UUIDs have matching archive symbols.");
};//func ends

/* ------------------ BREAK ------------------ */

// Finds existing dSYM bundles inside dependency or downloaded symbol folders.
function findSymbols(root: string): string[] {
  if (!existsSync(root)) return [];
  if (root.endsWith(".dSYM")) return [root];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? findSymbols(path.join(root, entry.name)) : []);
};//func ends

// Reads the UUID and architecture of each binary slice using Apple's developer tools.
function getUUIDs(binary: string): BinaryUUID[] {
  const output = execFileSync("xcrun", ["dwarfdump", "--uuid", binary], { encoding: "utf8" });
  return [...output.matchAll(/UUID: ([A-F0-9-]+) \(([^)]+)\)/g)].map((match) => ({ uuid: match[1], architecture: match[2] }));
};//func ends

// Checks that symbols cover every UUID and architecture in the archived framework.
function matchesUUIDs(binary: BinaryUUID[], symbols: BinaryUUID[]): boolean {
  return binary.length > 0 && binary.every((item) => symbols.some((symbol) => symbol.uuid === item.uuid && symbol.architecture === item.architecture));
};//func ends

copyArchiveSymbols();
