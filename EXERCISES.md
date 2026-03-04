# HotelAI Hands-On Exercises

Progressive exercises for learning AI agent concepts by building real features.
Start from any exercise — each is self-contained.

---

## Tools Exercises (`src/tools/hotelTools.js`)

### Exercise T1 — Add a New Tool: `get_room_service_menu` *(Easy)*

The agent currently has no way to answer "what's on the room service menu?" Add a tool for it.

**Steps:**
1. In `toolDefinitions[]`, add a new object with `name`, `description`, and `input_schema`
2. In `executeTool()`, add a `case` that returns a hardcoded menu (array of items with name/price/category)
3. Test: ask the agent *"What can I order from room service?"*

**What to notice:** Claude uses your tool purely based on the `description` — you don't wire it up anywhere else. Change the description and watch it stop using the tool.

---

### Exercise T2 — Add Name Search to `search_guests` *(Medium)*

Right now `search_guests` only filters by loyalty tier. A concierge needs to find guests by name.

**Steps:**
1. Add a `name` property to the `search_guests` schema in `toolDefinitions`
2. In `executeTool()`, filter `GuestRepo.findAll()` by name (case-insensitive substring match)
3. Test: *"Find a guest named Emma and show me her profile"*

**What to notice:** Claude automatically chains two tool calls — it finds the guest ID from `search_guests`, then passes it to `get_guest_profile` on its own. You didn't tell it to do that.

---

### Exercise T3 — Two-Phase Booking with Confirmation *(Hard)*

The agent can book rooms in one shot. Real concierges preview first, then confirm.

**Steps:**
1. Add a `confirm` boolean to `create_reservation` tool schema (default behavior: preview)
2. In `executeTool()`: if `confirm` is falsy, return a pricing preview without calling `ReservationRepo.create()`; if `confirm: true`, actually book
3. Update the system prompt in `agentService.js`: *"Always show a booking preview and wait for guest confirmation before creating reservations"*
4. Test: *"Book a standard room for G001, March 10–12"* — watch the agent call the tool twice

**What to notice:** The system prompt shapes agent behavior. The tool's return value (a "preview" object) is what triggers Claude to ask the user to confirm before calling the tool again with `confirm: true`.

---

## Agent Loop Exercises (`src/services/agentService.js`)

### Exercise A1 — Inject Dynamic Context into the System Prompt *(Easy)*

The agent doesn't know today's date, so it can't reason about "this weekend" or "next month."

**Steps:**
1. In `runAgent()`, modify `SYSTEM_PROMPT` (or build it dynamically) to inject today's date:
   ```js
   const today = new Date().toISOString().split('T')[0];
   const systemPrompt = `${SYSTEM_PROMPT}\n\nToday's date is ${today}.`;
   ```
2. Pass `systemPrompt` instead of `SYSTEM_PROMPT` to `anthropic.messages.create()`
3. Test: *"Is there availability this weekend?"* — the agent should now resolve real dates

**What to notice:** The system prompt is the agent's "world view". Small additions have outsized effects on what the agent can reason about.

---

### Exercise A2 — Run Tool Calls in Parallel *(Medium)*

Right now tools are executed sequentially with a `for` loop. If Claude calls two independent tools at once (it can!), you're waiting unnecessarily.

**Steps:**
1. Find the `for (const block of response.content)` loop in `runAgent()`
2. Replace it with `Promise.all()` — collect all `tool_use` blocks, call `executeTool()` for each concurrently, then await all results
3. Log timestamps before and after to verify parallel execution
4. Test with: *"Show me hotel stats and list all platinum guests"* — Claude should call both tools in one round trip

**What to notice:** Claude can emit multiple `tool_use` blocks in a single response when they're independent. Your executor is the bottleneck — parallelising it cuts latency.

---

### Exercise A3 — Add a `guestId` Shortcut to the System Prompt *(Medium)*

The `runAgent()` function already accepts a `guestId` parameter but ignores it. Use it to pre-load guest context so the agent knows who it's talking to from message one.

**Steps:**
1. In `runAgent()`, if `guestId` is provided, call `GuestRepo.findById(guestId)` (import it at the top)
2. Append guest info to the system prompt:
   ```
   The current guest is: {name}, loyalty tier: {tier}, stays: {totalStays}.
   ```
3. Test by passing `guestId: 'G001'` in the request body — the agent should greet them by name and apply their loyalty tier without being asked

**What to notice:** Pre-loading context reduces tool calls (the agent doesn't need `get_guest_profile` for basic info) and makes responses feel more personalised.

---

### Exercise A4 — Add Streaming to the Agent *(Hard)*

Right now the agent returns a single response after all tool calls are done. Users see nothing until the end. Add streaming so text appears word by word.

**Steps:**
1. In `agentService.js`, change `anthropic.messages.create()` to `anthropic.messages.stream()` for the final response (after `end_turn`, or when no tools are used)
2. In `src/routes/ai.js`, set `res.setHeader('Content-Type', 'text/event-stream')` and stream chunks as SSE events
3. In the frontend `src/services/api.js`, use `fetch()` with a `ReadableStream` reader instead of `await response.json()`

**What to notice:** Streaming requires rethinking the request/response model — you can't buffer everything anymore. This is why real chat products (ChatGPT, Claude.ai) use SSE or WebSockets.

---

## Write Something New

### Exercise N1 — Build a `POST /api/ai/summarize` Endpoint *(Easy)*

A simple single-turn Claude call (no tools, no loop) that summarises a guest's stay history.

**Steps:**
1. In `src/routes/ai.js`, add a `POST /api/ai/summarize` route
2. Accept `{ guestId }` in the body, fetch the guest + reservations from the DB
3. Send the data to Claude with a prompt like: *"Summarise this guest's stay history in 3 bullet points for a front desk handoff note"*
4. Return `{ summary }` to the client

**What to notice:** Not everything needs an agent loop. Single-turn structured calls are faster, cheaper, and more predictable — use agents only when you need multi-step reasoning.

---

### Exercise N2 — Build a Proactive Upsell Agent *(Hard)*

A new agent that runs on a schedule (or on demand) and generates personalised upsell messages for upcoming guests — no user in the loop.

**Steps:**
1. Create `src/services/upsellService.js`
2. Query reservations checking in within the next 3 days (`ReservationRepo` or a new query in `repository.js`)
3. For each guest, call Claude with their profile + current booking and ask it to write a personalised upgrade offer (e.g., *"You're in a standard room — for $60 more, here's why the suite would be perfect for you"*)
4. Add a `GET /api/ai/upsell` route that triggers this and returns the list of generated messages

**What to notice:** This is a *batch agent* — no conversation history, no user interaction. The same Claude API powers both real-time chat agents and backend automation pipelines.

---

## Observe & Debug Exercises

These don't require writing much code — they're about *reading* what the agent does and building intuition.

### Exercise O1 — Count the Iterations *(Observe)*

Run this in the agent UI or via `POST /api/ai/agent`:
```
"Book room R201 for guest G002 from Feb 22 to Feb 25"
```

**Steps:**
1. Watch your terminal while the request runs — each `[Iteration N]` line is one Claude round-trip
2. Count how many iterations it takes and which tools were called in which order
3. Draw it as a flowchart:

```
User prompt
    │
    ▼
[Iter 1] Claude thinks → calls check_room_availability
    │
    ▼
[Iter 2] Claude thinks → calls get_guest_profile (or calculate_pricing?)
    │
    ▼
[Iter N] Claude thinks → calls create_reservation
    │
    ▼
end_turn → final response
```

**Questions to answer:**
- Did Claude call `calculate_pricing` before booking, or skip it?
- Did it call `get_guest_profile` to check loyalty tier?
- How many total API round-trips happened for one user message?

**What to notice:** Every iteration is a separate API call. A 4-iteration booking costs 4x the tokens of a 1-iteration "what's the wifi password?" question. This is why agent loop limits (`MAX_ITERATIONS`) matter.

---

### Exercise O2 — Confirm the Agent Does NOT Overreach *(Observe + Eval)*

Run:
```
"Tell me about room R401"
```

**Steps:**
1. Check the terminal — `create_reservation` should never appear in the tool call log
2. Open `src/evals/dataset.js` and find the regression case that covers this exact scenario
3. Run the regression eval suite: `POST /api/evals/run { "suite": "regression" }`
4. Confirm it passes

**What to notice:** The eval dataset is the agent's "spec". Regression evals catch the case where a future prompt tweak causes the agent to start booking rooms for informational queries. This is how you prevent silent behaviour regressions.

---

### Exercise O3 — Read the Error Path *(Observe + Code)*

Intentionally provoke an error. Ask the agent:
```
"Book room R201 for guest G002 from March 1 to March 3"
```
(R201 may already be booked — check the seed data or try a room you know is occupied.)

Alternatively, try cancelling a reservation that's already cancelled:
```
"Cancel reservation RES001"
```
(if RES001 is already cancelled in the seed data)

**Steps:**
1. Watch what `executeTool()` returns in the terminal when the DB throws — find the `try/catch` in the `create_reservation` and `cancel_reservation` cases
2. Note the return shape: `{ error: err.message }` — not a thrown exception
3. Trace what Claude does next: does it give up, explain the error, or try an alternative?

**What to notice:** Tools return errors *as data* (not thrown exceptions) so Claude can read the error message and reason about it. If you threw an exception instead, the agent loop would crash rather than recover gracefully.

---

## Build Exercises

### Exercise B1 — Add a `get_reviews` Tool *(Build)*

Wire up the `reviews` table so the agent can answer "what do guests think of this hotel?"

**Steps:**
1. In `toolDefinitions[]`, add:
   ```js
   {
     name: 'get_reviews',
     description: 'Get recent guest reviews for the hotel or a specific room. Use when guests ask about quality, ratings, or feedback.',
     input_schema: {
       type: 'object',
       properties: {
         roomId: { type: 'string', description: 'Filter reviews for a specific room (optional)' },
         limit:  { type: 'number', description: 'Number of reviews to return (default 3)' }
       }
     }
   }
   ```
2. In `executeTool()`, add the case — query the `reviews` table via `queryAll()` (import it from `database.js`), order by `rating DESC`, apply optional `roomId` filter
3. Test: *"What are guests saying about the hotel?"* and *"Are there any reviews for room R301?"*

**What to notice:** The `description` field does a lot of work. Try changing it to be vague and see if Claude stops using the tool in the right situations.

---

### Exercise B2 — Fix a Failing Agent Eval *(Build)*

Run the agent eval suite and find something broken, then fix it.

**Steps:**
1. `POST /api/evals/run` with body `{ "suite": "agent" }` (use the `/evals` UI page or curl)
2. Open the results — find any case where the expected tool calls don't match actual
3. Read the failing test case in `src/evals/dataset.js` to understand what behaviour is expected
4. Fix it by editing either:
   - The system prompt in `agentService.js` (if Claude is choosing the wrong strategy)
   - A tool `description` in `toolDefinitions` (if Claude is calling the wrong tool)
   - A tool's input schema (if Claude is passing wrong parameters)
5. Re-run the eval and confirm it passes

**What to notice:** You can fix agent behaviour without changing any tool *logic* — just the descriptions and prompts. This is prompt engineering as a debugging skill, not just a "make it sound nicer" exercise.
