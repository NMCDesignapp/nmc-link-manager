# Task: Create /quan-ly Management Page

## Summary
Created a comprehensive management/Excel-like page at `/quan-ly` with 5 sheets, editable tables, and full CRUD APIs.

## Files Created

### API Routes
1. `/src/app/api/leaders/route.ts` - GET (list all), POST (create single/bulk upsert), DELETE (delete all)
2. `/src/app/api/leaders/[id]/route.ts` - PATCH (update single), DELETE (delete single)
3. `/src/app/api/revenue/route.ts` - GET (list all with optional month filter), POST (create single/bulk create), DELETE (delete all)
4. `/src/app/api/revenue/[id]/route.ts` - PATCH (update single), DELETE (delete single)

### Page
5. `/src/app/quan-ly/page.tsx` - Full management page with:
   - Sidebar navigation with 5 sheets
   - Dashboard overview with stats cards and revenue chart (Recharts)
   - Leader Info sheet (editable, spreadsheet-like)
   - Monthly Revenue sheet (editable, spreadsheet-like)
   - Contracts sheet (read-only from existing data)
   - Staff sheet (read-only, combines Staff + Recruiter data)
   - Search/filter, sort by column, export to Excel, import from CSV/Excel
   - Auto-save with debounced API calls (600ms)
   - Responsive design with collapsible sidebar
   - Solid dark theme: bg-[#0a0a1a] page, bg-emerald-900 sidebar, bg-emerald-800 table headers

## Key Design Decisions
- Used `RowData = Record<string, string | number | null>` as unified type to avoid TypeScript issues with generic data
- `toRowData()` utility converts API responses to consistent format
- `processData()` combines filter + sort in one function
- EditableCell component: click to edit, Enter/blur to save, Escape to cancel
- Bulk import parses Excel/CSV using xlsx library, maps column headers to field keys
- Leaders use upsert (update if agentCode exists), Revenue uses createMany (append mode)
