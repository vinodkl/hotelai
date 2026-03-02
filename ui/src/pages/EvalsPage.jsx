import { useEvals } from '../hooks/useEvals'
import Header from '../components/common/Header'
import LoadingOverlay from '../components/common/LoadingOverlay'
import Toast from '../components/common/Toast'
import EvalsSidebar from '../components/evals/EvalsSidebar'
import ResultsView from '../components/evals/ResultsView'
import DatasetView from '../components/evals/DatasetView'
import HistoryView from '../components/evals/HistoryView'
import Placeholder from '../components/evals/Placeholder'
import styles from './EvalsPage.module.css'

function EvalsPage() {
  const {
    currentView,
    results,
    processedResults,
    history,
    dataset,
    isLoading,
    loadingMessage,
    error,
    toast,
    switchView,
    runEvals,
    loadRun,
  } = useEvals()

  const renderContent = () => {
    if (error && currentView === 'results') {
      return <Placeholder message={error} />
    }

    switch (currentView) {
      case 'results':
        return processedResults ? (
          <ResultsView processedResults={processedResults} />
        ) : (
          <Placeholder />
        )
      case 'dataset':
        return <DatasetView dataset={dataset} />
      case 'history':
        return <HistoryView history={history} />
      default:
        return <Placeholder />
    }
  }

  return (
    <div className={styles.page}>
      <LoadingOverlay visible={isLoading} message={loadingMessage} />
      <Toast message={toast?.message} type={toast?.type} visible={!!toast} />

      <Header />

      <div className={styles.layout}>
        <EvalsSidebar
          currentView={currentView}
          history={history}
          onViewChange={switchView}
          onRunEvals={runEvals}
          onLoadRun={loadRun}
        />
        <main className={styles.main}>
          {renderContent()}
        </main>
      </div>
    </div>
  )
}

export default EvalsPage
