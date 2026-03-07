// ═══════════════════════════════════════════════════════════════
// AGENT TOOLS — Now backed by real SQLite database
// All tools call the Repository layer, not in-memory arrays
// ═══════════════════════════════════════════════════════════════

import { RoomRepo, GuestRepo, ReservationRepo, StatsRepo } from '../db/repository.js';

export const toolDefinitions = [
  {
    name: 'check_room_availability',
    description: 'Check which rooms are available for specific dates. Use when a guest asks about booking, availability, or wants to find rooms.',
    input_schema: {
      type: 'object',
      properties: {
        checkIn:  { type: 'string', description: 'Check-in date YYYY-MM-DD' },
        checkOut: { type: 'string', description: 'Check-out date YYYY-MM-DD' },
        guests:   { type: 'number', description: 'Number of guests (optional)' },
        roomType: { type: 'string', enum: ['standard','deluxe','suite','penthouse'], description: 'Preferred room type (optional)' }
      },
      required: ['checkIn','checkOut']
    }
  },
  {
    name: 'get_reservation_details',
    description: 'Retrieve details of a specific reservation by ID or confirmation number.',
    input_schema: {
      type: 'object',
      properties: {
        reservationId:   { type: 'string', description: 'Reservation ID e.g. RES001' },
        confirmationNo:  { type: 'string', description: 'Confirmation number e.g. CONF-2026-001' }
      }
    }
  },
  {
    name: 'create_reservation',
    description: 'Create a new hotel reservation. Confirm all details with guest first.',
    input_schema: {
      type: 'object',
      properties: {
        guestId:         { type: 'string', description: 'Guest ID' },
        roomId:          { type: 'string', description: 'Room ID to book' },
        checkIn:         { type: 'string', description: 'Check-in date YYYY-MM-DD' },
        checkOut:        { type: 'string', description: 'Check-out date YYYY-MM-DD' },
        adults:          { type: 'number', description: 'Number of adults' },
        children:        { type: 'number', description: 'Number of children' },
        specialRequests: { type: 'string', description: 'Special requests' }
      },
      required: ['guestId','roomId','checkIn','checkOut']
    }
  },
  {
    name: 'cancel_reservation',
    description: 'Cancel an existing reservation. Always confirm with guest before cancelling.',
    input_schema: {
      type: 'object',
      properties: {
        reservationId: { type: 'string', description: 'Reservation ID to cancel' }
      },
      required: ['reservationId']
    }
  },
  {
    name: 'get_guest_profile',
    description: 'Look up a guest profile including loyalty tier, preferences, and full stay history.',
    input_schema: {
      type: 'object',
      properties: {
        guestId: { type: 'string', description: 'Guest ID e.g. G001' }
      },
      required: ['guestId']
    }
  },
  {
    name: 'get_hotel_stats',
    description: 'Get current hotel occupancy, revenue stats, and reservation summary. Use for management queries.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'calculate_pricing',
    description: 'Calculate total price for a stay including taxes and loyalty discounts.',
    input_schema: {
      type: 'object',
      properties: {
        roomId:       { type: 'string', description: 'Room ID' },
        checkIn:      { type: 'string', description: 'Check-in date YYYY-MM-DD' },
        checkOut:     { type: 'string', description: 'Check-out date YYYY-MM-DD' },
        loyaltyTier:  { type: 'string', enum: ['bronze','silver','gold','platinum'] }
      },
      required: ['roomId','checkIn','checkOut']
    }
  },
  {
    name: 'search_guests',
    description: 'Search or list guests. Use when looking up a guest by name or to see VIP guests.',
    input_schema: {
      type: 'object',
      properties: {
        tier: { type: 'string', enum: ['bronze','silver','gold','platinum'], description: 'Filter by loyalty tier' },
        name: { type: 'string', description: 'Filter by name' }
      }
    }
  },
  {
    name: 'get_room_service_menu',
    description: 'Get the menu for the room service with food, drinks and desserts items with price. Use when a guest asks about the menu. Return a list of items with name, price, and category.',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];

export const executeTool = (toolName, toolInput) => {
  console.log(`\n🔧 TOOL: ${toolName}`, JSON.stringify(toolInput));

  switch (toolName) {

    case 'check_room_availability': {
      const { checkIn, checkOut, guests, roomType } = toolInput;
      const available = RoomRepo.findAvailable(checkIn, checkOut, guests, roomType);
      console.log(`   → ${available.length} rooms found`);
      return { available, count: available.length, checkIn, checkOut };
    }

    case 'get_reservation_details': {
      const res = toolInput.reservationId
        ? ReservationRepo.findById(toolInput.reservationId)
        : ReservationRepo.findByConfirmation(toolInput.confirmationNo);
      if (!res) return { error: 'Reservation not found' };
      // Enrich with full guest profile
      const guest = GuestRepo.findById(res.guestId);
      const room  = RoomRepo.findById(res.roomId);
      return { ...res, guest, room };
    }

    case 'create_reservation': {
      try {
        const reservation = ReservationRepo.create(toolInput);
        console.log(`   → Created ${reservation.id}`);
        return { success: true, reservation };
      } catch (err) {
        return { error: err.message };
      }
    }

    case 'cancel_reservation': {
      try {
        const reservation = ReservationRepo.cancel(toolInput.reservationId);
        console.log(`   → Cancelled ${reservation.id}`);
        return { success: true, message: `Reservation ${reservation.id} cancelled.`, reservation };
      } catch (err) {
        return { error: err.message };
      }
    }

    case 'get_guest_profile': {
      const guest = GuestRepo.findWithReservations(toolInput.guestId);
      if (!guest) return { error: 'Guest not found' };
      console.log(`   → Found ${guest.name} (${guest.loyaltyTier})`);
      return guest;
    }

    case 'get_hotel_stats': {
      const stats = StatsRepo.getHotelStats();
      console.log(`   → Stats retrieved`);
      return stats;
    }

    case 'calculate_pricing': {
      const room = RoomRepo.findById(toolInput.roomId);
      if (!room) return { error: 'Room not found' };
      const nights = Math.ceil((new Date(toolInput.checkOut) - new Date(toolInput.checkIn)) / 86400000);
      const discounts = { bronze:0.05, silver:0.10, gold:0.15, platinum:0.20 };
      const disc = discounts[toolInput.loyaltyTier] || 0;
      const base = nights * room.pricePerNight;
      const discAmt = base * disc;
      const tax  = (base - discAmt) * 0.12;
      const total = base - discAmt + tax;
      return {
        nights, basePrice: base,
        discountPercent: disc * 100,
        discountAmount: +discAmt.toFixed(2),
        taxes: +tax.toFixed(2),
        total: +total.toFixed(2),
        roomDetails: { id: room.id, type: room.type, pricePerNight: room.pricePerNight },
        breakdown: `${nights} nights × $${room.pricePerNight} = $${base} − ${disc*100}% loyalty = −$${discAmt.toFixed(2)} + 12% tax $${tax.toFixed(2)} = $${total.toFixed(2)}`
      };
    }

    case 'search_guests': {
      let guests = GuestRepo.findAll();
      if (toolInput.tier) guests = guests.filter(g => g.loyaltyTier === toolInput.tier);
      if (toolInput.name) guests = guests.filter(g => g.name.toLowerCase().includes(toolInput.name.toLowerCase()));
      return { guests: guests.slice(0, 10), count: guests.length };
    }

    case 'get_room_service_menu': {
      return { menu: [ { name: 'Margherita Pizza', price: 18, category: 'Mains' },  { name: 'Garden Salad', price: 12, category: 'Salads' }, { name: 'Coca Cola', price: 3, category: 'Drinks' }, { name: 'Water', price: 1, category: 'Drinks' }] };
    }
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
};
