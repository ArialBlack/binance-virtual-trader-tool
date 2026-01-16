import type Database from 'better-sqlite3';
import getDb from './index';
import type { Position, Fill, Event, CreatePositionRequest, UpdatePositionRequest, Settings } from '@/types';
import logger from '../utils/logger';

// ==================== POSITIONS ====================

export function createPosition(data: CreatePositionRequest, entryPrice: number, fee: number): Position {
  const db = getDb();
  const now = Date.now();
  
  const insert = db.prepare(`
    INSERT INTO paper_positions (
      symbol, side, qty, entryPrice, entryTime, sl, tp, leverage, 
      status, feesOpen, realizedPnl, fundingPnl, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, 0, 0, ?)
  `);
  
  const result = insert.run(
    data.symbol,
    data.side,
    data.sizeMode === 'USDT' ? data.sizeValue / entryPrice : data.sizeValue,
    entryPrice,
    now,
    data.sl || null,
    data.tp || null,
    data.leverage,
    fee,
    data.notes || null
  );
  
  const positionId = result.lastInsertRowid as number;
  
  // Log fill
  createFill({
    positionId,
    type: 'OPEN',
    price: entryPrice,
    qty: data.sizeMode === 'USDT' ? data.sizeValue / entryPrice : data.sizeValue,
    fee,
    ts: now,
  });
  
  // Log event
  createEvent({
    positionId,
    event: 'POSITION_CREATED',
    payload: JSON.stringify({ entryType: data.entryType, notes: data.notes }),
    ts: now,
  });
  
  logger.info({ positionId, symbol: data.symbol, side: data.side }, 'Position created');
  
  return getPositionById(positionId)!;
}

export function getPositionById(id: number): Position | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM paper_positions WHERE id = ?');
  const row = stmt.get(id) as Position | undefined;
  return row || null;
}

export function getPositions(status?: 'OPEN' | 'CLOSED'): Position[] {
  const db = getDb();
  const query = status
    ? 'SELECT * FROM paper_positions WHERE status = ? ORDER BY entryTime DESC'
    : 'SELECT * FROM paper_positions ORDER BY entryTime DESC';
  
  const stmt = db.prepare(query);
  const rows = status ? stmt.all(status) : stmt.all();
  return rows as Position[];
}

export function getOpenPositionsBySymbol(symbol: string): Position[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM paper_positions WHERE symbol = ? AND status = ?');
  return stmt.all(symbol, 'OPEN') as Position[];
}

export function getAllOpenPositions(): Position[] {
  return getPositions('OPEN');
}

export function updatePosition(id: number, data: UpdatePositionRequest): Position | null {
  const db = getDb();
  const updates: string[] = [];
  const values: any[] = [];
  
  if (data.sl !== undefined) {
    updates.push('sl = ?');
    values.push(data.sl);
  }
  
  if (data.tp !== undefined) {
    updates.push('tp = ?');
    values.push(data.tp);
  }
  
  if (updates.length === 0) {
    return getPositionById(id);
  }
  
  values.push(id);
  const stmt = db.prepare(`UPDATE paper_positions SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);
  
  // Log event
  createEvent({
    positionId: id,
    event: data.sl !== undefined ? 'SL_UPDATED' : 'TP_UPDATED',
    payload: JSON.stringify(data),
    ts: Date.now(),
  });
  
  logger.info({ positionId: id, updates: data }, 'Position updated');
  
  return getPositionById(id);
}

export function closePosition(
  id: number, 
  closePrice: number, 
  fee: number, 
  event: 'SL_TRIGGERED' | 'TP_TRIGGERED' | 'MANUAL_CLOSE'
): Position | null {
  const db = getDb();
  const position = getPositionById(id);
  
  // Safety checks
  if (!position) {
    logger.warn({ positionId: id }, 'Position not found');
    return null;
  }
  
  if (position.status === 'CLOSED') {
    logger.warn({ positionId: id }, 'Position already closed');
    return null;
  }
  
  const now = Date.now();
  
  // Calculate realized PnL
  const pnl = position.side === 'LONG'
    ? (closePrice - position.entryPrice) * position.qty
    : (position.entryPrice - closePrice) * position.qty;
  
  const realizedPnl = pnl - position.feesOpen - fee - position.fundingPnl;
  
  const update = db.prepare(`
    UPDATE paper_positions 
    SET status = 'CLOSED', closePrice = ?, closeTime = ?, realizedPnl = ?, feesClose = ?
    WHERE id = ?
  `);
  
  update.run(closePrice, now, realizedPnl, fee, id);
  
  // Log fill
  createFill({
    positionId: id,
    type: 'CLOSE',
    price: closePrice,
    qty: position.qty,
    fee,
    ts: now,
  });
  
  // Log event
  createEvent({
    positionId: id,
    event,
    payload: JSON.stringify({ closePrice, realizedPnl }),
    ts: now,
  });
  
  logger.info({ positionId: id, event, realizedPnl }, 'Position closed');
  
  return getPositionById(id);
}

export function deletePosition(id: number): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM paper_positions WHERE id = ?');
  const result = stmt.run(id);
  
  logger.info({ positionId: id }, 'Position deleted');
  
  return result.changes > 0;
}

// ==================== FILLS ====================

export function createFill(data: Omit<Fill, 'id'>): Fill {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO paper_fills (positionId, type, price, qty, fee, ts)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    data.positionId,
    data.type,
    data.price,
    data.qty,
    data.fee,
    data.ts
  );
  
  return {
    id: result.lastInsertRowid as number,
    ...data,
  };
}

export function getFillsByPosition(positionId: number): Fill[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM paper_fills WHERE positionId = ? ORDER BY ts ASC');
  return stmt.all(positionId) as Fill[];
}

// ==================== EVENTS ====================

export function createEvent(data: Omit<Event, 'id'>): Event {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO paper_events (positionId, event, payload, ts)
    VALUES (?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    data.positionId,
    data.event,
    data.payload,
    data.ts
  );
  
  return {
    id: result.lastInsertRowid as number,
    ...data,
  };
}

export function getEventsByPosition(positionId: number): Event[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM paper_events WHERE positionId = ? ORDER BY ts ASC');
  return stmt.all(positionId) as Event[];
}

export function getAllEvents(limit: number = 100): Event[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM paper_events ORDER BY ts DESC LIMIT ?');
  return stmt.all(limit) as Event[];
}

// ==================== SETTINGS ====================

export function getSettings(): Settings {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM settings WHERE id = 1');
  const row = stmt.get() as Settings;
  return row;
}

export function updateSettings(data: Partial<Omit<Settings, 'id'>>): Settings {
  const db = getDb();
  const updates: string[] = [];
  const values: any[] = [];
  
  if (data.takerFee !== undefined) {
    updates.push('takerFee = ?');
    values.push(data.takerFee);
  }
  
  if (data.makerFee !== undefined) {
    updates.push('makerFee = ?');
    values.push(data.makerFee);
  }
  
  if (data.enableFunding !== undefined) {
    updates.push('enableFunding = ?');
    values.push(data.enableFunding ? 1 : 0);
  }
  
  if (data.baseBalance !== undefined) {
    updates.push('baseBalance = ?');
    values.push(data.baseBalance);
  }
  
  if (data.numberFormat !== undefined) {
    updates.push('numberFormat = ?');
    values.push(data.numberFormat);
  }
  
  if (data.timezone !== undefined) {
    updates.push('timezone = ?');
    values.push(data.timezone);
  }
  
  if (data.defaultStopLossPercent !== undefined) {
    updates.push('defaultStopLossPercent = ?');
    values.push(data.defaultStopLossPercent);
  }
  
  if (data.defaultTakeProfitPercent !== undefined) {
    updates.push('defaultTakeProfitPercent = ?');
    values.push(data.defaultTakeProfitPercent);
  }
  
  if (updates.length > 0) {
    const stmt = db.prepare(`UPDATE settings SET ${updates.join(', ')} WHERE id = 1`);
    stmt.run(...values);
    logger.info({ updates: data }, 'Settings updated');
  }
  
  return getSettings();
}
