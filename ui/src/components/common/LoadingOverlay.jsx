import styles from './LoadingOverlay.module.css'

function LoadingOverlay({ visible, message = 'Loading...' }) {
  if (!visible) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.spinner}></div>
      <div className={styles.message}>{message}</div>
    </div>
  )
}

export default LoadingOverlay
