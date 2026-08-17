const fs = require('fs');

const TARGETS = [
  'src/app/api/clb-sao-viet/duy-tri-tn/route.ts',
  'src/app/api/clb-sao-viet/duy-tri-ttn/route.ts',
];

const MARKER = '// nmc-tvvm-stage-reward-once-v1';

const OLD_BLOCK = `          let stageReward = 0;
          if (tvvStart && !Number.isNaN(tvvStart.getTime())) {
            const range = stageRange(tvvStart, month);
            if (range) {
              const stageIP = sumAgentIP(tvvCode, range.start, range.endExclusive);
              if (range.stage === 1) {
                if (stageIP >= 100_000_000) stageReward = 6_000_000;
                else if (stageIP >= 50_000_000) stageReward = 3_000_000;
              } else if (range.stage >= 2 && range.stage <= 4 && stageIP >= 100_000_000) {
                stageReward = 3_000_000;
              }
            }
          }
`;

const NEW_BLOCK = `          ${MARKER}
          // Chỉ cộng PHẦN THƯỞNG CHẶNG MỚI PHÁT SINH trong tháng hiện tại.
          // Phần đã đạt/đã tính ở tháng trước trong cùng chặng tuyệt đối không cộng lại.
          // Riêng Chặng 1: nếu trước đó đã đạt mốc 50tr (3tr) rồi sau đó lên 100tr (6tr),
          // tháng sau chỉ cộng phần tăng thêm 3tr, không cộng lại toàn bộ 6tr.
          let stageReward = 0;
          if (tvvStart && !Number.isNaN(tvvStart.getTime())) {
            const range = stageRange(tvvStart, month);
            if (range) {
              const stageRewardEntitlement = (stage: number, stageIP: number): number => {
                if (stage === 1) {
                  if (stageIP >= 100_000_000) return 6_000_000;
                  if (stageIP >= 50_000_000) return 3_000_000;
                  return 0;
                }
                if (stage >= 2 && stage <= 4 && stageIP >= 100_000_000) return 3_000_000;
                return 0;
              };

              const currentStageIP = sumAgentIP(tvvCode, range.start, range.endExclusive);
              // 'start' là đầu tháng đang xét. Đây chính là IP lũy kế của chặng TRƯỚC tháng hiện tại.
              const previousStageIP = sumAgentIP(tvvCode, range.start, start);
              const currentEntitlement = stageRewardEntitlement(range.stage, currentStageIP);
              const previousEntitlement = stageRewardEntitlement(range.stage, previousStageIP);
              stageReward = Math.max(0, currentEntitlement - previousEntitlement);
            }
          }
`;

let changed = 0;
for (const file of TARGETS) {
  let source = fs.readFileSync(file, 'utf8');
  if (source.includes(MARKER)) {
    console.log(`✓ TVVm stage reward already one-time: ${file}`);
    continue;
  }
  if (!source.includes(OLD_BLOCK)) {
    throw new Error(`[TVVm stage reward] Không tìm thấy đoạn cần sửa trong ${file}`);
  }
  source = source.replace(OLD_BLOCK, NEW_BLOCK);
  fs.writeFileSync(file, source, 'utf8');
  changed += 1;
  console.log(`✓ TVVm stage reward one-time applied: ${file}`);
}

console.log(`✓ TVVm stage reward rule: ${changed} file(s) changed.`);
