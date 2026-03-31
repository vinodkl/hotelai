// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE — SQLite via sql.js (pure JavaScript, no native compilation)
//
// LEARNING NOTE:
// sql.js is a WebAssembly port of SQLite. It runs entirely in JS — no C bindings,
// no native modules, no compilation errors. Perfect for learning.
//
// In production you'd swap this for:
//   - better-sqlite3 (sync SQLite, fastest for Node)
//   - pg (PostgreSQL)
//   - @planetscale/database (serverless MySQL)
//   - Prisma ORM (type-safe, works with all the above)
//
// The DATABASE LAYER (this file) is the only thing you'd change.
// All your routes, services, and tools stay identical. That's the point of
// a proper data access layer — it abstracts the storage engine.
// ═══════════════════════════════════════════════════════════════════════════════

import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '../../data/hotel.db');
const DATA_DIR = join(__dirname, '../../data');

let db = null;
let inTransaction = false;

// ─── Initialise (called once at startup) ──────────────────────────────────────
export async function initDatabase() {
  const SQL = await initSqlJs();

  // Ensure data directory exists
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

  // Load existing DB file or create fresh
  if (existsSync(DB_PATH)) {
    const fileBuffer = readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('📂 Loaded existing database from', DB_PATH);
  } else {
    db = new SQL.Database();
    console.log('🆕 Created new in-memory database');
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON;');

  return db;
}

// ─── Persist to disk ──────────────────────────────────────────────────────────
// Call this after any write operation (INSERT / UPDATE / DELETE)
export function persistDatabase() {
  if (!db) return;
  const data = db.export();
  writeFileSync(DB_PATH, Buffer.from(data));
}

// ─── Get DB instance ──────────────────────────────────────────────────────────
export function getDb() {
  if (!db) throw new Error('Database not initialised. Call initDatabase() first.');
  return db;
}

// ─── Query helpers (make sql.js feel like better-sqlite3) ────────────────────

/**
 * Execute a SELECT and return all rows as plain objects.
 * e.g. queryAll('SELECT * FROM rooms WHERE type = ?', ['suite'])
 */
export function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

/**
 * Execute a SELECT and return the first row or null.
 */
export function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results[0] ?? null;
}

/**
 * Execute an INSERT / UPDATE / DELETE.
 * Returns { changes, lastInsertRowid }
 */
export function execute(sql, params = []) {
  db.run(sql, params);
  const meta = db.exec('SELECT changes() as changes, last_insert_rowid() as lastId');
  const row = meta[0]?.values[0];
  if (!inTransaction) persistDatabase(); // skip inside a transaction — transaction() persists once at commit
  return {
    changes: row?.[0] ?? 0,
    lastInsertRowid: row?.[1] ?? null,
  };
}

/**
 * Run multiple statements inside a transaction.
 * Rolls back on error.
 */
export function transaction(fn) {
  db.run('BEGIN TRANSACTION');
  inTransaction = true;
  try {
    const result = fn();
    db.run('COMMIT');
    inTransaction = false;
    persistDatabase();
    return result;
  } catch (err) {
    inTransaction = false;
    db.run('ROLLBACK');
    throw err;
  }
}
