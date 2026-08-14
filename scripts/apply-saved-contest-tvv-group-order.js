const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/components/saved-contest-inline.tsx');
let source = fs.readFileSync(filePath, 'utf8');

function replaceRequired(from, to, label) {
  if (source.includes(to)) return;
  if (!source.includes(from)) {
    throw new Error(`[Saved contest TVV] Không tìm thấy đoạn cần sửa: ${label}`);
  }
  source = source.replace(from, to);
}

replaceRequired(
  `import React, { useEffect, useMemo, useState } from 'react';`,
  `import React, { useCallback, useEffect, useMemo, useState } from 'react';`,
  'thêm useCallback',
);

replaceRequired(
  `  }, [appData.structurePhong, appData.structureAd, appData.structureBanNhom, tvvStructList]);\n\n  // Step 1: filter contracts by contest dates`,
  `  }, [appData.structurePhong, appData.structureAd, appData.structureBanNhom, tvvStructList]);\n\n  // Dùng cùng nguồn Cấu trúc như trang Thi đua để mọi TVV luôn có đúng nhóm.\n  // Ưu tiên DS TVV → DS TB/TN → Nhân sự/NTD → dữ liệu hợp đồng.\n  const resolveTvvGroup = useCallback((agentCode: string, fallbackNhom = '', fallbackMaNhom = '') => {\n    const normalizedCode = norm(agentCode || '').toLowerCase();\n    const clean = (value: unknown) => String(value ?? '').trim();\n    const structureMember = tvvStructList.find(\n      (item) => norm(item.agentCode || '').toLowerCase() === normalizedCode,\n    );\n    const leaderMember = leadersList.find(\n      (item: any) => norm(item?.agentCode || '').toLowerCase() === normalizedCode,\n    );\n    const staffMember = staffList.find(\n      (item) => norm(item.agentCode || '').toLowerCase() === normalizedCode,\n    );\n    const recruiterMember = recruiterList.find(\n      (item) => norm(item.agentCode || '').toLowerCase() === normalizedCode,\n    );\n\n    const groupCode = clean(\n      structureMember?.maBanNhom\n      || leaderMember?.maNhom\n      || leaderMember?.maBanNhom\n      || leaderMember?.maDonVi\n      || leaderMember?.maDV\n      || staffMember?.maNhom\n      || fallbackMaNhom,\n    );\n    const groupRecord = (appData.structureBanNhom || []).find(\n      (item: any) => norm(item?.maBanNhom || '').toLowerCase() === norm(groupCode).toLowerCase(),\n    );\n    const groupName = clean(\n      groupRecord?.tenBanNhom\n      || leaderMember?.nhom\n      || leaderMember?.tenBanNhom\n      || leaderMember?.tenNhom\n      || staffMember?.nhom\n      || recruiterMember?.nhom\n      || fallbackNhom\n      || groupCode\n      || 'CHƯA XÁC ĐỊNH',\n    );\n\n    return { groupName, groupCode: groupCode || groupName };\n  }, [appData.structureBanNhom, leadersList, recruiterList, staffList, tvvStructList]);\n\n  const isPAGroupLabel = useCallback((groupName: string, groupCode: string) => {\n    const value = norm(\`\${groupName || ''} \${groupCode || ''}\`).toUpperCase();\n    return /(^|[\\s_-])PA(?:[\\s_-]|\\d|$)/.test(value);\n  }, []);\n\n  // Step 1: filter contracts by contest dates`,
  'bộ phân giải nhóm TVV',
);

replaceRequired(
  `  const tvvTotalRows = useMemo(\n    () => computeTVVTotalRows(displayContracts, config, staffList, recruiterList, tvvStructList, priorityTvvCodes),\n    [displayContracts, config, staffList, recruiterList, tvvStructList, priorityTvvCodes]\n  );\n  const tvvPerContractRows = useMemo(\n    () => computeTVVPerContractRows(displayContracts, config, tvvStructList),\n    [displayContracts, config, tvvStructList]\n  );`,
  `  const tvvTotalRows = useMemo(() => {\n    const rows = computeTVVTotalRows(\n      displayContracts, config, staffList, recruiterList, tvvStructList, priorityTvvCodes,\n    );\n    return rows\n      .map((row) => {\n        const resolved = resolveTvvGroup(row.agent.agentCode, row.agent.nhom, row.agent.maNhom);\n        return {\n          ...row,\n          agent: { ...row.agent, nhom: resolved.groupName, maNhom: resolved.groupCode },\n        };\n      })\n      .sort((a, b) => {\n        const valueDiff = b.value - a.value;\n        if (valueDiff !== 0) return valueDiff;\n        if (a.value === 0) {\n          const aPA = isPAGroupLabel(a.agent.nhom, a.agent.maNhom);\n          const bPA = isPAGroupLabel(b.agent.nhom, b.agent.maNhom);\n          if (aPA !== bPA) return aPA ? 1 : -1;\n        }\n        const aPriority = priorityTvvCodes.has(a.agent.agentCode) ? 1 : 0;\n        const bPriority = priorityTvvCodes.has(b.agent.agentCode) ? 1 : 0;\n        if (aPriority !== bPriority) return bPriority - aPriority;\n        return (a.agent.agentName || a.agent.agentCode).localeCompare(\n          b.agent.agentName || b.agent.agentCode, 'vi',\n        );\n      });\n  }, [displayContracts, config, staffList, recruiterList, tvvStructList, priorityTvvCodes, resolveTvvGroup, isPAGroupLabel]);\n\n  const tvvPerContractRows = useMemo(() => {\n    const rows = computeTVVPerContractRows(displayContracts, config, tvvStructList);\n    return rows\n      .map((row) => {\n        const resolved = resolveTvvGroup(\n          row.contract.agentCode, row.contract.nhom, row.contract.maNhom,\n        );\n        return {\n          ...row,\n          contract: {\n            ...row.contract,\n            nhom: resolved.groupName,\n            maNhom: resolved.groupCode,\n          },\n        };\n      })\n      .sort((a, b) => {\n        const valueDiff = b.cValue - a.cValue;\n        if (valueDiff !== 0) return valueDiff;\n        if (a.cValue === 0) {\n          const aPA = isPAGroupLabel(a.contract.nhom, a.contract.maNhom);\n          const bPA = isPAGroupLabel(b.contract.nhom, b.contract.maNhom);\n          if (aPA !== bPA) return aPA ? 1 : -1;\n        }\n        return (a.contract.agentName || a.contract.agentCode).localeCompare(\n          b.contract.agentName || b.contract.agentCode, 'vi',\n        );\n      });\n  }, [displayContracts, config, tvvStructList, resolveTvvGroup, isPAGroupLabel]);`,
  'tính nhóm và sắp xếp TVV',
);

replaceRequired(
  `      // Also from tvvTotalRows\n      for (const r of tvvTotalRows) if (r.agent.nhom) set.add(r.agent.nhom);`,
  `      // Also from both result modes after resolving group from Cấu trúc.\n      for (const r of tvvTotalRows) if (r.agent.nhom) set.add(r.agent.nhom);\n      for (const r of tvvPerContractRows) if (r.contract.nhom) set.add(r.contract.nhom);`,
  'danh sách lọc nhóm',
);

replaceRequired(
  `  }, [groupedData, displayContracts, tvvTotalRows, nydData, config.targetType]);`,
  `  }, [groupedData, displayContracts, tvvTotalRows, tvvPerContractRows, nydData, config.targetType]);`,
  'dependency danh sách nhóm',
);

fs.writeFileSync(filePath, source, 'utf8');
console.log('✓ Sao Việt toàn chặng: đã bổ sung nhóm cho TVV và đồng bộ thứ tự với trang Thi đua.');
