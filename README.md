# 🏨 HotelAI — Agentic AI Learning Lab

A hands-on project for learning **RAG, Tool Use, Agentic AI, Evals, and Fine-tuning** —
built on **Node.js + Express + SQLite** so you can focus on AI concepts, not a new stack.

---

## 🗂 Project Structure

```
hotelai/
├── README.md                          ← You are here
│
├── backend/
│   ├── package.json                   ← All dependencies (sql.js, @anthropic-ai/sdk, etc.)
│   ├── .env.example                   ← Copy to .env and add your API key
│   │
│   └── src/
│       ├── index.js                   ← Entry point: boots DB → seeds data → starts Express
│       │
│       ├── db/                        ← DATABASE LAYER
│       │   ├── database.js            ← sql.js connection + query helpers
│       │   ├── schema.js              ← 8 CREATE TABLE definitions
│       │   ├── seed.js                ← 76 rows of mock data (runs once on first boot)
│       │   └── repository.js          ← All queries: RoomRepo, GuestRepo, ReservationRepo, StatsRepo
│       │
│       ├── data/
│       │   └── documents.js           ← Hotel policy docs (RAG knowledge base)
│       │
│       ├── rag/
│       │   └── ragService.js          ← PHASE 2: chunk → embed → retrieve → inject
│       │
│       ├── tools/
│       │   └── hotelTools.js          ← PHASE 3: tool definitions + executeTool()
│       │
│       ├── services/
│       │   └── agentService.js        ← PHASE 3: the ReAct while loop
│       │
│       ├── evals/                     ← PHASE 5: evaluation framework
│       │   ├── dataset.js             ← 31 ground-truth test cases
│       │   ├── runner.js              ← 4 eval strategies (RAG, Agent, Quality, Regression)
│       │   └── store.js               ← Persists runs to DB, diff utility
│       │
│       └── routes/
│           ├── rooms.js               ← GET /api/rooms
│           ├── guests.js              ← GET /api/guests
│           ├── reservations.js        ← CRUD /api/reservations
│           ├── ai.js                  ← /chat, /rag, /agent, /ingest, /finetune/dataset
│           └── evals.js               ← /run, /history, /compare, /dataset
│
└── ui/
    ├── index.html                     ← Chat UI (open directly in browser, no build step)
    └── evals.html                     ← Eval dashboard
```

---

## 🚀 Quick Start

### 1. Get an Anthropic API key

Go to [console.anthropic.com](https://console.anthropic.com) → API Keys → Create Key.

### 2. Check Node.js version

```bash
node --version   # needs 18 or higher
```

If not installed: [nodejs.org/en/download](https://nodejs.org/en/download)

### 3. Install dependencies

```bash
cd hotelai/backend
npm install
```

### 4. Add your API key

```bash
cp .env.example .env
```

Open `.env` and replace the placeholder:

```
ANTHROPIC_API_KEY=sk-ant-...your key here...
PORT=3001
```

### 5. Start the server

```bash
npm run dev
```

You should see:

```
🆕 Created new in-memory database
✅ Schema created (8 tables)
  ✓ eval_runs table ready

🌱 Seeding database with mock data...
  ✓ 12 rooms
  ✓ 15 guests
  ✓ 18 reservations
  ✓ 8 payments
  ✓ 6 room service orders
  ✓ 7 reviews
  ✓ 6 staff
  ✓ 4 maintenance logs
✅ Seed complete!

🏨  HotelAI Backend  →  http://localhost:3001
```

### 6. Open the UI

Open `hotelai/ui/index.html` in your browser — **no build step, just double-click the file**.

For the eval dashboard, open `hotelai/ui/evals.html` the same way.

---

## 🎯 First 3 Exercises (Start Here)

**Exercise 1 — See hallucination (5 min)**

In the chat UI, select **Phase 1**, ask: *"What is your cancellation policy?"*
The LLM confidently invents an answer. This is why RAG exists.

**Exercise 2 — See RAG fix it (10 min)**

1. Click **Ingest Hotel Docs** in the sidebar
2. Switch to **Phase 2**, ask the same question
3. Expand the **Retrieved chunks** section — see which document was used

**Exercise 3 — Watch the agent think (15 min)**

Switch to **Phase 3**, ask: *"Book room R201 for guest G002 from Feb 22 to Feb 25"*
Watch the terminal — every tool call is logged with inputs and outputs.

---

## 🤖 AI Endpoints

| Endpoint | Phase | What it does |
|---|---|---|
| `POST /api/ai/chat` | 1 | Raw LLM — no context, hallucinates |
| `POST /api/ai/ingest` | 2 | Index hotel docs into vector store |
| `POST /api/ai/rag` | 2 | RAG pipeline — retrieves real policy docs |
| `POST /api/ai/agent` | 3 | ReAct agent — calls real DB tools |
| `GET  /api/ai/finetune/dataset` | 6 | JSONL training data export |

**Request body for all POST endpoints:**
```json
{ "message": "What is your cancellation policy?", "history": [] }
```

---

## 🗄️ Hotel REST API

```
GET  /api/rooms
GET  /api/rooms/available?checkIn=2026-02-25&checkOut=2026-02-28&guests=2&type=suite
GET  /api/rooms/:id

GET  /api/guests
GET  /api/guests/:id          (includes full reservation history)

GET  /api/reservations
GET  /api/reservations?status=confirmed
GET  /api/reservations/upcoming
GET  /api/reservations/:id
POST /api/reservations        body: { guestId, roomId, checkIn, checkOut, adults, specialRequests }
PATCH /api/reservations/:id/cancel
PATCH /api/reservations/:id/status   body: { status }

GET  /api/stats
```

**Useful IDs for testing:**

| Type | Available IDs |
|---|---|
| Rooms | R101–R104, R201–R203, R301–R303, R401, R402 |
| Guests | G001–G015 (G003 = Platinum, G015 = top VIP) |
| Reservations | RES001–RES018 (RES001 = checked-in, RES002 = upcoming) |

---

## 🧪 Eval Endpoints

```
POST /api/evals/run                      body: { "suite": "rag|agent|quality|regression|full" }
GET  /api/evals/history
GET  /api/evals/run/:id
GET  /api/evals/compare?a=<id>&b=<id>    diffs two runs (shows REGRESSION / FIXED)
GET  /api/evals/dataset                  returns all 31 test cases
```

**Run evals with curl:**
```bash
# Regression only — fast, no LLM calls for most cases
curl -X POST http://localhost:3001/api/evals/run \
  -H "Content-Type: application/json" \
  -d '{"suite": "regression"}'

# Full suite — takes 2–5 minutes
curl -X POST http://localhost:3001/api/evals/run \
  -H "Content-Type: application/json" \
  -d '{"suite": "full"}'
```

---

## 🗃️ Database

Uses **sql.js** — pure JavaScript SQLite, zero native compilation, works on any machine.
Database file saved to `backend/data/hotel.db` automatically after every write.

**Reset mock data:**
```bash
rm backend/data/hotel.db
npm run dev    # recreates and reseeds automatically
```

---

## 🔧 Troubleshooting

| Problem | Fix |
|---|---|
| `npm install` fails | Check `node --version` — needs 18+ |
| "Cannot find module" on start | Run `npm install` from inside `backend/`, not the root |
| UI shows "Cannot connect" | Start the backend first, then open the HTML file |
| 401 API key error | Check `.env` exists in `backend/` and key starts with `sk-ant-` |
| Eval suite times out | Quality evals make many LLM calls — run `regression` first |
| Database locked | Stop other running backend instances, then restart |

---

## 📦 Scripts

```bash
npm run dev    # start with auto-reload (use this for development)
npm start      # start without auto-reload
```

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | **Yes** | Get from console.anthropic.com |
| `PORT` | No | Default: 3001 |
| `OPENAI_API_KEY` | No | Only needed for Phase 6 fine-tuning |
