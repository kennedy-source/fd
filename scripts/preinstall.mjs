import { existsSync, unlinkSync } from "node:fs";

for (const lockfile of ["package-lock.json", "yarn.lock"]) {
  if (existsSync(lockfile)) unlinkSync(lockfile);
}

const invokedByPnpm = process.env.npm_config_user_agent?.startsWith("pnpm/") || process.env.npm_execpath?.toLowerCase().includes("pnpm");
if (!invokedByPnpm) {
  console.error("Use pnpm instead");
  process.exit(1);
}