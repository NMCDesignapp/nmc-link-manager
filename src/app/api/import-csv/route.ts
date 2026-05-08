import { NextRequest, NextResponse } from 'next/server';

// GET /api/import-csv - Fetch CSV from Google Sheets URL
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp URL Google Sheets' },
        { status: 400 }
      );
    }

    // Validate URL is a Google Sheets URL
    if (!url.includes('docs.google.com/spreadsheets') && !url.includes('googleusercontent.com')) {
      return NextResponse.json(
        { error: 'URL không hợp lệ. Vui lòng nhập URL Google Sheets' },
        { status: 400 }
      );
    }

    // Ensure URL has output=csv parameter
    let csvUrl = url;
    if (!csvUrl.includes('output=csv')) {
      // Remove any existing query params and add output=csv
      const baseUrl = csvUrl.split('?')[0];
      csvUrl = `${baseUrl}?output=csv`;
    }

    console.log('Fetching CSV from:', csvUrl);

    const response = await fetch(csvUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/csv,text/plain,application/csv,*/*',
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      console.error('CSV fetch failed:', response.status, response.statusText);
      return NextResponse.json(
        { error: `Không thể tải dữ liệu từ Google Sheets (HTTP ${response.status})` },
        { status: response.status }
      );
    }

    const csvData = await response.text();

    if (!csvData || csvData.trim().length === 0) {
      return NextResponse.json(
        { error: 'Dữ liệu CSV trống' },
        { status: 400 }
      );
    }

    // Log first few lines for debugging
    const lines = csvData.split('\n').slice(0, 3);
    console.log('CSV preview:', lines);

    return NextResponse.json({ csvData });
  } catch (error) {
    console.error('Error fetching CSV:', error);
    const message = error instanceof Error ? error.message : 'Lỗi không xác định';
    return NextResponse.json(
      { error: `Không thể kết nối đến Google Sheets: ${message}` },
      { status: 500 }
    );
  }
}
