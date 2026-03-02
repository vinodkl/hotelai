# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HotelAI is a hands-on learning lab for building AI features (RAG, Tool Use, Agents, Evals) on top of a hotel reservation system. The backend uses the Anthropic Claude API directly. The project is intentionally structured to teach concepts progressively across phases — not production-ready code.

## Development Setup

**Environment:**
```bash
cp backend/.env.example backend/.env
# Set ANTHROPIC_API_KEY in backend/.env
```

**Backend (port 3001):**
```bash
cd backend && npm install
npm run dev        # nodemon auto-reload
npm start          # no auto-reload
npm run db:reset   # wipe and re-seed database
```

**Frontend (port 5173, proxies /api → 3001):**
```bash
cd ui && npm install
npm run dev        # Vite dev server
npm run build      # production build to dist/
```

There is no test framework — the eval system in `backend/src/evals/` serves as the testing mechanism. Run evals via `POST /api/evals/run` or the `/evals` UI page.

## Architecture

### Layered Backend

```
Express Routes (src/routes/)
  → Services (src/services/)
    → Repository (src/db/repository.js)
      → Database (src/db/database.js — sql.js SQLite wrapper)
```

Routes never touch the database directly. All SQL lives in `repository.js` (RoomRepo, GuestRepo, ReservationRepo, StatsRepo). `database.js` uses **sql.js** (pure-JS SQLite, no native compilation) — swappable for better-sqlite3 or Postgres by changing only that file.

### AI Phases (all in `src/routes/ai.js`)

| Phase | Endpoint | Feature |
|-------|----------|---------|
| 1 | `POST /api/ai/chat` | Raw Claude API chat |
| 2 | `POST /api/ai/rag` | RAG with keyword-based retrieval |
| 3 | `POST /api/ai/agent` | ReAct agent loop with tool use |
| 4 | `POST /api/ai/ingest` | Document ingestion into vector store |
| 5 | `POST /api/ai/finetune` | Fine-tuning data generation |

### ReAct Agent Loop (`src/services/agentService.js`)

The agent loops: ask Claude → if `stop_reason === 'tool_use'` → execute tools → feed results back → repeat until `end_turn` or max iterations. Claude decides which tools to call; the tools are plain functions.

### Tool System (`src/tools/hotelTools.js`)

- `toolDefinitions[]` — 8 JSON Schema tool specs passed to Claude
- `executeTool(name, input)` — dispatcher calling the right repository function

Tools: `check_room_availability`, `get_reservation_details`, `create_reservation`, `cancel_reservation`, `get_guest_profile`, `get_hotel_stats`, `calculate_pricing`, `search_guests`

### RAG Pipeline (`src/rag/ragService.js`)

Documents → 400-word chunks → keyword-based vectors (not real embeddings) → cosine similarity → top-3 retrieved → injected into prompt. The knowledge base is `src/data/documents.js` (8 hotel policy documents).

### Eval Framework (`src/evals/`)

Four eval types in `runner.js`, 31 ground-truth cases in `dataset.js`, results stored via `store.js`:
- **RAG eval** — retrieval precision/recall
- **Agent eval** — correct tool calls in correct order
- **Quality eval** — LLM-as-judge with rubric scoring
- **Regression eval** — binary pass/fail on known-good cases

### Database Schema

8 tables: `rooms`, `guests`, `reservations`, `payments`, `room_service_orders`, `reviews`, `staff`, `maintenance_logs`. Seeded with 12 rooms (R101–R402), 15 guests (G001–G015), 18 reservations (RES001–RES018).

### Frontend (`ui/src/`)

React 19 + React Router + Vite. Two pages:
- `/` — ChatPage with phase selector (raw → RAG → agent)
- `/evals` — EvalsPage to run/view/compare eval results

API calls go through `src/services/` to `/api/*` (proxied to backend in dev).

## Key Files

| File | Purpose |
|------|---------|
| `backend/src/index.js` | Entry: DB init, schema, seed, Express setup |
| `backend/src/db/repository.js` | All database queries |
| `backend/src/routes/ai.js` | All AI phase endpoints |
| `backend/src/services/agentService.js` | ReAct agent loop |
| `backend/src/tools/hotelTools.js` | Tool definitions + executor |
| `backend/src/rag/ragService.js` | RAG chunking, embedding, retrieval |
| `backend/src/evals/runner.js` | Eval orchestration |
| `backend/src/data/documents.js` | Hotel policy knowledge base |
| `ui/src/App.jsx` | Router and page layout |

## Important Conventions

- Backend uses **ES modules** (`"type": "module"` in package.json) — use `import/export`, not `require`.
- The frontend Vite dev server proxies `/api` to `http://localhost:3001` — no CORS issues in dev.
- Database file persists at `backend/data/hotel.db`; eval results at `backend/data/evals.db`. Use `npm run db:reset` to start fresh.
- ChromaDB (`CHROMA_URL`) is optional — only needed for Phase 4 document ingestion with real vector storage.
