const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/app/clb-sao-viet/page.tsx');
const marker = '// nmc-clb-top-ip-v1';
if (!fs.existsSync(filePath)) throw new Error(`Không tìm thấy ${filePath}`);
let source = fs.readFileSync(filePath, 'utf8');
if (source.includes(marker)) {
  console.log('✓ CLB Top IP already applied.');
  process.exit(0);
}

const dynamicAnchor = `const CLBTitleAssessmentSection = dynamic(\n  () => import('@/components/clb-sao-viet-title-assessment').then((mod) => mod.CLBTitleAssessmentSection),\n  { ssr: false, loading: () => <SectionLoading /> },\n);`;
const dynamicInsert = `${dynamicAnchor}\n${marker}\nconst CLBTopIPSection = dynamic(\n  () => import('@/components/clb-sao-viet-top-ip').then((mod) => mod.CLBTopIPSection),\n  { ssr: false, loading: () => <SectionLoading /> },\n);`;
if (!source.includes(dynamicAnchor)) throw new Error('Không tìm thấy anchor CLBTitleAssessmentSection — cần chạy apply-clb-title-assessment trước');
source = source.replace(dynamicAnchor, dynamicInsert);

const stateAnchor = `  const [titleFolderOpen, setTitleFolderOpen] = useState(false);\n  const [openItem, setOpenItem] = useState<string | null>(null);`;
const stateInsert = `  const [titleFolderOpen, setTitleFolderOpen] = useState(false);\n  const [topIpFolderOpen, setTopIpFolderOpen] = useState(false);\n  const [openItem, setOpenItem] = useState<string | null>(null);`;
if (!source.includes(stateAnchor)) throw new Error('Không tìm thấy anchor state titleFolderOpen');
source = source.replace(stateAnchor, stateInsert);

const periodAnchor = `          Xét duy trì, Xét gia nhập và DS thành viên sau đợt xét dùng Đợt 1/{assessmentMonth}/{assessmentYear} và 3 tháng liền trước. Xét danh hiệu chốt theo chỉ tiêu của tháng liền trước đợt xét.`;
const periodInsert = `          Xét duy trì, Xét gia nhập và DS thành viên sau đợt xét dùng Đợt 1/{assessmentMonth}/{assessmentYear} và 3 tháng liền trước. Xét danh hiệu chốt theo chỉ tiêu của tháng liền trước đợt xét. Xét Top IP chỉ lấy doanh số đúng 1 tháng liền trước theo Ngày PH.`;
if (!source.includes(periodAnchor)) throw new Error('Không tìm thấy anchor mô tả kỳ xét sau Mục 4');
source = source.replace(periodAnchor, periodInsert);

// Mục 4 được apply ngay trước script này, nên dùng chính block Mục 4 làm anchor.
// Không bám vào class giao diện cuối trang vì các patch solid/depth đã đổi class trước đó.
const titleFolderAnchor = `        <AssessmentFolder\n          title="Xét danh hiệu CLB"\n          open={titleFolderOpen}\n          onToggle={() => setTitleFolderOpen((value) => !value)}\n        >\n          <AssessmentItem title="Xét danh hiệu - TVV" open={openItem === 'title-tvv'} onToggle={() => toggleItem('title-tvv')}>\n            {openItem === 'title-tvv' ? <CLBTitleAssessmentSection {...sharedProps} program="tvv" /> : null}\n          </AssessmentItem>\n          <AssessmentItem title="Xét danh hiệu - TN KTM" open={openItem === 'title-tn-ktm'} onToggle={() => toggleItem('title-tn-ktm')}>\n            {openItem === 'title-tn-ktm' ? <CLBTitleAssessmentSection {...sharedProps} program="tnKtm" /> : null}\n          </AssessmentItem>\n          <AssessmentItem title="Xét danh hiệu - TN TD" open={openItem === 'title-tn-td'} onToggle={() => toggleItem('title-tn-td')}>\n            {openItem === 'title-tn-td' ? <CLBTitleAssessmentSection {...sharedProps} program="tnTd" /> : null}\n          </AssessmentItem>\n        </AssessmentFolder>`;
const topFolder = `${titleFolderAnchor}\n\n        <AssessmentFolder\n          title="Xét Top IP"\n          open={topIpFolderOpen}\n          onToggle={() => setTopIpFolderOpen((value) => !value)}\n        >\n          {topIpFolderOpen ? <CLBTopIPSection {...sharedProps} /> : null}\n        </AssessmentFolder>`;
if (!source.includes(titleFolderAnchor)) throw new Error('Không tìm thấy anchor Mục 4 Xét danh hiệu CLB');
source = source.replace(titleFolderAnchor, topFolder);

fs.writeFileSync(filePath, source, 'utf8');
console.log('✓ CLB Top IP applied: Mục 5, tháng liền trước, Ngày PH, ngưỡng 80 triệu, Top 3.');
