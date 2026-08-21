#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'src', 'components', 'kpi-contest-notice.tsx');
const standalonePath = path.join(root, 'kpi-app', 'src', 'components', 'kpi-contest-notice.tsx');
const pagePath = path.join(root, 'src', 'app', 'kpi', 'page.tsx');
const UI_MARKER = '/* nmc-kpi-region-notice-polish-v1 */';
const POPUP_MARKER = 'data-kpi-contest-popup="true"';

if (!fs.existsSync(sourcePath)) throw new Error(`Không tìm thấy ${sourcePath}`);
if (!fs.existsSync(pagePath)) throw new Error(`Không tìm thấy ${pagePath}`);

let source = fs.readFileSync(sourcePath, 'utf8');
source = source.replace('const ROTATE_MS = 7_500;', 'const ROTATE_MS = 5_000;');
source = source.replace(
  'animation: kpiContestNoticeIn .5s cubic-bezier(.22,1,.36,1);',
  'animation: kpiContestNoticeIn .96s cubic-bezier(.16,1,.3,1); will-change: opacity, transform;',
);
source = source.replace(
  'from { opacity: 0; transform: translateX(10px); }\n          to { opacity: 1; transform: translateX(0); }',
  'from { opacity: 0; transform: translateX(8px) scale(.997); }\n          45% { opacity: .72; }\n          to { opacity: 1; transform: translateX(0) scale(1); }',
);
source = source.replace('margin: 10px 0 16px;', 'margin: 18px 0 16px;');
source = source.replace(
  '          padding: 5px;\n          border: 1px solid rgba(230, 189, 85, .5);',
  '          padding: 0;\n          border: 1px solid rgba(230, 189, 85, .5);',
);
source = source.replace('          object-fit: contain;', '          object-fit: cover;');

if (!source.includes(POPUP_MARKER)) {
  const stateAnchor = '  const [posterFailed, setPosterFailed] = useState(false);\n';
  if (!source.includes(stateAnchor)) throw new Error('Không tìm thấy state poster để thêm popup.');
  source = source.replace(stateAnchor, `${stateAnchor}  const [popupOpen, setPopupOpen] = useState(false);\n`);

  const rotationAnchor = `  useEffect(() => {\n    if (sorted.length <= 1) return;\n    const timer = window.setInterval(() => {\n      setIndex((current) => (current + 1) % sorted.length);\n    }, ROTATE_MS);\n    return () => window.clearInterval(timer);\n  }, [sorted.length]);\n`;
  if (!source.includes(rotationAnchor)) throw new Error('Không tìm thấy timer luân phiên để tạm dừng khi mở popup.');
  source = source.replace(
    rotationAnchor,
    `  useEffect(() => {\n    if (sorted.length <= 1 || popupOpen) return;\n    const timer = window.setInterval(() => {\n      setIndex((current) => (current + 1) % sorted.length);\n    }, ROTATE_MS);\n    return () => window.clearInterval(timer);\n  }, [sorted.length, popupOpen]);\n`,
  );

  const effectAnchor = `  useEffect(() => {\n    if (index >= sorted.length && sorted.length > 0) setIndex(0);\n    setPosterFailed(false);\n  }, [index, sorted.length]);\n`;
  if (!source.includes(effectAnchor)) throw new Error('Không tìm thấy effect index để thêm xử lý popup.');
  source = source.replace(
    effectAnchor,
    `${effectAnchor}\n  useEffect(() => {\n    if (!popupOpen) return;\n    const previousOverflow = document.body.style.overflow;\n    document.body.style.overflow = 'hidden';\n    const onKeyDown = (event: KeyboardEvent) => {\n      if (event.key === 'Escape') setPopupOpen(false);\n    };\n    window.addEventListener('keydown', onKeyDown);\n    return () => {\n      document.body.style.overflow = previousOverflow;\n      window.removeEventListener('keydown', onKeyDown);\n    };\n  }, [popupOpen]);\n`,
  );

  const posterOpen = '          <div className="kpi-contest-poster-wrap">\n';
  if (!source.includes(posterOpen)) throw new Error('Không tìm thấy khung poster để gắn thao tác mở popup.');
  source = source.replace(
    posterOpen,
    `          <button\n            type="button"\n            className="kpi-contest-poster-wrap"\n            onClick={() => setPopupOpen(true)}\n            aria-label={\`Xem poster lớn: \${current.title}\`}\n            title="Bấm để xem poster lớn"\n          >\n`,
  );

  const posterClose = `          </div>\n\n          <div className="kpi-contest-copy">`;
  if (!source.includes(posterClose)) throw new Error('Không tìm thấy điểm đóng khung poster.');
  source = source.replace(posterClose, `          </button>\n\n          <div className="kpi-contest-copy">`);

  const styleAnchor = '      <style jsx>{`\n';
  if (!source.includes(styleAnchor)) throw new Error('Không tìm thấy style component để chèn popup.');

  const popupJsx = `      {popupOpen && current && (\n        <div\n          className="kpi-contest-modal-backdrop"\n          data-kpi-contest-popup="true"\n          role="presentation"\n          onClick={() => setPopupOpen(false)}\n        >\n          <div\n            className="kpi-contest-modal"\n            role="dialog"\n            aria-modal="true"\n            aria-label={\`Chi tiết chương trình \${current.title}\`}\n            onClick={(event) => event.stopPropagation()}\n          >\n            <button\n              type="button"\n              className="kpi-contest-modal-close"\n              onClick={() => setPopupOpen(false)}\n              aria-label="Đóng chi tiết chương trình"\n            >\n              ×\n            </button>\n\n            <div className="kpi-contest-modal-poster-stage">\n              {!posterFailed ? (\n                <img\n                  src={current.posterUrl}\n                  alt={\`Poster lớn \${current.title}\`}\n                  className="kpi-contest-modal-poster"\n                  onError={() => setPosterFailed(true)}\n                  draggable={false}\n                />\n              ) : (\n                <div className="kpi-contest-modal-poster-fallback">\n                  <span>★</span>\n                  <strong>THI ĐUA</strong>\n                </div>\n              )}\n            </div>\n\n            <div className="kpi-contest-modal-info">\n              <div className="kpi-contest-modal-kicker">THÔNG TIN CHƯƠNG TRÌNH</div>\n              <h3>{current.title}</h3>\n              <div className="kpi-contest-modal-meta">\n                <div>\n                  <span>Bắt đầu</span>\n                  <strong>{formatDate(current.startDate)}</strong>\n                </div>\n                <div>\n                  <span>Đối tượng thi đua</span>\n                  <strong>{targetLabel(current)}</strong>\n                </div>\n              </div>\n              <div className={\`kpi-contest-modal-end kpi-contest-modal-end-\${status?.tone || 'active'}\`}>\n                <div>\n                  <span>KẾT THÚC THI ĐUA</span>\n                  <strong>{formatDate(current.endDate)}</strong>\n                </div>\n                <em>{status?.text}</em>\n              </div>\n            </div>\n          </div>\n        </div>\n      )}\n\n`;
  source = source.replace(styleAnchor, `${popupJsx}${styleAnchor}`);

  const cssAnchor = `        .kpi-contest-poster-wrap {\n`;
  if (!source.includes(cssAnchor)) throw new Error('Không tìm thấy CSS poster để thêm trạng thái tương tác.');
  source = source.replace(
    cssAnchor,
    `        .kpi-contest-poster-wrap {\n          appearance: none;\n          font: inherit;\n          cursor: zoom-in;\n`,
  );

  const fallbackCssAnchor = `        .kpi-contest-poster-fallback span { font-size: 24px; }\n`;
  if (!source.includes(fallbackCssAnchor)) throw new Error('Không tìm thấy CSS fallback poster để thêm popup styles.');
  const popupCss = `        .kpi-contest-poster-wrap:focus-visible {\n          outline: 2px solid rgba(126, 220, 244, .95);\n          outline-offset: 2px;\n        }\n        .kpi-contest-modal-backdrop {\n          position: fixed;\n          inset: 0;\n          z-index: 10050;\n          display: flex;\n          align-items: center;\n          justify-content: center;\n          padding: 14px;\n          background: rgba(1, 8, 17, .86);\n          backdrop-filter: blur(8px);\n          -webkit-backdrop-filter: blur(8px);\n          animation: kpiContestModalBackdropIn .24s ease-out both;\n        }\n        .kpi-contest-modal {\n          position: relative;\n          width: min(760px, 100%);\n          max-height: calc(100dvh - 28px);\n          overflow: auto;\n          border: 1px solid rgba(96, 191, 220, .58);\n          border-radius: 16px;\n          background: linear-gradient(160deg, #071a2b 0%, #07131f 60%, #0b1d2b 100%);\n          box-shadow: 0 28px 80px rgba(0,0,0,.62), inset 0 1px 0 rgba(255,255,255,.06);\n          overscroll-behavior: contain;\n          animation: kpiContestModalIn .34s cubic-bezier(.16,1,.3,1) both;\n        }\n        .kpi-contest-modal-close {\n          position: absolute;\n          z-index: 2;\n          top: 10px;\n          right: 10px;\n          width: 36px;\n          height: 36px;\n          display: grid;\n          place-items: center;\n          border: 1px solid rgba(255,255,255,.24);\n          border-radius: 999px;\n          background: rgba(2, 10, 18, .78);\n          color: #fff;\n          font: 700 25px/1 Arial, sans-serif;\n          cursor: pointer;\n          box-shadow: 0 4px 14px rgba(0,0,0,.34);\n        }\n        .kpi-contest-modal-poster-stage {\n          width: 100%;\n          min-height: 220px;\n          display: flex;\n          align-items: center;\n          justify-content: center;\n          background: #01070d;\n          border-bottom: 1px solid rgba(230, 189, 85, .35);\n          overflow: hidden;\n        }\n        .kpi-contest-modal-poster {\n          display: block;\n          width: 100%;\n          max-height: 58dvh;\n          object-fit: contain;\n          user-select: none;\n          -webkit-user-drag: none;\n        }\n        .kpi-contest-modal-poster-fallback {\n          width: 100%;\n          min-height: 260px;\n          display: flex;\n          flex-direction: column;\n          align-items: center;\n          justify-content: center;\n          gap: 8px;\n          color: #f4d477;\n          background: radial-gradient(circle at 50% 30%, #143c58, #061724 72%);\n          letter-spacing: .12em;\n        }\n        .kpi-contest-modal-poster-fallback span { font-size: 38px; }\n        .kpi-contest-modal-info {\n          padding: 16px;\n        }\n        .kpi-contest-modal-kicker {\n          color: #79d9ed;\n          font-size: 10px;\n          font-weight: 900;\n          letter-spacing: .14em;\n        }\n        .kpi-contest-modal-info h3 {\n          margin: 7px 0 14px;\n          color: #f7fbff;\n          font-size: clamp(18px, 3.8vw, 26px);\n          line-height: 1.18;\n          font-weight: 900;\n          text-transform: uppercase;\n        }\n        .kpi-contest-modal-meta {\n          display: grid;\n          grid-template-columns: repeat(2, minmax(0, 1fr));\n          gap: 9px;\n          margin-bottom: 10px;\n        }\n        .kpi-contest-modal-meta > div {\n          min-width: 0;\n          padding: 10px 11px;\n          border: 1px solid rgba(92, 160, 191, .28);\n          border-radius: 10px;\n          background: rgba(20, 57, 79, .62);\n        }\n        .kpi-contest-modal-meta span,\n        .kpi-contest-modal-end span {\n          display: block;\n          margin-bottom: 3px;\n          color: #88aabd;\n          font-size: 9px;\n          font-weight: 900;\n          text-transform: uppercase;\n          letter-spacing: .08em;\n        }\n        .kpi-contest-modal-meta strong {\n          color: #ecfaff;\n          font-size: 14px;\n        }\n        .kpi-contest-modal-end {\n          display: flex;\n          align-items: center;\n          justify-content: space-between;\n          gap: 10px;\n          padding: 12px;\n          border: 1px solid rgba(241, 201, 95, .62);\n          border-radius: 11px;\n          background: linear-gradient(135deg, rgba(120, 77, 15, .62), rgba(66, 41, 8, .46));\n          box-shadow: 0 0 20px rgba(241, 201, 95, .08);\n        }\n        .kpi-contest-modal-end span { color: #f5d788; }\n        .kpi-contest-modal-end strong {\n          display: block;\n          color: #fff2bd;\n          font-size: clamp(20px, 5vw, 28px);\n          line-height: 1;\n          white-space: nowrap;\n        }\n        .kpi-contest-modal-end em {\n          flex: 0 0 auto;\n          padding: 7px 9px;\n          border: 1px solid rgba(93, 219, 145, .42);\n          border-radius: 999px;\n          background: rgba(35, 132, 81, .34);\n          color: #c9ffdc;\n          font-size: 10px;\n          line-height: 1;\n          font-weight: 900;\n          font-style: normal;\n          white-space: nowrap;\n        }\n        .kpi-contest-modal-end-today {\n          border-color: rgba(255, 140, 77, .78);\n          background: linear-gradient(135deg, rgba(142, 59, 23, .67), rgba(74, 29, 10, .54));\n        }\n        .kpi-contest-modal-end-today em {\n          color: #ffe1cc;\n          border-color: rgba(255, 137, 85, .58);\n          background: rgba(185, 63, 26, .44);\n        }\n        .kpi-contest-modal-end-ended {\n          border-color: rgba(132, 153, 170, .4);\n          background: rgba(39, 52, 64, .64);\n        }\n        .kpi-contest-modal-end-ended em {\n          color: #c8d5df;\n          border-color: rgba(159, 178, 193, .32);\n          background: rgba(75, 92, 107, .42);\n        }\n        @keyframes kpiContestModalBackdropIn {\n          from { opacity: 0; }\n          to { opacity: 1; }\n        }\n        @keyframes kpiContestModalIn {\n          from { opacity: 0; transform: translateY(12px) scale(.985); }\n          to { opacity: 1; transform: translateY(0) scale(1); }\n        }\n        @media (max-width: 560px) {\n          .kpi-contest-modal-backdrop { padding: 8px; }\n          .kpi-contest-modal {\n            width: 100%;\n            max-height: calc(100dvh - 16px);\n            border-radius: 13px;\n          }\n          .kpi-contest-modal-poster { max-height: 52dvh; }\n          .kpi-contest-modal-info { padding: 13px; }\n          .kpi-contest-modal-meta { gap: 7px; }\n          .kpi-contest-modal-end { align-items: flex-end; }\n          .kpi-contest-modal-end strong { font-size: 21px; }\n          .kpi-contest-modal-end em { font-size: 9px; padding: 6px 8px; }\n        }\n`;
  source = source.replace(fallbackCssAnchor, `${fallbackCssAnchor}${popupCss}`);
}

if (!source.includes('const ROTATE_MS = 5_000;')) {
  throw new Error('Không áp dụng được chu kỳ 5 giây cho thông báo thi đua.');
}
if (!source.includes('animation: kpiContestNoticeIn .96s')) {
  throw new Error('Không áp dụng được chuyển cảnh chậm/mượt cho thông báo thi đua.');
}
if (!source.includes('margin: 18px 0 16px;')) {
  throw new Error('Không cân được khoảng cách giữa Tiến độ khu vực và ô thông báo.');
}
if (!source.includes('object-fit: cover;')) {
  throw new Error('Không kéo poster phủ đầy khung thông báo.');
}
if (!source.includes('padding: 0;\n          border: 1px solid rgba(230, 189, 85, .5);')) {
  throw new Error('Không bỏ được khoảng đệm bên trong khung poster.');
}
if (!source.includes(POPUP_MARKER) || !source.includes('if (sorted.length <= 1 || popupOpen) return;')) {
  throw new Error('Không áp dụng được popup poster hoặc tạm dừng carousel khi popup mở.');
}

fs.writeFileSync(sourcePath, source, 'utf8');
fs.mkdirSync(path.dirname(standalonePath), { recursive: true });
fs.writeFileSync(standalonePath, source, 'utf8');

let page = fs.readFileSync(pagePath, 'utf8');
if (!page.includes(UI_MARKER)) {
  const anchor = `.kpi-app .target-reg-actions .target-reg-btn { flex: 1 1 0; }\n`;
  if (!page.includes(anchor)) {
    throw new Error('Không tìm thấy CSS chiều rộng KPI để gắn thiết kế Tiến độ khu vực.');
  }

  const polish = `${UI_MARKER}\n/* Cân nhịp dọc với nav 6 nút và đưa mũi tên vào một badge gọn trong thanh. */\n.kpi-app .region-divider.is-collapse-btn {\n  margin-top: 18px !important;\n  margin-bottom: 0 !important;\n}\n.kpi-app .region-divider.is-collapse-btn .region-divider-title {\n  position: relative;\n  min-height: 48px;\n  padding: 0 54px !important;\n  border-radius: 12px !important;\n  border: 1px solid rgba(88, 192, 224, .72) !important;\n  background: linear-gradient(180deg, #15516f 0%, #103f5a 52%, #0c354d 100%) !important;\n  box-shadow: 0 9px 20px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.10), inset 0 -1px 0 rgba(0,0,0,.22) !important;\n  color: #e9f9ff !important;\n  text-shadow: 0 1px 5px rgba(0,0,0,.42) !important;\n}\n.kpi-app .region-divider.is-collapse-btn:hover .region-divider-title {\n  background: linear-gradient(180deg, #1a5c7a 0%, #124963 52%, #0e3b53 100%) !important;\n  border-color: rgba(112, 211, 238, .86) !important;\n}\n.kpi-app .region-divider.is-collapse-btn .region-divider-title .collapse-icon {\n  position: absolute !important;\n  left: 12px !important;\n  top: 50% !important;\n  width: 30px !important;\n  height: 30px !important;\n  padding: 0 !important;\n  transform: translateY(-50%) !important;\n  border: 1px solid rgba(244, 198, 82, .52) !important;\n  border-radius: 8px !important;\n  background: linear-gradient(145deg, rgba(242, 190, 64, .14), rgba(242, 190, 64, .05)) !important;\n  box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 3px 9px rgba(0,0,0,.18) !important;\n}\n.kpi-app .region-divider.is-collapse-btn .region-divider-title .collapse-icon::after {\n  content: '';\n  position: absolute;\n  left: 50%;\n  top: 50%;\n  width: 8px;\n  height: 8px;\n  border: solid #ffd66f;\n  border-width: 0 2px 2px 0;\n  transform: translate(-50%, -62%) rotate(45deg);\n  transition: transform .28s ease;\n  filter: drop-shadow(0 0 4px rgba(255,214,111,.22));\n}\n.kpi-app .region-divider.is-collapse-btn.collapsed .region-divider-title .collapse-icon {\n  transform: translateY(-50%) !important;\n}\n.kpi-app .region-divider.is-collapse-btn.collapsed .region-divider-title .collapse-icon::after {\n  transform: translate(-60%, -50%) rotate(-45deg);\n}\n@media (max-width: 899px) {\n  .kpi-app .region-divider.is-collapse-btn .region-divider-title {\n    min-height: 46px;\n    padding-left: 50px !important;\n    padding-right: 50px !important;\n  }\n  .kpi-app .region-divider.is-collapse-btn .region-divider-title .collapse-icon {\n    left: 10px !important;\n    width: 28px !important;\n    height: 28px !important;\n  }\n}\n`;

  page = page.replace(anchor, `${anchor}${polish}`);
  fs.writeFileSync(pagePath, page, 'utf8');
}

console.log('✓ KPI polish: chu kỳ 5 giây; chuyển cảnh 0.96s; poster phủ đầy khung; bấm poster mở popup lớn + thông tin bên dưới; carousel tạm dừng khi popup mở.');
