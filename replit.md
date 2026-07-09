# Mini Mart POS

Cloud-based point-of-sale system for a Ghanaian mini mart (GHS currency), with Owner/Manager/Cashier roles covering checkout, inventory, customers, sales history, expenses, dashboards, and reports.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/minimart-pos run dev` — run the POS web frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run seed` — seed demo users/categories/products/customers (skips if users already exist)
- Required env: `DATABASE_URL` — Postgres connection string; `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, custom JWT auth in an HTTP-only cookie (bcryptjs + jsonwebtoken), role-based middleware
- DB: PostgreSQL + Drizzle ORM
- Frontend: React + Vite (`artifacts/minimart-pos`), wouter routing, React Query via generated hooks
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- API contract: `lib/api-spec/openapi.yaml`
- DB schema: `lib/db/src/schema/` (users, categories, products, customers, sales + saleItems, expenses)
- Backend routes: `artifacts/api-server/src/routes/` (one file per domain: auth, users, categories, products, customers, sales, expenses, dashboard, reports)
- Auth/JWT logic: `artifacts/api-server/src/lib/auth.ts`
- Seed data: `artifacts/api-server/src/seed.ts`
- Frontend app: `artifacts/minimart-pos/src/`

## Architecture decisions

- Custom JWT + HTTP-only-cookie auth (not Clerk/Replit Auth) because the original product spec explicitly required JWT-based RBAC; roles are owner/manager/cashier.
- Dashboard, reports, and expenses endpoints require `owner`/`manager` role — cashiers only get POS/sales access, matching the intended role model.
- Sale creation derives item prices from the current DB `sellingPrice` (never trusts client-submitted price) to prevent tampering, and rejects `amountPaid < total`.
- Stock decrement on sale and status transition on void both use conditional `UPDATE ... WHERE` clauses inside a transaction to stay correct under concurrent requests, instead of read-then-write.
- Suppliers, purchase orders, stock batches/expiry, notifications, audit logs, receipt/barcode printing, and multi-branch/offline sync were explicitly deferred as follow-up work beyond this MVP.

## Product

- Login (email/password) gated app with role-based navigation.
- Dashboard: today/week/month/year sales, profit, inventory value, low/out-of-stock counts, sales trend chart, top products.
- POS screen: cart-based checkout with barcode/search lookup, multiple payment methods, change due, receipt.
- Inventory: products + categories CRUD, stock adjustments with a reason.
- Customers: CRUD with loyalty points and outstanding balance.
- Sales history: filterable list, sale detail/receipt, void.
- Expenses: record and list (owner/manager only).
- Reports: sales by category/cashier/payment method.
- Staff (owner-only): manage user accounts and roles.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `lib/db` and `lib/api-zod`/`lib/api-spec` use TS project references with stale `dist/*.d.ts` output; if a consuming package's typecheck reports "no exported member" for something that clearly exists in `src`, rebuild the referenced project (`npx tsc -b tsconfig.json` inside it) rather than assuming the export is missing.
- Drizzle `numeric` columns come back as strings from the `pg` driver. Any route returning them through a Zod schema expecting `number` must explicitly `Number(...)` them before `.parse()`.
- `@workspace/api-client-react` exports everything (hooks + types) from the package root — do not import from a `/src/generated/api` or `.schemas` subpath.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
