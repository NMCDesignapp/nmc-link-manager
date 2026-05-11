---
Task ID: 1
Agent: Main Agent
Task: Fix data sync, disappearing links, desktop layout bugs

Work Log:
- Fixed SWR revalidation flash with keepPreviousData + revalidateOnFocus: false
- Fixed layoutId conflict with separate prefixes (mobile-link- vs desktop-link-)
- Fixed settings race condition - local storage wins over server data
- Fixed CSV sync parser to handle quoted multi-line fields

Stage Summary:
- All rendering bugs fixed
- SWR hooks configured for stable data display

---
Task ID: 2
Agent: Main Agent
Task: Migrate SQLite to Neon PostgreSQL and deploy to Vercel

Work Log:
- Diagnosed root cause: SQLite doesn't work on Vercel (serverless, read-only filesystem)
- Created Neon PostgreSQL database via neon.new API
- Updated prisma/schema.prisma: provider from sqlite to postgresql, added directUrl
- Added DATABASE_URL and DIRECT_URL to Vercel environment variables
- Deployed to Vercel production successfully

Stage Summary:
- DATABASE: Neon PostgreSQL (cloud, persistent)
  - Pooler URL: postgresql://neondb_owner:npg_Mt5S2qxfcQCw@ep-still-bird-ajsntqwu-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require
  - Direct URL: postgresql://neondb_owner:npg_Mt5S2qxfcQCw@ep-still-bird-ajsntqwu.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require
- VERCEL PRODUCTION URL: https://nc-link.vercel.app
- Vercel alias: https://my-project-phi-two-54.vercel.app
- GITHUB REPO: https://github.com/NMCDesignapp/nmc-link-manager
- ENV VARS ON VERCEL: DATABASE_URL + DIRECT_URL (Production, Development)
- VERCEL TOKEN: [REDACTED]
- SCHEMA: Link, Category, Setting, CalendarEvent, Contract, Staff, Recruiter, Contest
- postinstall script: prisma generate && prisma migrate deploy
- App fully functional on Vercel with Neon PostgreSQL

---
Task ID: 3
Agent: Main Agent
Task: Fix link opening behavior - keep iframe in-app, not open external browser

Work Log:
- User reported "Example Domain" error when clicking links
- Root cause: Seed data had example.com URLs (placeholder)
- User wants links to open IN APP via iframe (with back button), NOT in external browser
- Kept handleOpenLink using IframeModal (no change to open in browser)
- Deleted all placeholder example.com links from database
- Database is now EMPTY - user will add their own real links via Settings > Add Link

Stage Summary:
- IMPORTANT: User adds their OWN real links through the app. NEVER add example/placeholder links!
- Links open in iframe inside the app with back button (user preference)
- If a website blocks iframe, app shows "Mo trong trinh duyet" fallback button
- Database has 0 links, 3 categories (Cong cu, Bao cao, Khac), and settings
- User can add links via: Settings (gear icon) > Add Link
