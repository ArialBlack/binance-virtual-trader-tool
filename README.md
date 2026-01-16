# Binance Virtual Trader Tool

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)

Paper trading simulator for Binance Futures with real-time price feeds, automatic SL/TP execution, and comprehensive statistics tracking.

This project is a local paper-trading simulator for Binance Futures that uses real-time prices.

- It does not place real orders.
- It does not require API keys for the core workflow.
- It does stream live Binance Futures mark prices and updates PnL in real time.

Think of it as the “truth serum” for strategy ideas. It turns opinions and signals into a measurable track record.

---

## How verification works

The flow is intentionally simple:

1) Create a virtual position
You open a LONG/SHORT with size (USDT or qty), leverage, and optional SL/TP (market or limit entry). The position is stored immediately in SQLite.

2) Stream mark prices from Binance
A WebSocket client subscribes to the symbol’s mark price feed on Binance Futures.

3) Execute SL/TP automatically
On every price tick, a trigger engine evaluates stop-loss and take-profit conditions. If triggered, it closes the position and logs what happened.

4) Push live updates to the UI
Instead of polling, the UI listens to a Server-Sent Events (SSE) stream: initial state, live position updates, trigger notifications, and heartbeats.

5) Keep an audit trail
Positions, fills, events, and settings are persisted locally. The goal is not just “did it win?”—it’s “what exactly happened, and why?”

---

## What you can do with it today

- Open positions and watch PnL update live
- Let SL/TP close positions automatically
- Close manually when you want to override
- Review closed trades, events, and summary stats
- Export to CSV for your own analysis
- Restart the app without losing state (SQLite persistence)

## 🚀 Features

- ✅ **Real-time Market Data** - WebSocket connection to Binance Futures for live price updates
- ✅ **Automatic SL/TP Triggers** - Positions close automatically when stop-loss or take-profit levels are hit
- ✅ **Position Management** - Create, monitor, and close LONG/SHORT positions with leverage
- ✅ **Live PnL Tracking** - Real-time unrealized PnL updates via Server-Sent Events (< 300ms latency)
- ✅ **Trading History** - Complete audit trail of all closed positions and events
- ✅ **Statistics Dashboard** - Win rate, average PnL, R-multiple, best/worst trades
- ✅ **CSV Export** - Export trading history with filters
- ✅ **Persistent Storage** - SQLite database survives restarts
- ✅ **Fee Simulation** - Configurable taker/maker fees (default: Binance rates)
- ✅ **Responsive UI** - Next.js 14 App Router with inline styles

## 📋 Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (or yarn/pnpm)
- Internet connection for Binance WebSocket streams

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd binance-virtual-trader-tool
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` (optional - defaults work out of the box):
   ```env
   # Binance WebSocket URL (optional)
   BINANCE_WS_URL=wss://fstream.binance.com/ws

   # Database path (optional)
   DATABASE_PATH=./database/paper-trading.db

   # Logging level (optional)
   LOG_LEVEL=info
   ```

4. **Initialize the database**
   
   The database will be created automatically on first run.

## 🏃 Running the Application

### Development Mode

```bash
npm run dev
```

The application will start at `http://localhost:3000/paper`

### Production Build

```bash
npm run build
npm start
```

## 📚 Usage Guide

### Creating a Position

1. Navigate to `http://localhost:3000/paper`
2. Fill in the form:
   - **Symbol**: Trading pair (e.g., `BTCUSDT`, `ETHUSDT`)
   - **Side**: LONG or SHORT
   - **Size Mode**: USDT (position value) or QTY (quantity)
   - **Size**: Amount in USDT or quantity
   - **Leverage**: 1x to 125x
   - **Entry Type**: Market (instant) or Limit (at specific price)
   - **SL/TP**: Optional stop-loss and take-profit prices
3. Click "Create Position"

### Monitoring Positions

- **Real-time table** shows all open positions with live PnL updates
- **Mark Price** updates every ~300ms via WebSocket
- **Unrealized PnL** and **PnL %** recalculated automatically
- Click **Close** to manually close a position

### Viewing History

Navigate to `http://localhost:3000/paper/history`:

- **Closed Positions** tab: All finished trades with realized PnL
- **Events** tab: Audit log of triggers, edits, and closes
- **Statistics** tab: Performance metrics and analytics
- **Export to CSV**: Download trading history for external analysis

### Configuring Settings

Navigate to `http://localhost:3000/paper/settings`:

- **Trading Fees**: Adjust taker/maker percentages
- **Funding**: Enable/disable funding rate simulation
- **Base Balance**: Set starting capital for % calculations
- **Display**: Decimal places and timezone preferences

## 🗄️ Database Structure

**SQLite** database with 4 tables:

### `paper_positions`
Main positions table with:
- Entry/close prices and times
- Quantity, leverage, side (LONG/SHORT)
- SL/TP levels
- Realized PnL and fees
- Status: OPEN or CLOSED

### `paper_fills`
Audit trail of position entries and exits with:
- Position ID reference
- Type: OPEN or CLOSE
- Execution price, quantity, fee
- Timestamp

### `paper_events`
Event log for:
- SL/TP triggers
- Manual closes
- Position edits
- Payload (JSON details)

### `settings`
Application configuration:
- Taker/maker fees
- Funding enabled flag
- Base balance
- Display preferences

## 🔌 API Endpoints

### Positions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/paper/positions` | Create new position |
| GET | `/api/paper/positions` | List positions (filter by `?status=OPEN\|CLOSED`) |
| GET | `/api/paper/positions/:id` | Get position details |
| PATCH | `/api/paper/positions/:id` | Update SL/TP |
| POST | `/api/paper/positions/:id/close` | Manually close position |
| DELETE | `/api/paper/positions/:id` | Delete from history |

### Statistics & Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/paper/stats` | Trading statistics |
| GET | `/api/paper/events` | Event log (filter by `?positionId=123`) |
| GET | `/api/paper/stream` | Server-Sent Events for real-time updates |
| GET | `/api/paper/export` | Export CSV (filter by `?startDate&endDate&symbol`) |

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/paper/settings` | Get current settings |
| POST | `/api/paper/settings` | Save settings |

## 🧮 PnL Calculation Formulas

### Unrealized PnL

**LONG:**
```
unrealizedPnl = (markPrice - entryPrice) * qty
```

**SHORT:**
```
unrealizedPnl = (entryPrice - markPrice) * qty
```

### PnL Percentage

```
pnlPercent = (unrealizedPnl / notional) * leverage * 100
```

Where `notional = qty * entryPrice`

### Fees

```
fee = notional * feeRate
```

Default rates (Binance):
- Taker: 0.04%
- Maker: 0.02%

### R-Multiple

```
rMultiple = realizedPnl / risk
```

Where `risk` is the initial risk based on SL distance from entry.

## 🔄 SL/TP Trigger Logic

**LONG positions:**
- SL triggers when `markPrice <= sl`
- TP triggers when `markPrice >= tp`

**SHORT positions:**
- SL triggers when `markPrice >= sl`
- TP triggers when `markPrice <= tp`

Triggers are checked on every price update (~300ms) via the trigger engine.

## 🔧 Architecture

```
src/
├── app/                      # Next.js App Router
│   ├── paper/                # Paper trading UI
│   │   ├── page.tsx          # Trading page (form + positions table)
│   │   ├── history/          # History & statistics
│   │   ├── settings/         # Settings page
│   │   └── components/       # React components
│   └── api/paper/            # REST API routes
│       ├── positions/        # Position CRUD
│       ├── stats/            # Statistics endpoint
│       ├── events/           # Events log
│       ├── stream/           # SSE streaming
│       ├── export/           # CSV export
│       └── settings/         # Settings API
├── lib/
│   ├── db/                   # SQLite queries and schema
│   ├── binance/              # WebSocket client & REST helpers
│   ├── calc/                 # PnL calculations
│   ├── triggers/             # SL/TP trigger engine
│   ├── utils/                # Logger and helpers
│   └── init.ts               # App initialization
└── types/                    # TypeScript interfaces
```

## 📝 Restore on Restart

The application automatically restores state after restart:

1. Loads all **OPEN** positions from database
2. Resubscribes to WebSocket streams for active symbols
3. Re-enables trigger monitoring for SL/TP

This is handled by `src/lib/init.ts` via Next.js middleware.

## 🧪 Testing Checklist

- [ ] Create LONG market position → PnL updates in real-time
- [ ] Create SHORT market position → PnL updates correctly
- [ ] Set SL → Position closes automatically when hit
- [ ] Set TP → Position closes automatically when hit
- [ ] Manual close → Position moves to CLOSED
- [ ] Restart server → OPEN positions restored with live updates
- [ ] Export CSV → File downloads with correct data
- [ ] Change settings → Fees applied to new positions
- [ ] UI responsiveness → Updates < 300ms latency

## 🛡️ Important Notes

### Security
- **NO REAL API KEYS REQUIRED** - Uses public Binance WebSocket streams
- No real trading occurs - pure simulation
- Database stored locally (`database/paper-trading.db`)

### Limitations
- Market orders execute at current mark price (no slippage simulation)
- Funding rates not calculated in MVP (toggle in settings is placeholder)
- No liquidation simulation
- No order book depth visualization

## 📦 Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework with App Router |
| **TypeScript** | Type-safe code |
| **SQLite** | Serverless database (better-sqlite3) |
| **WebSocket (ws)** | Binance Futures connection |
| **Pino** | Structured logging |
| **Server-Sent Events** | Real-time UI updates |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (see Testing Checklist)
5. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## 🐛 Troubleshooting

### Database locked error
- Close any other processes accessing `database/paper-trading.db`
- Delete `database/paper-trading.db-wal` and `database/paper-trading.db-shm` files

### WebSocket connection failed
- Check internet connection
- Verify Binance Futures API is accessible
- Check console logs for details

### Positions not updating
- Check browser console for SSE connection errors
- Restart development server
- Clear browser cache

### TypeScript errors during build
- Run `npm install` to ensure all dependencies are installed
- Check Node.js version (must be >= 18.0.0)

## 📞 Support

For issues or questions, please open an issue on GitHub.

---

**Built with ❤️ for paper trading enthusiasts**
