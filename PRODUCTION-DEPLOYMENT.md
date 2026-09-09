# Pajoy Smart Business production deployment

## Architecture

The Windows POS talks only to the API. The API is the only component that connects to PostgreSQL.

`Windows POS -> HTTPS API -> private PostgreSQL`

Do not expose PostgreSQL to the public internet. Put the API behind HTTPS and restrict CORS with `ALLOWED_ORIGINS`.

## Environment

Copy `PRODUCTION-ENV.example` into the secret manager or service environment. Never commit the real values. The API requires `DATABASE_URL`, `PORT`, `BOOTSTRAP_ADMIN_USERNAME`, and `BOOTSTRAP_ADMIN_PASSWORD`. The bootstrap password must be at least 12 characters and contain upper case, lower case, a number, and a symbol.

`API_BASE_URL` and `VITE_API_BASE_URL` contain only the API URL. They must never contain database credentials.

## Fresh production initialization

From the repository root on the API host:

```powershell
pnpm install --frozen-lockfile
$env:DATABASE_URL="postgres://..."
$env:BOOTSTRAP_ADMIN_USERNAME="admin"
$env:BOOTSTRAP_ADMIN_PASSWORD="..."
pnpm --filter @workspace/scripts production:init
```

This applies tracked Drizzle migrations, creates Shop 1 and Shop 2 if missing, and creates one administrator only when no administrator exists. It never inserts products, customers, orders, payments, or inventory. It never drops or wipes data. Run it again safely after a restart; the existing administrator is preserved.

Start the API:

```powershell
$env:NODE_ENV="production"
$env:PORT="3001"
$env:ALLOWED_ORIGINS="https://pos.example.com"
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/api-server start
```

Check process and database readiness:

```powershell
Invoke-WebRequest http://127.0.0.1:3001/health
Invoke-WebRequest http://127.0.0.1:3001/api/readyz
```

## Windows service

Use NSSM or another approved service manager. Configure the service executable as `pnpm.cmd`, arguments `--filter @workspace/api-server start`, working directory as the repository root, and all production environment variables in the service configuration. Set automatic startup and restart-on-failure. Keep PostgreSQL on the same private host or a private managed network.

Do not run the API from a developer terminal in production.

## VPS/cloud deployment

Build the API in CI, store secrets in the provider secret manager, run `pnpm install --frozen-lockfile`, run `production:init` as a one-time release task, and run `pnpm --filter @workspace/api-server start` as the persistent web process. Use a private managed PostgreSQL instance, TLS termination at the proxy, an API health check at `/health`, and a readiness check at `/api/readyz`.

## Windows POS build

For a web-connected POS build:

```powershell
$env:VITE_API_BASE_URL="https://api.example.com"
pnpm run desktop:build
```

The installer contains the Electron app, frontend, and bundled API code, but no PostgreSQL password. For a separate persistent API server, set `API_BASE_URL` in the POS runtime environment and set `PAJOY_DISABLE_BUNDLED_API=true`; the POS then connects to the configured API URL. For a local bundled API, provide `DATABASE_URL` and `PAJOY_BOOTSTRAP_PASSWORD` to the bundled API service environment before launch.

Exact installer output from the build script is `C:\Pajoy-Uniforms-POS-release\Pajoy-Uniforms-POS-0.0.0-win-x64.exe` on Windows.

## Backups and restore

Back up PostgreSQL to storage separate from the API host. Example scheduled backup:

```powershell
pg_dump --format=custom --file="D:\Backups\pajoy-$(Get-Date -Format yyyyMMdd-HHmm).dump" "$env:DATABASE_URL"
```

Restore into a stopped or maintenance-mode API database:

```powershell
createdb -h PRIVATE_DB_HOST -U PRODUCTION_DB_USER pajoy_restore
pg_restore --clean --if-exists --dbname="postgres://.../pajoy_restore" "D:\Backups\pajoy-YYYYMMDD-HHMM.dump"
```

Test restores regularly. Keep multiple dated backups and at least one copy off the shop computer.

## Security checklist

- PostgreSQL accepts connections only from the API host/private network.
- `DATABASE_URL` and bootstrap passwords are service secrets, never frontend variables or installer files.
- `ALLOWED_ORIGINS` is an explicit production allowlist.
- HTTPS is enabled for any API reachable outside the shop LAN.
- The bootstrap password is changed/rotated after initial setup.
- Admin and cashier accounts use separate credentials.
- The destructive reset command is not configured in the normal API service.
- Backups are encrypted and restore-tested.
- Windows service and database accounts use least privilege.
- `/api/readyz` is monitored without exposing database details.

## Offline behavior

Offline sales are not implemented. If the API is unavailable, the POS must show the connection/error state; it must not claim that a sale was saved or queue an untested local transaction.

## One-computer shop installation

For a single-computer shop, run PostgreSQL and the API on the same Windows computer. Run this script from an elevated PowerShell window after installing PostgreSQL and pnpm:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\install-local-shop.ps1 -AdminPassword "A-strong-unique-password"
```

The script creates the local database, applies migrations, creates the two shops and initial administrator, configures the API for `127.0.0.1:3001`, and registers the API to start at Windows boot. PostgreSQL should be configured as an automatic Windows service. The POS uses the local API and never connects directly to PostgreSQL.

The computer still must be powered on and healthy for sales. Automatic startup and service restart reduce downtime after a reboot or process failure; they cannot make a powered-off computer transact.
