import { NextRequest } from 'next/server';
import { getAllOpenPositions } from '@/lib/db/queries';
import { calculatePnLData } from '@/lib/calc/pnl';
import getTriggerEngine from '@/lib/triggers/engine';
import logger from '@/lib/utils/logger';
import type { PriceUpdate, PositionUpdate } from '@/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Server-Sent Events (SSE) endpoint for real-time position updates
 * 
 * SSE Flow:
 * 1. Client connects → send 'connected' message
 * 2. Send initial state (all open positions with current prices)
 * 3. Subscribe to price updates from trigger engine
 * 4. Push updates to client whenever:
 *    - Mark price changes (every ~300ms per symbol)
 *    - SL/TP trigger executes
 * 5. Send periodic heartbeat (every 30s) to keep connection alive
 * 
 * SSE Format: "data: {JSON}\n\n"
 * Client should handle: position-update, trigger-executed, heartbeat events
 */
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const triggerEngine = getTriggerEngine();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const connectionMsg = `data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`;
      controller.enqueue(encoder.encode(connectionMsg));

      // Send initial positions data
      try {
        const positions = getAllOpenPositions();
        const positionsData = positions.map(pos => {
          const cachedPrice = triggerEngine.getCachedPrice(pos.symbol);
          if (cachedPrice) {
            const pnlData = calculatePnLData(pos, cachedPrice);
            return {
              id: pos.id,
              symbol: pos.symbol,
              side: pos.side,
              qty: pos.qty,
              entryPrice: pos.entryPrice,
              markPrice: cachedPrice,
              unrealizedPnl: pnlData.unrealizedPnl,
              pnlPercent: pnlData.pnlPercent,
              sl: pos.sl,
              tp: pos.tp,
              leverage: pos.leverage,
              entryTime: pos.entryTime,
            };
          }
          // Return position without price updates if no cached price yet
          return {
            id: pos.id,
            symbol: pos.symbol,
            side: pos.side,
            qty: pos.qty,
            entryPrice: pos.entryPrice,
            markPrice: undefined,
            unrealizedPnl: undefined,
            pnlPercent: undefined,
            sl: pos.sl,
            tp: pos.tp,
            leverage: pos.leverage,
            entryTime: pos.entryTime,
          };
        });

        const initialMsg = `data: ${JSON.stringify({ type: 'initial', data: positionsData })}\n\n`;
        controller.enqueue(encoder.encode(initialMsg));
      } catch (error) {
        logger.error({ error }, 'Failed to send initial positions data');
      }

      // Listen to price updates from trigger engine
      const handlePriceUpdate = (update: PriceUpdate) => {
        try {
          const positions = getAllOpenPositions().filter(p => p.symbol === update.symbol);

          positions.forEach(position => {
            const pnlData = calculatePnLData(position, update.markPrice);

            const positionUpdate: PositionUpdate = {
              type: 'position-update',
              data: {
                id: position.id,
                symbol: position.symbol,
                markPrice: update.markPrice,
                unrealizedPnl: pnlData.unrealizedPnl,
                pnlPercent: pnlData.pnlPercent,
              },
            };

            const message = `data: ${JSON.stringify(positionUpdate)}\n\n`;
            controller.enqueue(encoder.encode(message));
          });
        } catch (error) {
          logger.error({ error, symbol: update.symbol }, 'Failed to send position update');
        }
      };

      // Listen to trigger events (SL/TP closures)
      const handleTriggerExecuted = (data: any) => {
        try {
          const triggerMsg = `data: ${JSON.stringify({ type: 'trigger-executed', data })}\n\n`;
          controller.enqueue(encoder.encode(triggerMsg));
        } catch (error) {
          logger.error({ error }, 'Failed to send trigger event');
        }
      };

      // Subscribe to events
      triggerEngine.on('priceUpdate', handlePriceUpdate);
      triggerEngine.on('triggerExecuted', handleTriggerExecuted);

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = `data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`;
          controller.enqueue(encoder.encode(heartbeat));
        } catch (error) {
          logger.error({ error }, 'Failed to send heartbeat');
        }
      }, 30000);

      // Cleanup on connection close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        triggerEngine.off('priceUpdate', handlePriceUpdate);
        triggerEngine.off('triggerExecuted', handleTriggerExecuted);
        controller.close();
        logger.info('SSE stream closed by client');
      });

      logger.info('SSE stream started');
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
