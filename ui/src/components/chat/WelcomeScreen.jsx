import styles from './WelcomeScreen.module.css'

function WelcomeScreen() {
  return (
    <div className={styles.welcome}>
      <div className={styles.icon}>🏨</div>
      <h2>Start Learning</h2>
      <p>
        Select a phase on the left, then ask a question. Compare how each phase
        responds differently to the same query.
      </p>
    </div>
  )
}

export default WelcomeScreen
