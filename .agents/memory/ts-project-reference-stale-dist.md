---
name: TS project reference stale dist
description: tsc project references can resolve to a workspace lib's stale dist/*.d.ts instead of live src, causing false "no exported member" errors.
---

In a pnpm monorepo using TypeScript project references (`composite: true`, `references: [...]` in tsconfig), a consuming package's `tsc --noEmit` typecheck can resolve an internal workspace package (e.g. `@workspace/db`) to that package's previously-built `dist/*.d.ts` files rather than its current `src`, even though the package.json `exports` field points at `src`. This happens when the referenced project was built once (producing `dist`) and then its `src` changed afterward without rebuilding.

**Why:** hit this after adding new Drizzle schema files to `lib/db/src/schema/` — every consumer got `TS2305: Module has no exported member 'productsTable'` etc., even though the export clearly existed in the current source.

**How to apply:** if a workspace-internal import reports a missing export that plainly exists in the referenced package's `src`, don't assume the export is wrong — rebuild that referenced project first (`cd lib/<pkg> && npx tsc -b tsconfig.json`) and re-run the consumer's typecheck before investigating further.
