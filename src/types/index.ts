// Core types for the paper trading system

export type PositionSide = 'LONG' | 'SHORT';
export type PositionStatus = 'OPEN' | 'CLOSED';
export type EntryType = 'MARKET' | 'LIMIT';
export type SizeMode = 'USDT' | 'QTY';
export type FillType = 'OPEN' | 'CLOSE' | 'PARTIAL';
export type EventType = 
  | 'SL_TRIGGERED' 
  | 'TP_TRIGGERED' 
  | 'MANUAL_CLOSE' 
  | 'SL_UPDATED' 
  | 'TP_UPDATED'
  | 'POSITION_CREATED';

// Type guards
export function isPositionSide(value: unknown): value is PositionSide {
  return value === 'LONG' || value === 'SHORT';
}

export function isPositionStatus(value: unknown): value is PositionStatus {
  return value === 'OPEN' || value === 'CLOSED';
}

export function isEntryType(value: unknown): value is EntryType {
  return value === 'MARKET' || value === 'LIMIT';
}

export interface Position {
  id: number;
  symbol: string;
  side: PositionSide;
  qty: number;
  entryPrice: number;
  entryTime: number;
  sl: number | null;
  tp: number | null;
  leverage: number;
  status: PositionStatus;
  closePrice: number | null;
  closeTime: number | null;
  realizedPnl: number;
  feesOpen: number;
  feesClose: number;
  fundingPnl: number;
  notes: string | null;
}

export interface Fill {
  id: number;
  positionId: number;
  type: FillType;
  price: number;
  qty: number;
  fee: number;
  ts: number;
}

export interface Event {
  id: number;
  positionId: number;
  event: EventType;
  payload: string | null;
  ts: number;
}

export interface Settings {
  id: number;
  takerFee: number;
  makerFee: number;
  enableFunding: boolean;
  baseBalance: number;
  numberFormat: string;
  timezone: string;
  defaultStopLossPercent: number;
  defaultTakeProfitPercent: number;
}

export interface CreatePositionRequest {
  symbol: string;
  side: PositionSide;
  sizeMode: SizeMode;
  sizeValue: number;
  leverage: number;
  entryType: EntryType;
  limitPrice?: number;
  sl?: number;
  tp?: number;
  slMode?: 'PERCENT' | 'PRICE';
  tpMode?: 'PERCENT' | 'PRICE';
  notes?: string;
}

export interface UpdatePositionRequest {
  sl?: number;
  tp?: number;
}

export interface PnLCalculation {
  unrealizedPnl: number;
  pnlPercent: number;
  notional: number;
  currentPrice: number;
}

export interface Stats {
  totalPositions: number;
  openPositions: number;
  closedPositions: number;
  totalPnl: number;
  winRate: number;
  avgRMultiple: number;
  bestSymbol: string | null;
  worstSymbol: string | null;
  currentBalance: number;
}

export interface PriceUpdate {
  symbol: string;
  markPrice: number;
  timestamp: number;
}

export interface PositionUpdate {
  type: 'position-update';
  data: {
    id: number;
    symbol: string;
    markPrice: number;
    unrealizedPnl: number;
    pnlPercent: number;
  };
}
