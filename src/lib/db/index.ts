import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

const DB_DIR = path.join(process.cwd(), 'database');
const DB_PATH = process.env.DATABASE_PATH || path.join(DB_DIR, 'paper-trading.db');

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  logger.info({ path: DB_DIR }, 'Created database directory');
}

// Initialize database connection
let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, {
      verbose: process.env.NODE_ENV === 'development' ? logger.debug.bind(logger) : undefined,
    });
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Set WAL mode for better concurrency
    db.pragma('journal_mode = WAL');
    
    logger.info({ path: DB_PATH }, 'Database connection established');
    
    // Run migrations
    runMigrations(db);
    
    // Initialize app asynchronously (don't block)
    initializeAppAsync();
  }
  
  return db;
}

// Async initialization to avoid blocking
let initPromise: Promise<void> | null = null;

async function initializeAppAsync() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // Wait a bit to ensure database is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Dynamic import to avoid circular dependencies
      const { initializeApp } = await import('../init');
      await initializeApp();
    } catch (error) {
      logger.error({ err: error }, 'Failed to initialize app');
    }
  })();

  return initPromise;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
}

function runMigrations(database: Database.Database): void {
  // Use process.cwd() instead of __dirname to find schema in source directory
  const schemaPath = path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');
  
  if (!fs.existsSync(schemaPath)) {
    logger.error({ path: schemaPath }, 'Schema file not found');
    throw new Error('Schema file not found');
  }
  
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  
  try {
    database.exec(schema);
    logger.info('Database schema initialized successfully');
    
    // Run additional migrations for existing databases
    try {
      // Add defaultStopLossPercent and defaultTakeProfitPercent if they don't exist
      database.exec(`
        ALTER TABLE settings ADD COLUMN defaultStopLossPercent REAL NOT NULL DEFAULT 5.0;
      `);
      logger.info('Added defaultStopLossPercent column to settings');
    } catch (e) {
      // Column already exists, ignore
    }
    
    try {
      database.exec(`
        ALTER TABLE settings ADD COLUMN defaultTakeProfitPercent REAL NOT NULL DEFAULT 10.0;
      `);
      logger.info('Added defaultTakeProfitPercent column to settings');
    } catch (e) {
      // Column already exists, ignore
    }
    
    // Update existing settings row if columns were just added
    database.exec(`
      UPDATE settings 
      SET defaultStopLossPercent = 5.0, defaultTakeProfitPercent = 10.0 
      WHERE id = 1 AND defaultStopLossPercent IS NULL;
    `);
    
  } catch (error) {
    logger.error({ error }, 'Failed to initialize database schema');
    throw error;
  }
}

// Graceful shutdown
process.on('exit', () => {
  closeDb();
});

process.on('SIGINT', () => {
  closeDb();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDb();
  process.exit(0);
});

export default getDb;
