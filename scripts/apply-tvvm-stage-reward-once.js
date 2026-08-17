const fs = require('fs');

const TARGETS = [
  'src/app/api/clb-sao-viet/duy-tri-tn/route.ts',
  'src/app/api/clb-sao-viet/duy-tri-ttn/route.ts',
];

const MARKER = '// nmc-tvvm-stage-reward-once-v1';
const POLICY_MARKER = '// nmc-tvvm-stage-reward-once-policy-v1';

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

// Đồng bộ cùng quy tắc vào 2 chính sách gốc trên trang Quản lý:
// - Thưởng Tuyển Luyện
// - Thưởng Đồng Hành
// Chỉ thay các block có `tongThuongTVVm += thuongThang + thuongChang`, vì đây là
// hai nơi dùng thưởng TVVm làm nền cho chính sách quản lý; không đụng bảng thưởng TVVm cá nhân.
const policyFile = 'src/app/quan-ly/page.tsx';
let policySource = fs.readFileSync(policyFile, 'utf8');
if (policySource.includes(POLICY_MARKER)) {
  console.log(`✓ TVVm stage reward already one-time: ${policyFile} (Tuyển Luyện + Đồng Hành)`);
} else {
  const policyPattern = /(\s*)(?:\/\/ Thưởng chặng\n\s*)?let thuongChang = 0;\n\s*if \(changInfo\.chang === 1\) \{\n\s*if \(tongIPChang >= 100_000_000\) thuongChang = 6_000_000;\n\s*else if \(tongIPChang >= 50_000_000\) thuongChang = 3_000_000;\n\s*\} else if \(changInfo\.chang >= 2 && changInfo\.chang <= 4\) \{\n\s*if \(tongIPChang >= 100_000_000\) thuongChang = 3_000_000;\n\s*\}\n\s*tongThuongTVVm \+= thuongThang \+ thuongChang;/g;

  let policyReplacementCount = 0;
  policySource = policySource.replace(policyPattern, (_match, indent) => {
    policyReplacementCount += 1;
    const i = indent;
    return `${i}${POLICY_MARKER}\n${i}// Thưởng chặng chỉ ghi nhận phần MỚI phát sinh ở tháng hiện tại.\n${i}// Nếu phần thưởng của cùng chặng đã được ghi nhận ở tháng trước thì không cộng lại.\n${i}const currentMonthStartForStage = new Date(currentYear, currentMonth - 1, 1);\n${i}const previousStageIP = contracts.filter(c => {\n${i}  if (c.agentCode !== tvv.agentCode) return false;\n${i}  const d = getDoanhSoMonth(c);\n${i}  return !isNaN(d.getTime()) && d >= changInfo.rangeStart && d < currentMonthStartForStage;\n${i}}).reduce((s, c) => s + c.pdt10DT, 0);\n${i}const stageRewardEntitlement = (stage: number, stageIP: number): number => {\n${i}  if (stage === 1) {\n${i}    if (stageIP >= 100_000_000) return 6_000_000;\n${i}    if (stageIP >= 50_000_000) return 3_000_000;\n${i}    return 0;\n${i}  }\n${i}  if (stage >= 2 && stage <= 4 && stageIP >= 100_000_000) return 3_000_000;\n${i}  return 0;\n${i}};\n${i}const thuongChang = Math.max(\n${i}  0,\n${i}  stageRewardEntitlement(changInfo.chang, tongIPChang)\n${i}    - stageRewardEntitlement(changInfo.chang, previousStageIP),\n${i});\n${i}tongThuongTVVm += thuongThang + thuongChang;`;
  });

  if (policyReplacementCount !== 2) {
    throw new Error(`[TVVm stage reward] Kỳ vọng sửa đúng 2 block Tuyển Luyện/Đồng Hành, thực tế: ${policyReplacementCount}`);
  }
  fs.writeFileSync(policyFile, policySource, 'utf8');
  changed += 1;
  console.log(`✓ TVVm stage reward one-time applied: ${policyFile} (2 policy blocks)`);
}

console.log(`✓ TVVm stage reward rule: ${changed} file(s) changed.`);
