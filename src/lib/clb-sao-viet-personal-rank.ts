export type ClbsvPersonalRankResult =
  | { kind: 'deficit'; amount: number }
  | { kind: 'missing-monthly-ip'; label: string }
  | { kind: 'achieved' };

interface EvaluateClbsvPersonalRankOptions {
  cumulativeFyp: number;
  monthlyIp: number;
  threshold: number;
  minimumMonthlyIp: number;
  month: number;
}

export function evaluateClbsvPersonalRank({
  cumulativeFyp,
  monthlyIp,
  threshold,
  minimumMonthlyIp,
  month,
}: EvaluateClbsvPersonalRankOptions): ClbsvPersonalRankResult {
  if (cumulativeFyp < threshold) {
    return { kind: 'deficit', amount: Math.max(0, threshold - cumulativeFyp) };
  }

  if (monthlyIp < minimumMonthlyIp) {
    return { kind: 'missing-monthly-ip', label: `Thiếu IP T${month}` };
  }

  return { kind: 'achieved' };
}
