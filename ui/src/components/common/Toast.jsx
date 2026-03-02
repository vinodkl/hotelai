import styles from './Toast.module.css'

function Toast({ message, type = 'ok', visible }) {
  if (!message) return null

  return (
    <div className={`${styles.toast} ${visible ? styles.show : ''} ${styles[type]}`}>
      {message}
    </div>
  )
}

export default Toast
