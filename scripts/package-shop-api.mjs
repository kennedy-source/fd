import { spawnSync } from "node:child_process";
import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptsDir, "..");
const apiDir = path.resolve(workspaceRoot, "artifacts/api-server");

const releaseRoot = process.env.PAJOY_SHOP_RELEASE ?? path.resolve(workspaceRoot, "Pajoy-Uniforms-Shop-Release-Corrected");
const targetDir = path.resolve(releaseRoot, "api-server");

const build = spawnSync(process.execPath, ["./build.mjs"], { cwd: apiDir, stdio: "inherit" });
if (build.status !== 0) process.exit(build.status ?? 1);

await mkdir(targetDir, { recursive: true });
await rm(path.resolve(targetDir, "dist"), { recursive: true, force: true });
await rm(path.resolve(targetDir, "migrations"), { recursive: true, force: true });

await cp(path.resolve(apiDir, "dist"), path.resolve(targetDir, "dist"), { recursive: true });
await cp(path.resolve(apiDir, "migrations"), path.resolve(targetDir, "migrations"), { recursive: true });
await cp(path.resolve(apiDir, "production-init.mjs"), path.resolve(targetDir, "production-init.mjs"));
await cp(path.resolve(workspaceRoot, "PRODUCTION-ENV.example"), path.resolve(targetDir, ".env.example"));

const manifest = await readFile(path.resolve(apiDir, "package.production.json"), "utf8");
await writeFile(path.resolve(targetDir, "package.json"), manifest);

const npm = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: targetDir, stdio: "inherit" });
if (npm.status !== 0) {
  console.warn("Could not refresh package-lock.json; the committed lockfile may be stale.");
}

const entry = path.resolve(targetDir, "dist/index.mjs");
await access(entry).catch(() => {
  console.error(`Packaging failed: ${entry} was not produced.`);
  process.exit(1);
});

console.info(`Shop API payload written to ${targetDir}`);
