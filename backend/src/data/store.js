// ═══════════════════════════════════════════════════════════════
// MOCK DATA STORE — simulates a real hotel database
// In a real app this would be PostgreSQL / MongoDB
// ═══════════════════════════════════════════════════════════════

export const rooms = [
  { id: 'R101', type: 'standard', floor: 1, beds: 1, capacity: 2, pricePerNight: 120, amenities: ['wifi', 'tv', 'ac'], status: 'available', view: 'city' },
  { id: 'R102', type: 'standard', floor: 1, beds: 2, capacity: 4, pricePerNight: 150, amenities: ['wifi', 'tv', 'ac'], status: 'occupied', view: 'city' },
  { id: 'R201', type: 'deluxe', floor: 2, beds: 1, capacity: 2, pricePerNight: 200, amenities: ['wifi', 'tv', 'ac', 'minibar', 'bathtub'], status: 'available', view: 'garden' },
  { id: 'R202', type: 'deluxe', floor: 2, beds: 2, capacity: 4, pricePerNight: 250, amenities: ['wifi', 'tv', 'ac', 'minibar', 'bathtub'], status: 'available', view: 'garden' },
  { id: 'R301', type: 'suite', floor: 3, beds: 1, capacity: 2, pricePerNight: 400, amenities: ['wifi', 'tv', 'ac', 'minibar', 'jacuzzi', 'living-room', 'kitchenette'], status: 'available', view: 'ocean' },
  { id: 'R302', type: 'suite', floor: 3, beds: 2, capacity: 4, pricePerNight: 550, amenities: ['wifi', 'tv', 'ac', 'minibar', 'jacuzzi', 'living-room', 'kitchenette'], status: 'maintenance', view: 'ocean' },
  { id: 'R401', type: 'penthouse', floor: 4, beds: 2, capacity: 4, pricePerNight: 1200, amenities: ['wifi', 'tv', 'ac', 'minibar', 'jacuzzi', 'private-pool', 'butler-service', 'rooftop-terrace'], status: 'available', view: 'panoramic' },
];

export const guests = [
  { id: 'G001', name: 'Alice Johnson', email: 'alice@example.com', phone: '+1-555-0101', loyaltyTier: 'gold', totalStays: 12, preferences: { roomType: 'suite', pillowType: 'firm', dietaryRestrictions: ['vegetarian'] } },
  { id: 'G002', name: 'Bob Martinez', email: 'bob@example.com', phone: '+1-555-0102', loyaltyTier: 'silver', totalStays: 5, preferences: { roomType: 'deluxe', pillow: 'soft', dietaryRestrictions: [] } },
  { id: 'G003', name: 'Chen Wei', email: 'chen@example.com', phone: '+1-555-0103', loyaltyTier: 'platinum', totalStays: 28, preferences: { roomType: 'penthouse', floorLevel: 'high', dietaryRestrictions: ['halal'] } },
  { id: 'G004', name: 'Diana Patel', email: 'diana@example.com', phone: '+1-555-0104', loyaltyTier: 'bronze', totalStays: 2, preferences: { roomType: 'standard', dietaryRestrictions: ['vegan'] } },
];

export const reservations = [
  { 
    id: 'RES001', guestId: 'G001', roomId: 'R301', 
    checkIn: '2026-02-20', checkOut: '2026-02-23', 
    status: 'confirmed', totalAmount: 1200, 
    specialRequests: 'Early check-in if possible, anniversary surprise setup',
    createdAt: '2026-02-01T10:00:00Z'
  },
  { 
    id: 'RES002', guestId: 'G002', roomId: 'R102', 
    checkIn: '2026-02-18', checkOut: '2026-02-19', 
    status: 'checked-in', totalAmount: 150, 
    specialRequests: '',
    createdAt: '2026-02-10T14:30:00Z'
  },
  { 
    id: 'RES003', guestId: 'G003', roomId: 'R401', 
    checkIn: '2026-02-25', checkOut: '2026-03-01', 
    status: 'confirmed', totalAmount: 6000, 
    specialRequests: 'Halal breakfast, airport transfer, business center access',
    createdAt: '2026-01-15T09:00:00Z'
  },
];

// Helper functions (your "repository layer")
export const findAvailableRooms = (checkIn, checkOut, guests) => {
  const occupiedRoomIds = reservations
    .filter(r => r.status !== 'cancelled' && datesOverlap(r.checkIn, r.checkOut, checkIn, checkOut))
    .map(r => r.roomId);
  
  return rooms.filter(r => 
    r.status === 'available' && 
    !occupiedRoomIds.includes(r.id) &&
    (!guests || r.capacity >= guests)
  );
};

export const getReservationById = (id) => reservations.find(r => r.id === id);
export const getGuestById = (id) => guests.find(g => g.id === id);
export const getRoomById = (id) => rooms.find(r => r.id === id);

export const createReservation = (data) => {
  const newRes = {
    id: `RES${String(reservations.length + 1).padStart(3, '0')}`,
    ...data,
    status: 'confirmed',
    createdAt: new Date().toISOString()
  };
  reservations.push(newRes);
  return newRes;
};

const datesOverlap = (start1, end1, start2, end2) => {
  return new Date(start1) < new Date(end2) && new Date(end1) > new Date(start2);
};

export const getHotelStats = () => ({
  totalRooms: rooms.length,
  availableRooms: rooms.filter(r => r.status === 'available').length,
  occupiedRooms: rooms.filter(r => r.status === 'occupied').length,
  totalGuests: guests.length,
  activeReservations: reservations.filter(r => r.status !== 'cancelled').length,
  todayCheckIns: reservations.filter(r => r.checkIn === new Date().toISOString().split('T')[0]).length,
});
