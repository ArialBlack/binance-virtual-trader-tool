import { getPositions } from '@/lib/db/queries';
import BinanceWSClient from '@/lib/binance/ws-client';
import TriggerEngine from '@/lib/triggers/engine';
import logger from '@/lib/utils/logger';

let isInitialized = false;

/**
 * Initialize the application on startup
 * - Load OPEN positions from database
 * - Resubscribe to WebSocket streams
 * - Restore trigger monitoring
 */
export async function initializeApp() {
  if (isInitialized) {
    logger.info('App already initialized');
    return;
  }

  logger.info('Initializing application...');

  try {
    // Get all OPEN positions
    const openPositions = getPositions('OPEN');
    logger.info(`Found ${openPositions.length} open positions`);

    if (openPositions.length === 0) {
      logger.info('No open positions to restore');
      isInitialized = true;
      return;
    }

    // Get WebSocket client instance
    const wsClient = BinanceWSClient();

    // Get trigger engine instance
    const triggerEngine = TriggerEngine();

    // Subscribe to all active symbols
    const symbolSet = new Set(openPositions.map((pos) => pos.symbol));
    const symbols = Array.from(symbolSet);
    logger.info(`Subscribing to WebSocket streams for symbols: ${symbols.join(', ')}`);

    for (const symbol of symbols) {
      await wsClient.subscribe(symbol);
    }

    // Trigger engine automatically monitors all OPEN positions
    logger.info('Trigger engine monitoring restored');

    isInitialized = true;
    logger.info('Application initialized successfully');
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to initialize application');
    throw error;
  }
}

/**
 * Shutdown the application gracefully
 * - Close WebSocket connections
 * - Stop trigger monitoring
 */
export async function shutdownApp() {
  logger.info('Shutting down application...');

  try {
    const wsClient = BinanceWSClient();
    wsClient.close();

    const triggerEngine = TriggerEngine();
    triggerEngine.removeAllListeners();

    isInitialized = false;
    logger.info('Application shut down successfully');
  } catch (error: any) {
    logger.error({ err: error }, 'Error during shutdown');
  }
}
