type ActivityDetailContract = {
  agentCode: string;
  agentName: string;
  contractNumber: string;
  pdt10DT: number;
};

/**
 * Export-only expansion. Qualification/counting stays with the calculator.
 * Both inputs must already be scoped to this recruiter and contest period.
 * A zero-round row can contribute IP to a qualifying TVV's aggregated activity.
 */
export function expandActivityExportDetails<T extends ActivityDetailContract>(
  scopedContracts: T[],
  qualifyingContracts: T[],
): { contract: T; totalIP: number | ''; rounds: number | '' }[] {
  const keyOf = (contract: T) => contract.agentCode.trim().toUpperCase();
  const rounds = new Map<string, number>();
  for (const contract of qualifyingContracts) {
    const key = keyOf(contract);
    if (key) rounds.set(key, (rounds.get(key) || 0) + 1);
  }
  const groups = new Map<string, T[]>();
  for (const contract of scopedContracts) {
    const key = keyOf(contract);
    if (!rounds.has(key)) continue;
    const group = groups.get(key) || [];
    group.push(contract);
    groups.set(key, group);
  }
  return [...groups.entries()]
    .sort(([a, aa], [b, bb]) => aa[0].agentName.localeCompare(bb[0].agentName, 'vi') || a.localeCompare(b))
    .flatMap(([key, contracts]) => {
      const totalIP = contracts.reduce((sum, contract) => sum + contract.pdt10DT, 0);
      return [...contracts]
        .sort((a, b) => a.contractNumber.localeCompare(b.contractNumber))
        .map((contract, index) => ({
          contract,
          totalIP: index === 0 ? totalIP : '' as const,
          rounds: index === 0 ? rounds.get(key)! : '' as const,
        }));
    });
}
