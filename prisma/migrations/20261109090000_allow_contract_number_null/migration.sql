-- BC02 can contain valid current-month rows that have a proposal number but
-- do not have a policy number yet. Keep those rows instead of rejecting the
-- whole authoritative snapshot.
ALTER TABLE "Contract" ALTER COLUMN "contractNumber" DROP NOT NULL;
