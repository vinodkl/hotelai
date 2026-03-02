// ═══════════════════════════════════════════════════════════════════════════════
// SEED — Rich mock data for The Grand HotelAI
//
// Run once at startup if DB is empty.
// Data is realistic: real names, plausible dates, consistent relationships.
//
// What's seeded:
//   12 rooms  (all 4 types, mix of statuses)
//   15 guests (range of loyalty tiers, nationalities, preferences)
//   18 reservations (mix of statuses, past + future + current)
//    8 payments
//    6 room-service orders
//    7 reviews
//    6 staff members
//    4 maintenance logs
// ═══════════════════════════════════════════════════════════════════════════════

import { execute, queryOne } from './database.js';

// Helper: check if data already seeded
export function isSeeded() {
  const row = queryOne('SELECT COUNT(*) as count FROM rooms');
  return (row?.count ?? 0) > 0;
}

export function seedDatabase() {
  if (isSeeded()) {
    console.log('💾 Database already seeded — skipping');
    return;
  }

  console.log('\n🌱 Seeding database with mock data...');

  seedRooms();
  seedGuests();
  seedReservations();
  seedPayments();
  seedRoomServiceOrders();
  seedReviews();
  seedStaff();
  seedMaintenanceLogs();

  console.log('✅ Seed complete!\n');
}

// ─── ROOMS ────────────────────────────────────────────────────────────────────
function seedRooms() {
  const rooms = [
    // Standard rooms — floor 1
    { id:'R101', type:'standard', floor:1, beds:1, capacity:2, price:120, status:'available', view:'city',
      amenities:['wifi','tv','ac','safe'], desc:'Cozy city-view room with queen bed. Perfect for solo travelers or couples.', sqft:320, accessible:0 },
    { id:'R102', type:'standard', floor:1, beds:2, capacity:4, price:150, status:'occupied', view:'city',
      amenities:['wifi','tv','ac','safe'], desc:'Spacious twin room ideal for families or colleagues traveling together.', sqft:380, accessible:0 },
    { id:'R103', type:'standard', floor:1, beds:1, capacity:2, price:120, status:'available', view:'garden',
      amenities:['wifi','tv','ac','safe','roll-in-shower','grab-bars'], desc:'ADA-accessible room with garden view. Roll-in shower, visual fire alarms, lowered fixtures.', sqft:400, accessible:1 },

    // Deluxe rooms — floor 2
    { id:'R201', type:'deluxe', floor:2, beds:1, capacity:2, price:200, status:'available', view:'garden',
      amenities:['wifi','tv','ac','minibar','bathtub','rainfall-shower','safe','robe'], desc:'Elegant garden-view room with freestanding bathtub and premium linens.', sqft:480, accessible:0 },
    { id:'R202', type:'deluxe', floor:2, beds:2, capacity:4, price:250, status:'available', view:'garden',
      amenities:['wifi','tv','ac','minibar','bathtub','safe','robe','sitting-area'], desc:'Twin deluxe with separate sitting area and garden terrace access.', sqft:520, accessible:0 },
    { id:'R203', type:'deluxe', floor:2, beds:1, capacity:2, price:220, status:'maintenance', view:'city',
      amenities:['wifi','tv','ac','minibar','bathtub','safe','robe'], desc:'City-view deluxe currently undergoing scheduled refurbishment.', sqft:480, accessible:0 },

    // Suites — floor 3
    { id:'R301', type:'suite', floor:3, beds:1, capacity:2, price:400, status:'reserved', view:'ocean',
      amenities:['wifi','tv','ac','minibar','jacuzzi','living-room','kitchenette','safe','robe','nespresso'], desc:'Panoramic ocean-view suite with private jacuzzi and separate living area.', sqft:750, accessible:0 },
    { id:'R302', type:'suite', floor:3, beds:2, capacity:4, price:550, status:'available', view:'ocean',
      amenities:['wifi','tv','ac','minibar','jacuzzi','living-room','kitchenette','safe','robe','nespresso','dining-area'], desc:'Two-bedroom ocean suite. Ideal for families or extended stays.', sqft:950, accessible:0 },
    { id:'R303', type:'suite', floor:3, beds:1, capacity:2, price:420, status:'available', view:'city',
      amenities:['wifi','tv','ac','minibar','jacuzzi','living-room','safe','robe','nespresso'], desc:'Executive suite with sweeping city skyline views and jacuzzi.', sqft:720, accessible:1 },

    // Penthouse — floor 4
    { id:'R401', type:'penthouse', floor:4, beds:2, capacity:4, price:1200, status:'available', view:'panoramic',
      amenities:['wifi','tv','ac','minibar','jacuzzi','private-pool','butler-service','rooftop-terrace','kitchen','wine-cellar','home-theater'], desc:'The crown jewel of The Grand HotelAI. 360° panoramic views, private heated pool, butler on call 24/7.', sqft:2800, accessible:0 },
    { id:'R402', type:'penthouse', floor:4, beds:1, capacity:2, price:950, status:'available', view:'panoramic',
      amenities:['wifi','tv','ac','minibar','jacuzzi','private-terrace','butler-service','kitchen'], desc:'Junior penthouse with private terrace and personalized butler service.', sqft:1600, accessible:0 },

    // Additional standard — floor 1
    { id:'R104', type:'standard', floor:1, beds:2, capacity:3, price:140, status:'available', view:'pool',
      amenities:['wifi','tv','ac','safe','pool-view-balcony'], desc:'Pool-view room with balcony — wake up to the sound of the water.', sqft:360, accessible:0 },
  ];

  for (const r of rooms) {
    execute(
      `INSERT INTO rooms (id,type,floor,beds,capacity,price_per_night,status,view,amenities,description,square_feet,accessible)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [r.id, r.type, r.floor, r.beds, r.capacity, r.price, r.status,
       r.view, JSON.stringify(r.amenities), r.desc, r.sqft, r.accessible]
    );
  }
  console.log(`  ✓ ${rooms.length} rooms`);
}

// ─── GUESTS ───────────────────────────────────────────────────────────────────
function seedGuests() {
  const guests = [
    { id:'G001', name:'Alice Johnson', email:'alice.j@example.com', phone:'+1-212-555-0101',
      dob:'1985-03-14', nationality:'American', tier:'gold', points:4800, stays:12, spent:8640,
      prefs:{ roomType:'suite', pillowType:'firm', dietaryRestrictions:['vegetarian'], floorPref:'high' },
      notes:'Celebrating anniversary Feb 20-23. Prefers quiet room away from elevator.' },

    { id:'G002', name:'Bob Martinez', email:'bob.m@example.com', phone:'+1-415-555-0102',
      dob:'1979-07-22', nationality:'American', tier:'silver', points:1200, stays:5, spent:2100,
      prefs:{ roomType:'deluxe', pillow:'soft', dietaryRestrictions:[], bedPref:'king' },
      notes:'Business traveler. Needs early checkout receipt by email.' },

    { id:'G003', name:'Chen Wei', email:'chen.w@example.com', phone:'+86-138-0013-8000',
      dob:'1971-11-05', nationality:'Chinese', tier:'platinum', points:18400, stays:28, spent:42000,
      prefs:{ roomType:'penthouse', floorLevel:'high', dietaryRestrictions:['halal'], language:'zh' },
      notes:'VIP. Personal concierge assigned. Prefers Mandarin-speaking staff. Always books R401.' },

    { id:'G004', name:'Diana Patel', email:'diana.p@example.com', phone:'+44-20-7946-0104',
      dob:'1992-01-30', nationality:'British', tier:'bronze', points:320, stays:2, spent:490,
      prefs:{ roomType:'standard', dietaryRestrictions:['vegan'], temperature:'cool' },
      notes:'Yoga instructor. Requests yoga mat in room.' },

    { id:'G005', name:'Erik Svensson', email:'erik.s@example.com', phone:'+46-70-555-0105',
      dob:'1968-09-12', nationality:'Swedish', tier:'gold', points:6100, stays:15, spent:11200,
      prefs:{ roomType:'deluxe', pillow:'firm', dietaryRestrictions:[], gym:'early-access' },
      notes:'Marathon runner. Requests 5am gym access and high-protein breakfast.' },

    { id:'G006', name:'Fatima Al-Rashid', email:'fatima.r@example.com', phone:'+971-50-555-0106',
      dob:'1988-04-18', nationality:'Emirati', tier:'platinum', points:22100, stays:31, spent:58000,
      prefs:{ roomType:'suite', dietaryRestrictions:['halal'], view:'ocean', privacy:'high' },
      notes:'High privacy requirements. No social media photography. Halal food only.' },

    { id:'G007', name:'George Thompson', email:'george.t@example.com', phone:'+1-617-555-0107',
      dob:'1955-12-01', nationality:'American', tier:'silver', points:2800, stays:7, spent:3900,
      prefs:{ roomType:'standard', dietaryRestrictions:['low-sodium'], accessible:true },
      notes:'Uses walking cane. Prefers accessible room. Needs shower seat.' },

    { id:'G008', name:'Hana Kobayashi', email:'hana.k@example.com', phone:'+81-90-5555-0108',
      dob:'1995-06-25', nationality:'Japanese', tier:'bronze', points:180, stays:1, spent:250,
      prefs:{ roomType:'standard', pillow:'soft', dietaryRestrictions:[] },
      notes:'First-time guest. Referred by travel agent.' },

    { id:'G009', name:'Ibrahim Hassan', email:'ibrahim.h@example.com', phone:'+20-10-5555-0109',
      dob:'1982-02-14', nationality:'Egyptian', tier:'gold', points:5400, stays:13, spent:9800,
      prefs:{ roomType:'suite', dietaryRestrictions:['halal'], view:'ocean', wakeup:'7am' },
      notes:'Medical conference attendee Feb 28 - Mar 3. Needs business center access.' },

    { id:'G010', name:'Julia Rossi', email:'julia.r@example.com', phone:'+39-02-555-0110',
      dob:'1990-08-07', nationality:'Italian', tier:'silver', points:1900, stays:6, spent:4200,
      prefs:{ roomType:'deluxe', pillow:'soft', dietaryRestrictions:[], wine:'prosecco' },
      notes:'Interior designer. Interested in hotel decor. Loves welcome amenity.' },

    { id:'G011', name:'Kevin O\'Brien', email:'kevin.o@example.com', phone:'+1-773-555-0111',
      dob:'1975-10-31', nationality:'American', tier:'bronze', points:90, stays:1, spent:150,
      prefs:{ roomType:'standard', dietaryRestrictions:['gluten-free'] },
      notes:null },

    { id:'G012', name:'Leila Mansouri', email:'leila.m@example.com', phone:'+98-21-555-0112',
      dob:'1987-03-22', nationality:'Iranian', tier:'gold', points:7200, stays:17, spent:13400,
      prefs:{ roomType:'suite', pillow:'medium', dietaryRestrictions:['vegetarian'], view:'city' },
      notes:'Architect. Often works late. Needs good desk lighting and strong wifi.' },

    { id:'G013', name:'Marcus Williams', email:'marcus.w@example.com', phone:'+1-404-555-0113',
      dob:'1983-05-19', nationality:'American', tier:'silver', points:3100, stays:8, spent:4600,
      prefs:{ roomType:'deluxe', dietaryRestrictions:[], pets:1, petName:'Max', petBreed:'Labrador' },
      notes:'Travels with dog Max (Labrador, 55 lbs — OVER pet weight limit, confirm each visit).' },

    { id:'G014', name:'Nina Schmidt', email:'nina.s@example.com', phone:'+49-30-555-0114',
      dob:'1993-12-03', nationality:'German', tier:'bronze', points:450, stays:3, spent:720,
      prefs:{ roomType:'standard', dietaryRestrictions:[], temperature:'warm' },
      notes:'Medical student. Very early check-in requests due to flight schedules.' },

    { id:'G015', name:'Omar Abdullah', email:'omar.a@example.com', phone:'+966-50-555-0115',
      dob:'1966-07-14', nationality:'Saudi', tier:'platinum', points:31000, stays:42, spent:87000,
      prefs:{ roomType:'penthouse', dietaryRestrictions:['halal'], view:'panoramic', butler:true },
      notes:'Most valuable guest. Always stays in penthouse. Personal butler (James) assigned. Direct line to GM.' },
  ];

  for (const g of guests) {
    execute(
      `INSERT INTO guests (id,name,email,phone,date_of_birth,nationality,loyalty_tier,loyalty_points,total_stays,total_spent,preferences,notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [g.id, g.name, g.email, g.phone, g.dob, g.nationality, g.tier,
       g.points, g.stays, g.spent, JSON.stringify(g.prefs), g.notes]
    );
  }
  console.log(`  ✓ ${guests.length} guests`);
}

// ─── RESERVATIONS ────────────────────────────────────────────────────────────
function seedReservations() {
  const today = '2026-02-18';  // frozen "today" for consistent demo data

  const reservations = [
    // Currently checked-in
    { id:'RES001', guestId:'G002', roomId:'R102', checkIn:'2026-02-17', checkOut:'2026-02-19',
      status:'checked-in', adults:1, children:0, nights:2, rate:150, total:300, paid:300,
      requests:'Extra pillows, early checkout receipt by email', source:'direct', conf:'CONF-2026-001' },

    // Upcoming — this week
    { id:'RES002', guestId:'G001', roomId:'R301', checkIn:'2026-02-20', checkOut:'2026-02-23',
      status:'confirmed', adults:2, children:0, nights:3, rate:400, total:1200, paid:600,
      requests:'Anniversary surprise setup — rose petals, champagne on arrival. Early check-in 1pm if possible.', source:'direct', conf:'CONF-2026-002' },

    { id:'RES003', guestId:'G004', roomId:'R103', checkIn:'2026-02-19', checkOut:'2026-02-21',
      status:'confirmed', adults:1, children:0, nights:2, rate:120, total:240, paid:240,
      requests:'Yoga mat in room. Vegan welcome amenity.', source:'direct', conf:'CONF-2026-003' },

    // Upcoming — next week
    { id:'RES004', guestId:'G003', roomId:'R401', checkIn:'2026-02-25', checkOut:'2026-03-01',
      status:'confirmed', adults:2, children:1, nights:4, rate:1200, total:4800, paid:4800,
      requests:'Halal breakfast daily. Airport transfer Feb 25 at 2pm. Business center. Mandarin-speaking staff preferred.', source:'agent', conf:'CONF-2026-004' },

    { id:'RES005', guestId:'G009', roomId:'R302', checkIn:'2026-02-28', checkOut:'2026-03-03',
      status:'confirmed', adults:1, children:0, nights:3, rate:550, total:1650, paid:825,
      requests:'Medical conference. Business center access 24/7. Late checkout if possible.', source:'direct', conf:'CONF-2026-005' },

    { id:'RES006', guestId:'G005', roomId:'R201', checkIn:'2026-02-22', checkOut:'2026-02-24',
      status:'confirmed', adults:2, children:0, nights:2, rate:200, total:400, paid:400,
      requests:'5am gym access. High-protein breakfast option.', source:'direct', conf:'CONF-2026-006' },

    // Past — checked out
    { id:'RES007', guestId:'G010', roomId:'R202', checkIn:'2026-02-10', checkOut:'2026-02-13',
      status:'checked-out', adults:2, children:0, nights:3, rate:250, total:750, paid:750,
      requests:'Welcome prosecco on arrival.', source:'ota', conf:'CONF-2026-007' },

    { id:'RES008', guestId:'G012', roomId:'R303', checkIn:'2026-02-05', checkOut:'2026-02-08',
      status:'checked-out', adults:1, children:0, nights:3, rate:420, total:1260, paid:1260,
      requests:'Strong wifi, good desk lighting. Late checkout.', source:'direct', conf:'CONF-2026-008' },

    { id:'RES009', guestId:'G006', roomId:'R301', checkIn:'2026-01-20', checkOut:'2026-01-25',
      status:'checked-out', adults:2, children:0, nights:5, rate:400, total:2000, paid:2000,
      requests:'Maximum privacy. Halal food only. No photography.', source:'direct', conf:'CONF-2026-009' },

    { id:'RES010', guestId:'G015', roomId:'R401', checkIn:'2026-01-10', checkOut:'2026-01-15',
      status:'checked-out', adults:2, children:2, nights:5, rate:1200, total:6000, paid:6000,
      requests:'Butler James assigned. Halal meals. Airport transfer both ways.', source:'direct', conf:'CONF-2026-010' },

    // Cancelled
    { id:'RES011', guestId:'G008', roomId:'R101', checkIn:'2026-02-14', checkOut:'2026-02-16',
      status:'cancelled', adults:1, children:0, nights:2, rate:120, total:240, paid:0,
      requests:'', source:'ota', conf:'CONF-2026-011' },

    { id:'RES012', guestId:'G011', roomId:'R104', checkIn:'2026-02-20', checkOut:'2026-02-22',
      status:'cancelled', adults:2, children:0, nights:2, rate:140, total:280, paid:280,
      requests:'Gluten-free breakfast.', source:'phone', conf:'CONF-2026-012' },

    // Far future
    { id:'RES013', guestId:'G015', roomId:'R401', checkIn:'2026-03-15', checkOut:'2026-03-20',
      status:'confirmed', adults:2, children:0, nights:5, rate:1200, total:6000, paid:3000,
      requests:'Same setup as last visit. Butler James. Halal.', source:'direct', conf:'CONF-2026-013' },

    { id:'RES014', guestId:'G006', roomId:'R302', checkIn:'2026-03-10', checkOut:'2026-03-14',
      status:'confirmed', adults:2, children:1, nights:4, rate:550, total:2200, paid:1100,
      requests:'Ocean view essential. Halal. High privacy.', source:'direct', conf:'CONF-2026-014' },

    // No-show example
    { id:'RES015', guestId:'G014', roomId:'R101', checkIn:'2026-02-12', checkOut:'2026-02-14',
      status:'no-show', adults:1, children:0, nights:2, rate:120, total:240, paid:120,
      requests:'Very early check-in 8am requested.', source:'phone', conf:'CONF-2026-015' },

    // A few more future bookings for variety
    { id:'RES016', guestId:'G007', roomId:'R103', checkIn:'2026-03-05', checkOut:'2026-03-07',
      status:'confirmed', adults:2, children:0, nights:2, rate:120, total:240, paid:240,
      requests:'Accessible room, shower seat, walking cane storage.', source:'phone', conf:'CONF-2026-016' },

    { id:'RES017', guestId:'G013', roomId:'R104', checkIn:'2026-02-24', checkOut:'2026-02-26',
      status:'confirmed', adults:1, children:0, nights:2, rate:140, total:280, paid:280,
      requests:'Pet-friendly room for Max (Labrador). Note: Max is 55lbs, over 30lb limit — pre-approved by manager.', source:'direct', conf:'CONF-2026-017' },

    { id:'RES018', guestId:'G001', roomId:'R303', checkIn:'2026-04-01', checkOut:'2026-04-05',
      status:'confirmed', adults:2, children:0, nights:4, rate:420, total:1680, paid:840,
      requests:'City view. Firm pillows. Vegetarian dinner package.', source:'direct', conf:'CONF-2026-018' },
  ];

  for (const r of reservations) {
    execute(
      `INSERT INTO reservations (id,guest_id,room_id,check_in,check_out,status,adults,children,
        total_nights,room_rate,total_amount,paid_amount,special_requests,source,confirmation_no)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [r.id, r.guestId, r.roomId, r.checkIn, r.checkOut, r.status,
       r.adults, r.children, r.nights, r.rate, r.total, r.paid,
       r.requests, r.source, r.conf]
    );
  }
  console.log(`  ✓ ${reservations.length} reservations`);
}

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────
function seedPayments() {
  const payments = [
    { id:'PAY001', resId:'RES001', amount:300,  method:'credit_card',   status:'completed', ref:'CC-8821-001' },
    { id:'PAY002', resId:'RES002', amount:600,  method:'credit_card',   status:'completed', ref:'CC-8821-002' },
    { id:'PAY003', resId:'RES003', amount:240,  method:'debit_card',    status:'completed', ref:'DC-9910-003' },
    { id:'PAY004', resId:'RES004', amount:4800, method:'bank_transfer', status:'completed', ref:'BT-INT-004' },
    { id:'PAY005', resId:'RES005', amount:825,  method:'credit_card',   status:'completed', ref:'CC-7744-005' },
    { id:'PAY006', resId:'RES007', amount:750,  method:'credit_card',   status:'completed', ref:'CC-6632-007' },
    { id:'PAY007', resId:'RES008', amount:1260, method:'credit_card',   status:'completed', ref:'CC-5521-008' },
    { id:'PAY008', resId:'RES010', amount:6000, method:'bank_transfer', status:'completed', ref:'BT-VIP-010' },
  ];

  for (const p of payments) {
    execute(
      `INSERT INTO payments (id,reservation_id,amount,method,status,transaction_ref)
       VALUES (?,?,?,?,?,?)`,
      [p.id, p.resId, p.amount, p.method, p.status, p.ref]
    );
  }
  console.log(`  ✓ ${payments.length} payments`);
}

// ─── ROOM SERVICE ORDERS ──────────────────────────────────────────────────────
function seedRoomServiceOrders() {
  const orders = [
    { id:'RS001', resId:'RES001', total:68, status:'delivered',
      items:[{name:'Club Sandwich',qty:1,price:22},{name:'Caesar Salad',qty:1,price:18},{name:'Sparkling Water',qty:2,price:8},{name:'Tiramisu',qty:1,price:12}],
      notes:'No onions on sandwich', ordered:'2026-02-17T19:30:00', delivered:'2026-02-17T20:05:00' },

    { id:'RS002', resId:'RES002', total:95, status:'delivered',
      items:[{name:'Champagne (bottle)',qty:1,price:65},{name:'Chocolate Strawberries',qty:1,price:30}],
      notes:'Anniversary setup — deliver before 6pm with rose petals as per special request', ordered:'2026-02-20T14:00:00', delivered:'2026-02-20T17:45:00' },

    { id:'RS003', resId:'RES004', total:142, status:'pending',
      items:[{name:'Halal Breakfast Platter',qty:2,price:48},{name:'Fresh Juice Selection',qty:1,price:22},{name:'Arabic Coffee Service',qty:1,price:18},{name:'Pastry Basket',qty:1,price:28},{name:'Mineral Water (still)',qty:3,price:9}],
      notes:'All items must be halal-certified. Arabic coffee without sugar please.', ordered:'2026-02-25T07:15:00', delivered:null },

    { id:'RS004', resId:'RES007', total:52, status:'delivered',
      items:[{name:'Prosecco (bottle)',qty:1,price:38},{name:'Mixed Nuts',qty:1,price:14}],
      notes:'Welcome amenity — arrival gift', ordered:'2026-02-10T15:30:00', delivered:'2026-02-10T16:00:00' },

    { id:'RS005', resId:'RES008', total:34, status:'delivered',
      items:[{name:'Nespresso Pods (×10)',qty:1,price:12},{name:'Croissant Basket',qty:1,price:16},{name:'Still Water',qty:2,price:6}],
      notes:'Working late — light snack delivery at midnight', ordered:'2026-02-06T23:45:00', delivered:'2026-02-07T00:15:00' },

    { id:'RS006', resId:'RES010', total:380, status:'delivered',
      items:[{name:'Halal Wagyu Steak (200g)',qty:2,price:120},{name:'Lobster Bisque',qty:2,price:45},{name:'Dom Pérignon (bottle)',qty:1,price:280},{name:'Fresh Fruit Platter',qty:1,price:35}],
      notes:'VIP dinner service. Butler James to supervise. Fine dining setup.', ordered:'2026-01-12T19:00:00', delivered:'2026-01-12T20:00:00' },
  ];

  for (const o of orders) {
    execute(
      `INSERT INTO room_service_orders (id,reservation_id,items,total,status,notes,ordered_at,delivered_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [o.id, o.resId, JSON.stringify(o.items), o.total, o.status, o.notes, o.ordered, o.delivered]
    );
  }
  console.log(`  ✓ ${orders.length} room service orders`);
}

// ─── REVIEWS ─────────────────────────────────────────────────────────────────
function seedReviews() {
  const reviews = [
    { id:'REV001', resId:'RES007', guestId:'G010', overall:5, clean:5, svc:5, loc:5, val:4,
      comment:'Magnificent stay. The attention to detail is extraordinary — the prosecco welcome was a lovely touch. Room 202 has the most beautiful garden view. The Azure restaurant exceeded our expectations for dinner. Will absolutely return.',
      response:'Thank you so much, Julia! We were delighted to host you and look forward to welcoming you back soon.' },

    { id:'REV002', resId:'RES008', guestId:'G012', overall:4, clean:5, svc:4, loc:5, val:4,
      comment:'Excellent suite, perfect for working. WiFi is genuinely fast. Desk and lighting are professional-grade. Only minor gripe: the late checkout request was handled a bit slowly. Everything else was 5 stars.',
      response:'Thank you Leila! Your feedback on late checkout processing is noted — we are streamlining our process. Hope to see you at your next conference!' },

    { id:'REV003', resId:'RES009', guestId:'G006', overall:5, clean:5, svc:5, loc:5, val:5,
      comment:'The privacy and discretion shown by all staff was impeccable. Our dietary requirements were handled perfectly every single time — true halal compliance with no compromises. The ocean suite is breathtaking. 5-star service from every team member.',
      response:'It is always an honour to host you. Your trust means everything to our team.' },

    { id:'REV004', resId:'RES010', guestId:'G015', overall:5, clean:5, svc:5, loc:5, val:5,
      comment:'As always, The Grand delivers. James (butler) is a true professional. The halal wagyu dinner was perfection. Our children were entertained and well cared for. The panoramic pool at sunset is unlike anything in the world. See you in March.',
      response:'Mr. Abdullah, your loyalty humbles us. James and the entire team looks forward to your return in March.' },

    { id:'REV005', resId:'RES007', guestId:'G010', overall:3, clean:4, svc:3, loc:5, val:3,
      comment:'Second visit — slightly disappointed compared to last time. Room was clean but the TV remote had dead batteries. Restaurant was slow at lunch. The location and building itself remain stunning.',
      response:'We sincerely apologize for falling short on your second visit. We have addressed the maintenance point. Please allow us to make it right on your next stay.' },

    { id:'REV006', resId:'RES001', guestId:'G002', overall:4, clean:4, svc:4, loc:5, val:4,
      comment:'Good business stay. Room was comfortable and quiet. Checkout was smooth. Gym was well-equipped. Would return for work trips.',
      response:'Glad to be your business travel home, Bob! See you next time.' },

    { id:'REV007', resId:'RES008', guestId:'G012', overall:5, clean:5, svc:5, loc:5, val:5,
      comment:'Have now stayed 4 times. The consistency is remarkable. R303 with city views at night is absolutely stunning. Staff remembers my preferences (strong wifi, late hours) without me asking. This is what 5-star hospitality looks like.',
      response:'Leila, your kind words warm our whole team! R303 will always be ready for you.' },
  ];

  for (const r of reviews) {
    execute(
      `INSERT INTO reviews (id,reservation_id,guest_id,overall_rating,cleanliness,service,location,value,comment,response)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [r.id, r.resId, r.guestId, r.overall, r.clean, r.svc, r.loc, r.val, r.comment, r.response]
    );
  }
  console.log(`  ✓ ${reviews.length} reviews`);
}

// ─── STAFF ────────────────────────────────────────────────────────────────────
function seedStaff() {
  const staff = [
    { id:'S001', name:'James Harrison',  role:'concierge',    email:'james.h@hotelai.com',  phone:'+1-555-1001', shift:'morning', active:1 },
    { id:'S002', name:'Maria Santos',    role:'front_desk',   email:'maria.s@hotelai.com',  phone:'+1-555-1002', shift:'morning', active:1 },
    { id:'S003', name:'David Park',      role:'front_desk',   email:'david.p@hotelai.com',  phone:'+1-555-1003', shift:'afternoon', active:1 },
    { id:'S004', name:'Amara Osei',      role:'housekeeping', email:'amara.o@hotelai.com',  phone:'+1-555-1004', shift:'morning', active:1 },
    { id:'S005', name:'Tom Nguyen',      role:'maintenance',  email:'tom.n@hotelai.com',    phone:'+1-555-1005', shift:'morning', active:1 },
    { id:'S006', name:'Sophie Laurent',  role:'manager',      email:'sophie.l@hotelai.com', phone:'+1-555-1006', shift:'morning', active:1 },
  ];

  for (const s of staff) {
    execute(
      `INSERT INTO staff (id,name,role,email,phone,shift,active)
       VALUES (?,?,?,?,?,?,?)`,
      [s.id, s.name, s.role, s.email, s.phone, s.shift, s.active]
    );
  }
  console.log(`  ✓ ${staff.length} staff`);
}

// ─── MAINTENANCE LOGS ─────────────────────────────────────────────────────────
function seedMaintenanceLogs() {
  const logs = [
    { id:'MNT001', roomId:'R203', staffId:'S005', issue:'Scheduled full refurbishment — new bathroom fixtures, fresh paint, updated furniture', priority:'normal', status:'in-progress', notes:'Expected completion: Feb 28, 2026' },
    { id:'MNT002', roomId:'R302', staffId:'S005', issue:'Jacuzzi pump intermittent noise reported by previous guest', priority:'high', status:'resolved', resolved:'2026-02-15T14:00:00', notes:'Pump replaced. Tested and confirmed silent.' },
    { id:'MNT003', roomId:'R101', staffId:'S005', issue:'TV remote batteries dead — reported by guest G002', priority:'low', status:'resolved', resolved:'2026-02-17T10:30:00', notes:'Replaced. All remotes in block now checked.' },
    { id:'MNT004', roomId:'R401', staffId:'S005', issue:'Private pool heating system annual service', priority:'normal', status:'open', notes:'Scheduled for Mar 5 during low occupancy window.' },
  ];

  for (const l of logs) {
    execute(
      `INSERT INTO maintenance_logs (id,room_id,staff_id,issue,priority,status,resolved_at,notes)
       VALUES (?,?,?,?,?,?,?,?)`,
      [l.id, l.roomId, l.staffId, l.issue, l.priority, l.status, l.resolved ?? null, l.notes]
    );
  }
  console.log(`  ✓ ${logs.length} maintenance logs`);
}
