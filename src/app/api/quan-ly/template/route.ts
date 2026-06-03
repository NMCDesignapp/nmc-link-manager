import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

const TEMPLATES: Record<string, { headers: string[]; sampleData: Record<string, string>[] }> = {
  leaders: {
    headers: ['Mã số', 'Họ tên', 'Chức vụ', 'Ban', 'Nhóm', 'Mã nhóm', 'Tiền/tháng', 'SĐT', 'Email', 'Ghi chú'],
    sampleData: [{ 'Mã số': 'TVV001', 'Họ tên': 'Nguyễn Văn A', 'Chức vụ': 'Trưởng nhóm', 'Ban': 'Ban A', 'Nhóm': 'Nhóm 1', 'Mã nhóm': 'NH01', 'Tiền/tháng': '5000000', 'SĐT': '0901234567', 'Email': 'a@email.com', 'Ghi chú': '' }],
  },
  revenue: {
    headers: ['Tháng', 'Mã nhóm', 'Nhóm', 'Mã TVV', 'Tên TVV', 'Tổng IP', 'Tổng AFYP', 'Số HĐ', 'Lượt HĐ', 'Ghi chú'],
    sampleData: [{ 'Tháng': '2026-06', 'Mã nhóm': 'NH01', 'Nhóm': 'Nhóm 1', 'Mã TVV': 'TVV001', 'Tên TVV': 'Nguyễn Văn A', 'Tổng IP': '15000000', 'Tổng AFYP': '20000000', 'Số HĐ': '5', 'Lượt HĐ': '8', 'Ghi chú': '' }],
  },
  contracts: {
    headers: ['Số HĐ', 'Mã TVV', 'Họ tên', 'Chức vụ', 'Ban', 'Nhóm', 'Mã nhóm', 'Mã TN', 'Mã NTD', 'Ngày bắt đầu', 'Ngày hiệu lực', 'Ngày cấp', 'IP', 'AFYP', 'Tính lượt'],
    sampleData: [{ 'Số HĐ': 'HD001', 'Mã TVV': 'TVV001', 'Họ tên': 'Nguyễn Văn A', 'Chức vụ': 'TVV', 'Ban': 'Ban A', 'Nhóm': 'Nhóm 1', 'Mã nhóm': 'NH01', 'Mã TN': 'TN001', 'Mã NTD': 'NTD001', 'Ngày bắt đầu': '01/01/2026', 'Ngày hiệu lực': '15/01/2026', 'Ngày cấp': '20/01/2026', 'IP': '5000000', 'AFYP': '6500000', 'Tính lượt': '1' }],
  },
  staff: {
    headers: ['Mã số', 'Họ tên', 'Chức vụ', 'Nhóm', 'Mã nhóm', 'Ngày bắt đầu'],
    sampleData: [{ 'Mã số': 'TVV001', 'Họ tên': 'Nguyễn Văn A', 'Chức vụ': 'TVV', 'Nhóm': 'Nhóm 1', 'Mã nhóm': 'NH01', 'Ngày bắt đầu': '01/01/2026' }],
  },
  recruiters: {
    headers: ['Mã số', 'Họ tên', 'Chức vụ', 'Nhóm', 'Ngày bắt đầu'],
    sampleData: [{ 'Mã số': 'NTD001', 'Họ tên': 'Trần Thị B', 'Chức vụ': 'NTD', 'Nhóm': 'Nhóm 1', 'Ngày bắt đầu': '01/01/2026' }],
  },
};

export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get('type') || 'leaders';
    const template = TEMPLATES[type];

    if (!template) {
      return NextResponse.json({ error: 'Invalid template type' }, { status: 400 });
    }

    const data = [template.sampleData.length > 0 ? template.sampleData[0] : Object.fromEntries(template.headers.map(h => [h, '']))];
    const ws = XLSX.utils.json_to_sheet(data, { header: template.headers });
    ws['!cols'] = template.headers.map(h => ({ wch: Math.max(h.length * 2, 12) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type);

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Mau_${type}_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('[template] Error generating template:', error);
    return NextResponse.json({ error: 'Failed to generate template', details: String(error) }, { status: 500 });
  }
}
