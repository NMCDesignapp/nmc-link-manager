#!/usr/bin/env node
/**
 * OCR bảng THƯỞNG BẮT KỲP từ ảnh (z-ai vision SDK).
 * Trả về JSON {catchup3: {rows}, catchup6: {rows}}.
 */
import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

async function main() {
  const imgPath = '/home/z/my-project/upload/pasted_image_1782267943762.png';
  const buf = fs.readFileSync(imgPath);
  const b64 = buf.toString('base64');
  const dataUrl = `data:image/png;base64,${b64}`;

  const zai = await ZAI.create();
  const prompt = `Đây là ảnh một bảng THƯỞNG BẮT KỲP cho chương trình TTN Tuyển ngang. Bảng gồm 2 phần:

- PHẦN TRÁI: "BẮT KỊP 3 THÁNG" — 3 cột cho tháng 1, tháng 2, tháng 3
- PHẦN PHẢI: "BẮT KỊP 6 THÁNG" — 3 cột cho tháng 4, tháng 5, tháng 6

Mỗi phần có 4 HÀNG (theo thứ tự từ trên xuống):
  Hàng 1: QUY MÔ (số TVV)
  Hàng 2: TVVm HĐC (số)
  Hàng 3: FYP (triệu đồng)
  Hàng 4: THƯỞNG (triệu đồng)

Yêu cầu: Đọc chính xác GIÁ TRỊ SỐ tại từng ô trong bảng. KHÔNG suy đoán. Nếu ô trống, ghi null.

Trả về JSON duy nhất theo format:
{
  "catchup3": {
    "month1": {"quymo": ?, "tvvmHdc": ?, "fyp": ?, "thuong": ?},
    "month2": {"quymo": ?, "tvvmHdc": ?, "fyp": ?, "thuong": ?},
    "month3": {"quymo": ?, "tvvmHdc": ?, "fyp": ?, "thuong": ?}
  },
  "catchup6": {
    "month4": {"quymo": ?, "tvvmHdc": ?, "fyp": ?, "thuong": ?},
    "month5": {"quymo": ?, "tvvmHdc": ?, "fyp": ?, "thuong": ?},
    "month6": {"quymo": ?, "tvvmHdc": ?, "fyp": ?, "thuong": ?}
  }
}

Chỉ trả về JSON, không kèm giải thích.`;

  const resp = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    thinking: { type: 'enabled' },
  });

  const content = resp.choices?.[0]?.message?.content || '';
  console.log('=== RAW CONTENT ===');
  console.log(content);
  console.log('=== END ===');
}

main().catch(e => { console.error(e); process.exit(1); });
