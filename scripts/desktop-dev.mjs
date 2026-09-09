import { spawn, spawnSync } from "node:child_process";

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const spawnOptions = { shell: process.platform === "win32" };
const apiPort = Number(process.env.PAJOY_API_PORT ?? "3001");
const apiUrl = `http://127.0.0.1:${apiPort}`;
const apiEnvironment = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/postgres",
  PAJOY_BOOTSTRAP_PASSWORD: process.env.PAJOY_BOOTSTRAP_PASSWORD ?? "PajoyDemo2026!",
  PORT: String(apiPort),
};

const apiBuild = spawnSync(command, ["--filter", "@workspace/api-server", "build"], {
  env: apiEnvironment,
  stdio: "inherit",
  ...spawnOptions,
});
if (apiBuild.status !== 0) process.exit(apiBuild.status ?? 1);

const api = spawn(command, ["--filter", "@workspace/api-server", "start"], {
  env: apiEnvironment,
  stdio: "inherit",
  shell: process.platform === "win32",
});

const renderer = spawn(command, ["--filter", "@workspace/pajoy-uniforms", "dev"], {
  env: { ...process.env, PORT: "5173", BASE_PATH: "/", PAJOY_API_URL: apiUrl },
  stdio: "inherit",
  shell: process.platform === "win32",
});

const stopChildren = () => {
  api.kill();
  renderer.kill();
};

const waitForRenderer = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch("http://localhost:5173");
      if (response.ok) return;
    } catch { }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("The Vite renderer did not start on port 5173.");
};

const waitForApi = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${apiUrl}/api/healthz`);
      if (response.ok) return;
    } catch { }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`The API server did not start on port ${apiPort}.`);
};

try {
  await Promise.all([waitForApi(), waitForRenderer()]);
  const electron = spawn(command, ["exec", "electron", "artifacts/pajoy-uniforms/electron/main.cjs"], {
    env: { ...process.env, NODE_ENV: "development", PAJOY_DESKTOP_DEV: "true", PAJOY_API_URL: apiUrl, PAJOY_RENDERER_URL: "http://localhost:5173" },
    stdio: "inherit",
    ...spawnOptions,
  });
  electron.on("exit", (code) => { stopChildren(); process.exit(code ?? 0); });
} catch (error) {
  stopChildren();
  console.error(error);
  process.exit(1);
}