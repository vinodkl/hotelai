// ═══════════════════════════════════════════════════════════════════════════════
// EVAL RUNNER — Executes all 4 eval types and scores them
//
// LEARNING NOTE — The 4 patterns used here:
//
// 1. RAG EVAL (Precision + Recall)
//    Metric: did the right document chunks come back?
//    Precision = of what was retrieved, how much was relevant?
//    Recall    = of what was relevant, how much was retrieved?
//    This is the SAME metric used in search engines & information retrieval.
//
// 2. AGENT EVAL (Tool Use Correctness)
//    Metric: did the agent call the right tools with the right inputs?
//    Pattern: run the agent → inspect `toolCalls` array → check against expected
//    This catches regressions like "agent stopped calling check_room_availability"
//
// 3. QUALITY EVAL (LLM-as-Judge)
//    Pattern: use a SECOND LLM call to grade the first LLM's response
//    The judge LLM scores against a rubric (your gradingCriteria)
//    This is how GPT-4 evals GPT-3.5, how Anthropic evals Claude, etc.
//    Limitation: the judge can be biased — mitigate with clear rubrics
//
// 4. REGRESSION EVAL
//    Pattern: run known-good cases, assert hard invariants
//    Simpler than quality eval — binary pass/fail on specific conditions
//    Run this on every code change (like unit tests)
// ═══════════════════════════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';
import { ragEvalCases, agentEvalCases, qualityEvalCases, regressionEvalCases } from './dataset.js';
import { ragChat, ingestDocuments, vectorStore } from '../rag/ragService.js';
import { runAgent } from '../services/agentService.js';
import { StatsRepo } from '../db/repository.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Shared result shape ──────────────────────────────────────────────────────
const pass = (id, details = {}) => ({ id, status: 'pass', ...details });
const fail = (id, reason, details = {}) => ({ id, status: 'fail', reason, ...details });
const skip = (id, reason) => ({ id, status: 'skip', reason });

// ─────────────────────────────────────────────────────────────────────────────
// 1. RAG EVALS
// ─────────────────────────────────────────────────────────────────────────────
export async function runRagEvals(cases = ragEvalCases) {
  console.log('\n📚 Running RAG evals...');
  if (!vectorStore.isIndexed) await ingestDocuments(); // only index if not already done

  const results = [];

  for (const tc of cases) {
    try {
      const { retrievedChunks } = await ragChat(tc.question);
      const retrievedDocIds = retrievedChunks.map(c => c.docId || c.title);
      // Out-of-scope test — expect nothing to be retrieved
      if (tc.shouldFail) {
        // OpenAI embeddings always return non-zero scores; use a higher threshold
        const noResultThreshold = vectorStore.name.includes('openai') ? 0.45 : 0.2;
        const nothingRelevant = retrievedChunks.every(c => c.score < noResultThreshold);
        results.push(nothingRelevant
          ? pass(tc.id, { note: 'Correctly returned no relevant chunks', chunks: retrievedChunks })
          : fail(tc.id, 'Retrieved chunks for an out-of-scope query (false positive)', { chunks: retrievedChunks })
        );
        continue;
      }

      // Keyword recall: how many expected keywords appear in retrieved text
      const allRetrievedText = retrievedChunks.map(c => c.snippet || '').join(' ').toLowerCase();
      const keywordHits = tc.expectedKeywords.filter(kw => allRetrievedText.includes(kw.toLowerCase()));
      const keywordRecall = tc.expectedKeywords.length
        ? keywordHits.length / tc.expectedKeywords.length
        : 1;

      // Doc match: did we retrieve from the right document category?
      const retrievedTitles = retrievedChunks.map(c => c.title || '').join(' ').toLowerCase();
      const expectedDoc = tc.expectedDocIds[0] || '';
      const docHit = expectedDoc ? retrievedTitles.length > 0 : true; // lenient: just check something was retrieved

      const score = (keywordRecall * 0.7 + (docHit ? 1 : 0) * 0.3);

      const result = score >= 0.4
        ? pass(tc.id, {
            score: +score.toFixed(2),
            keywordRecall: `${keywordHits.length}/${tc.expectedKeywords.length}`,
            keywordsFound: keywordHits,
            keywordsMissed: tc.expectedKeywords.filter(k => !keywordHits.includes(k)),
            chunks: retrievedChunks,
          })
        : fail(tc.id, `Low retrieval score: ${score.toFixed(2)}`, {
            score: +score.toFixed(2),
            keywordRecall: `${keywordHits.length}/${tc.expectedKeywords.length}`,
            keywordsFound: keywordHits,
            keywordsMissed: tc.expectedKeywords.filter(k => !keywordHits.includes(k)),
            chunks: retrievedChunks,
          });

      results.push(result);
    } catch (err) {
      results.push(fail(tc.id, `Error: ${err.message}`));
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. AGENT EVALS
// ─────────────────────────────────────────────────────────────────────────────
export async function runAgentEvals(cases = agentEvalCases) {
  console.log('\n🤖 Running agent evals...');
  const results = [];

  for (const tc of cases) {
    try {
      const { toolCalls, response } = await runAgent(tc.request);
      const calledToolNames = toolCalls.map(t => t.name);

      const failures = [];

      // Check: all expected tools were called
      for (const expected of (tc.expectedTools || [])) {
        if (!calledToolNames.includes(expected)) {
          failures.push(`Expected tool "${expected}" was NOT called`);
        }
      }

      // Check: forbidden tools were NOT called
      for (const forbidden of (tc.mustNotCallTools || [])) {
        if (calledToolNames.includes(forbidden)) {
          failures.push(`Forbidden tool "${forbidden}" WAS called`);
        }
      }

      // Check: specific tool inputs (lenient — we just check key fields are present)
      for (const expectedInput of (tc.expectedToolInputs || [])) {
        const toolName = tc.expectedTools?.[tc.expectedToolInputs?.indexOf(expectedInput)];
        const actualCall = toolCalls.find(t => t.name === toolName);
        if (actualCall) {
          for (const [key, val] of Object.entries(expectedInput)) {
            if (val && actualCall.input[key] !== val) {
              failures.push(`Tool "${toolName}" called with wrong ${key}: expected "${val}", got "${actualCall.input[key]}"`);
            }
          }
        }
      }

      results.push(failures.length === 0
        ? pass(tc.id, { toolsCalled: calledToolNames, response: response.substring(0, 150) + '...' })
        : fail(tc.id, failures.join(' | '), { toolsCalled: calledToolNames, failures })
      );
    } catch (err) {
      results.push(fail(tc.id, `Error: ${err.message}`));
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. QUALITY EVALS — LLM-as-Judge
// ─────────────────────────────────────────────────────────────────────────────
export async function runQualityEvals(cases = qualityEvalCases) {
  console.log('\n⭐ Running quality evals (LLM-as-judge)...');
  const results = [];

  for (const tc of cases) {
    try {
      // Step 1: Generate response using RAG
      const { response } = await ragChat(tc.question);

      // Step 2: Ask a judge LLM to score the response against criteria
      // This is the "LLM-as-judge" pattern — a second LLM grades the first
      const judgePrompt = `You are an objective evaluator grading a hotel AI assistant's response.

GUEST QUESTION: "${tc.question}"

CONTEXT PROVIDED TO THE AI:
${tc.context}

AI'S RESPONSE:
"${response}"

GRADING CRITERIA (grade each as PASS or FAIL with brief reason):
${tc.gradingCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Respond with a JSON object exactly like this:
{
  "criteriaResults": [
    { "criterion": "...", "result": "PASS" | "FAIL", "reason": "brief reason" }
  ],
  "overallScore": 0.0-1.0,
  "summary": "one sentence summary of quality"
}`;

      const judgeResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: judgePrompt }],
      });

      const judgeText = judgeResponse.content[0].text;
      const jsonMatch = judgeText.match(/\{[\s\S]*\}/);
      const judgment = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

      if (!judgment) {
        results.push(fail(tc.id, 'Judge returned unparseable response'));
        continue;
      }

      const passed = judgment.overallScore >= 0.6;
      results.push(passed
        ? pass(tc.id, {
            score: judgment.overallScore,
            summary: judgment.summary,
            criteria: judgment.criteriaResults,
            response: response.substring(0, 200),
          })
        : fail(tc.id, judgment.summary, {
            score: judgment.overallScore,
            criteria: judgment.criteriaResults,
            response: response.substring(0, 200),
          })
      );
    } catch (err) {
      results.push(fail(tc.id, `Error: ${err.message}`));
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. REGRESSION EVALS
// ─────────────────────────────────────────────────────────────────────────────
export async function runRegressionEvals(cases = regressionEvalCases) {
  console.log('\n🔁 Running regression evals...');
  const results = [];

  for (const tc of cases) {
    try {
      if (tc.type === 'rag') {
        const { response } = await ragChat(tc.question);
        const lower = response.toLowerCase();
        const failures = [];
        for (const must of (tc.mustContain || [])) {
          if (!lower.includes(must.toLowerCase())) failures.push(`Response missing: "${must}"`);
        }
        for (const mustNot of (tc.mustNotContain || [])) {
          if (lower.includes(mustNot.toLowerCase())) failures.push(`Response contains forbidden: "${mustNot}"`);
        }
        results.push(failures.length === 0
          ? pass(tc.id, { description: tc.description })
          : fail(tc.id, failures.join(' | '), { description: tc.description })
        );

      } else if (tc.type === 'agent') {
        const { toolCalls, response } = await runAgent(tc.request);
        const calledTools = toolCalls.map(t => t.name);
        const failures = [];

        if (tc.mustCallTool && !calledTools.includes(tc.mustCallTool)) {
          failures.push(`Must call "${tc.mustCallTool}" but didn't`);
        }
        if (tc.mustNotCallTool && calledTools.includes(tc.mustNotCallTool)) {
          failures.push(`Must NOT call "${tc.mustNotCallTool}" but did`);
        }
        if (tc.responseMusContain) {
          const lower = response.toLowerCase();
          for (const must of tc.responseMusContain) {
            if (!lower.includes(must.toLowerCase())) failures.push(`Response missing: "${must}"`);
          }
        }
        results.push(failures.length === 0
          ? pass(tc.id, { description: tc.description, toolsCalled: calledTools })
          : fail(tc.id, failures.join(' | '), { description: tc.description })
        );

      } else if (tc.type === 'stats') {
        const stats = StatsRepo.getHotelStats();
        const failures = (tc.mustHaveFields || []).filter(f => !(f in stats));
        results.push(failures.length === 0
          ? pass(tc.id, { description: tc.description })
          : fail(tc.id, `Missing fields: ${failures.join(', ')}`, { description: tc.description })
        );
      }
    } catch (err) {
      results.push(fail(tc.id, `Error: ${err.message}`));
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL SUITE — run all evals and return consolidated report
// ─────────────────────────────────────────────────────────────────────────────
export async function runFullEvalSuite({ types = ['rag', 'agent', 'quality', 'regression'] } = {}) {
  const report = {
    runAt: new Date().toISOString(),
    suites: {},
    summary: {},
  };

  if (types.includes('rag')) {
    const results = await runRagEvals();
    report.suites.rag = summariseSuite('RAG Retrieval', results);
  }
  if (types.includes('agent')) {
    const results = await runAgentEvals();
    report.suites.agent = summariseSuite('Agent Tool Use', results);
  }
  if (types.includes('quality')) {
    const results = await runQualityEvals();
    report.suites.quality = summariseSuite('Response Quality', results);
  }
  if (types.includes('regression')) {
    const results = await runRegressionEvals();
    report.suites.regression = summariseSuite('Regression', results);
  }

  // Overall summary
  const allResults = Object.values(report.suites).flatMap(s => s.results);
  report.summary = {
    total: allResults.length,
    passed: allResults.filter(r => r.status === 'pass').length,
    failed: allResults.filter(r => r.status === 'fail').length,
    skipped: allResults.filter(r => r.status === 'skip').length,
    passRate: allResults.length
      ? ((allResults.filter(r => r.status === 'pass').length / allResults.length) * 100).toFixed(1) + '%'
      : '0%',
  };

  return report;
}

function summariseSuite(name, results) {
  return {
    name,
    results,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail').length,
    total: results.length,
    passRate: results.length
      ? ((results.filter(r => r.status === 'pass').length / results.length) * 100).toFixed(1) + '%'
      : '0%',
  };
}
