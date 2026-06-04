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
    headers: ['STT', 'Ban', 'Mã trưởng ban', 'Nhóm', 'Mã Ban/Nhóm', 'Mã trưởng Ban/Nhóm', 'Mã ĐL', 'Tên', 'Chức vụ', 'Ngày bắt đầu làm việc', 'Số hợp đồng', 'Ngày hiệu lực', 'Ngày phát hành', 'PĐT + 10% ĐT', 'FYP', 'Nguồn dữ liệu', 'Hợp đồng tổ chức', 'ĐK ĐÓNG PHÍ', 'PHÍ ĐÓNG THÊM', 'AFYP chưa trừ 10% ĐT', 'AFYP', 'AD', 'NHÓM', 'NGÀY BẮT ĐẦU LÀM VIỆC', 'THÁNG TD', 'NĂM TD', 'THÁNG HL', 'TÍNH LƯỢT 3 tr', 'Mã đại lý tuyển dụng', 'ĐÁNH DẤU TVVm TUYỂN DỤNG QUÝ 1', 'Chức vụ'],
    sampleData: [{ 'STT': '1', 'Ban': 'Hiệp Tiến', 'Mã trưởng ban': 'D104132535', 'Nhóm': 'Nhiệt An', 'Mã Ban/Nhóm': 'U1041A3L6E', 'Mã trưởng Ban/Nhóm': 'D104132784', 'Mã ĐL': 'D104132784', 'Tên': 'Dương Thị Hồng Nga', 'Chức vụ': 'Trưởng nhóm', 'Ngày bắt đầu làm việc': '01/10/2017', 'Số hợp đồng': '10000017167449', 'Ngày hiệu lực': '01/11/2026', 'Ngày phát hành': '15/11/2026', 'PĐT + 10% ĐT': '12651118', 'FYP': '12651118', 'Nguồn dữ liệu': 'PH', 'Hợp đồng tổ chức': '', 'ĐK ĐÓNG PHÍ': 'Năm', 'PHÍ ĐÓNG THÊM': '75060', 'AFYP chưa trừ 10% ĐT': '12651118', 'AFYP': '12643612', 'AD': 'Trương Quốc Uy', 'NHÓM': 'Nhiệt An', 'NGÀY BẮT ĐẦU LÀM VIỆC': '01/10/2017', 'THÁNG TD': '10', 'NĂM TD': '2017', 'THÁNG HL': '1', 'TÍNH LƯỢT 3 tr': '12651118', 'Mã đại lý tuyển dụng': 'D104102154', 'ĐÁNH DẤU TVVm TUYỂN DỤNG QUÝ 1': '', 'Chức vụ': 'Trưởng nhóm' }],
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
