-- Make effectiveDate and issueDate nullable on Contract
-- So users can upload Excel with empty date cells without app filling in fallback values

ALTER TABLE "Contract" ALTER COLUMN "effectiveDate" DROP NOT NULL;
ALTER TABLE "Contract" ALTER COLUMN "issueDate" DROP NOT NULL;
