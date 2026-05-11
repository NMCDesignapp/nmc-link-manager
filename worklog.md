---
Task ID: 1
Agent: main
Task: Fix app issues - links disappearing, data not syncing

Work Log:
- Diagnosed root cause of links appearing then disappearing: SWR revalidation on focus/reconnect causing data to flash
- Added `revalidateOnFocus: false`, `revalidateOnReconnect: false`, `dedupingInterval: 30000`, `keepPreviousData: true` to all SWR calls in page.tsx
- Changed link rendering logic to use `linksLoading && !linksData` instead of just `linksLoading` to prevent skeleton flash during revalidation
- Added separate error state (`linksError && !linksData`) vs empty state (`links.length === 0`)
- Fixed SWR options in monthly-calendar.tsx and settings-panel.tsx similarly
- Fixed `layoutId` conflict between mobile and desktop layouts (mobile-link- vs desktop-link-)
- Added allowedDevOrigins for server ports in next.config.ts
- Added auto-sync feature on thi-đua page when no contract data exists
- Build successful

Stage Summary:
- SWR revalidation flash fixed with keepPreviousData + revalidateOnFocus: false
- layoutId conflict fixed with separate prefixes
- Auto-sync added for first load of thi-đua page
- All changes build successfully
