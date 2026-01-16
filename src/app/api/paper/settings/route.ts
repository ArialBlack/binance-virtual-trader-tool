import { NextRequest, NextResponse } from 'next/server';
import { getSettings } from '@/lib/db/queries';
import getDb from '@/lib/db';

export async function GET() {
  try {
    const settings = getSettings();
    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      takerFee = 0.0004,
      makerFee = 0.0002,
      fundingEnabled = false,
      baseBalance = 10000,
      decimalPlaces = 2,
      timezone = 'UTC',
      defaultStopLossPercent = 5.0,
      defaultTakeProfitPercent = 10.0,
    } = body;

    const db = getDb();

    // Check if settings exist
    const existing = db.prepare('SELECT id FROM settings LIMIT 1').get();

    if (existing) {
      // Update existing settings
      const stmt = db.prepare(`
        UPDATE settings SET
          takerFee = ?,
          makerFee = ?,
          fundingEnabled = ?,
          baseBalance = ?,
          decimalPlaces = ?,
          timezone = ?,
          defaultStopLossPercent = ?,
          defaultTakeProfitPercent = ?
        WHERE id = ?
      `);
      stmt.run(
        takerFee,
        makerFee,
        fundingEnabled ? 1 : 0,
        baseBalance,
        decimalPlaces,
        timezone,
        defaultStopLossPercent,
        defaultTakeProfitPercent,
        (existing as any).id
      );
    } else {
      // Insert new settings
      const stmt = db.prepare(`
        INSERT INTO settings (takerFee, makerFee, fundingEnabled, baseBalance, decimalPlaces, timezone, defaultStopLossPercent, defaultTakeProfitPercent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(takerFee, makerFee, fundingEnabled ? 1 : 0, baseBalance, decimalPlaces, timezone, defaultStopLossPercent, defaultTakeProfitPercent);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to save settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings', details: error.message },
      { status: 500 }
    );
  }
}
