const API_BASE = '/api'

class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body)
  }

  const response = await fetch(url, config)
  const data = await response.json()

  if (!response.ok || data.error) {
    throw new ApiError(data.error || 'Request failed', response.status)
  }

  return data
}

// AI API
export const aiApi = {
  chat: (message, history = []) =>
    request('/ai/chat', {
      method: 'POST',
      body: { message, history },
    }),

  rag: (message, history = []) =>
    request('/ai/rag', {
      method: 'POST',
      body: { message, history },
    }),

  agent: (message, history = []) =>
    request('/ai/agent', {
      method: 'POST',
      body: { message, history },
    }),

  ingest: () =>
    request('/ai/ingest', {
      method: 'POST',
    }),
}

// Evals API
export const evalsApi = {
  run: (suite) =>
    request('/evals/run', {
      method: 'POST',
      body: { suite },
    }),

  getHistory: (limit = 10) =>
    request(`/evals/history?limit=${limit}`),

  getDataset: () =>
    request('/evals/dataset'),

  getRun: (id) =>
    request(`/evals/run/${id}`),
}

export { ApiError }
