// ═══════════════════════════════════════════════════════════════════════════════
// EVAL STORE — Persists eval runs to the database for trend tracking
//
// LEARNING NOTE — Why persist eval results?
// If you only run evals and print them, you lose history.
// By saving each run, you can:
//   - Compare run N vs run N-1 ("did my prompt change help?")
//   - Track pass rate over time (is the system getting better or worse?)
//   - Show a history in the UI so you can see when things broke
//
// This is exactly what tools like LangSmith, Braintrust, and PromptLayer do —
// they're essentially eval result databases with nice UIs on top.
// ═══════════════════════════════════════════════════════════════════════════════

import { getDb, execute, queryAll, queryOne } from '../db/database.js';

export function createEvalSchema() {
  const db = getDb();

  db.run(`
    CREATE TABLE IF NOT EXISTS eval_runs (
      id          TEXT PRIMARY KEY,
      run_at      TEXT NOT NULL,
      suite       TEXT NOT NULL,   -- rag | agent | quality | regression | full
      total       INTEGER NOT NULL,
      passed      INTEGER NOT NULL,
      failed      INTEGER NOT NULL,
      pass_rate   TEXT NOT NULL,
      results_json TEXT NOT NULL,  -- full JSON blob of all results
      notes       TEXT             -- optional label e.g. "after prompt change"
    )
  `);

  console.log('  ✓ eval_runs table ready');
}

export function saveEvalRun(suite, suiteResult, notes = '') {
  const id = `eval-${suite}-${Date.now()}`;
  execute(
    `INSERT INTO eval_runs (id, run_at, suite, total, passed, failed, pass_rate, results_json, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      new Date().toISOString(),
      suite,
      suiteResult.total,
      suiteResult.passed,
      suiteResult.failed,
      suiteResult.passRate,
      JSON.stringify(suiteResult.results),
      notes,
    ]
  );
  return id;
}

export function getEvalHistory(suite = null, limit = 20) {
  let sql = 'SELECT id, run_at, suite, total, passed, failed, pass_rate, notes FROM eval_runs';
  const params = [];
  if (suite) { sql += ' WHERE suite = ?'; params.push(suite); }
  sql += ' ORDER BY run_at DESC LIMIT ?';
  params.push(limit);
  return queryAll(sql, params);
}

export function getEvalRun(id) {
  const row = queryOne('SELECT * FROM eval_runs WHERE id = ?', [id]);
  if (!row) return null;
  return { ...row, results: JSON.parse(row.results_json) };
}

// Compare two runs — what changed?
export function compareRuns(idA, idB) {
  const runA = getEvalRun(idA);
  const runB = getEvalRun(idB);
  if (!runA || !runB) return null;

  const byId = (results) => Object.fromEntries(results.map(r => [r.id, r]));
  const mapA = byId(runA.results);
  const mapB = byId(runB.results);

  const allIds = new Set([...Object.keys(mapA), ...Object.keys(mapB)]);
  const diffs = [];

  for (const id of allIds) {
    const a = mapA[id];
    const b = mapB[id];
    if (!a || !b) continue;
    if (a.status !== b.status) {
      diffs.push({
        id,
        change: a.status === 'pass' && b.status === 'fail' ? 'REGRESSION'
              : a.status === 'fail' && b.status === 'pass' ? 'FIXED'
              : 'CHANGED',
        before: a.status,
        after: b.status,
      });
    }
  }

  return {
    runA: { id: idA, runAt: runA.run_at, passRate: runA.pass_rate },
    runB: { id: idB, runAt: runB.run_at, passRate: runB.pass_rate },
    diffs,
    regressions: diffs.filter(d => d.change === 'REGRESSION').length,
    fixes: diffs.filter(d => d.change === 'FIXED').length,
  };
}
