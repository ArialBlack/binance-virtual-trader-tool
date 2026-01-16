import type { Position, PositionSide, PnLCalculation } from '@/types';
import { getSettings } from '../db/queries';

/**
 * Calculate notional value
 */
export function calculateNotional(qty: number, price: number): number {
  return qty * price;
}

/**
 * Calculate unrealized PnL for a position
 */
export function calculateUnrealizedPnL(
  side: PositionSide,
  entryPrice: number,
  markPrice: number,
  qty: number
): number {
  if (side === 'LONG') {
    return (markPrice - entryPrice) * qty;
  } else {
    return (entryPrice - markPrice) * qty;
  }
}

/**
 * Calculate PnL percentage
 */
export function calculatePnLPercent(
  unrealizedPnl: number,
  entryPrice: number,
  qty: number
): number {
  const notional = calculateNotional(qty, entryPrice);
  if (notional === 0) return 0;
  return (unrealizedPnl / notional) * 100;
}

/**
 * Calculate trading fee
 */
export function calculateFee(notional: number, feeRate: number): number {
  return notional * feeRate;
}

/**
 * Calculate taker fee
 */
export function calculateTakerFee(notional: number): number {
  const settings = getSettings();
  return calculateFee(notional, settings.takerFee);
}

/**
 * Calculate maker fee
 */
export function calculateMakerFee(notional: number): number {
  const settings = getSettings();
  return calculateFee(notional, settings.makerFee);
}

/**
 * Calculate full PnL data for a position
 */
export function calculatePnLData(
  position: Position,
  markPrice: number
): PnLCalculation {
  const unrealizedPnl = calculateUnrealizedPnL(
    position.side,
    position.entryPrice,
    markPrice,
    position.qty
  );

  const pnlPercent = calculatePnLPercent(
    unrealizedPnl,
    position.entryPrice,
    position.qty
  );

  const notional = calculateNotional(position.qty, position.entryPrice);

  return {
    unrealizedPnl,
    pnlPercent,
    notional,
    currentPrice: markPrice,
  };
}

/**
 * Calculate R-multiple (risk-reward ratio)
 */
export function calculateRMultiple(
  entryPrice: number,
  sl: number
): number {
  return Math.abs(entryPrice - sl);
}

/**
 * Calculate TP price based on R-multiple
 */
export function calculateTPFromR(
  side: PositionSide,
  entryPrice: number,
  sl: number,
  rMultiple: number
): number {
  const rValue = calculateRMultiple(entryPrice, sl);
  
  if (side === 'LONG') {
    return entryPrice + (rValue * rMultiple);
  } else {
    return entryPrice - (rValue * rMultiple);
  }
}

/**
 * Calculate funding payment
 * Funding is paid/received every 8 hours
 */
export function calculateFundingPayment(
  notional: number,
  fundingRate: number
): number {
  return notional * fundingRate;
}

/**
 * Calculate required margin
 */
export function calculateMargin(
  notional: number,
  leverage: number
): number {
  if (leverage === 0) return notional;
  return notional / leverage;
}

/**
 * Calculate liquidation price (simplified, for display only)
 * Note: In MVP we don't enforce liquidations
 */
export function calculateLiquidationPrice(
  side: PositionSide,
  entryPrice: number,
  leverage: number,
  maintenanceMarginRate: number = 0.004 // 0.4% default
): number {
  if (side === 'LONG') {
    return entryPrice * (1 - (1 / leverage) + maintenanceMarginRate);
  } else {
    return entryPrice * (1 + (1 / leverage) - maintenanceMarginRate);
  }
}

/**
 * Calculate ROE (Return on Equity) percentage
 */
export function calculateROE(
  pnl: number,
  margin: number
): number {
  if (margin === 0) return 0;
  return (pnl / margin) * 100;
}

/**
 * Normalize price to tick size
 */
export function normalizePriceToTickSize(price: number, tickSize: number): number {
  if (tickSize === 0) return price;
  return Math.round(price / tickSize) * tickSize;
}

/**
 * Normalize quantity to step size
 */
export function normalizeQtyToStepSize(qty: number, stepSize: number): number {
  if (stepSize === 0) return qty;
  return Math.round(qty / stepSize) * stepSize;
}

/**
 * Calculate quantity from USDT value
 */
export function calculateQtyFromUSDT(
  usdtValue: number,
  price: number,
  stepSize: number = 0.001
): number {
  const qty = usdtValue / price;
  return normalizeQtyToStepSize(qty, stepSize);
}

/**
 * Check if SL should be triggered for LONG position
 */
export function shouldTriggerSLLong(markPrice: number, sl: number | null): boolean {
  if (sl === null) return false;
  return markPrice <= sl;
}

/**
 * Check if TP should be triggered for LONG position
 */
export function shouldTriggerTPLong(markPrice: number, tp: number | null): boolean {
  if (tp === null) return false;
  return markPrice >= tp;
}

/**
 * Check if SL should be triggered for SHORT position
 */
export function shouldTriggerSLShort(markPrice: number, sl: number | null): boolean {
  if (sl === null) return false;
  return markPrice >= sl;
}

/**
 * Check if TP should be triggered for SHORT position
 */
export function shouldTriggerTPShort(markPrice: number, tp: number | null): boolean {
  if (tp === null) return false;
  return markPrice <= tp;
}

/**
 * Check if SL should be triggered
 */
export function shouldTriggerSL(
  side: PositionSide,
  markPrice: number,
  sl: number | null
): boolean {
  if (side === 'LONG') {
    return shouldTriggerSLLong(markPrice, sl);
  } else {
    return shouldTriggerSLShort(markPrice, sl);
  }
}

/**
 * Check if TP should be triggered
 */
export function shouldTriggerTP(
  side: PositionSide,
  markPrice: number,
  tp: number | null
): boolean {
  if (side === 'LONG') {
    return shouldTriggerTPLong(markPrice, tp);
  } else {
    return shouldTriggerTPShort(markPrice, tp);
  }
}
