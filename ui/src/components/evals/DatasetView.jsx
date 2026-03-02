import { escapeHtml } from '../../utils/formatters'
import styles from './DatasetView.module.css'

function DatasetView({ dataset }) {
  if (!dataset) {
    return <div className={styles.loading}>Loading dataset…</div>
  }

  return (
    <div className={styles.container}>
      {/* RAG Cases */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>RAG Eval Cases ({dataset.rag.length})</div>
          <span className={styles.suiteTag} style={{ borderColor: 'var(--rag)', color: 'var(--rag)' }}>
            rag
          </span>
        </div>
        {dataset.rag.map((c, idx) => (
          <div key={idx} className={styles.card}>
            <div className={styles.cardId}>{c.id} · {c.category}</div>
            <div className={styles.cardQuestion}>{c.question}</div>
            <div className={styles.keywords}>
              {(c.expectedKeywords || []).map((k, i) => (
                <span key={i} className={styles.kwChip}>{k}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Agent Cases */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>Agent Eval Cases ({dataset.agent.length})</div>
          <span className={styles.suiteTag} style={{ borderColor: 'var(--agent)', color: 'var(--agent)' }}>
            agent
          </span>
        </div>
        {dataset.agent.map((c, idx) => (
          <div key={idx} className={styles.card}>
            <div className={styles.cardId}>{c.id} · {c.category}</div>
            <div className={styles.cardQuestion}>{c.request}</div>
            <div className={styles.keywords}>
              {(c.expectedTools || []).map((t, i) => (
                <span key={i} className={styles.toolChip}>{t}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Quality Cases */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>Quality Eval Cases ({dataset.quality.length})</div>
          <span className={styles.suiteTag} style={{ borderColor: 'var(--quality)', color: 'var(--quality)' }}>
            quality
          </span>
        </div>
        {dataset.quality.map((c, idx) => (
          <div key={idx} className={styles.card}>
            <div className={styles.cardId}>{c.id}</div>
            <div className={styles.cardQuestion}>{c.question}</div>
            <div className={styles.cardMeta}>{c.gradingCriteria.length} criteria</div>
          </div>
        ))}
      </div>

      {/* Regression Cases */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>Regression Cases ({dataset.regression.length})</div>
          <span className={styles.suiteTag} style={{ borderColor: 'var(--reg)', color: 'var(--reg)' }}>
            regression
          </span>
        </div>
        {dataset.regression.map((c, idx) => (
          <div key={idx} className={styles.card}>
            <div className={styles.cardId}>{c.id} · {c.type}</div>
            <div className={styles.cardQuestion}>{c.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DatasetView
