---
name: api-client-react import convention
description: Generated React Query hooks and Zod-adjacent types both live at the @workspace/api-client-react package root, not a nested subpath.
---

The generated `@workspace/api-client-react` package re-exports everything — React Query hooks (`useGetX`, `useCreateX`, ...) and TypeScript types (`User`, `LoginInput`, etc.) — from its root `index.ts`, which itself re-exports `./generated/api` and `./generated/api.schemas`. There is no separate `@workspace/api-client-react.schemas` or `@workspace/api-client-react/src/generated/api` subpath to import from in application code.

**Why:** a design subagent generated frontend code importing types from a nonexistent `.schemas` subpath and hooks from an internal `/src/generated/api` path, which broke the Vite dependency scan and the app typecheck.

**How to apply:** always `import { useGetX, type SomeType } from "@workspace/api-client-react"` — never reach into `/src/generated/...` or a `.schemas` suffix from app code.
