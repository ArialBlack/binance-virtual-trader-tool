import { NextRequest, NextResponse } from 'next/server';
import { getPositionById, closePosition } from '@/lib/db/queries';
import { getCurrentPrice } from '@/lib/binance/rest-api';
import { calculateTakerFee, calculateNotional } from '@/lib/calc/pnl';
import getTriggerEngine from '@/lib/triggers/engine';
import logger from '@/lib/utils/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const position = getPositionById(id);

    if (!position) {
      return NextResponse.json(
        { error: 'Position not found' },
        { status: 404 }
      );
    }

    if (position.status === 'CLOSED') {
      return NextResponse.json(
        { error: 'Position already closed' },
        { status: 400 }
      );
    }

    // Get current price
    const triggerEngine = getTriggerEngine();
    let closePrice = triggerEngine.getCachedPrice(position.symbol);
    
    if (!closePrice) {
      closePrice = await getCurrentPrice(position.symbol);
    }

    // Calculate close fee
    const notional = calculateNotional(position.qty, closePrice);
    const closeFee = calculateTakerFee(notional);

    // Close position
    const closedPosition = closePosition(id, closePrice, closeFee, 'MANUAL_CLOSE');

    if (!closedPosition) {
      return NextResponse.json(
        { error: 'Failed to close position' },
        { status: 500 }
      );
    }

    logger.info(
      { positionId: id, closePrice, realizedPnl: closedPosition.realizedPnl },
      'Position manually closed via API'
    );

    return NextResponse.json(closedPosition, { status: 200 });
  } catch (error: any) {
    logger.error({ error: error.message, id: params.id }, 'Failed to close position');
    return NextResponse.json(
      { error: 'Failed to close position', details: error.message },
      { status: 500 }
    );
  }
}
