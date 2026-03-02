// ═══════════════════════════════════════════════════════════════════════════════
// REPOSITORY — All database queries in one place
//
// LEARNING NOTE (Software Architecture):
// This is the "Repository Pattern". Every route and service calls THIS file,
// never the raw DB directly. Why it matters:
//
//   routes/rooms.js  ─┐
//   tools/hotelTools  ─┼─► repository.js ─► database.js ─► SQLite
//   services/agent    ─┘
//
// Benefits:
//   1. Swap SQLite → Postgres by changing only database.js
//   2. All queries in one place → easy to audit, test, optimise
//   3. Business logic (enrich, filter, format) lives here, not in routes
// ═══════════════════════════════════════════════════════════════════════════════

import { queryAll, queryOne, execute, transaction } from './database.js';
import { v4 as uuidv4 } from 'uuid';

// ─────────────────────────────────────────────────────────────────────────────
// ROOMS
// ─────────────────────────────────────────────────────────────────────────────

export const RoomRepo = {
  findAll() {
    const rooms = queryAll('SELECT * FROM rooms ORDER BY floor, id');
    return rooms.map(parseRoom);
  },

  findById(id) {
    const room = queryOne('SELECT * FROM rooms WHERE id = ?', [id]);
    return room ? parseRoom(room) : null;
  },

  findAvailable(checkIn, checkOut, guestCount = null, roomType = null) {
    // Find rooms not occupied by overlapping reservations
    let sql = `
      SELECT r.* FROM rooms r
      WHERE r.status = 'available'
        AND r.id NOT IN (
          SELECT res.room_id FROM reservations res
          WHERE res.status NOT IN ('cancelled', 'checked-out', 'no-show')
            AND res.check_in  < ?
            AND res.check_out > ?
        )
    `;
    const params = [checkOut, checkIn];

    if (guestCount) {
      sql += ' AND r.capacity >= ?';
      params.push(guestCount);
    }
    if (roomType) {
      sql += ' AND r.type = ?';
      params.push(roomType);
    }

    sql += ' ORDER BY r.price_per_night ASC';
    return queryAll(sql, params).map(parseRoom);
  },

  updateStatus(id, status) {
    execute('UPDATE rooms SET status = ? WHERE id = ?', [status, id]);
    return this.findById(id);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// GUESTS
// ─────────────────────────────────────────────────────────────────────────────

export const GuestRepo = {
  findAll() {
    return queryAll('SELECT * FROM guests ORDER BY total_spent DESC').map(parseGuest);
  },

  findById(id) {
    const guest = queryOne('SELECT * FROM guests WHERE id = ?', [id]);
    return guest ? parseGuest(guest) : null;
  },

  findByEmail(email) {
    const guest = queryOne('SELECT * FROM guests WHERE email = ?', [email]);
    return guest ? parseGuest(guest) : null;
  },

  findWithReservations(id) {
    const guest = this.findById(id);
    if (!guest) return null;
    const reservations = queryAll(
      `SELECT res.*, r.type as room_type, r.view, r.price_per_night
       FROM reservations res
       JOIN rooms r ON res.room_id = r.id
       WHERE res.guest_id = ?
       ORDER BY res.check_in DESC`,
      [id]
    );
    return { ...guest, reservations: reservations.map(parseReservation) };
  },

  addPoints(id, points) {
    execute(
      'UPDATE guests SET loyalty_points = loyalty_points + ? WHERE id = ?',
      [points, id]
    );
  },

  incrementStays(id, amount) {
    execute(
      `UPDATE guests SET 
         total_stays = total_stays + 1,
         total_spent = total_spent + ?,
         last_stay   = date('now')
       WHERE id = ?`,
      [amount, id]
    );
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// RESERVATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const ReservationRepo = {
  findAll({ status, limit = 50 } = {}) {
    let sql = `
      SELECT res.*,
             g.name as guest_name, g.email as guest_email, g.loyalty_tier,
             r.type as room_type, r.view, r.floor, r.price_per_night
      FROM reservations res
      JOIN guests g ON res.guest_id = g.id
      JOIN rooms  r ON res.room_id  = r.id
    `;
    const params = [];
    if (status) {
      sql += ' WHERE res.status = ?';
      params.push(status);
    }
    sql += ` ORDER BY res.check_in DESC LIMIT ${limit}`;
    return queryAll(sql, params).map(parseReservation);
  },

  findById(id) {
    const res = queryOne(
      `SELECT res.*,
              g.name as guest_name, g.email as guest_email, g.phone as guest_phone,
              g.loyalty_tier, g.loyalty_points, g.preferences as guest_preferences,
              r.type as room_type, r.view, r.floor, r.amenities as room_amenities,
              r.square_feet, r.description as room_description, r.price_per_night
       FROM reservations res
       JOIN guests g ON res.guest_id = g.id
       JOIN rooms  r ON res.room_id  = r.id
       WHERE res.id = ?`,
      [id]
    );
    return res ? parseReservation(res) : null;
  },

  findByConfirmation(confirmationNo) {
    const res = queryOne(
      `SELECT res.*, g.name as guest_name, r.type as room_type
       FROM reservations res
       JOIN guests g ON res.guest_id = g.id
       JOIN rooms  r ON res.room_id  = r.id
       WHERE res.confirmation_no = ?`,
      [confirmationNo]
    );
    return res ? parseReservation(res) : null;
  },

  findUpcoming(days = 7) {
    return queryAll(
      `SELECT res.*, g.name as guest_name, r.type as room_type, r.id as room_id
       FROM reservations res
       JOIN guests g ON res.guest_id = g.id
       JOIN rooms  r ON res.room_id  = r.id
       WHERE res.status IN ('confirmed')
         AND res.check_in BETWEEN date('now') AND date('now', '+' || ? || ' days')
       ORDER BY res.check_in`,
      [days]
    ).map(parseReservation);
  },

  findTodayCheckIns() {
    return queryAll(
      `SELECT res.*, g.name as guest_name, r.type as room_type
       FROM reservations res
       JOIN guests g ON res.guest_id = g.id
       JOIN rooms  r ON res.room_id  = r.id
       WHERE res.check_in = date('now') AND res.status = 'confirmed'`,
      []
    ).map(parseReservation);
  },

  create({ guestId, roomId, checkIn, checkOut, adults = 2, children = 0, specialRequests = '', source = 'direct' }) {
    const room = RoomRepo.findById(roomId);
    if (!room) throw new Error(`Room ${roomId} not found`);

    const nights = Math.ceil(
      (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
    );
    const total = nights * room.pricePerNight;
    const id    = 'RES' + String(Date.now()).slice(-6);
    const conf  = 'CONF-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 90000) + 10000);

    transaction(() => {
      execute(
        `INSERT INTO reservations
           (id,guest_id,room_id,check_in,check_out,adults,children,
            total_nights,room_rate,total_amount,paid_amount,special_requests,source,confirmation_no)
         VALUES (?,?,?,?,?,?,?,?,?,?,0,?,?,?)`,
        [id, guestId, roomId, checkIn, checkOut, adults, children,
         nights, room.pricePerNight, total, specialRequests, source, conf]
      );
      // Mark room as reserved
      execute("UPDATE rooms SET status = 'reserved' WHERE id = ?", [roomId]);
    });

    return this.findById(id);
  },

  updateStatus(id, status) {
    execute(
      "UPDATE reservations SET status = ?, updated_at = datetime('now') WHERE id = ?",
      [status, id]
    );
    return this.findById(id);
  },

  cancel(id) {
    const res = this.findById(id);
    if (!res) throw new Error('Reservation not found');
    transaction(() => {
      execute("UPDATE reservations SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?", [id]);
      execute("UPDATE rooms SET status = 'available' WHERE id = ?", [res.roomId]);
    });
    return this.findById(id);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// STATS (dashboard / hotel-wide analytics)
// ─────────────────────────────────────────────────────────────────────────────

export const StatsRepo = {
  getHotelStats() {
    const roomStats  = queryOne(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status='available'   THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status='occupied'    THEN 1 ELSE 0 END) as occupied,
        SUM(CASE WHEN status='maintenance' THEN 1 ELSE 0 END) as maintenance,
        SUM(CASE WHEN status='reserved'    THEN 1 ELSE 0 END) as reserved
      FROM rooms`);

    const resStats   = queryOne(`
      SELECT
        COUNT(*)                                                       as total,
        SUM(CASE WHEN status='confirmed'   THEN 1 ELSE 0 END)         as confirmed,
        SUM(CASE WHEN status='checked-in'  THEN 1 ELSE 0 END)         as checked_in,
        SUM(CASE WHEN status='checked-out' THEN 1 ELSE 0 END)         as checked_out,
        SUM(CASE WHEN status='cancelled'   THEN 1 ELSE 0 END)         as cancelled,
        SUM(CASE WHEN check_in=date('now') AND status='confirmed' THEN 1 ELSE 0 END) as today_check_ins,
        SUM(CASE WHEN check_out=date('now') AND status='checked-in' THEN 1 ELSE 0 END) as today_check_outs
      FROM reservations`);

    const revenue    = queryOne(`
      SELECT
        SUM(paid_amount)   as total_collected,
        SUM(total_amount)  as total_invoiced,
        AVG(total_amount)  as avg_booking_value
      FROM reservations
      WHERE status NOT IN ('cancelled','no-show')`);

    const guestStats = queryOne(`
      SELECT
        COUNT(*) as total_guests,
        SUM(CASE WHEN loyalty_tier='platinum' THEN 1 ELSE 0 END) as platinum,
        SUM(CASE WHEN loyalty_tier='gold'     THEN 1 ELSE 0 END) as gold,
        SUM(CASE WHEN loyalty_tier='silver'   THEN 1 ELSE 0 END) as silver,
        SUM(CASE WHEN loyalty_tier='bronze'   THEN 1 ELSE 0 END) as bronze
      FROM guests`);

    const occupancyRate = roomStats.total
      ? (((roomStats.occupied + roomStats.reserved) / roomStats.total) * 100).toFixed(1)
      : 0;

    return {
      rooms: { ...roomStats, occupancyRate: `${occupancyRate}%` },
      reservations: resStats,
      revenue: {
        collected: revenue.total_collected?.toFixed(2),
        invoiced:  revenue.total_invoiced?.toFixed(2),
        avgBooking: revenue.avg_booking_value?.toFixed(2),
      },
      guests: guestStats,
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// REVIEWS
// ─────────────────────────────────────────────────────────────────────────────

export const ReviewRepo = {
  findAll() {
    return queryAll(`
      SELECT rv.*, g.name as guest_name, r.type as room_type, r.id as room_id
      FROM reviews rv
      JOIN guests g ON rv.guest_id = g.id
      JOIN reservations res ON rv.reservation_id = res.id
      JOIN rooms r ON res.room_id = r.id
      ORDER BY rv.created_at DESC
    `);
  },
  averageRating() {
    return queryOne('SELECT AVG(overall_rating) as avg, COUNT(*) as count FROM reviews');
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// MAINTENANCE
// ─────────────────────────────────────────────────────────────────────────────

export const MaintenanceRepo = {
  findOpen() {
    return queryAll(`
      SELECT ml.*, r.type as room_type, s.name as staff_name
      FROM maintenance_logs ml
      JOIN rooms r ON ml.room_id = r.id
      LEFT JOIN staff s ON ml.staff_id = s.id
      WHERE ml.status != 'resolved'
      ORDER BY CASE ml.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END
    `);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Parsers — convert DB snake_case → JS camelCase + parse JSON fields
// ─────────────────────────────────────────────────────────────────────────────

function parseRoom(r) {
  return {
    id: r.id, type: r.type, floor: r.floor, beds: r.beds, capacity: r.capacity,
    pricePerNight: r.price_per_night,
    status: r.status, view: r.view,
    amenities: JSON.parse(r.amenities || '[]'),
    description: r.description,
    squareFeet: r.square_feet,
    smoking: !!r.smoking,
    accessible: !!r.accessible,
    createdAt: r.created_at,
  };
}

function parseGuest(g) {
  return {
    id: g.id, name: g.name, email: g.email, phone: g.phone,
    dateOfBirth: g.date_of_birth, nationality: g.nationality,
    loyaltyTier: g.loyalty_tier, loyaltyPoints: g.loyalty_points,
    totalStays: g.total_stays, totalSpent: g.total_spent,
    preferences: JSON.parse(g.preferences || '{}'),
    notes: g.notes, createdAt: g.created_at, lastStay: g.last_stay,
  };
}

function parseReservation(r) {
  return {
    id: r.id,
    guestId: r.guest_id, roomId: r.room_id,
    checkIn: r.check_in, checkOut: r.check_out,
    status: r.status,
    adults: r.adults, children: r.children,
    totalNights: r.total_nights, roomRate: r.room_rate,
    totalAmount: r.total_amount, paidAmount: r.paid_amount,
    specialRequests: r.special_requests,
    source: r.source, confirmationNo: r.confirmation_no,
    createdAt: r.created_at, updatedAt: r.updated_at,
    // Joined fields (only present when queried with JOINs)
    ...(r.guest_name    && { guestName: r.guest_name, guestEmail: r.guest_email }),
    ...(r.guest_phone   && { guestPhone: r.guest_phone }),
    ...(r.loyalty_tier  && { loyaltyTier: r.loyalty_tier }),
    ...(r.room_type     && { roomType: r.room_type, roomView: r.view }),
    ...(r.room_amenities && { roomAmenities: JSON.parse(r.room_amenities) }),
  };
}
