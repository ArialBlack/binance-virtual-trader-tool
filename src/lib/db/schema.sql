-- SQLite schema for Binance Virtual Trader Tool
-- Database: paper-trading.db

-- Table: paper_positions
-- Stores all trading positions (OPEN and CLOSED)
CREATE TABLE IF NOT EXISTS paper_positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK(side IN ('LONG', 'SHORT')),
  qty REAL NOT NULL,
  entryPrice REAL NOT NULL,
  entryTime INTEGER NOT NULL,
  sl REAL,
  tp REAL,
  leverage INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK(status IN ('OPEN', 'CLOSED')) DEFAULT 'OPEN',
  closePrice REAL,
  closeTime INTEGER,
  realizedPnl REAL NOT NULL DEFAULT 0,
  feesOpen REAL NOT NULL DEFAULT 0,
  feesClose REAL NOT NULL DEFAULT 0,
  fundingPnl REAL NOT NULL DEFAULT 0,
  notes TEXT
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_positions_status ON paper_positions(status);
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON paper_positions(symbol);
CREATE INDEX IF NOT EXISTS idx_positions_entry_time ON paper_positions(entryTime);
CREATE INDEX IF NOT EXISTS idx_positions_symbol_status ON paper_positions(symbol, status);

-- Table: paper_fills
-- Audit trail for all position fills (OPEN, CLOSE, PARTIAL)
CREATE TABLE IF NOT EXISTS paper_fills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  positionId INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('OPEN', 'CLOSE', 'PARTIAL')),
  price REAL NOT NULL,
  qty REAL NOT NULL,
  fee REAL NOT NULL,
  ts INTEGER NOT NULL,
  FOREIGN KEY(positionId) REFERENCES paper_positions(id) ON DELETE CASCADE
);

-- Index for position fills lookup
CREATE INDEX IF NOT EXISTS idx_fills_position_id ON paper_fills(positionId);
CREATE INDEX IF NOT EXISTS idx_fills_ts ON paper_fills(ts);

-- Table: paper_events
-- Event log for SL/TP triggers, manual edits, etc.
CREATE TABLE IF NOT EXISTS paper_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  positionId INTEGER NOT NULL,
  event TEXT NOT NULL,
  payload TEXT,
  ts INTEGER NOT NULL,
  FOREIGN KEY(positionId) REFERENCES paper_positions(id) ON DELETE CASCADE
);

-- Index for events lookup
CREATE INDEX IF NOT EXISTS idx_events_position_id ON paper_events(positionId);
CREATE INDEX IF NOT EXISTS idx_events_ts ON paper_events(ts);
CREATE INDEX IF NOT EXISTS idx_events_event ON paper_events(event);

-- Table: settings
-- Application settings (fees, funding, balance, etc.)
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  takerFee REAL NOT NULL DEFAULT 0.0004,
  makerFee REAL NOT NULL DEFAULT 0.0002,
  enableFunding INTEGER NOT NULL DEFAULT 0,
  baseBalance REAL NOT NULL DEFAULT 10000,
  numberFormat TEXT NOT NULL DEFAULT 'en-US',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  defaultStopLossPercent REAL NOT NULL DEFAULT 5.0,
  defaultTakeProfitPercent REAL NOT NULL DEFAULT 10.0
);

-- Insert default settings if not exists
INSERT OR IGNORE INTO settings (id, takerFee, makerFee, enableFunding, baseBalance, numberFormat, timezone, defaultStopLossPercent, defaultTakeProfitPercent)
VALUES (1, 0.0004, 0.0002, 0, 10000, 'en-US', 'UTC', 5.0, 10.0);
