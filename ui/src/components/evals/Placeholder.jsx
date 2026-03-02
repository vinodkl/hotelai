import styles from './Placeholder.module.css'

function Placeholder({ message = 'Run an eval suite to see results' }) {
  return (
    <div className={styles.placeholder}>
      <div className={styles.icon}>🧪</div>
      <p>{message}</p>
      <p className={styles.sub}>All 4 types: RAG · Agent · Quality · Regression</p>
    </div>
  )
}

export default Placeholder
