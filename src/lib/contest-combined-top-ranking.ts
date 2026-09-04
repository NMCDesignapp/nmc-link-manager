export type CombinedTopCondition =
  | 'per_contract_ip'
  | 'per_contract_afyp'
  | 'total_ip'
  | 'total_afyp';

export interface CombinedTopCandidate {
  /** Stable row/entity key used to attach ranking metadata back to a result row. */
  key: string;
  /** The exact primary contest metric shown for this row/entity. */
  value: number;
  /** Only candidates that already satisfy the primary contest condition may rank. */
  qualified: boolean;
}

export interface CombinedTopRanking {
  rank: number;
  title: string;
  reward: number;
  note: string;
}

export function supportsCombinedTopRanking(conditionType: string): conditionType is CombinedTopCondition {
  return conditionType === 'per_contract_ip'
    || conditionType === 'per_contract_afyp'
    || conditionType === 'total_ip'
    || conditionType === 'total_afyp';
}

export function getCombinedTopMetric(conditionType: string): 'ip' | 'afyp' {
  return conditionType === 'per_contract_afyp' || conditionType === 'total_afyp'
    ? 'afyp'
    : 'ip';
}

export function getCombinedTopTitle(rank: number): string {
  if (rank === 1) return 'Quán quân';
  if (rank === 2) return 'Á quân';
  return `TOP ${rank}`;
}

export function formatCombinedTopReward(amount: number): string {
  const normalized = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(normalized)}đ`;
}

/**
 * Build ranking metadata for the additive TOP contest.
 *
 * Rules:
 * - TOP is never a replacement for the primary condition.
 * - A row/entity must already satisfy the primary condition (`qualified=true`).
 * - Ranking uses the exact same metric as the primary contest row.
 * - Rank prizes are independent from the primary reward column.
 * - Equal values use the stable key as a deterministic tie-breaker, matching the
 *   existing app's sequential TOP behavior instead of creating shared ranks.
 */
export function buildCombinedTopRanking(
  candidates: CombinedTopCandidate[],
  topN: number,
  rewardAmounts: number[],
): Map<string, CombinedTopRanking> {
  const limit = Math.max(0, Math.floor(Number(topN) || 0));
  if (limit === 0) return new Map();

  const eligible = candidates
    .filter(candidate => candidate.qualified)
    .map(candidate => ({
      ...candidate,
      value: Number.isFinite(candidate.value) ? candidate.value : 0,
    }))
    .sort((a, b) => {
      const diff = b.value - a.value;
      if (diff !== 0) return diff;
      return a.key.localeCompare(b.key, 'vi');
    })
    .slice(0, limit);

  const result = new Map<string, CombinedTopRanking>();
  eligible.forEach((candidate, index) => {
    const rank = index + 1;
    const title = getCombinedTopTitle(rank);
    const reward = Math.max(0, Number(rewardAmounts[index]) || 0);
    result.set(candidate.key, {
      rank,
      title,
      reward,
      note: `${title} - ${formatCombinedTopReward(reward)}`,
    });
  });
  return result;
}
