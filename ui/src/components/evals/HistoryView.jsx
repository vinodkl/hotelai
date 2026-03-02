import { formatDate, getSuiteColor, getStatusClass } from '../../utils/formatters'
import styles from './HistoryView.module.css'

function HistoryView({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className={styles.empty}>
        No eval runs yet. Run some evals first.
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.title}>Past {history.length} Eval Runs</div>
      {history.map((h) => {
        const rate = parseInt(h.pass_rate)
        const statusClass = getStatusClass(rate)

        return (
          <div key={h.id} className={styles.row}>
            <div className={styles.header}>
              <span
                className={styles.suiteTag}
                style={{
                  borderColor: getSuiteColor(h.suite),
                  color: getSuiteColor(h.suite),
                }}
              >
                {h.suite}
              </span>
              <span className={styles.runId}>{h.id}</span>
              <span
                className={styles.score}
                style={{
                  color: rate >= 80 ? 'var(--pass)' : rate >= 50 ? 'var(--skip)' : 'var(--fail)',
                }}
              >
                {h.pass_rate}
              </span>
              <span className={styles.meta}>
                {h.passed}/{h.total} · {formatDate(h.run_at)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default HistoryView
