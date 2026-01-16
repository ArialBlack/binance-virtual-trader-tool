import { NextRequest, NextResponse } from 'next/server';
import { createPosition, getPositions } from '@/lib/db/queries';
import { getCurrentPrice } from '@/lib/binance/rest-api';
import { calculateTakerFee, calculateNotional } from '@/lib/calc/pnl';
import getTriggerEngine from '@/lib/triggers/engine';
import logger from '@/lib/utils/logger';
import type { CreatePositionRequest } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: CreatePositionRequest = await request.json();

    // Validate required fields
    if (!body.symbol || !body.side || !body.sizeValue || !body.leverage) {
      return NextResponse.json(
        { error: 'Missing required fields', required: ['symbol', 'side', 'sizeValue', 'leverage'] },
        { status: 400 }
      );
    }

    // Validate leverage range
    if (body.leverage < 1 || body.leverage > 125) {
      return NextResponse.json(
        { error: 'Leverage must be between 1 and 125' },
        { status: 400 }
      );
    }

    // Validate size
    if (body.sizeValue <= 0) {
      return NextResponse.json(
        { error: 'Size must be greater than 0' },
        { status: 400 }
      );
    }

    // Get current price for market entry
    let entryPrice: number;
    if (body.entryType === 'LIMIT' && body.limitPrice) {
      entryPrice = body.limitPrice;
    } else {
      entryPrice = await getCurrentPrice(body.symbol);
    }

    // Calculate fee
    const qty = body.sizeMode === 'USDT' ? body.sizeValue / entryPrice : body.sizeValue;
    const notional = calculateNotional(qty, entryPrice);
    const fee = calculateTakerFee(notional);

    // Convert percentage SL/TP to absolute price levels
    // This allows users to specify stops in % while storing as exact prices
    let sl = body.sl;
    let tp = body.tp;
    
    if (body.slMode === 'PERCENT' && body.sl) {
      if (body.side === 'LONG') {
        // LONG: SL below entry (minus percent)
        // Example: Entry $100, SL 5% → $95
        sl = entryPrice * (1 - body.sl / 100);
      } else {
        // SHORT: SL above entry (plus percent)
        // Example: Entry $100, SL 5% → $105
        sl = entryPrice * (1 + body.sl / 100);
      }
    }
    
    if (body.tpMode === 'PERCENT' && body.tp) {
      if (body.side === 'LONG') {
        // LONG: TP above entry (plus percent)
        tp = entryPrice * (1 + body.tp / 100);
      } else {
        // SHORT: TP below entry (minus percent)
        tp = entryPrice * (1 - body.tp / 100);
      }
    }

    // Create position with calculated prices
    const positionData = {
      ...body,
      sl,
      tp,
    };

    // Create position in database
    const position = createPosition(positionData, entryPrice, fee);

    // Subscribe to symbol for price updates
    const triggerEngine = getTriggerEngine();
    triggerEngine.subscribeToSymbol(body.symbol);

    logger.info({ positionId: position.id, symbol: body.symbol }, 'Position created via API');

    return NextResponse.json(position, { status: 201 });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to create position');
    return NextResponse.json(
      { error: 'Failed to create position', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'OPEN' | 'CLOSED' | null;

    const positions = status ? getPositions(status) : getPositions();

    return NextResponse.json(positions, { status: 200 });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get positions');
    return NextResponse.json(
      { error: 'Failed to get positions', details: error.message },
      { status: 500 }
    );
  }
}
