---
name: Drizzle numeric string coercion
description: Postgres numeric columns come back as strings via node-postgres/Drizzle; response schemas expecting numbers must convert explicitly.
---

Drizzle's `numeric` pg-core column type maps to a plain `string` at the driver level (node-postgres does not parse arbitrary-precision numerics to JS `number` by default). If an OpenAPI/Zod-generated response schema declares a field as `number` (e.g. prices, totals, balances), parsing a raw Drizzle row directly through that schema throws `ZodError: invalid_type, expected number, received string`.

**Why:** discovered building a POS backend — every money field (`purchasePrice`, `sellingPrice`, `outstandingBalance`, sale totals, expense `amount`) failed `.parse()` until each route mapped the row to convert those fields with `Number(...)` before validating/serializing.

**How to apply:** whenever a Drizzle table has `numeric(...)` columns and the API response schema types them as `number`, add an explicit serialization step (`Number(row.field)`) for every read path (list/get/create/update) before calling `.parse()`. Do this once per route file as a small helper rather than inline at each call site.
