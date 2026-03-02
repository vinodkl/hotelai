// ═══════════════════════════════════════════════════════════════
// HOTEL DOCUMENTS — This is the "knowledge base" for RAG
// In Phase 2, these get chunked, embedded, and stored in ChromaDB
// The AI will retrieve relevant chunks to answer guest questions
// ═══════════════════════════════════════════════════════════════

export const hotelDocuments = [
  {
    id: 'doc-policy-checkin',
    title: 'Check-in & Check-out Policy',
    category: 'policy',
    content: `
      CHECK-IN POLICY
      Standard check-in time is 3:00 PM. Early check-in before 3:00 PM is subject to availability and may incur an additional charge of $30. 
      Guests requesting early check-in should contact the front desk at least 24 hours in advance.
      All guests must present a valid government-issued photo ID and a credit card at check-in.
      For reservations held with a debit card, a security deposit of $200 will be held.
      
      CHECK-OUT POLICY
      Standard check-out time is 12:00 PM (noon). Late check-out until 2:00 PM is available for $50.
      Late check-out until 6:00 PM is available for $100 (subject to availability).
      After 6:00 PM, a full night's rate will be charged.
      Gold and Platinum loyalty members receive complimentary late check-out until 2:00 PM.
    `
  },
  {
    id: 'doc-policy-cancellation',
    title: 'Cancellation & Modification Policy',
    category: 'policy',
    content: `
      CANCELLATION POLICY
      Free cancellation is available up to 48 hours before check-in date.
      Cancellations within 48 hours of check-in will be charged one night's stay.
      No-show reservations will be charged the full stay amount.
      Non-refundable rates cannot be cancelled or modified.
      
      MODIFICATION POLICY
      Reservations can be modified up to 24 hours before check-in at no charge.
      Modifications within 24 hours are subject to a $25 change fee.
      Room upgrades are subject to availability and price difference.
      Date changes are treated as a cancellation and rebooking.
    `
  },
  {
    id: 'doc-policy-pets',
    title: 'Pet Policy',
    category: 'policy',
    content: `
      PET POLICY
      The Grand HotelAI is a pet-friendly property. We welcome dogs and cats under 30 lbs.
      A non-refundable pet fee of $75 per stay applies (up to 7 nights).
      Stays longer than 7 nights incur an additional $10/night pet fee.
      Pets must be kept on leash in all common areas.
      Pets are not permitted in the restaurant, spa, or pool areas.
      Guests are responsible for any damage caused by their pets.
      A maximum of 2 pets per room is allowed.
      Service animals are always welcome at no charge.
    `
  },
  {
    id: 'doc-amenities-dining',
    title: 'Dining & Restaurant Information',
    category: 'amenities',
    content: `
      THE AZURE RESTAURANT
      Our signature restaurant offers contemporary Mediterranean cuisine.
      Breakfast: 6:30 AM – 10:30 AM (weekends until 11:00 AM)
      Lunch: 12:00 PM – 2:30 PM  
      Dinner: 6:00 PM – 10:30 PM
      Reservations recommended for dinner. Call ext. 2200 or use the in-room tablet.
      
      THE LOBBY BAR
      Open daily from 11:00 AM to 1:00 AM.
      Happy hour: 5:00 PM – 7:00 PM with 20% off all cocktails.
      
      ROOM SERVICE
      Available 24 hours. A $5 delivery fee applies. Orders typically arrive within 30 minutes.
      Full menu available until midnight; limited menu from midnight to 6:00 AM.
      
      DIETARY ACCOMMODATIONS
      We cater to vegetarian, vegan, gluten-free, halal, and kosher dietary requirements.
      Please inform us of any allergies at least 24 hours in advance.
    `
  },
  {
    id: 'doc-amenities-spa',
    title: 'Spa & Wellness',
    category: 'amenities',
    content: `
      THE SERENITY SPA
      Open daily 8:00 AM – 9:00 PM.
      Advance booking required for all treatments. Book via front desk or ext. 3300.
      
      TREATMENTS
      Swedish Massage (60 min): $120 | (90 min): $175
      Deep Tissue Massage (60 min): $140 | (90 min): $195
      Hot Stone Therapy (90 min): $200
      Couples Massage (60 min): $225
      Facial Treatments from $95
      
      FITNESS CENTER
      Open 24 hours. Complimentary for all guests.
      Personal training sessions available: $75/hour (advance booking required).
      
      POOL
      Outdoor heated pool open daily 7:00 AM – 10:00 PM.
      Indoor pool open 24 hours (heated, 82°F).
      Towels provided poolside.
    `
  },
  {
    id: 'doc-loyalty-program',
    title: 'Loyalty Program — Grand Rewards',
    category: 'loyalty',
    content: `
      GRAND REWARDS LOYALTY PROGRAM
      
      TIERS
      Bronze: 0-4 stays per year
        - 5% discount on room rates
        - Free WiFi (standard)
      
      Silver: 5-10 stays per year
        - 10% discount on room rates  
        - Free WiFi (premium, high-speed)
        - Room upgrade when available (at check-in)
        - Late check-out until 1:00 PM
      
      Gold: 11-20 stays per year
        - 15% discount on room rates
        - Complimentary breakfast for 2
        - Guaranteed room upgrade (1 category)
        - Late check-out until 2:00 PM
        - Welcome amenity upon arrival
        - Access to Gold lounge (6 AM – 10 PM)
      
      Platinum: 21+ stays per year
        - 20% discount on room rates
        - Complimentary breakfast and dinner for 2
        - Guaranteed suite upgrade when available
        - Complimentary late check-out until 4:00 PM
        - Personal concierge service
        - Airport transfer (one-way, complimentary)
        - Gold lounge access 24/7
      
      POINTS
      Earn 10 points per $1 spent on rooms.
      Earn 5 points per $1 spent on dining and spa.
      1,000 points = $10 credit toward future stays.
    `
  },
  {
    id: 'doc-faq',
    title: 'Frequently Asked Questions',
    category: 'faq',
    content: `
      FREQUENTLY ASKED QUESTIONS
      
      Q: Is parking available?
      A: Yes, valet parking is $35/night. Self-parking in our adjacent garage is $25/night. Electric vehicle charging stations are available at $5/night additional.
      
      Q: Do you offer airport transfers?
      A: Yes, we partner with Premier Limo. Cost is $65 one-way to/from the airport. Platinum members receive one complimentary transfer. Book 24 hours in advance via concierge.
      
      Q: What is the minimum check-in age?
      A: Guests must be 21 or older to check in. Guests 18-20 may check in with a parent or legal guardian present.
      
      Q: Do you have accessible rooms?
      A: Yes, we have 4 ADA-compliant rooms (R103, R203, R303, R403). These feature roll-in showers, grab bars, visual fire alarms, and lowered fixtures. Contact us to guarantee accessible room assignment.
      
      Q: Is the WiFi really free?
      A: Standard WiFi (up to 25 Mbps) is complimentary for all guests. Premium WiFi (up to 300 Mbps) is available for $15/day or included for Silver tier and above loyalty members.
      
      Q: Can I store luggage after check-out?
      A: Yes, complimentary luggage storage is available at the bell desk for up to 24 hours after check-out.
      
      Q: Do you accommodate group bookings?
      A: Yes, for groups of 10+ rooms, please contact our group sales team at groups@hotelai.com for special rates and coordination.
    `
  }
];
