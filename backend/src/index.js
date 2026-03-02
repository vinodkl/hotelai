import dotenv from 'dotenv';
dotenv.config(); // Load env first so ANTHROPIC_API_KEY etc. are set before routes are imported

import express from 'express';
import cors from 'cors';

import { initDatabase } from './db/database.js';
import { createSchema } from './db/schema.js';
import { seedDatabase } from './db/seed.js';
import { StatsRepo } from './db/repository.js';
import { createEvalSchema } from './evals/store.js';

import reservationRoutes from './routes/reservations.js';
import roomRoutes from './routes/rooms.js';
import guestRoutes from './routes/guests.js';
import aiRoutes from './routes/ai.js';
import evalRoutes from './routes/evals.js';

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/reservations', reservationRoutes);
app.use('/api/rooms',        roomRoutes);
app.use('/api/guests',       guestRoutes);
app.use('/api/ai',           aiRoutes);
app.use('/api/evals',        evalRoutes);

app.get('/api/stats', (_req, res) => res.json(StatsRepo.getHotelStats()));
app.get('/health',    (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

async function start() {
  try {
    await initDatabase();
    createSchema();
    createEvalSchema();   // ← new: creates eval_runs table
    seedDatabase();

    app.listen(PORT, () => {
      console.log(`\n🏨  HotelAI Backend  →  http://localhost:${PORT}`);
      console.log(`\n🤖  AI endpoints:`);
      console.log(`    POST /api/ai/chat    Phase 1 — basic LLM`);
      console.log(`    POST /api/ai/rag     Phase 2 — RAG`);
      console.log(`    POST /api/ai/agent   Phase 3 — agent + tools`);
      console.log(`\n🧪  Eval endpoints:`);
      console.log(`    POST /api/evals/run          run evals`);
      console.log(`    GET  /api/evals/history      past runs`);
      console.log(`    GET  /api/evals/compare?a=&b= diff two runs`);
      console.log(`    GET  /api/evals/dataset      view test cases`);
    });
  } catch (err) {
    console.error('❌ Failed to start:', err);
    process.exit(1);
  }
}

start();
