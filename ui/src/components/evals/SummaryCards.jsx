import { getStatusClass } from '../../utils/formatters'
import styles from './SummaryCards.module.css'

function SummaryCards({ passed, failed, total, rate, suiteCount, suiteNames }) {
  const statusClass = getStatusClass(rate)

  return (
    <div className={styles.summaryCards}>
      <div className={styles.card}>
        <div className={styles.label}>Pass Rate</div>
        <div className={`${styles.value} ${styles[statusClass]}`}>{rate}%</div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{
              width: `${rate}%`,
              background: statusClass === 'pass' ? 'var(--pass)' : statusClass === 'skip' ? 'var(--skip)' : 'var(--fail)',
            }}
          />
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>Passed</div>
        <div className={`${styles.value} ${styles.pass}`}>{passed}</div>
        <div className={styles.sub}>of {total} cases</div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>Failed</div>
        <div className={`${styles.value} ${styles.fail}`}>{failed}</div>
        <div className={styles.sub}>cases to fix</div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>Suites Run</div>
        <div className={`${styles.value} ${styles.total}`}>{suiteCount}</div>
        <div className={styles.sub}>{suiteNames}</div>
      </div>
    </div>
  )
}

export default SummaryCards
