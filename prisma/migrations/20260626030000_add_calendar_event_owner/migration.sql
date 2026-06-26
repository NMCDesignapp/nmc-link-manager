-- AddColumn: owner field on CalendarEvent (Phụ trách: Công ty / HTKD / PTKD / DVKH / Other text)
ALTER TABLE "CalendarEvent" ADD COLUMN "owner" TEXT NOT NULL DEFAULT '';
