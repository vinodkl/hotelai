// ═══════════════════════════════════════════════════════════════
// AGENT SERVICE — Multi-step AI agent with tool use
//
// LEARNING NOTE (Phase 3 — Agentic AI):
// This implements the ReAct pattern: Reason → Act → Observe → Repeat
//
// The loop:
//   1. User: "Book the cheapest available suite for Feb 25-28 for guest G001"
//   2. Claude THINKS: "I need to check availability first"
//   3. Claude ACTS: calls check_room_availability({ checkIn, checkOut, roomType: 'suite' })
//   4. We OBSERVE: run the tool, return results to Claude
//   5. Claude THINKS: "I found suites, now check guest profile for discounts"
//   6. Claude ACTS: calls get_guest_profile({ guestId: 'G001' })
//   7. Claude THINKS: "G003 is Platinum, 20% off. Let me calculate pricing"
//   8. Claude ACTS: calls calculate_pricing(...)
//   9. Claude THINKS: "Now I have all info, I'll confirm and book"
//  10. Claude ACTS: calls create_reservation(...)
//  11. Claude responds: "I've booked Suite R301 for $960 (Platinum discount applied)"
//
// KEY INSIGHT: The LLM is the "brain" deciding WHICH tools to call and WHEN.
// Your tools are just regular functions — the AI orchestrates them.
// ═══════════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';
import { toolDefinitions, executeTool } from '../tools/hotelTools.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expert AI concierge for The Grand HotelAI. 
You help guests with reservations, answer questions, and handle all hotel-related requests.

You have access to real-time hotel tools. Use them proactively to:
- Check actual availability before suggesting rooms
- Look up guest profiles to personalize service
- Calculate accurate pricing with loyalty discounts
- Create or modify reservations when requested

Personality: Professional, warm, and efficient. Address guests by name when known.
Always confirm important actions (bookings, cancellations) before executing them.
Think step by step — gather all needed information before making reservations.`;

export const runAgent = async (userMessage, chatHistory = [], guestId = null) => {
  const messages = [
    ...chatHistory,
    { role: 'user', content: userMessage }
  ];

  const toolCalls = []; // Track all tool calls for the UI (great for learning!)
  let iterations = 0;
  const MAX_ITERATIONS = 10; // Safety limit

  console.log(`\n🤖 AGENT START: "${userMessage}"`);
  console.log(`═══════════════════════════════════`);

  // ─── The Agent Loop (ReAct pattern) ────────────────────────────────────────
  while (iterations < MAX_ITERATIONS) {
    iterations++;
    console.log(`\n[Iteration ${iterations}]`);

    // Ask Claude what to do next (it can respond OR call a tool)
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: toolDefinitions,
      messages
    });

    console.log(`Stop reason: ${response.stop_reason}`);

    // Add Claude's response to message history
    messages.push({ role: 'assistant', content: response.content });

    // ─── Case 1: Claude is done (no more tools to call) ──────────────────────
    if (response.stop_reason === 'end_turn') {
      const finalText = response.content.find(b => b.type === 'text')?.text || '';
      console.log(`\n✅ AGENT DONE after ${iterations} iterations, ${toolCalls.length} tool calls`);
      return {
        response: finalText,
        toolCalls, // Send to UI so user can see the agent's reasoning
        iterations
      };
    }

    // ─── Case 2: Claude wants to use tools ───────────────────────────────────
    if (response.stop_reason === 'tool_use') {
      const toolResults = [];

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        // Execute the tool (calls your real hotel functions)
        const result = executeTool(block.name, block.input);
        
        // Track for UI display
        toolCalls.push({
          name: block.name,
          input: block.input,
          output: result,
          timestamp: new Date().toISOString()
        });

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result)
        });
      }

      // Feed tool results back to Claude so it can continue reasoning
      messages.push({ role: 'user', content: toolResults });
    }
  }

  return { 
    response: 'I encountered an issue completing your request. Please try again.',
    toolCalls,
    iterations 
  };
};
