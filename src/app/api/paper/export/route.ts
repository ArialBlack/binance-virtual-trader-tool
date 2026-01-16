import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const symbol = searchParams.get('symbol');

    const db = getDb();
    let query = 'SELECT * FROM paper_positions WHERE status = "CLOSED"';
    const params: any[] = [];

    if (startDate) {
      query += ' AND entryTime >= ?';
      params.push(new Date(startDate).getTime());
    }

    if (endDate) {
      query += ' AND closeTime <= ?';
      params.push(new Date(endDate).getTime());
    }

    if (symbol) {
      query += ' AND symbol = ?';
      params.push(symbol);
    }

    query += ' ORDER BY closeTime DESC';

    const stmt = db.prepare(query);
    const positions = stmt.all(...params);

    // Generate CSV
    const headers = [
      'ID',
      'Symbol',
      'Side',
      'Quantity',
      'Entry Price',
      'Close Price',
      'Entry Time',
      'Close Time',
      'Realized PnL',
      'Fees Open',
      'Fees Close',
      'Funding PnL',
      'Leverage',
      'Notes',
    ];

    const rows = positions.map((pos: any) => [
      pos.id,
      pos.symbol,
      pos.side,
      pos.qty,
      pos.entryPrice,
      pos.closePrice,
      new Date(pos.entryTime).toISOString(),
      new Date(pos.closeTime).toISOString(),
      pos.realizedPnl,
      pos.feesOpen,
      pos.feesClose,
      pos.fundingPnl || 0,
      pos.leverage,
      pos.notes || '',
    ]);

    // Convert to CSV format
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => {
          // Escape cells with commas or quotes
          if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(',')
      ),
    ].join('\n');

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="paper-trading-history-${Date.now()}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Failed to export CSV:', error);
    return NextResponse.json(
      { error: 'Failed to export CSV', details: error.message },
      { status: 500 }
    );
  }
}
