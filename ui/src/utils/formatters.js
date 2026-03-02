export function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function formatResponse(text) {
  if (!text) return ''
  return escapeHtml(text)
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(
      /`([^`]+)`/g,
      '<code style="background:var(--bg4);padding:0.1rem 0.3rem;border-radius:3px;font-family:var(--font-mono);font-size:0.85em">$1</code>'
    )
}

export function formatDate(date) {
  return new Date(date).toLocaleString()
}

export function getPhaseNumber(phase) {
  switch (phase) {
    case 'chat': return '1'
    case 'rag': return '2'
    case 'agent': return '3'
    default: return '?'
  }
}

export function getSuiteColor(suite) {
  const colors = {
    rag: 'var(--rag)',
    agent: 'var(--agent)',
    quality: 'var(--quality)',
    regression: 'var(--reg)',
    full: 'var(--text)',
  }
  return colors[suite] || 'var(--text-dim)'
}

export function getStatusClass(rate) {
  const percent = parseInt(rate)
  if (percent >= 80) return 'pass'
  if (percent >= 50) return 'skip'
  return 'fail'
}
