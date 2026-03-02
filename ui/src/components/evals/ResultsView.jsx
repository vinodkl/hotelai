import { getSuiteColor } from '../../utils/formatters'
import SummaryCards from './SummaryCards'
import ResultRow from './ResultRow'
import styles from './ResultsView.module.css'

function ResultsView({ processedResults }) {
  const { suites, passed, failed, rate, total } = processedResults

  return (
    <div className={styles.container}>
      <SummaryCards
        passed={passed}
        failed={failed}
        total={total}
        rate={rate}
        suiteCount={Object.keys(suites).length}
        suiteNames={Object.keys(suites).join(', ')}
      />

      {Object.entries(suites).map(([key, suite]) => (
        <div key={key} className={styles.suiteSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>{suite.name || key}</div>
            <div className={styles.sectionMeta}>
              <span
                className={styles.suiteTag}
                style={{
                  borderColor: getSuiteColor(key),
                  color: getSuiteColor(key),
                }}
              >
                {key}
              </span>
              <span className={styles.passedCount}>
                {suite.passed}/{suite.total} passed
              </span>
            </div>
          </div>
          {(suite.results || []).map((r, idx) => (
            <ResultRow key={idx} result={r} suiteKey={key} />
          ))}
        </div>
      ))}
    </div>
  )
}

export default ResultsView
