#!/usr/bin/env python3
"""
Round decimals trong trang chính sách (quan-ly/page.tsx):
- Năng suất: toFixed(2) → Math.round
- Tỷ trọng IP, % KH, % progress: toFixed(1)/toFixed(0) → Math.round
- formatKpiCurrency, formatSmartCurrency: bỏ phần thập phân dư
"""

import re
from pathlib import Path

PAGE = Path('/home/z/my-project/src/app/quan-ly/page.tsx')
src = PAGE.read_text(encoding='utf-8')
orig = src

# 1) Năng suất toFixed(2) → Math.round(nangSuat)
src = src.replace(
    "{ label: 'NĂNG SUẤT', unit: 'HĐ/lượt', value: nangSuat.toFixed(2), rawVal: nangSuat, target: 0, targetFmt: '', bg: '#0284C7', hasKH: false },",
    "{ label: 'NĂNG SUẤT', unit: 'HĐ/lượt', value: String(Math.round(nangSuat)), rawVal: nangSuat, target: 0, targetFmt: '', bg: '#0284C7', hasKH: false },"
)

# 2) TỶ TRỌNG IP toFixed(1) → Math.round
src = src.replace(
    "{ label: 'TỶ TRỌNG IP', unit: '%', value: ipAfypRatio.toFixed(1) + '%', rawVal: ipAfypRatio, target: 0, targetFmt: '', bg: '#0891B2', hasKH: false },",
    "{ label: 'TỶ TRỌNG IP', unit: '%', value: Math.round(ipAfypRatio) + '%', rawVal: ipAfypRatio, target: 0, targetFmt: '', bg: '#0891B2', hasKH: false },"
)

# 3) aggPct.toFixed(1) → Math.round(aggPct)
src = src.replace(
    '{aggPct.toFixed(1)}%',
    '{Math.round(aggPct)}%'
)

# 4) monthlyPlan/actualAFYP toFixed(1)tr → Math.round và format tr
src = src.replace(
    "{monthlyPlan > 0 ? (monthlyPlan >= 1_000_000 ? `${(monthlyPlan / 1_000_000).toFixed(1)}tr` : formatNumber(Math.round(monthlyPlan))) : '—'}",
    "{monthlyPlan > 0 ? (monthlyPlan >= 1_000_000 ? `${Math.round(monthlyPlan / 1_000_000)}tr` : formatNumber(Math.round(monthlyPlan))) : '—'}"
)
src = src.replace(
    "{actualAFYP > 0 ? (actualAFYP >= 1_000_000 ? `${(actualAFYP / 1_000_000).toFixed(1)}tr` : formatNumber(Math.round(actualAFYP))) : '—'}",
    "{actualAFYP > 0 ? (actualAFYP >= 1_000_000 ? `${Math.round(actualAFYP / 1_000_000)}tr` : formatNumber(Math.round(actualAFYP))) : '—'}"
)
# Line 3076
src = src.replace(
    "{d.afyp >= 1_000_000 ? `${(d.afyp / 1_000_000).toFixed(1)}tr` : formatNumber(Math.round(d.afyp))}",
    "{d.afyp >= 1_000_000 ? `${Math.round(d.afyp / 1_000_000)}tr` : formatNumber(Math.round(d.afyp))}"
)
# Line 3142/3143
src = src.replace(
    "if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2).replace(/\\.?0+$/, '')} tỷ`;",
    "if (val >= 1_000_000_000) return `${Math.round(val / 1_000_000_000)} tỷ`;"
)
src = src.replace(
    "if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2).replace(/\\.?0+$/, '')} trđ`;",
    "if (val >= 1_000_000) return `${Math.round(val / 1_000_000)} trđ`;"
)

# 5) nangSuatMonth toFixed(2) → Math.round
src = re.sub(
    r"\bnangSuatMonth\.toFixed\(2\)",
    "String(Math.round(nangSuatMonth))",
    src
)
# 6) ipAfypMonth toFixed(1) → Math.round
src = re.sub(
    r"\bipAfypMonth\.toFixed\(1\)",
    "String(Math.round(ipAfypMonth))",
    src
)

# 7) formatKpiCurrency: bỏ thập phân
src = src.replace(
    "  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(3).replace('.', ',')} tỷ`;",
    "  if (amount >= 1_000_000_000) return `${Math.round(amount / 1_000_000_000)} tỷ`;"
)
src = src.replace(
    "  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(3).replace('.', ',')} trđ`;",
    "  if (amount >= 1_000_000) return `${Math.round(amount / 1_000_000)} trđ`;"
)
src = src.replace(
    "  if (amount >= 1_000) return `${(amount / 1_000).toFixed(3).replace('.', ',')} ngàn`;",
    "  if (amount >= 1_000) return `${Math.round(amount / 1_000)} ngàn`;"
)
# formatKpiCurrency: 0 → '0 trđ'
src = src.replace(
    "  if (amount === 0) return '0,000 trđ';",
    "  if (amount === 0) return '0 trđ';"
)

# 8) formatSmartCurrency (mobile) → bỏ thập phân
src = src.replace(
    "    if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2).replace(/\\.?0+$/, '')} tỷ`;",
    "    if (amount >= 1_000_000_000) return `${Math.round(amount / 1_000_000_000)} tỷ`;"
)
src = src.replace(
    "    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2).replace(/\\.?0+$/, '')} trđ`;",
    "    if (amount >= 1_000_000) return `${Math.round(amount / 1_000_000)} trđ`;"
)
src = src.replace(
    "    if (amount >= 1_000) return `${(amount / 1_000).toFixed(1).replace(/\\.?0+$/, '')} ngàn`;",
    "    if (amount >= 1_000) return `${Math.round(amount / 1_000)} ngàn`;"
)

# 9) formatPolicyAmountForBox mobile: round 1dp/2dp → integer
src = src.replace(
    "    if (trVal >= 10) return trVal.toFixed(1).replace('.', ',').replace(/,0$/, '');",
    "    if (trVal >= 10) return Math.round(trVal).toString();"
)
src = src.replace(
    "    return trVal.toFixed(2).replace('.', ',').replace(/,?0+$/, '');",
    "    return Math.round(trVal).toString();"
)

# 10) Line 828-831 helper formatCompact
src = src.replace(
    "    if (Math.abs(val) >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)} tỷ`;",
    "    if (Math.abs(val) >= 1_000_000_000) return `${Math.round(val / 1_000_000_000)} tỷ`;"
)
src = src.replace(
    "    if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)} triệu`;",
    "    if (Math.abs(val) >= 1_000_000) return `${Math.round(val / 1_000_000)} triệu`;"
)
src = src.replace(
    "    return val.toFixed(val % 1 === 0 ? 0 : 1);",
    "    return Math.round(val).toString();"
)

# 11) KPI detail 'decimal' formatType: round integer
src = src.replace(
    "      if (formatType === 'decimal') return value.toFixed(1);",
    "      if (formatType === 'decimal') return String(Math.round(value));"
)
src = src.replace(
    "      if (formatType === 'decimal') return target.toFixed(1);",
    "      if (formatType === 'decimal') return String(Math.round(target));"
)

# 12) pct.toFixed(0) → Math.round(pct) (already integer but consistency)
src = re.sub(r"\bpct\.toFixed\(0\)%", "Math.round(pct)%", src)
src = re.sub(r"\bpct\?\.toFixed\(0\)%", "Math.round(pct ?? 0)%", src)

if src != orig:
    PAGE.write_text(src, encoding='utf-8')
    print(f'OK: page.tsx updated. Size: {len(src)}')
    # Print number of changes by counting remaining toFixed
    remaining = src.count('.toFixed(')
    print(f'Remaining .toFixed occurrences: {remaining}')
else:
    print('No changes made')
