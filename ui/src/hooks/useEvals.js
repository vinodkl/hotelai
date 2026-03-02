import { useState, useCallback, useEffect } from 'react'
import { evalsApi } from '../services/api'

export function useEvals() {
  const [currentView, setCurrentView] = useState('results')
  const [results, setResults] = useState(null)
  const [history, setHistory] = useState([])
  const [dataset, setDataset] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'ok') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const loadHistory = useCallback(async () => {
    try {
      const data = await evalsApi.getHistory(8)
      setHistory(data)
    } catch (err) {
      // Silently fail for history loading
    }
  }, [])

  const runEvals = useCallback(async (suite) => {
    setIsLoading(true)
    setLoadingMessage(`Running ${suite} evals… this takes 30–90s`)
    setError(null)

    try {
      const data = await evalsApi.run(suite)
      setResults({ ...data, suite })
      loadHistory()
      showToast(`✓ ${suite} evals complete`, 'ok')
    } catch (err) {
      setError(err.message)
      showToast(`✗ ${err.message}`, 'err')
    } finally {
      setIsLoading(false)
      setLoadingMessage('')
    }
  }, [loadHistory, showToast])

  const loadRun = useCallback(async (id) => {
    setIsLoading(true)
    setLoadingMessage('Loading run…')

    try {
      const run = await evalsApi.getRun(id)
      const fakeData = {
        results: run.results,
        passRate: run.pass_rate,
        passed: run.passed,
        failed: run.failed,
        total: run.total,
        name: run.suite,
        suite: run.suite,
        report: {
          suites: {
            [run.suite]: {
              results: run.results,
              passed: run.passed,
              total: run.total,
              name: run.suite,
            },
          },
          summary: { passRate: run.pass_rate },
        },
      }
      setResults(fakeData)
    } catch (err) {
      showToast(err.message, 'err')
    } finally {
      setIsLoading(false)
      setLoadingMessage('')
    }
  }, [showToast])

  const loadDataset = useCallback(async () => {
    try {
      const data = await evalsApi.getDataset()
      setDataset(data)
    } catch (err) {
      setError('Backend not running — start with: cd backend && npm run dev')
    }
  }, [])

  const switchView = useCallback((view) => {
    setCurrentView(view)
    if (view === 'dataset' && !dataset) {
      loadDataset()
    }
  }, [dataset, loadDataset])

  // Load history on mount
  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // Process results for display
  const processedResults = results ? (() => {
    let allResults = []
    let suites = {}

    if (results.suite === 'full' && results.report) {
      suites = results.report.suites
      allResults = Object.values(suites).flatMap((s) => s.results || [])
    } else {
      allResults = results.results || []
      suites[results.suite] = results
    }

    const passed = allResults.filter((r) => r.status === 'pass').length
    const failed = allResults.filter((r) => r.status === 'fail').length
    const rate = allResults.length ? ((passed / allResults.length) * 100).toFixed(0) : 0

    return { allResults, suites, passed, failed, rate, total: allResults.length }
  })() : null

  return {
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
    loadHistory,
  }
}
