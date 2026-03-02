import { formatDate, getStatusClass } from '../../utils/formatters'
import styles from './EvalsSidebar.module.css'

function EvalsSidebar({
  currentView,
  history,
  onViewChange,
  onRunEvals,
  onLoadRun,
}) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Run Evals</div>
        <button className={styles.runBtn} onClick={() => onRunEvals('full')}>
          ▶ Run All Suites
        </button>
        <button className={`${styles.runBtn} ${styles.secondary}`} onClick={() => onRunEvals('rag')}>
          RAG Only
        </button>
        <button className={`${styles.runBtn} ${styles.secondary}`} onClick={() => onRunEvals('agent')}>
          Agent Only
        </button>
        <button className={`${styles.runBtn} ${styles.secondary}`} onClick={() => onRunEvals('quality')}>
          Quality Only
        </button>
        <button className={`${styles.runBtn} ${styles.secondary}`} onClick={() => onRunEvals('regression')}>
          Regression Only
        </button>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>View</div>
        <button
          className={`${styles.suiteBtn} ${currentView === 'results' ? styles.active : ''}`}
          onClick={() => onViewChange('results')}
        >
          <span className={styles.suiteDot} style={{ background: 'var(--rag)' }}></span>
          Results
        </button>
        <button
          className={`${styles.suiteBtn} ${currentView === 'dataset' ? styles.active : ''}`}
          onClick={() => onViewChange('dataset')}
        >
          <span className={styles.suiteDot} style={{ background: 'var(--text-dim)' }}></span>
          Dataset
        </button>
        <button
          className={`${styles.suiteBtn} ${currentView === 'history' ? styles.active : ''}`}
          onClick={() => onViewChange('history')}
        >
          <span className={styles.suiteDot} style={{ background: 'var(--quality)' }}></span>
          History
        </button>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Recent Runs</div>
        <div className={styles.historyList}>
          {history.length === 0 ? (
            <div className={styles.noRuns}>No runs yet</div>
          ) : (
            history.map((h) => {
              const rate = parseInt(h.pass_rate)
              return (
                <div
                  key={h.id}
                  className={styles.historyItem}
                  onClick={() => onLoadRun(h.id)}
                >
                  <div>
                    <span className={styles.hiSuite}>{h.suite}</span>
                    <span className={`${styles.hiRate} ${rate >= 80 ? styles.good : styles.bad}`}>
                      {h.pass_rate}
                    </span>
                  </div>
                  <div className={styles.hiTime}>{formatDate(h.run_at)}</div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </aside>
  )
}

export default EvalsSidebar
