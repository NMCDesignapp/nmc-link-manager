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

---
Task ID: 1
Agent: Main Agent
Task: Fix data sync, disappearing links, and desktop layout bugs

Work Log:
- Analyzed the CSV data from user's Google Sheets link - confirmed it loads correctly (568 lines of contract data)
- Fixed use-settings.ts: Changed merge priority so local storage wins over server data (prevents race condition where stale server data overwrites local changes)
- Fixed use-settings.ts: Fixed server sync effect to only write to localStorage when no local data exists at all, and set serverSyncedRef.current = true after first sync
- Fixed page.tsx: Added fallbackData: [] to SWR hooks for links and categories to prevent undefined state
- Fixed page.tsx: Changed links/categories to useMemo for stable references
- Fixed page.tsx: Changed mutate('/api/links') to use async updater function that keeps current data during revalidation
- Fixed page.tsx: Changed loading conditions from `!linksData` to `links.length === 0` to prevent flash of empty state
- Fixed page.tsx: Changed `links.length === 0` empty state to `links.length === 0 && !linksLoading` to prevent showing empty state during initial load
- Fixed page.tsx: Desktop layout - removed justify-center, changed to pt-6 pb-4 padding for better scrolling
- Fixed page.tsx: Desktop link container - changed from max-h-[55vh] to flex-1 overflow-y-auto for proper layout
- Fixed settings-panel.tsx: Added fallbackData: [] and keepPreviousData: true to SWR hooks
- Fixed settings-panel.tsx: Changed mutate('/api/links') calls to use async updater functions
- Fixed sync/route.ts: Replaced parseCSVLine (line-by-line) with parseCSV (full document) to properly handle quoted multi-line fields in CSV
- Fixed sync/route.ts: Removed skipDuplicates: true from createMany calls (not supported by Prisma SQLite)

Stage Summary:
- Links disappearing bug: Fixed by adding fallbackData to SWR, using async updater in mutate, changing rendering conditions
- Desktop layout not updating: Fixed by removing justify-center, using flex-1 instead of max-h-[55vh]
- Settings race condition: Fixed by making local storage win over server data in merge priority
- CSV sync: Fixed parser to handle quoted multi-line fields, removed unsupported skipDuplicates
- User's CSV link tested and confirmed working - 568 lines of contract data loads successfully
- Build passes successfully
