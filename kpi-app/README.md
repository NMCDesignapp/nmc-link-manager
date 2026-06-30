# KPI App — Standalone Vercel Project

Standalone Next.js project containing ONLY the KPI dashboard page, deployed separately
from the main nc-link app to its own Vercel URL.

## Why a separate project?

- **Independent URL**: KPI dashboard accessible at `kpi.<your-domain>.vercel.app` (or custom domain)
- **Independent scaling**: KPI page traffic doesn't affect main app
- **Independent rollback**: Roll back KPI without touching main app
- **Shared codebase**: Both apps live in the same git repo — single source of truth.

## Project Structure

```
kpi-app/
├── package.json              # Standalone Next.js project (Next 16, React 19, Prisma)
├── next.config.ts            # Configured for Vercel (CORS, headers)
├── vercel.json               # Vercel deployment config
├── tsconfig.json
├── tailwind.config.ts
├── prisma/
│   └── schema.prisma         # Same schema as main app
├── public/
│   ├── icon/                 # App icons
│   ├── kpi/                  # KPI-specific icons
│   ├── logo.svg
│   └── manifest.json         # PWA manifest (standalone)
└── src/
    ├── app/
    │   ├── layout.tsx         # Minimal layout (dark theme)
    │   ├── globals.css
    │   ├── page.tsx           # KPI dashboard (root page)
    │   └── api/
    │       ├── quan-ly/all/route.ts
    │       ├── settings/route.ts
    │       ├── calendar/route.ts
    │       └── structure/{ad,phong,bannhom,tvv}/route.ts
    ├── components/
    │   └── back-button.tsx
    └── lib/
        ├── db.ts              # Prisma client (shared with main app)
        └── utils.ts
```

## Setup — One-time Vercel Project Creation

### Step 1: Push to Git

Make sure your git repo includes the `kpi-app/` subfolder.

### Step 2: Create New Vercel Project

1. Go to https://vercel.com/new
2. Import your git repository
3. **CRITICAL**: In "Configure Project" screen, set:
   - **Framework Preset**: Next.js
   - **Root Directory**: `kpi-app` ← IMPORTANT
   - **Build Command**: `npm run build` (default)
   - **Install Command**: `npm install` (default)
4. In "Environment Variables", add:
   - `DATABASE_URL` = (same Neon PostgreSQL URL as main app)
   - `DIRECT_URL` = (same Neon direct URL as main app)
   - `NEXT_PUBLIC_MAIN_APP_URL` = `https://<your-main-app>.vercel.app` (so the KPI back-button can return users to the main app)
5. Click "Deploy"

### Step 3: Verify

- Vercel will give you a URL like `kpi-nc-link.vercel.app`
- Visit it — you should see the KPI dashboard
- The back-button (top-left) should return to the main nc-link app

## Sync Workflow — How updates propagate

The KPI page source lives in **`/src/app/kpi/page.tsx`** of the main app (single source of truth).
The `kpi-app/` folder is a deployable copy.

Whenever you edit `/src/app/kpi/page.tsx`, run:

```bash
bash scripts/sync-kpi-app.sh
```

This script:
1. Copies `src/app/kpi/page.tsx` → `kpi-app/src/app/page.tsx`
2. Injects the `MAIN_APP_URL` constant + adjusts `BackButton` and `/thi-dua-chau` links to point to the main app
3. Syncs dependent files: API routes, components, lib, prisma schema, icons
4. Verifies the result

After sync:
1. Commit: `git add kpi-app/ && git commit -m "sync kpi-app"`
2. Push: `git push`
3. Vercel auto-deploys both projects (main app + kpi-app) from the same push

## Local Development

```bash
cd kpi-app
npm install
npm run dev    # → http://localhost:3100
```

Set env vars in `.env.local`:
```
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXT_PUBLIC_MAIN_APP_URL=http://localhost:3000
```

## Performance Notes

- KPI app is **minimal** — only loads the KPI page + 6 API routes
- No heavy poster images, no main app's other pages
- Initial page load is fast because there's nothing else to load
- Database connection is shared with main app (Neon serverless PostgreSQL)

## Adding NEW API routes (when KPI page calls a new endpoint)

1. Add the route to main app at `src/app/api/<name>/route.ts`
2. Add a copy line in `scripts/sync-kpi-app.sh`
3. Run the sync script
4. Commit & push

## Removing routes (when KPI page no longer needs an endpoint)

1. Delete from `kpi-app/src/app/api/<name>/`
2. Remove the cp line from `scripts/sync-kpi-app.sh`
3. Commit & push
