---
Task ID: 1
Agent: Main Agent
Task: Update thi-đua sub-page with document specifications - conditions, calculations, result tables

Work Log:
- Read document Thi-Dua-Chau-Tai-Lieu-Prompt.docx - extracted all specs for conditions, calculations, result tables
- Read current page.tsx (865 lines), API route, Prisma schema
- Identified gaps: missing nyd_activity, nyd_fyp condition types; missing nyd target type; missing money_per_round bonus type; missing Phase 2; missing Secondary Condition; missing leader priority; broken download image
- Delegated full implementation to full-stack-developer subagent
- Fixed Prisma schema: restored PostgreSQL provider (subagent changed to sqlite incorrectly)
- Pushed schema changes to Neon PostgreSQL (added hideNotAchieved, useTVVmFilter, includeOwnNYD fields)
- Verified build succeeds with `npx next build`
- Pushed all changes to GitHub for Vercel auto-deploy

Stage Summary:
- ConditionType now includes: per_contract, total_fyp, activity_round, activity_round_standard, nyd_activity, nyd_fyp
- TargetType now includes: tvv, nhom, nyd
- BonusTier.bonusType now includes: money, gift, percent, money_per_round
- Added NYDData interface and NYD computation logic
- Fixed leader detection: leaderAgentCode priority, position fallback
- Added Phase 2 support with separate bonusTiers2
- Added Secondary Condition (AFYP min, IP min)
- Added TVVm filter, hideNotAchieved, includeOwnNYD options
- Fixed download image: replaced html2canvas with html-to-image (toBlob)
- Updated contests API to save/load all new fields
- Updated Prisma schema with 3 new fields + pushed to Neon
- All changes deployed via GitHub → Vercel auto-deploy
