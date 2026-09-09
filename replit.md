# Pajoy Uniforms Operations

Pajoy Uniforms' operations console for multi-branch inventory, retail and wholesale sales, school orders, payments, credit, and embroidery workflows.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `$env:RESET_CONFIRMATION="RESET_PAJOY_BUSINESS"; pnpm reset:business` — transaction-safe business reset; preserves staff, authentication, roles, permissions, shops, schema, and migrations
- Required env: `DATABASE_URL` — Postgres connection string

### Local development

For a local PostgreSQL 18 installation using the default development database:

```powershell
$env:DATABASE_URL="postgres://postgres:postgres@localhost:5432/postgres"
$env:PAJOY_BOOTSTRAP_PASSWORD="use-a-strong-local-password"
$env:PORT="3001"
pnpm --filter @workspace/db push
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/api-server start
```

The API does not seed business data. The first login creates only the `admin` and `cashier` users using the configured bootstrap password. Add real shops, branches, products, customers, and inventory through the production administration workflow.

The reset command requires the exact confirmation value above and removes business records while preserving staff, authentication, shops, schema, and migrations.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/pajoy-uniforms` — React/Vite operations console and route-based views.
- `artifacts/api-server/src/routes/pajoy.ts` — API endpoints, seed data, and response mapping.
- `lib/api-spec/openapi.yaml` — source of truth for Pajoy API contracts and generated client hooks.
- `lib/db/src/schema/pajoy.ts` — Drizzle tables for branches, products, inventory, customers, orders, payments, and activity.

## Architecture decisions

- The frontend uses the generated OpenAPI React Query hooks so the dashboard and operational forms share a typed contract with the API.
- Production uses the shared PostgreSQL database without automatic demo-data seeding.
- Branch inventory is modeled independently from products so on-hand, reserved, and available quantities remain branch-specific.
- Kenyan Shilling amounts are stored as database numerics and mapped to numbers at the API boundary for predictable UI calculations.

## Product

- Dashboard overview with sales, credit, order, inventory, branch, and activity signals.
- POS, product catalog, inventory, customer, order, payment, reports, and settings routes.
- Create flows for products, customers, school/wholesale orders, and customer payments.
- Workflows include school deposits, deferred balances, stock reservations, and embroidery-linked order status.

## User preferences

No additional preferences recorded.

## Gotchas

- Regenerate client and Zod outputs after changing `lib/api-spec/openapi.yaml`.
- The API never seeds business data automatically; provision real data explicitly.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
