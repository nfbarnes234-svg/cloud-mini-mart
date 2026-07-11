# Deploying Cloud Mini Mart (Frontend → Vercel, API → Render)

This document contains the minimal, tested steps to deploy the project without requiring a working local build on Windows (useful when native optional deps fail locally).

Prerequisites
- GitHub account with this repository connected.
- Vercel account (for frontend) and Render (or Railway) account (for API + Postgres).
- pnpm installed locally (optional if you only use the web UIs).

Quick overview
1. Provision Postgres on Render.
2. Deploy API (artifacts/api-server) to Render.
3. Seed the production DB (one-off command or from Render shell).
4. Deploy frontend (artifacts/minimart-pos) to Vercel and point API_BASE_URL to the API URL.

Detailed steps

A — Provision Postgres (Render)
1. Sign in to https://render.com and click New → PostgreSQL.
2. Choose service name and plan (free for testing).
3. After creation, copy the DATABASE_URL from the Render dashboard.

B — Deploy the API on Render
1. Render → New → Web Service → Connect your GitHub repository.
2. Configure the service:
   - Root Directory: `artifacts/api-server`
   - Branch: `main` (or your deployment branch)
   - Build Command: `pnpm install && pnpm run build`
   - Start Command: `node --enable-source-maps ./dist/index.mjs`
   - Environment: Node (defaults are fine)
3. Add Environment Variables in the Render UI (Service → Environment):
   - `DATABASE_URL` = (the DATABASE_URL from Postgres)
   - `SESSION_SECRET` = (generate a random secret; see below)
   - `NODE_ENV` = `production`
   - (Render sets `PORT` automatically)
4. Create and deploy the service. Note the production URL (e.g., `https://minimart-api.onrender.com`).

Generate a SESSION_SECRET (locally)
- Run: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- Copy the output into the `SESSION_SECRET` environment variable on Render.

C — Seed the production DB
Option 1 (Render one-off shell):
- From the service page on Render, open the Shell/Console and run:
  - `pnpm --filter @workspace/api-server run seed`
Option 2 (locally pointing to production DB):
- Set the DATABASE_URL locally and run the seed script:
  - `export DATABASE_URL="postgres://..."` (macOS/Linux)
  - PowerShell: `$env:DATABASE_URL = "postgres://..."`
  - `pnpm --filter @workspace/api-server run seed`

D — Deploy frontend to Vercel
1. Go to https://vercel.com/new and import your GitHub repo.
2. In project settings (during import):
   - Root Directory: leave empty (repo root) or set to `/`.
   - Install Command: `pnpm install`
   - Build Command: `pnpm --filter @workspace/minimart-pos run build`
   - Output Directory: `artifacts/minimart-pos/dist`
   - Framework Preset: Other / Static (Vite)
3. Add Environment Variables in Vercel (Project → Settings → Environment Variables):
   - `API_BASE_URL` = `https://<your-render-api-domain>`
4. Deploy. Vercel runs the build in a Linux environment (avoids Windows native-bind problems).

E — Verify
- API health: `curl https://<your-render-api-domain>/api/health`
- Frontend: Visit the Vercel URL; log in using seeded credentials.

F — Troubleshooting notes
- CORS & credentials: If frontend is on a different origin than the API, enable credentials and set origin in CORS in `artifacts/api-server/src/app.ts`:
  ```js
  app.use(cors({ origin: 'https://your-frontend-domain', credentials: true }));
  ```
  Also ensure frontend fetches use `credentials: 'include'` when calling auth-protected endpoints.
- If Render build fails due to native binaries, you can use Render's Docker service or containerize the API (a Dockerfile is included in the repo).
- If you need to run builds locally on Windows, use WSL or Git Bash to improve compatibility with native optional deps.

Files added
- `.env.example` — example environment variables

If you want, I can also add a `vercel.json` to pin the build configuration or a Dockerfile for the API (I added one in the repository in `artifacts/api-server/Dockerfile`).

