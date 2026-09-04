import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {
  buildTitleTiers,
  getTitleThresholdPeriod,
  getTitleTierStatus,
} from '../src/lib/clb-title-tier-display.ts';

test('đợt 1/9 dùng đúng cột chỉ tiêu tháng 9, không dùng tháng doanh số 8', () => {
  assert.deepEqual(getTitleThresholdPeriod(2026, 9), {
    year: 2026,
    month: 9,
    thresholdIndex: 3,
    label: '1/9/2026',
  });
});

test('build rewrite mô tả đúng kỳ chỉ tiêu đã chọn và không ghi tháng liền trước', () => {
  const titleScript = fs.readFileSync(new URL('../scripts/apply-clb-title-assessment.js', import.meta.url), 'utf8');
  const topScript = fs.readFileSync(new URL('../scripts/apply-clb-top-ip.js', import.meta.url), 'utf8');
  assert.match(titleScript, /Xét danh hiệu dùng đúng bộ chỉ tiêu của Đợt 1\/\{assessmentMonth\}/);
  assert.match(topScript, /Xét danh hiệu dùng đúng bộ chỉ tiêu của Đợt 1\/\{assessmentMonth\}/);
  assert.doesNotMatch(topScript, /Xét danh hiệu chốt theo chỉ tiêu của tháng liền trước/);
});

test('TVV hiện ĐẠT đúng hạng, hạng đã vượt và số còn thiếu ở hạng kế tiếp', () => {
  const tiers = buildTitleTiers('tvv', {
    vang: 450_000_000,
    bachkim: 740_000_000,
    kimcuong: 1_260_000_000,
    monthlyFypMin: 12_000_000,
  });
  const row = { rank: 'Bạch Kim', fypLuyKe: 800_000_000, fypThang: 20_000_000 };
  assert.equal(getTitleTierStatus('tvv', row, tiers[0]).label, 'ĐÃ VƯỢT');
  assert.equal(getTitleTierStatus('tvv', row, tiers[1]).label, 'ĐẠT');
  assert.equal(getTitleTierStatus('tvv', row, tiers[2]).label, 'Thiếu FYP 460 triệu');
});

test('TVV chưa đủ FYP tháng nêu rõ phần còn thiếu dù đã đủ FYP lũy kế', () => {
  const [tier] = buildTitleTiers('tvv', {
    vang: 450_000_000,
    bachkim: 740_000_000,
    kimcuong: 1_260_000_000,
    monthlyFypMin: 12_000_000,
  });
  assert.equal(
    getTitleTierStatus('tvv', { rank: 'Chưa đạt', fypLuyKe: 500_000_000, fypThang: 8_000_000 }, tier).label,
    'Thiếu FYP tháng 4 triệu',
  );
});

test('TN tuyển dụng hiện đồng thời phần FYP và số TVVm HĐC còn thiếu', () => {
  const tiers = buildTitleTiers('tnTd', {
    vang: { fyp: 400_000_000, hdc: 7 },
    bachkim: { fyp: 900_000_000, hdc: 10 },
  });
  assert.equal(
    getTitleTierStatus('tnTd', { rank: 'Vàng', fypTVVm: 500_000_000, slTvvmHDC: 8 }, tiers[0]).label,
    'ĐẠT',
  );
  assert.equal(
    getTitleTierStatus('tnTd', { rank: 'Vàng', fypTVVm: 500_000_000, slTvvmHDC: 8 }, tiers[1]).label,
    'Thiếu FYP 400 triệu • Thiếu 2 TVVm HĐC',
  );
});
