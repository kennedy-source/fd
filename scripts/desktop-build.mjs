import { spawnSync } from "node:child_process";

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const environment = { ...process.env, PAJOY_DESKTOP_BUILD: "true" };
const spawnOptions = { shell: process.platform === "win32" };

const renderer = spawnSync(command, ["--filter", "@workspace/pajoy-uniforms", "build"], { env: environment, stdio: "inherit", ...spawnOptions });
if (renderer.status !== 0) process.exit(renderer.status ?? 1);

const api = spawnSync(command, ["--filter", "@workspace/api-server", "build"], { env: environment, stdio: "inherit", ...spawnOptions });
if (api.status !== 0) process.exit(api.status ?? 1);

const output = process.env.PAJOY_BUILD_OUTPUT ?? "C:/Pajoy-Uniforms-POS-release";
const desktop = spawnSync(command, ["exec", "electron-builder", "--config", "artifacts/pajoy-uniforms/electron-builder.yml", `--config.directories.output=${output}`], { env: environment, stdio: "inherit", ...spawnOptions });
process.exit(desktop.status ?? 1);