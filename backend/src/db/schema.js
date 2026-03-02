// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA — Full hotel database schema
//
// Tables:
//   rooms            → room inventory (type, floor, price, amenities...)
//   guests           → guest profiles (loyalty tier, preferences...)
//   reservations     → bookings (links guest ↔ room, dates, status...)
//   payments         → payment records per reservation
//   room_service     → room service orders per reservation
//   reviews          → guest reviews per reservation
//   staff            → hotel staff members
//   maintenance_logs → room maintenance history
// ═══════════════════════════════════════════════════════════════════════════════

import { getDb } from './database.js';

export function createSchema() {
  const db = getDb();

  db.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      id              TEXT PRIMARY KEY,
      type            TEXT NOT NULL CHECK(type IN ('standard','deluxe','suite','penthouse')),
      floor           INTEGER NOT NULL,
      beds            INTEGER NOT NULL,
      capacity        INTEGER NOT NULL,
      price_per_night REAL NOT NULL,
      status          TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','occupied','maintenance','reserved')),
      view            TEXT,
      amenities       TEXT NOT NULL DEFAULT '[]',   -- JSON array stored as text
      description     TEXT,
      square_feet     INTEGER,
      smoking         INTEGER NOT NULL DEFAULT 0,   -- 0=false, 1=true (SQLite has no BOOLEAN)
      accessible      INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS guests (
      id                  TEXT PRIMARY KEY,
      name                TEXT NOT NULL,
      email               TEXT NOT NULL UNIQUE,
      phone               TEXT,
      date_of_birth       TEXT,
      nationality         TEXT,
      loyalty_tier        TEXT NOT NULL DEFAULT 'bronze' CHECK(loyalty_tier IN ('bronze','silver','gold','platinum')),
      loyalty_points      INTEGER NOT NULL DEFAULT 0,
      total_stays         INTEGER NOT NULL DEFAULT 0,
      total_spent         REAL NOT NULL DEFAULT 0,
      preferences         TEXT NOT NULL DEFAULT '{}',  -- JSON
      notes               TEXT,
      created_at          TEXT NOT NULL DEFAULT (datetime('now')),
      last_stay           TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reservations (
      id               TEXT PRIMARY KEY,
      guest_id         TEXT NOT NULL REFERENCES guests(id),
      room_id          TEXT NOT NULL REFERENCES rooms(id),
      check_in         TEXT NOT NULL,
      check_out        TEXT NOT NULL,
      status           TEXT NOT NULL DEFAULT 'confirmed'
                         CHECK(status IN ('confirmed','checked-in','checked-out','cancelled','no-show')),
      adults           INTEGER NOT NULL DEFAULT 2,
      children         INTEGER NOT NULL DEFAULT 0,
      total_nights     INTEGER NOT NULL,
      room_rate        REAL NOT NULL,
      total_amount     REAL NOT NULL,
      paid_amount      REAL NOT NULL DEFAULT 0,
      special_requests TEXT,
      source           TEXT DEFAULT 'direct',   -- direct | ota | phone | agent
      confirmation_no  TEXT UNIQUE,
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id               TEXT PRIMARY KEY,
      reservation_id   TEXT NOT NULL REFERENCES reservations(id),
      amount           REAL NOT NULL,
      method           TEXT NOT NULL CHECK(method IN ('credit_card','debit_card','cash','bank_transfer','loyalty_points')),
      status           TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('pending','completed','refunded','failed')),
      transaction_ref  TEXT,
      notes            TEXT,
      created_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS room_service_orders (
      id             TEXT PRIMARY KEY,
      reservation_id TEXT NOT NULL REFERENCES reservations(id),
      items          TEXT NOT NULL,  -- JSON array: [{name, qty, price}]
      total          REAL NOT NULL,
      status         TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','preparing','delivered','cancelled')),
      notes          TEXT,
      ordered_at     TEXT NOT NULL DEFAULT (datetime('now')),
      delivered_at   TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id             TEXT PRIMARY KEY,
      reservation_id TEXT NOT NULL REFERENCES reservations(id),
      guest_id       TEXT NOT NULL REFERENCES guests(id),
      overall_rating INTEGER NOT NULL CHECK(overall_rating BETWEEN 1 AND 5),
      cleanliness    INTEGER CHECK(cleanliness BETWEEN 1 AND 5),
      service        INTEGER CHECK(service BETWEEN 1 AND 5),
      location       INTEGER CHECK(location BETWEEN 1 AND 5),
      value          INTEGER CHECK(value BETWEEN 1 AND 5),
      comment        TEXT,
      response       TEXT,   -- hotel's response to the review
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS staff (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      role         TEXT NOT NULL,   -- concierge | housekeeping | front_desk | manager | maintenance
      email        TEXT UNIQUE,
      phone        TEXT,
      shift        TEXT,            -- morning | afternoon | night
      active       INTEGER NOT NULL DEFAULT 1,
      hired_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS maintenance_logs (
      id          TEXT PRIMARY KEY,
      room_id     TEXT NOT NULL REFERENCES rooms(id),
      staff_id    TEXT REFERENCES staff(id),
      issue       TEXT NOT NULL,
      priority    TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
      status      TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in-progress','resolved')),
      resolved_at TEXT,
      notes       TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  console.log('✅ Schema created (8 tables)');
}
