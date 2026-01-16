import { NextRequest, NextResponse } from 'next/server';
import { getPositions, getSettings } from '@/lib/db/queries';
import logger from '@/lib/utils/logger';
import type { Stats } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const allPositions = getPositions();
    const openPositions = getPositions('OPEN');
    const closedPositions = getPositions('CLOSED');
    const settings = getSettings();

    // Calculate total PnL
    const totalPnl = closedPositions.reduce((sum, pos) => sum + pos.realizedPnl, 0);

    // Calculate win rate
    const winners = closedPositions.filter(pos => pos.realizedPnl > 0).length;
    const winRate = closedPositions.length > 0 ? (winners / closedPositions.length) * 100 : 0;

    // Calculate average R-multiple
    const rMultiples = closedPositions
      .filter(pos => pos.sl !== null)
      .map(pos => {
        const risk = Math.abs(pos.entryPrice - (pos.sl || 0));
        if (risk === 0) return 0;
        const reward = pos.realizedPnl / pos.qty;
        return reward / risk;
      });
    const avgRMultiple = rMultiples.length > 0
      ? rMultiples.reduce((sum, r) => sum + r, 0) / rMultiples.length
      : 0;

    // Find best and worst symbols
    const symbolStats = new Map<string, { pnl: number; count: number }>();
    closedPositions.forEach(pos => {
      const current = symbolStats.get(pos.symbol) || { pnl: 0, count: 0 };
      symbolStats.set(pos.symbol, {
        pnl: current.pnl + pos.realizedPnl,
        count: current.count + 1,
      });
    });

    let bestSymbol: string | null = null;
    let worstSymbol: string | null = null;
    let maxPnl = -Infinity;
    let minPnl = Infinity;

    symbolStats.forEach((stats, symbol) => {
      if (stats.pnl > maxPnl) {
        maxPnl = stats.pnl;
        bestSymbol = symbol;
      }
      if (stats.pnl < minPnl) {
        minPnl = stats.pnl;
        worstSymbol = symbol;
      }
    });

    // Calculate current balance
    const currentBalance = settings.baseBalance + totalPnl;

    const stats: Stats = {
      totalPositions: allPositions.length,
      openPositions: openPositions.length,
      closedPositions: closedPositions.length,
      totalPnl,
      winRate,
      avgRMultiple,
      bestSymbol,
      worstSymbol,
      currentBalance,
    };

    return NextResponse.json(stats, { status: 200 });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get stats');
    return NextResponse.json(
      { error: 'Failed to get stats', details: error.message },
      { status: 500 }
    );
  }
}
