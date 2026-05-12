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

---
Task ID: 4
Agent: Main Agent
Task: Fix thi-dua page calculations not working (API timeout)

Work Log:
- Diagnosed: /api/contracts was timing out on Vercel due to slow Neon PostgreSQL queries
- Root cause 1: Prisma findMany() without select - fetching all columns including large fields
- Root cause 2: No connection pooling optimization for serverless environment
- Fixed: Added `select` to contracts, staff, recruiters API routes (only needed columns)
- Fixed: Added Cache-Control headers (s-maxage=60, stale-while-revalidate=300)
- Fixed: Optimized db.ts with connection_limit=1, connect_timeout=10, pool_timeout=10 for Neon serverless
- Result: /api/contracts went from TIMEOUT → 200 OK in 0.32s (261KB)

Stage Summary:
- Thi-dua page calculations should work again - all APIs responding fast
- Calculation logic was NOT changed - kept exactly as user built it
- IMPORTANT: Never modify the calculation logic unless user explicitly asks
- Database: 564 contracts, 88 staff, 26 recruiters, 0 links
- App URL: https://nc-link.vercel.app

---
Task ID: 4
Agent: Main Agent
Task: UI tweaks - calendar redesign, neon date picker for thi đua, poster fix

Work Log:
- Redesigned monthly-calendar.tsx: brighter backgrounds (0.04→0.08), less border-radius (rounded-xl→rounded-md), wider gaps (gap-1.5→gap-2), brighter text (0.75→0.90), subtle glow on non-today cells
- Created new component neon-date-picker.tsx: popup calendar matching MonthlyCalendar neon style with month nav, weekday headers, day grid, today/selected highlighting, quick "Hôm nay" and "Xóa" buttons
- Replaced 5 native <Input type="date"> in thi-dua-chau/page.tsx with NeonDatePicker (3 main dates + 2 phase-2 dates)
- Fixed poster image in result dialog: changed object-cover→object-fill so image stretches to fill 21:9 container instead of being cropped
- Deployed to Vercel production: https://nc-link.vercel.app

Stage Summary:
- Calendar: brighter, less rounded corners, wider spacing between cells
- Thi đua date pickers: now use neon popup calendar consistent with main page calendar design
- Poster image: fills the container (stretched) instead of being cropped

---
Task ID: 5
Agent: Main Agent
Task: Move clock to left panel desktop, fix calendar popup alignment

Work Log:
- Created DesktopBigClock component (desktop-big-clock.tsx): big clock with 4.5rem font, neon glow, seconds, day/date info, decorative glow line
- Moved clock from right panel (MonthlyCalendar desktopBright) to left panel below link buttons in page.tsx
- Removed LiveClock from MonthlyCalendar desktopBright top section
- Fixed calendar event popup positioning: changed from bottom-based to top-based positioning with dynamic above/below calculation
- Arrow indicator now dynamically positioned to point at the correct cell even when popup is clamped to edge
- Popup uses fixed positioning with accurate cellCenterX/cellTop/cellBottom coordinates
- Deployed to Vercel: https://nc-link.vercel.app

Stage Summary:
- Desktop left panel: Big neon clock in empty space below links (bigger than NMC text)
- Calendar popup: now properly aligned with cell, arrow points correctly
