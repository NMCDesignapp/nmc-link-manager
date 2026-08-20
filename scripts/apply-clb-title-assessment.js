const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/app/clb-sao-viet/page.tsx');
const marker = '// nmc-clb-title-assessment-v1';
if (!fs.existsSync(filePath)) throw new Error(`Không tìm thấy ${filePath}`);
let source = fs.readFileSync(filePath, 'utf8');
if (source.includes(marker)) {
  console.log('✓ CLB title assessment already applied.');
  require('./apply-clb-top-ip.js');
  require('./apply-multi-group-filters.js');
  require('./apply-saved-contest-multigroup-fix.js');
  require('./apply-multi-group-filter-ux.js');
  process.exit(0);
}

const dynamicAnchor = `const CLBPostAssessmentMembers = dynamic(\n  () => import('@/components/clb-sao-viet-post-assessment').then((mod) => mod.CLBPostAssessmentMembers),\n  { ssr: false, loading: () => <SectionLoading /> },\n);`;
const dynamicInsert = `${dynamicAnchor}\n${marker}\nconst CLBTitleAssessmentSection = dynamic(\n  () => import('@/components/clb-sao-viet-title-assessment').then((mod) => mod.CLBTitleAssessmentSection),\n  { ssr: false, loading: () => <SectionLoading /> },\n);`;
if (!source.includes(dynamicAnchor)) throw new Error('Không tìm thấy anchor dynamic CLBPostAssessmentMembers');
source = source.replace(dynamicAnchor, dynamicInsert);

const stateAnchor = `  const [membersFolderOpen, setMembersFolderOpen] = useState(false);\n  const [openItem, setOpenItem] = useState<string | null>(null);`;
const stateInsert = `  const [membersFolderOpen, setMembersFolderOpen] = useState(false);\n  const [titleFolderOpen, setTitleFolderOpen] = useState(false);\n  const [openItem, setOpenItem] = useState<string | null>(null);`;
if (!source.includes(stateAnchor)) throw new Error('Không tìm thấy anchor state membersFolderOpen');
source = source.replace(stateAnchor, stateInsert);

const periodAnchor = `          tất cả mục Xét duy trì, Xét gia nhập và DS thành viên sau đợt xét đều sử dụng Đợt 1/{assessmentMonth}/{assessmentYear} đã chọn phía trên và lấy 3 tháng liền trước.`;
const periodInsert = `          Xét duy trì, Xét gia nhập và DS thành viên sau đợt xét dùng Đợt 1/{assessmentMonth}/{assessmentYear} và 3 tháng liền trước. Xét danh hiệu chốt theo chỉ tiêu của tháng liền trước đợt xét.`;
if (!source.includes(periodAnchor)) throw new Error('Không tìm thấy anchor mô tả kỳ xét');
source = source.replace(periodAnchor, periodInsert);

const folderAnchor = `        <AssessmentFolder\n          title={\`DS thành viên CLB Sao Việt sau đợt xét ngày 1/\${assessmentMonth}/\${assessmentYear}\`}\n          open={membersFolderOpen}\n          onToggle={() => setMembersFolderOpen((value) => !value)}\n        >\n          {membersFolderOpen ? <CLBPostAssessmentMembers {...sharedProps} /> : null}\n        </AssessmentFolder>`;
const folderInsert = `${folderAnchor}\n\n        <AssessmentFolder\n          title="Xét danh hiệu CLB"\n          open={titleFolderOpen}\n          onToggle={() => setTitleFolderOpen((value) => !value)}\n        >\n          <AssessmentItem title="Xét danh hiệu - TVV" open={openItem === 'title-tvv'} onToggle={() => toggleItem('title-tvv')}>\n            {openItem === 'title-tvv' ? <CLBTitleAssessmentSection {...sharedProps} program="tvv" /> : null}\n          </AssessmentItem>\n          <AssessmentItem title="Xét danh hiệu - TN KTM" open={openItem === 'title-tn-ktm'} onToggle={() => toggleItem('title-tn-ktm')}>\n            {openItem === 'title-tn-ktm' ? <CLBTitleAssessmentSection {...sharedProps} program="tnKtm" /> : null}\n          </AssessmentItem>\n          <AssessmentItem title="Xét danh hiệu - TN TD" open={openItem === 'title-tn-td'} onToggle={() => toggleItem('title-tn-td')}>\n            {openItem === 'title-tn-td' ? <CLBTitleAssessmentSection {...sharedProps} program="tnTd" /> : null}\n          </AssessmentItem>\n        </AssessmentFolder>`;
if (!source.includes(folderAnchor)) throw new Error('Không tìm thấy anchor DS thành viên Mục 3');
source = source.replace(folderAnchor, folderInsert);

fs.writeFileSync(filePath, source, 'utf8');
console.log('✓ CLB title assessment applied: Mục 4 + 3 chương trình.');
require('./apply-clb-top-ip.js');
require('./apply-multi-group-filters.js');
require('./apply-saved-contest-multigroup-fix.js');
require('./apply-multi-group-filter-ux.js');