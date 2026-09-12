# Pajoy Uniforms POS shop installation

## What to take

Take these two things:

1. `artifacts/pajoy-uniforms/shop-release/Pajoy-Uniforms-POS-0.0.0-win-x64.exe`
2. The API/database deployment, or a reachable POS server at `localhost:3001` from the shop computer.

The desktop installer is the cashier interface. It does not contain PostgreSQL or the Express API because receipts, inventory, users, and reports must remain in the shared database.

## On the shop computer

1. Install PostgreSQL and create the POS database, or connect the API to the central POS database.
2. Configure `DATABASE_URL`, `PORT`, `ALLOWED_ORIGINS`, `BOOTSTRAP_ADMIN_USERNAME`, and a strong `BOOTSTRAP_ADMIN_PASSWORD` for the API service. Production does not use a local database or demo defaults.
3. From the repository root, run `pnpm --filter @workspace/scripts production:init`. This applies tracked migrations, creates Shop 1 and Shop 2 if missing, and creates the initial administrator only when no administrator exists.
4. Start the API as a persistent Windows service or VPS service on port `3001`.
5. Configure the POS with `API_BASE_URL` pointing to the API URL, then run `Pajoy-Uniforms-POS-0.0.0-win-x64.exe`.
6. Sign in with the administrator account created by the explicit initialization command, then create staff accounts through the administration workflow.

The application does not seed products, customers, orders, inventory, or payments automatically. Add the real business data after the first administrator login. To clear business records while retaining staff and authentication, use the protected reset flow with `RESET_CONFIRMATION=RESET_PAJOY_BUSINESS`.

For a production web build, set `VITE_API_BASE_URL` before `pnpm --filter @workspace/pajoy-uniforms build`. Never put `DATABASE_URL` or either bootstrap password in the frontend build or installer.

The application uses the same backend for authentication, receipts, inventory, reports, branch stock, and DTF jobs. Do not install separate databases per cashier workstation unless a synchronization plan is added.

## Build the installer

From the repository root:

```powershell
pnpm install
pnpm run desktop:build
```

The Windows installer is written to `artifacts/pajoy-uniforms/shop-release`.

## Build the shop API payload

The release folder ships a compiled API bundle, not TypeScript sources. Regenerate it from the repository root after any API change:

```powershell
pnpm install
pnpm run shop:api:package
```

This bundles `artifacts/api-server` with esbuild and refreshes `Pajoy-Uniforms-Shop-Release-Corrected/api-server` with `dist/`, `migrations/`, `production-init.mjs`, `.env.example`, and the production `package.json`. Set `PAJOY_SHOP_RELEASE` to write to a different release folder.

On the shop computer, that folder runs with plain npm: `npm install`, `npm run production:init`, `npm start`.