// ═══════════════════════════════════════════════════════════════
// AI ROUTES — Your learning lab
// 
// Phase 1: POST /api/ai/chat       → Plain LLM (no tools, no context)
// Phase 2: POST /api/ai/rag        → RAG (retrieves from knowledge base)
// Phase 3: POST /api/ai/agent      → Full agent with tool use
// Phase 4: POST /api/ai/ingest     → Index documents into vector store
// ═══════════════════════════════════════════════════════════════

import express from 'express';
import { ragChat, ingestDocuments, compareRetrieval } from '../rag/ragService.js';
import { runAgent } from '../services/agentService.js';
import { getLLMClient, DEFAULT_MODEL } from '../services/llmClient.js';

const router = express.Router();
const llmClient = getLLMClient();

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1: Basic LLM Chat
// Learning Goal: Understand the raw LLM API call.
//   - Notice: The LLM has NO knowledge of your hotel data.
//   - Try: "What are your cancellation policies?" → it will make something up!
//   - This is why we need RAG (Phase 2)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message) return res.status(400).json({ error: 'message is required' });

  try {
    const response = await llmClient.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1024,
      system: 'You are a helpful hotel concierge assistant. Be friendly and professional.',
      messages: [
        ...history,
        { role: 'user', content: message }
      ]
    });

    res.json({
      phase: 'Phase 1 — Basic LLM',
      response: response.content[0].text,
      usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
      note: '⚠️ This LLM has no hotel data. Ask about policies to see it hallucinate!'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2: RAG Chat
// Learning Goal: See how retrieved context improves accuracy.
//   - Ask: "What is your cancellation policy?" → now it answers correctly!
//   - The response includes `retrievedChunks` so you can see WHAT was retrieved
//   - Compare answers from /chat vs /rag to feel the difference
// ─────────────────────────────────────────────────────────────────────────────
router.post('/rag', async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message) return res.status(400).json({ error: 'message is required' });

  try {
    const result = await ragChat(message, history);
    res.json({
      phase: 'Phase 2 — RAG',
      ...result,
      note: '📚 Check retrievedChunks to see which documents were used!'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3: AI Agent with Tool Use
// Learning Goal: See the ReAct loop in action.
//   - Try: "What suites are available Feb 25-28?"
//   - Try: "Book room R201 for guest G002 from Feb 22 to Feb 25"
//   - Try: "Cancel reservation RES001"
//   - The response includes `toolCalls` showing EVERY tool the agent called
//   - Watch the server console to see the agent loop in real time!
// ─────────────────────────────────────────────────────────────────────────────
router.post('/agent', async (req, res) => {
  const { message, history = [], guestId } = req.body;

  if (!message) return res.status(400).json({ error: 'message is required' });

  try {
    const result = await runAgent(message, history, guestId);
    res.json({
      phase: 'Phase 3 — Agent with Tool Use',
      ...result,
      note: '🔧 Check toolCalls to see how the agent reasoned step-by-step!'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 4: Ingest / Index Documents
// Learning Goal: Understand how RAG knowledge is built.
//   - Call this once to index all hotel documents
//   - Watch the console to see chunking happen
//   - After ingesting, your RAG queries become smarter
// ─────────────────────────────────────────────────────────────────────────────
router.post('/ingest', async (req, res) => {
  try {
    const result = await ingestDocuments();
    res.json({
      phase: 'Phase 2 — Document Ingestion',
      ...result,
      message: 'Hotel documents chunked and indexed into vector store',
      note: '📖 Documents are now searchable by the RAG endpoint!'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EMBEDDING COMPARISON: keyword simpleEmbed vs OpenAI text-embedding-3-small
// Learning Goal: See concretely how real embeddings differ from keyword matching.
//   - POST { "query": "what if I need to cancel?" }
//   - Response shows top-5 chunks for each method with cosine similarity scores
//   - Compare which chunks surface and how their scores differ
//   - keyword scores cluster near 0/0.7 (binary); openai scores are continuous floats
// ─────────────────────────────────────────────────────────────────────────────
router.post('/embed-compare', async (req, res) => {
  const { query, topK = 5 } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });

  try {
    const result = await compareRetrieval(query, topK);
    res.json({ phase: 'Phase 2 — Embedding Comparison', ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 5: Fine-tuning Info & Sample Data Export
// Learning Goal: Understand when fine-tuning > RAG
// Fine-tuning is best when:
//   - You need the model to BEHAVE differently (tone, format, style)
//   - You have thousands of examples of correct Q&A
//   - RAG latency is too slow for your use case
// ─────────────────────────────────────────────────────────────────────────────
router.get('/finetune/dataset', (req, res) => {
  // Generate JSONL training data from hotel documents
  // This is the format OpenAI and Anthropic expect for fine-tuning
  const trainingData = [
    { messages: [
      { role: 'system', content: 'You are a hotel concierge for The Grand HotelAI.' },
      { role: 'user', content: 'What time is check-in?' },
      { role: 'assistant', content: 'Standard check-in is at 3:00 PM. Early check-in before 3:00 PM may be available for $30, subject to room availability. I recommend requesting this 24 hours in advance.' }
    ]},
    { messages: [
      { role: 'system', content: 'You are a hotel concierge for The Grand HotelAI.' },
      { role: 'user', content: 'Can I bring my dog?' },
      { role: 'assistant', content: 'Absolutely! We\'re a pet-friendly hotel. We welcome dogs and cats under 30 lbs. There\'s a non-refundable pet fee of $75 per stay (up to 7 nights). Pets must be leashed in common areas and are not allowed in the restaurant, spa, or pool. You may bring up to 2 pets per room.' }
    ]},
    { messages: [
      { role: 'system', content: 'You are a hotel concierge for The Grand HotelAI.' },
      { role: 'user', content: 'What are the benefits of being a Gold member?' },
      { role: 'assistant', content: 'As a Gold member (11-20 stays/year), you enjoy: 15% discount on room rates, complimentary breakfast for 2, guaranteed room upgrade by one category, late check-out until 2:00 PM, a welcome amenity on arrival, and access to our Gold lounge from 6 AM to 10 PM.' }
    ]},
  ];

  // Return as JSONL format
  const jsonl = trainingData.map(d => JSON.stringify(d)).join('\n');
  res.setHeader('Content-Type', 'application/json');
  res.json({
    phase: 'Phase 5 — Fine-tuning',
    note: 'This dataset would be used to fine-tune a model. Format: JSONL (one JSON per line)',
    sampleCount: trainingData.length,
    format: 'OpenAI / Anthropic fine-tuning JSONL format',
    whenToUseFineTuning: [
      'You need consistent tone/style the model doesn\'t have',
      'RAG is too slow or too expensive at your scale',
      'You have 500+ high-quality examples of correct responses',
      'You need the model to follow very specific output formats',
    ],
    whenToUseRAGInstead: [
      'Your knowledge base changes frequently',
      'You have < 500 examples',
      'You need to cite sources',
      'Costs/time for fine-tuning aren\'t justified yet',
    ],
    dataset: trainingData
  });
});

export default router;
