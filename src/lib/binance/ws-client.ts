import WebSocket from 'ws';
import { EventEmitter } from 'events';
import logger from '../utils/logger';
import type { PriceUpdate } from '@/types';

interface BinanceMarkPriceMessage {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  p: string; // Mark price
  i: string; // Index price
  P: string; // Estimated Settle Price (only useful in the last hour before the settlement starts)
  r: string; // Funding rate
  T: number; // Next funding time
}

interface SubscriptionMessage {
  method: 'SUBSCRIBE' | 'UNSUBSCRIBE';
  params: string[];
  id: number;
}

export class BinanceWebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private readonly baseUrl: string;
  private subscribedSymbols: Set<string> = new Set();
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 10;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private isIntentionallyClosed: boolean = false;
  private messageId: number = 1;

  constructor(baseUrl: string = 'wss://fstream.binance.com/ws') {
    super();
    this.baseUrl = baseUrl;
  }

  /**
   * Connect to Binance WebSocket
   */
  public connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      logger.warn('WebSocket already connected');
      return;
    }

    this.isIntentionallyClosed = false;
    this.ws = new WebSocket(this.baseUrl);

    this.ws.on('open', () => {
      logger.info('Connected to Binance Futures WebSocket');
      this.reconnectAttempts = 0;
      
      // Start ping/pong to keep connection alive
      this.startPingInterval();
      
      // Resubscribe to all symbols
      this.resubscribeAll();
      
      this.emit('connected');
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (error) {
        logger.error({ error }, 'Failed to parse WebSocket message');
      }
    });

    this.ws.on('error', (error) => {
      logger.error({ error: error.message }, 'WebSocket error');
      this.emit('error', error);
    });

    this.ws.on('close', () => {
      logger.info('WebSocket connection closed');
      this.stopPingInterval();
      
      if (!this.isIntentionallyClosed) {
        this.scheduleReconnect();
      }
      
      this.emit('disconnected');
    });

    this.ws.on('pong', () => {
      logger.debug('Received pong from server');
    });
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: any): void {
    // Handle subscription confirmation
    if (message.result === null && message.id) {
      logger.debug({ id: message.id }, 'Subscription confirmed');
      return;
    }

    // Handle mark price update
    if (message.e === 'markPriceUpdate') {
      const data = message as BinanceMarkPriceMessage;
      const priceUpdate: PriceUpdate = {
        symbol: data.s,
        markPrice: parseFloat(data.p),
        timestamp: data.E,
      };
      
      this.emit('priceUpdate', priceUpdate);
      logger.debug({ symbol: data.s, price: data.p }, 'Price update received');
    }
  }

  /**
   * Subscribe to a symbol's mark price stream
   */
  public subscribe(symbol: string): void {
    const normalizedSymbol = symbol.toLowerCase();
    const stream = `${normalizedSymbol}@markPrice`;

    if (this.subscribedSymbols.has(normalizedSymbol)) {
      logger.debug({ symbol }, 'Already subscribed');
      return;
    }

    this.subscribedSymbols.add(normalizedSymbol);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const subscribeMessage: SubscriptionMessage = {
        method: 'SUBSCRIBE',
        params: [stream],
        id: this.messageId++,
      };

      this.ws.send(JSON.stringify(subscribeMessage));
      logger.info({ symbol, stream }, 'Subscribed to symbol');
    } else {
      logger.warn({ symbol }, 'WebSocket not ready, will subscribe on connect');
    }
  }

  /**
   * Unsubscribe from a symbol's mark price stream
   */
  public unsubscribe(symbol: string): void {
    const normalizedSymbol = symbol.toLowerCase();
    const stream = `${normalizedSymbol}@markPrice`;

    if (!this.subscribedSymbols.has(normalizedSymbol)) {
      logger.debug({ symbol }, 'Not subscribed');
      return;
    }

    this.subscribedSymbols.delete(normalizedSymbol);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const unsubscribeMessage: SubscriptionMessage = {
        method: 'UNSUBSCRIBE',
        params: [stream],
        id: this.messageId++,
      };

      this.ws.send(JSON.stringify(unsubscribeMessage));
      logger.info({ symbol, stream }, 'Unsubscribed from symbol');
    }
  }

  /**
   * Resubscribe to all symbols after reconnect
   */
  private resubscribeAll(): void {
    if (this.subscribedSymbols.size === 0) {
      return;
    }

    const symbols = Array.from(this.subscribedSymbols);
    const streams = symbols.map(s => `${s}@markPrice`);

    const subscribeMessage: SubscriptionMessage = {
      method: 'SUBSCRIBE',
      params: streams,
      id: this.messageId++,
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(subscribeMessage));
      logger.info({ count: symbols.length, symbols }, 'Resubscribed to all symbols');
    }
  }

  /**
   * Schedule reconnect with exponential backoff
   * 
   * Reconnect strategy:
   * - Attempt 1: 1 second
   * - Attempt 2: 2 seconds  
   * - Attempt 3: 4 seconds
   * - Attempt 4: 8 seconds
   * - ...up to max 30 seconds
   * 
   * This prevents overwhelming the server during outages
   * while still recovering quickly from brief disconnections
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnect attempts reached, giving up');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    // Exponential backoff: 2^(n-1) seconds, capped at 30s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);

    logger.info({ attempt: this.reconnectAttempts, delay }, 'Scheduling reconnect');

    this.reconnectTimeout = setTimeout(() => {
      logger.info('Attempting to reconnect...');
      this.connect();
    }, delay);
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
        logger.debug('Sent ping to server');
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Close WebSocket connection
   */
  public close(): void {
    this.isIntentionallyClosed = true;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopPingInterval();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.subscribedSymbols.clear();
    logger.info('WebSocket client closed');
  }

  /**
   * Get list of subscribed symbols
   */
  public getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
let wsClient: BinanceWebSocketClient | null = null;

export function getBinanceWebSocketClient(): BinanceWebSocketClient {
  if (!wsClient) {
    const wsUrl = process.env.BINANCE_WS_URL || 'wss://fstream.binance.com/ws';
    wsClient = new BinanceWebSocketClient(wsUrl);
    wsClient.connect();
  }
  return wsClient;
}

export function closeBinanceWebSocketClient(): void {
  if (wsClient) {
    wsClient.close();
    wsClient = null;
  }
}

// Graceful shutdown
process.on('exit', () => {
  closeBinanceWebSocketClient();
});

process.on('SIGINT', () => {
  closeBinanceWebSocketClient();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeBinanceWebSocketClient();
  process.exit(0);
});

export default getBinanceWebSocketClient;
