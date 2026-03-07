// ═══════════════════════════════════════════════════════════════════════════════
// EVAL DATASET — Ground truth for all 4 eval types
//
// LEARNING NOTE — Why evals matter:
// Without evals, you're flying blind. You make a prompt change and have no idea
// if it made things better or worse. Evals give you:
//   1. A score BEFORE your change  (baseline)
//   2. A score AFTER your change   (new)
//   3. A diff                      (did it improve?)
//
// This is how companies like Anthropic, OpenAI, and every serious AI team
// develop reliable AI features. The eval loop is:
//
//   Write test cases → Run evals → See score → Change prompt/model/retrieval
//   → Run evals again → Compare → Ship if improved
//
// The 4 eval types here map to 4 different failure modes:
//   RAG eval       → Are we retrieving the right knowledge?
//   Agent eval     → Is the agent calling the right tools in the right order?
//   Quality eval   → Is the final answer actually correct and helpful?
//   Regression     → Did a recent change break something that used to work?
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 1. RAG EVAL CASES ───────────────────────────────────────────────────────
// For each question, we know WHICH document chunks SHOULD be retrieved.
// We grade: did the retriever surface those chunks?

export const ragEvalCases = [
  {
    id: 'rag-001',
    question: 'What is the cancellation policy?',
    expectedDocIds: ['doc-policy-cancellation'],
    expectedKeywords: ['48 hours', 'one night', 'non-refundable'],
    category: 'policy',
  },
  {
    id: 'rag-002',
    question: 'Can I bring my dog?',
    expectedDocIds: ['doc-policy-pets'],
    expectedKeywords: ['30 lbs', '$75', 'pet fee', 'leash'],
    category: 'policy',
  },
  {
    id: 'rag-003',
    question: 'What time is check-in and check-out?',
    expectedDocIds: ['doc-policy-checkin'],
    expectedKeywords: ['3:00 PM', '12:00 PM', 'early check-in', 'late check-out'],
    category: 'policy',
  },
  {
    id: 'rag-004',
    question: 'What are the benefits of the Gold loyalty tier?',
    expectedDocIds: ['doc-loyalty-program'],
    expectedKeywords: ['15%', 'breakfast', 'upgrade', 'lounge'],
    category: 'loyalty',
  },
  {
    id: 'rag-005',
    question: 'What dining options are available?',
    expectedDocIds: ['doc-amenities-dining'],
    expectedKeywords: ['Azure', 'room service', 'breakfast', 'dinner'],
    category: 'amenities',
  },
  {
    id: 'rag-006',
    question: 'How much does a massage cost?',
    expectedDocIds: ['doc-amenities-spa'],
    expectedKeywords: ['$120', '$140', 'Swedish', 'Deep Tissue'],
    category: 'amenities',
  },
  {
    id: 'rag-007',
    question: 'Is parking available and how much does it cost?',
    expectedDocIds: ['doc-faq'],
    expectedKeywords: ['valet', '$35', 'self-parking', '$25'],
    category: 'faq',
  },
  {
    id: 'rag-008',
    question: 'What is the minimum age to check in?',
    expectedDocIds: ['doc-faq'],
    expectedKeywords: ['21', '18', 'guardian'],
    category: 'faq',
  },
  {
    id: 'rag-009',
    // Tests a topic NOT in the knowledge base — should return no/low results
    question: 'Do you have a helicopter pad?',
    expectedDocIds: [],
    expectedKeywords: [],
    shouldFail: true, // expect retrieval to find nothing relevant
    category: 'out-of-scope',
  },
  {
    id: 'rag-010',
    question: 'What is the WiFi speed and is it free?',
    expectedDocIds: ['doc-faq', 'doc-loyalty-program'],
    expectedKeywords: ['WiFi', 'free', '25 Mbps', '$15'],
    category: 'faq',
  },
];

// ─── 2. AGENT EVAL CASES ─────────────────────────────────────────────────────
// For each request, we define exactly which tools should be called, in which order.
// We grade: did the agent use the right tools?

export const agentEvalCases = [
  {
    id: 'agent-001',
    request: 'What suites are available from Feb 25 to Feb 28?',
    expectedTools: ['check_room_availability'],
    expectedToolInputs: [{ checkIn: '2026-02-25', checkOut: '2026-02-28' }],
    mustNotCallTools: ['create_reservation', 'cancel_reservation'],
    category: 'availability',
  },
  {
    id: 'agent-002',
    request: 'Get me details on reservation RES004',
    expectedTools: ['get_reservation_details'],
    expectedToolInputs: [{ reservationId: 'RES004' }],
    mustNotCallTools: ['create_reservation'],
    category: 'lookup',
  },
  {
    id: 'agent-003',
    request: 'What is the current hotel occupancy?',
    expectedTools: ['get_hotel_stats'],
    expectedToolInputs: [{}],
    mustNotCallTools: [],
    category: 'stats',
  },
  {
    id: 'agent-004',
    // Multi-tool: needs availability + guest profile + pricing
    request: 'I\'m guest G001. What would it cost to stay in the cheapest available suite Feb 25-28?',
    expectedTools: ['check_room_availability', 'get_guest_profile', 'calculate_pricing'],
    mustNotCallTools: ['create_reservation'],
    category: 'multi-step',
  },
  {
    id: 'agent-005',
    request: 'Look up guest G003 profile',
    expectedTools: ['get_guest_profile'],
    expectedToolInputs: [{ guestId: 'G003' }],
    mustNotCallTools: ['create_reservation'],
    category: 'lookup',
  },
  {
    id: 'agent-006',
    // Should NOT immediately cancel — should look up first
    request: 'Cancel reservation RES001',
    expectedTools: ['cancel_reservation'],
    expectedToolInputs: [{ reservationId: 'RES001' }],
    mustNotCallTools: ['create_reservation'],
    category: 'action',
  },
  {
    id: 'agent-007',
    // Tricky: vague request → should check availability, not just answer generically
    request: 'Is there anything available this weekend?',
    expectedTools: ['check_room_availability'],
    mustNotCallTools: ['create_reservation'],
    category: 'availability',
  },
  {
    id: 'agent-008',
    // Pricing query → needs room lookup
    request: 'Calculate pricing for room R401 from March 1 to March 5 for a Platinum member',
    expectedTools: ['calculate_pricing'],
    expectedToolInputs: [{ roomId: 'R401', loyaltyTier: 'platinum' }],
    mustNotCallTools: [],
    category: 'pricing',
  },
  {
    id: 'agent-009',
    // Pricing query → needs room lookup
    request: 'What can I order from room service?',
    expectedTools: ['get_room_service_menu'],
    expectedToolInputs: [{}],
    mustNotCallTools: [],
    category: 'room_service',
  },
  {
    id: 'agent-010',
    // Pricing query → needs room lookup
    request: 'Find guest named Emma and show me her profile',
    expectedTools: ['search_guests', 'get_guest_profile'],
    expectedToolInputs: [{ name: 'Emma' }],
    mustNotCallTools: [],
    category: 'lookup',
  },
];

// ─── 3. RESPONSE QUALITY EVAL CASES ──────────────────────────────────────────
// For each question + context, we check the response against criteria.
// Graded by an LLM judge (the "LLM-as-judge" pattern).

export const qualityEvalCases = [
  {
    id: 'qual-001',
    question: 'What is the cancellation policy?',
    context: `[From: Cancellation & Modification Policy]
Free cancellation is available up to 48 hours before check-in date.
Cancellations within 48 hours of check-in will be charged one night's stay.
No-show reservations will be charged the full stay amount.
Non-refundable rates cannot be cancelled or modified.`,
    gradingCriteria: [
      'Mentions the 48-hour free cancellation window',
      'Mentions the one-night charge for late cancellations',
      'Does not invent any policy not in the context',
      'Response is concise and direct',
    ],
  },
  {
    id: 'qual-002',
    question: 'I have a dog, can he stay with us?',
    context: `[From: Pet Policy]
The Grand HotelAI is a pet-friendly property. We welcome dogs and cats under 30 lbs.
A non-refundable pet fee of $75 per stay applies (up to 7 nights).
Pets must be kept on leash in all common areas.
Pets are not permitted in the restaurant, spa, or pool areas.
A maximum of 2 pets per room is allowed. Service animals are always welcome at no charge.`,
    gradingCriteria: [
      'Confirms the hotel is pet-friendly',
      'Mentions the 30 lbs weight limit',
      'Mentions the $75 fee',
      'Mentions leash requirement in common areas',
      'Tone is warm and welcoming, not just listing rules',
    ],
  },
  {
    id: 'qual-003',
    question: 'What comes with Platinum status?',
    context: `[From: Grand Rewards Loyalty Program]
Platinum: 21+ stays per year
- 20% discount on room rates
- Complimentary breakfast and dinner for 2
- Guaranteed suite upgrade when available
- Complimentary late check-out until 4:00 PM
- Personal concierge service
- Airport transfer (one-way, complimentary)
- Gold lounge access 24/7`,
    gradingCriteria: [
      'Mentions the 20% discount',
      'Mentions complimentary breakfast AND dinner',
      'Mentions suite upgrade',
      'Mentions 4pm late checkout',
      'Mentions personal concierge',
      'Does not confuse Platinum with Gold benefits',
    ],
  },
  {
    id: 'qual-004',
    // Tests hallucination resistance — question is NOT answered by the context
    question: 'Do you have a helicopter landing pad?',
    context: 'No relevant hotel information found for this query.',
    gradingCriteria: [
      'Does NOT claim the hotel has a helicopter pad',
      'Does NOT make up an answer',
      'Politely acknowledges it cannot find that information',
      'Offers to help find the right contact or alternative',
    ],
  },
  {
    id: 'qual-005',
    question: 'How much is valet parking per night?',
    context: `[From: Frequently Asked Questions]
Yes, valet parking is $35/night. Self-parking in our adjacent garage is $25/night.
Electric vehicle charging stations are available at $5/night additional.`,
    gradingCriteria: [
      'States valet parking is $35/night',
      'Mentions self-parking at $25/night as an alternative',
      'Does not add information not in the context',
    ],
  },
];

// ─── 4. REGRESSION EVAL CASES ────────────────────────────────────────────────
// These are cases that USED to work and must keep working after any change.
// Think of these as your safety net for refactoring.

export const regressionEvalCases = [
  {
    id: 'reg-001',
    description: 'Basic RAG still returns cancellation policy correctly',
    type: 'rag',
    question: 'cancellation policy',
    mustContain: ['48 hours', 'one night'],
    mustNotContain: ['helicopter', 'I don\'t know'],
  },
  {
    id: 'reg-002',
    description: 'Room availability query returns real DB data (not hallucinated)',
    type: 'agent',
    request: 'List all available rooms',
    mustCallTool: 'check_room_availability',
    mustNotCallTool: 'create_reservation',
  },
  {
    id: 'reg-003',
    description: 'Guest lookup works for known guest ID',
    type: 'agent',
    request: 'Get profile for guest G003',
    mustCallTool: 'get_guest_profile',
    responseMusContain: ['Chen Wei', 'platinum'],
  },
  {
    id: 'reg-004',
    description: 'Agent does not create reservation without explicit confirmation',
    type: 'agent',
    request: 'Tell me about room R401',
    mustNotCallTool: 'create_reservation',
  },
  {
    id: 'reg-005',
    description: 'Stats endpoint always returns numeric occupancy data',
    type: 'stats',
    mustHaveFields: ['rooms', 'reservations', 'revenue'],
  },
  {
    id: 'reg-006',
    description: 'Pet policy retrieved for pet question',
    type: 'rag',
    question: 'can I bring my cat',
    mustContain: ['30 lbs', 'pet'],
    mustNotContain: ['helicopter'],
  },
];
