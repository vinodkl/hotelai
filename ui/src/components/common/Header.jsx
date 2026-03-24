import { Link, useLocation } from 'react-router-dom'
import styles from './Header.module.css'

function Header({ statusLabel, phaseLabel }) {
  const location = useLocation()
  const isEvals = location.pathname === '/evals'

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        {isEvals ? (
          <>HOTELAI <span>/ EVAL DASHBOARD</span></>
        ) : (
          <>THE GRAND HOTEL <span>Learning Lab</span></>
        )}
      </div>
      <div className={styles.statusBar}>
        {!isEvals && (
          <>
            <div className={styles.statusDot}></div>
            <span>{statusLabel || 'localhost:3001'}</span>
            <span className={styles.separator}>|</span>
            <span className={styles.phaseLabel}>{phaseLabel || 'Phase 1'}</span>
            <span className={styles.separator}>|</span>
          </>
        )}
        <Link to={isEvals ? '/' : '/evals'} className={styles.navLink}>
          {isEvals ? '← Chat' : 'Evals →'}
        </Link>
      </div>
    </header>
  )
}

export default Header
