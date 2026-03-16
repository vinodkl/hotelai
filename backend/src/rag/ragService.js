// ═══════════════════════════════════════════════════════════════
// RAG SERVICE — Retrieval Augmented Generation
//
// LEARNING NOTE (Phase 2):
// RAG solves a key LLM problem: the model doesn't know YOUR data.
//
// The process:
// INDEXING (run once):
//   1. Take your documents (hotel policies, FAQs)
//   2. CHUNK them into smaller pieces (e.g. 500 tokens each)
//   3. EMBED each chunk → convert text to a vector (array of numbers)
//      e.g. "cancellation policy" → [0.23, -0.87, 0.41, ...] (1536 numbers)
//   4. STORE vectors in a vector database
//
// RETRIEVAL (at query time):
//   1. User asks: "What's your cancellation policy?"
//   2. Embed the question → get its vector
//   3. Find the TOP-K most similar vectors (cosine similarity)
//   4. Retrieve those text chunks
//   5. INJECT them into the prompt as context
//   6. LLM answers using real, accurate information
//
// WHY THIS MATTERS:
// Without RAG: LLM makes up answers (hallucination!)
// With RAG: LLM cites your actual policies
//
// EMBEDDING UPGRADE:
// This file now supports two embedders side-by-side:
//   - simpleEmbed : 44-dim binary keyword vector (no API needed)
//   - openaiEmbed : 1536-dim float vector via text-embedding-3-small
// Compare them with POST /api/ai/embed-compare
// ═══════════════════════════════════════════════════════════════

import OpenAI from 'openai';
import { hotelDocuments } from '../data/documents.js';
import { getLLMClient, DEFAULT_MODEL } from '../services/llmClient.js';

const llmClient = getLLMClient();

// Initialise OpenAI client only if key is present
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ─── Embedding functions ──────────────────────────────────────────────────────

// BEFORE: 44-dimensional binary keyword vector.
// Each dimension is 1 if the keyword appears in the text, 0 otherwise.
// Weaknesses: fixed vocabulary, no synonyms, no term frequency, no semantics.
function simpleEmbed(text) {
  const keywords = [
    'cancellation', 'refund', 'policy', 'check-in', 'check-out', 'early', 'late',
    'pet', 'dog', 'cat', 'animal', 'parking', 'valet', 'wifi', 'internet',
    'restaurant', 'dining', 'food', 'breakfast', 'dinner', 'lunch', 'room service',
    'spa', 'pool', 'fitness', 'gym', 'massage', 'wellness',
    'loyalty', 'rewards', 'points', 'tier', 'gold', 'platinum', 'silver', 'bronze',
    'airport', 'transfer', 'shuttle', 'transport',
    'accessible', 'disability', 'ada', 'wheelchair',
    'group', 'booking', 'reservation', 'modify', 'change', 'upgrade',
    'price', 'rate', 'cost', 'fee', 'charge', 'discount',
  ];
  const lowerText = text.toLowerCase();
  return keywords.map(kw => lowerText.includes(kw) ? 1 : 0);
}

// AFTER: 1536-dimensional float vector via OpenAI text-embedding-3-small.
// Captures semantic meaning, synonyms, and context — not just keyword presence.
async function openaiEmbed(text) {
  if (!openai) throw new Error('OPENAI_API_KEY not set — cannot use real embeddings');
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

// ─── Vector Store ─────────────────────────────────────────────────────────────
// Accepts any embed function (sync or async) via constructor.
// This makes it easy to swap embedders without changing retrieval logic.

class VectorStore {
  constructor(name, embedFn) {
    this.name = name;
    this.embedFn = embedFn; // (text: string) => number[] | Promise<number[]>
    this.documents = [];
    this.embeddings = [];
    this.isIndexed = false;
  }

  chunkDocument(doc, chunkSize = 600) {
    const words = doc.content.split(/\s+/);
    const chunks = [];
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push({
        id: `${doc.id}-chunk-${Math.floor(i / chunkSize)}`,
        docId: doc.id,
        title: doc.title,
        category: doc.category,
        content: words.slice(i, i + chunkSize).join(' '),
        chunkIndex: Math.floor(i / chunkSize)
      });
    }
    return chunks;
  }

  cosineSimilarity(a, b) {
    const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
    const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
    return magA && magB ? dot / (magA * magB) : 0;
  }

  async index(documents) {
    console.log(`\n📚 [${this.name}] Indexing ${documents.length} documents...`);
    this.documents = [];
    this.embeddings = [];

    for (const doc of documents) {
      const chunks = this.chunkDocument(doc);
      console.log(`  - "${doc.title}" → ${chunks.length} chunks`);
      for (const chunk of chunks) {
        this.documents.push(chunk);
        this.embeddings.push(await this.embedFn(chunk.content));
      }
    }

    this.isIndexed = true;
    console.log(`✅ [${this.name}] Indexed ${this.documents.length} total chunks\n`);
    return { chunksIndexed: this.documents.length };
  }

  async retrieve(query, topK = 3) {
    const queryVector = await this.embedFn(query);
    const scored = this.documents.map((doc, i) => ({
      ...doc,
      score: this.cosineSimilarity(queryVector, this.embeddings[i])
    }));
    const results = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter(r => r.score > 0);
    
    console.log(`\n🔍 [${this.name}] Retrieval for: "${query}"`);
    results.forEach(r =>
      console.log(`  - [${r.score.toFixed(4)}] ${r.title} (chunk ${r.chunkIndex})`)
    );

    return results;
  }
}

// ─── Singletons ───────────────────────────────────────────────────────────────

// Keyword store — always available, no API key required
export const keywordStore = new VectorStore('keyword/simpleEmbed', simpleEmbed);

// OpenAI store — only created when OPENAI_API_KEY is set
export const realStore = openai
  ? new VectorStore('openai/text-embedding-3-small', openaiEmbed)
  : null;

// Main store used by ragChat: prefer real embeddings, fall back to keyword
export const vectorStore = realStore ?? keywordStore;

// ─── Compare retrieval: run both methods, return scores side by side ──────────
//
// LEARNING NOTE: This is the "before vs after" view.
// - keyword scores are sparse/binary cosine values (quantized steps like 0, 0.5, 0.707…)
// - openai scores are continuous floats reflecting genuine semantic closeness
// - Notice that different chunks surface for the same query!
//
export const compareRetrieval = async (query, topK = 5) => {
  if (!keywordStore.isIndexed) await keywordStore.index(hotelDocuments);
  if (realStore && !realStore.isIndexed) await realStore.index(hotelDocuments);

  const format = results => results.map(r => ({
    title: r.title,
    chunkIndex: r.chunkIndex,
    score: parseFloat(r.score.toFixed(4)),
    snippet: r.content.substring(0, 120) + '...'
  }));

  const keywordResults = format(await keywordStore.retrieve(query, topK));

  const result = {
    query,
    embedderNote: realStore
      ? 'keyword: 44-dim binary (no API) • openai: 1536-dim float (text-embedding-3-small)'
      : 'OPENAI_API_KEY not set — only keyword results available',
    keyword: keywordResults,
  };

  if (realStore) {
    result.openai = format(await realStore.retrieve(query, topK));
  }

  return result;
};

// ─── RAG Service ─────────────────────────────────────────────────────────────

export const ingestDocuments = async () => {
  return await vectorStore.index(hotelDocuments);
};

export const ragChat = async (userMessage, chatHistory = []) => {
  if (!vectorStore.isIndexed) {
    await ingestDocuments();
  }

  // STEP 1: Retrieve relevant chunks
  const relevantChunks = await vectorStore.retrieve(userMessage, 3);

  // STEP 2: Build context string from retrieved chunks
  const context = relevantChunks.length > 0
    ? relevantChunks.map(c => `[From: ${c.title}]\n${c.content}`).join('\n\n---\n\n')
    : 'No specific policy information found for this query.';

  // STEP 3: Inject context into system prompt — THIS is the "Augmented" in RAG
  const systemPrompt = `You are a helpful concierge at The Grand HotelAI.
Answer guest questions accurately using ONLY the provided hotel information.
If the answer is not in the context, say so politely and offer to connect them with the front desk.
Be warm, professional, and concise.

HOTEL INFORMATION (retrieved from knowledge base):
---
${context}
---

Always be specific with times, prices, and policies. Do not make up information not in the context.`;
  // STEP 4: Call Claude with the augmented prompt
  const response = await llmClient.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      ...chatHistory,
      { role: 'user', content: userMessage }
    ]
  });

  return {
    response: response.content[0].text,
    embedder: vectorStore.name,
    usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
    retrievedChunks: relevantChunks.map(c => ({
      docId: c.docId,
      title: c.title,
      score: c.score,
      snippet: c.content
    })),
    // ↑ Expose retrieved chunks to the UI so you can SEE what RAG retrieved (great for learning!)
  };
};

// ─── UPGRADE PATH: Real ChromaDB Integration (for later) ─────────────────────
// Uncomment this when you install ChromaDB and want real vector embeddings
//
// import { ChromaClient } from 'chromadb';
// const client = new ChromaClient({ path: process.env.CHROMA_URL });
//
// export const ingestWithChroma = async () => {
//   const collection = await client.getOrCreateCollection({ name: 'hotel_docs' });
//   const chunks = hotelDocuments.flatMap(doc => chunkDocument(doc));
//   await collection.add({
//     ids: chunks.map(c => c.id),
//     documents: chunks.map(c => c.content),
//     metadatas: chunks.map(c => ({ title: c.title, category: c.category }))
//   });
// };
