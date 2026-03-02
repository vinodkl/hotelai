// ═══════════════════════════════════════════════════════════════════════════════
// EVAL ROUTES
//
// POST /api/evals/run         → run one or all eval suites, save results
// GET  /api/evals/history     → list past eval runs
// GET  /api/evals/run/:id     → get a specific run with full results
// GET  /api/evals/compare     → compare two runs, show regressions/fixes
// GET  /api/evals/dataset     → return the ground-truth test cases (for UI)
// ═══════════════════════════════════════════════════════════════════════════════

import express from 'express';
import { runRagEvals, runAgentEvals, runQualityEvals, runRegressionEvals, runFullEvalSuite } from '../evals/runner.js';
import { saveEvalRun, getEvalHistory, getEvalRun, compareRuns } from '../evals/store.js';
import { ragEvalCases, agentEvalCases, qualityEvalCases, regressionEvalCases } from '../evals/dataset.js';

const router = express.Router();

// ─── Run evals ────────────────────────────────────────────────────────────────
// POST /api/evals/run
// Body: { suite: 'rag' | 'agent' | 'quality' | 'regression' | 'full', notes?: string }
router.post('/run', async (req, res) => {
  const { suite = 'full', notes = '' } = req.body;
  const validSuites = ['rag', 'agent', 'quality', 'regression', 'full'];

  if (!validSuites.includes(suite)) {
    return res.status(400).json({ error: `suite must be one of: ${validSuites.join(', ')}` });
  }

  try {
    let result;

    if (suite === 'full') {
      const report = await runFullEvalSuite();
      // Save each sub-suite separately for granular history
      const savedIds = {};
      for (const [key, suiteResult] of Object.entries(report.suites)) {
        savedIds[key] = saveEvalRun(key, suiteResult, notes);
      }
      return res.json({ report, savedIds });
    }

    const runners = {
      rag: runRagEvals,
      agent: runAgentEvals,
      quality: runQualityEvals,
      regression: runRegressionEvals,
    };

    const results = await runners[suite]();
    const suiteResult = {
      name: suite,
      results,
      passed: results.filter(r => r.status === 'pass').length,
      failed: results.filter(r => r.status === 'fail').length,
      total: results.length,
      passRate: ((results.filter(r => r.status === 'pass').length / results.length) * 100).toFixed(1) + '%',
    };

    const savedId = saveEvalRun(suite, suiteResult, notes);
    res.json({ suite, savedId, ...suiteResult });

  } catch (err) {
    console.error('Eval run error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── History ──────────────────────────────────────────────────────────────────
router.get('/history', (req, res) => {
  const { suite, limit } = req.query;
  res.json(getEvalHistory(suite, limit ? parseInt(limit) : 20));
});

// ─── Specific run ─────────────────────────────────────────────────────────────
router.get('/run/:id', (req, res) => {
  const run = getEvalRun(req.params.id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  res.json(run);
});

// ─── Compare two runs ─────────────────────────────────────────────────────────
// GET /api/evals/compare?a=eval-rag-123&b=eval-rag-456
router.get('/compare', (req, res) => {
  const { a, b } = req.query;
  if (!a || !b) return res.status(400).json({ error: 'a and b run IDs required' });
  const diff = compareRuns(a, b);
  if (!diff) return res.status(404).json({ error: 'One or both runs not found' });
  res.json(diff);
});

// ─── Dataset (for UI display) ─────────────────────────────────────────────────
router.get('/dataset', (req, res) => {
  res.json({
    rag: ragEvalCases,
    agent: agentEvalCases,
    quality: qualityEvalCases,
    regression: regressionEvalCases,
    totalCases: ragEvalCases.length + agentEvalCases.length + qualityEvalCases.length + regressionEvalCases.length,
  });
});

export default router;
