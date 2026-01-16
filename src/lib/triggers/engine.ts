import { EventEmitter } from 'events';
import type { PriceUpdate } from '@/types';
import { getAllOpenPositions, closePosition } from '../db/queries';
import { shouldTriggerSL, shouldTriggerTP, calculateTakerFee, calculateNotional } from '../calc/pnl';
import getBinanceWebSocketClient from '../binance/ws-client';
import logger from '../utils/logger';

export class TriggerEngine extends EventEmitter {
  private wsClient: ReturnType<typeof getBinanceWebSocketClient>;
  private priceCache: Map<string, number> = new Map();

  constructor() {
    super();
    this.wsClient = getBinanceWebSocketClient();
    this.setupEventListeners();
  }

  /**
   * Setup WebSocket event listeners
   */
  private setupEventListeners(): void {
    this.wsClient.on('priceUpdate', (update: PriceUpdate) => {
      this.handlePriceUpdate(update);
    });

    this.wsClient.on('connected', () => {
      logger.info('Trigger engine: WebSocket connected');
      this.resubscribeOpenPositions();
    });

    this.wsClient.on('disconnected', () => {
      logger.warn('Trigger engine: WebSocket disconnected');
    });

    this.wsClient.on('error', (error: Error) => {
      logger.error({ error }, 'Trigger engine: WebSocket error');
    });
  }

  /**
   * Handle price update from WebSocket
   */
  private handlePriceUpdate(update: PriceUpdate): void {
    const { symbol, markPrice } = update;

    // Update price cache
    this.priceCache.set(symbol.toUpperCase(), markPrice);

    // Check triggers for all open positions of this symbol
    this.checkTriggersForSymbol(symbol.toUpperCase(), markPrice);

    // Emit price update event for UI
    this.emit('priceUpdate', update);
  }

  /**
   * Check SL/TP triggers for all positions of a symbol
   * This runs on every price update, so it's critical for performance
   * 
   * Logic:
   * 1. Filter open positions by symbol
   * 2. For each position:
   *    - Check if SL is triggered (position closes at a loss)
   *    - If not, check if TP is triggered (position closes at profit)
   *    - Only one trigger can execute per update (SL takes precedence)
   */
  private checkTriggersForSymbol(symbol: string, markPrice: number): void {
    try {
      const positions = getAllOpenPositions().filter(p => p.symbol === symbol);

      for (const position of positions) {
        // Check SL trigger first - stops take priority over profit targets
        if (shouldTriggerSL(position.side, markPrice, position.sl)) {
          logger.info(
            { positionId: position.id, symbol, side: position.side, sl: position.sl, markPrice },
            'SL triggered'
          );
          this.executeTrigger(position.id, markPrice, 'SL_TRIGGERED');
          continue; // Position closed, no need to check TP
        }

        // Check TP trigger
        if (shouldTriggerTP(position.side, markPrice, position.tp)) {
          logger.info(
            { positionId: position.id, symbol, side: position.side, tp: position.tp, markPrice },
            'TP triggered'
          );
          this.executeTrigger(position.id, markPrice, 'TP_TRIGGERED');
        }
      }
    } catch (error) {
      logger.error({ error, symbol }, 'Failed to check triggers for symbol');
    }
  }

  /**
   * Execute trigger (close position)
   */
  private executeTrigger(
    positionId: number,
    closePrice: number,
    event: 'SL_TRIGGERED' | 'TP_TRIGGERED'
  ): void {
    try {
      // Calculate close fee
      const position = getAllOpenPositions().find(p => p.id === positionId);
      if (!position) {
        logger.warn({ positionId }, 'Position not found for trigger execution');
        return;
      }

      const notional = calculateNotional(position.qty, closePrice);
      const closeFee = calculateTakerFee(notional);

      // Close position
      const closedPosition = closePosition(positionId, closePrice, closeFee, event);

      if (closedPosition) {
        logger.info(
          {
            positionId,
            event,
            closePrice,
            realizedPnl: closedPosition.realizedPnl,
          },
          'Position closed by trigger'
        );

        // Emit trigger event for UI
        this.emit('triggerExecuted', {
          positionId,
          event,
          closePrice,
          realizedPnl: closedPosition.realizedPnl,
        });

        // Cleanup: unsubscribe from symbol if no positions remain
        // This prevents unnecessary WebSocket traffic for symbols we're not trading
        const remainingPositions = getAllOpenPositions().filter(
          p => p.symbol === position.symbol
        );

        // Unsubscribe if no more positions for this symbol
        if (remainingPositions.length === 0) {
          this.wsClient.unsubscribe(position.symbol);
          logger.info({ symbol: position.symbol }, 'Unsubscribed from symbol (no open positions)');
        }
      }
    } catch (error) {
      logger.error({ error, positionId, event }, 'Failed to execute trigger');
    }
  }

  /**
   * Subscribe to a symbol
   */
  public subscribeToSymbol(symbol: string): void {
    this.wsClient.subscribe(symbol);
    logger.info({ symbol }, 'Subscribed to symbol');
  }

  /**
   * Unsubscribe from a symbol
   */
  public unsubscribeFromSymbol(symbol: string): void {
    this.wsClient.unsubscribe(symbol);
    logger.info({ symbol }, 'Unsubscribed from symbol');
  }

  /**
   * Resubscribe to all symbols with open positions
   */
  public resubscribeOpenPositions(): void {
    try {
      const openPositions = getAllOpenPositions();
      const symbolSet = new Set(openPositions.map(p => p.symbol));
      const uniqueSymbols = Array.from(symbolSet);

      for (const symbol of uniqueSymbols) {
        this.subscribeToSymbol(symbol);
      }

      logger.info({ count: uniqueSymbols.length, symbols: uniqueSymbols }, 'Resubscribed to all symbols');
    } catch (error) {
      logger.error({ error }, 'Failed to resubscribe to open positions');
    }
  }

  /**
   * Get cached price for a symbol
   */
  public getCachedPrice(symbol: string): number | undefined {
    return this.priceCache.get(symbol.toUpperCase());
  }

  /**
   * Get all cached prices
   */
  public getAllCachedPrices(): Map<string, number> {
    return new Map(this.priceCache);
  }

  /**
   * Start the trigger engine
   */
  public start(): void {
    logger.info('Starting trigger engine');
    this.resubscribeOpenPositions();
  }

  /**
   * Stop the trigger engine
   */
  public stop(): void {
    logger.info('Stopping trigger engine');
    this.wsClient.removeAllListeners('priceUpdate');
    this.priceCache.clear();
  }
}

// Singleton instance
let triggerEngine: TriggerEngine | null = null;

export function getTriggerEngine(): TriggerEngine {
  if (!triggerEngine) {
    triggerEngine = new TriggerEngine();
    triggerEngine.start();
  }
  return triggerEngine;
}

export function stopTriggerEngine(): void {
  if (triggerEngine) {
    triggerEngine.stop();
    triggerEngine = null;
  }
}

// Graceful shutdown
process.on('exit', () => {
  stopTriggerEngine();
});

process.on('SIGINT', () => {
  stopTriggerEngine();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopTriggerEngine();
  process.exit(0);
});

export default getTriggerEngine;
