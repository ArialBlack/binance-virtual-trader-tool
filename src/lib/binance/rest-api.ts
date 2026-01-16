import logger from '../utils/logger';

const BINANCE_API_BASE = 'https://fapi.binance.com';

interface TickerPrice {
  symbol: string;
  price: string;
  time: number;
}

interface ExchangeInfo {
  symbols: Array<{
    symbol: string;
    status: string;
    baseAsset: string;
    quoteAsset: string;
    pricePrecision: number;
    quantityPrecision: number;
    filters: Array<{
      filterType: string;
      tickSize?: string;
      stepSize?: string;
      minPrice?: string;
      maxPrice?: string;
      minQty?: string;
      maxQty?: string;
    }>;
  }>;
}

/**
 * Validate symbol format (should be uppercase alphanumeric ending with USDT)
 */
export function isValidSymbolFormat(symbol: string): boolean {
  // Basic validation: uppercase letters/numbers, typically ends with USDT
  return /^[A-Z0-9]{5,20}$/.test(symbol) && symbol.endsWith('USDT');
}

/**
 * Get current price for a symbol
 */
export async function getCurrentPrice(symbol: string): Promise<number> {
  // Validate symbol format before making API call
  if (!isValidSymbolFormat(symbol.toUpperCase())) {
    throw new Error(`Invalid symbol format: ${symbol}. Expected format: BTCUSDT, ETHUSDT, etc.`);
  }

  try {
    const response = await fetch(`${BINANCE_API_BASE}/fapi/v1/ticker/price?symbol=${symbol.toUpperCase()}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Binance API error (${response.status}): ${errorText}`);
    }
    
    const data: TickerPrice = await response.json();
    const price = parseFloat(data.price);
    
    logger.debug({ symbol, price }, 'Fetched current price');
    
    return price;
  } catch (error) {
    logger.error({ error, symbol }, 'Failed to fetch current price');
    throw error;
  }
}

/**
 * Get symbol information (tick size, lot size, etc.)
 */
export async function getSymbolInfo(symbol: string): Promise<{
  tickSize: number;
  stepSize: number;
  pricePrecision: number;
  quantityPrecision: number;
} | null> {
  try {
    const response = await fetch(`${BINANCE_API_BASE}/fapi/v1/exchangeInfo`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: ExchangeInfo = await response.json();
    const symbolInfo = data.symbols.find(s => s.symbol === symbol.toUpperCase());
    
    if (!symbolInfo) {
      logger.warn({ symbol }, 'Symbol not found in exchange info');
      return null;
    }
    
    const priceFilter = symbolInfo.filters.find(f => f.filterType === 'PRICE_FILTER');
    const lotSizeFilter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE');
    
    const result = {
      tickSize: priceFilter?.tickSize ? parseFloat(priceFilter.tickSize) : 0.01,
      stepSize: lotSizeFilter?.stepSize ? parseFloat(lotSizeFilter.stepSize) : 0.001,
      pricePrecision: symbolInfo.pricePrecision,
      quantityPrecision: symbolInfo.quantityPrecision,
    };
    
    logger.debug({ symbol, info: result }, 'Fetched symbol info');
    
    return result;
  } catch (error) {
    logger.error({ error, symbol }, 'Failed to fetch symbol info');
    throw error;
  }
}

/**
 * Normalize price to tick size
 */
export function normalizePrice(price: number, tickSize: number): number {
  return Math.round(price / tickSize) * tickSize;
}

/**
 * Normalize quantity to step size
 */
export function normalizeQuantity(qty: number, stepSize: number): number {
  return Math.round(qty / stepSize) * stepSize;
}

/**
 * Format price with proper precision
 */
export function formatPrice(price: number, precision: number): string {
  return price.toFixed(precision);
}

/**
 * Format quantity with proper precision
 */
export function formatQuantity(qty: number, precision: number): string {
  return qty.toFixed(precision);
}
