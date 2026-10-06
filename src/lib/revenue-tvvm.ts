export interface RevenueTVVmContract {
  ngayBatDauLamViec: string | null;
  effectiveDate: string | null;
  afyp: number;
}

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
}

function addMonthsClamped(date: Date, months: number): Date {
  const targetYear = date.getFullYear() + Math.floor((date.getMonth() + months) / 12);
  const targetMonth = (date.getMonth() + months) % 12;
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  return new Date(targetYear, targetMonth, Math.min(date.getDate(), lastDay));
}

/**
 * Một hợp đồng được tính AFYP TVVm khi Ngày hiệu lực nằm trong khoảng
 * từ Ngày bắt đầu làm việc đến hết đúng 12 tháng sau đó (tính cả hai đầu).
 */
export function isRevenueTVVmContract(
  contract: Pick<RevenueTVVmContract, 'ngayBatDauLamViec' | 'effectiveDate'>
): boolean {
  const startDate = parseDateOnly(contract.ngayBatDauLamViec);
  const effectiveDate = parseDateOnly(contract.effectiveDate);
  if (!startDate || !effectiveDate) return false;

  const twelveMonthCutoff = addMonthsClamped(startDate, 12);
  return effectiveDate >= startDate && effectiveDate <= twelveMonthCutoff;
}

export function calculateRevenueTVVmAFYP(contracts: RevenueTVVmContract[]): number {
  return contracts.reduce(
    (total, contract) => total + (isRevenueTVVmContract(contract) ? Number(contract.afyp) || 0 : 0),
    0
  );
}
