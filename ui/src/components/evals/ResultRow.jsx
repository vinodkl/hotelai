import { useState } from 'react'
import { escapeHtml, getSuiteColor } from '../../utils/formatters'
import styles from './ResultRow.module.css'

function ResultRow({ result, suiteKey }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={styles.resultRow}>
      <div className={styles.header} onClick={() => setIsOpen(!isOpen)}>
        <span className={`${styles.statusPill} ${styles[result.status]}`}>
          {result.status.toUpperCase()}
        </span>
        <span className={styles.resultId}>{result.id}</span>
        {result.score != null && (
          <span className={styles.resultScore}>
            {(result.score * 100).toFixed(0)}%
          </span>
        )}
        <span className={styles.resultReason}>
          {result.reason || result.summary || result.note || ''}
        </span>
      </div>
      <div className={`${styles.body} ${isOpen ? styles.open : ''}`}>
        <ResultDetail result={result} suiteKey={suiteKey} />
      </div>
    </div>
  )
}

function ResultDetail({ result, suiteKey }) {
  return (
    <div className={styles.detail}>
      {/* Tools called */}
      {result.toolsCalled && (
        <div className={styles.detailSection}>
          <div className={styles.detailTitle}>Tools Called</div>
          <div className={styles.toolChips}>
            {result.toolsCalled.map((t, idx) => (
              <span key={idx} className={styles.toolChip}>{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Criteria */}
      {result.criteria && (
        <div className={styles.detailSection}>
          <div className={styles.detailTitle}>Grading Criteria</div>
          <div className={styles.criteriaList}>
            {result.criteria.map((c, idx) => (
              <div key={idx} className={styles.criterion}>
                <span className={c.result === 'PASS' ? styles.critPass : styles.critFail}>
                  {c.result === 'PASS' ? '✓' : '✗'}
                </span>
                <span>{c.criterion}</span>
                {c.reason && (
                  <span className={styles.critReason}>{c.reason}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keywords */}
      {(result.keywordsFound || result.keywordsMissed) && (
        <div className={styles.detailSection}>
          <div className={styles.detailTitle}>
            Keywords — recall {result.keywordRecall}
          </div>
          <div className={styles.keywords}>
            {result.keywordsFound?.map((k, idx) => (
              <span key={idx} className={`${styles.kwChip} ${styles.kwFound}`}>
                ✓ {k}
              </span>
            ))}
            {result.keywordsMissed?.map((k, idx) => (
              <span key={idx} className={`${styles.kwChip} ${styles.kwMissed}`}>
                ✗ {k}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Retrieved chunks */}
      {result.chunks?.length > 0 && (
        <div className={styles.detailSection}>
          <div className={styles.detailTitle}>
            Retrieved Chunks ({result.chunks.length})
          </div>
          {result.chunks.map((c, idx) => (
            <div key={idx} className={styles.chunkItem}>
              [{c.score?.toFixed(2) || '?'}] {c.title || ''} — {(c.snippet || '').substring(0, 80)}…
            </div>
          ))}
        </div>
      )}

      {/* Response */}
      {result.response && (
        <div className={styles.detailBox}>
          <div className={styles.detailTitle}>AI Response</div>
          <pre>{result.response}</pre>
        </div>
      )}
    </div>
  )
}

export default ResultRow
