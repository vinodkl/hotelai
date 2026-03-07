import { useState, useCallback } from 'react'
import { aiApi } from '../services/api'

const PHASES = {
  chat: {
    title: 'Phase 1 — Basic LLM Chat',
    endpoint: 'POST /api/ai/chat',
    color: 'var(--text-muted)',
    prompts: [
      'What are your cancellation policies?',
      'What time is check-in?',
      'Do you have a pool?',
      'Tell me about your loyalty program',
    ],
  },
  rag: {
    title: 'Phase 2 — RAG Chat',
    endpoint: 'POST /api/ai/rag',
    color: 'var(--gold)',
    prompts: [
      'What is your cancellation policy?',
      'What are the pet rules?',
      'What comes with Gold loyalty status?',
      'How much is valet parking?',
      'What dietary options does the restaurant offer?',
    ],
  },
  agent: {
    title: 'Phase 3 — AI Agent + Tool Use',
    endpoint: 'POST /api/ai/agent',
    color: 'var(--blue)',
    prompts: [
      'What suites are available Feb 25-28?',
      'Get me details on reservation RES001',
      'Show me the hotel occupancy stats',
      'Book room R201 for guest G002 from Feb 22 to Feb 25',
      'What would it cost for guest G003 to stay in R401 for 3 nights from Mar 1?',
    ],
  },
}

export function useChat() {
  const [currentPhase, setCurrentPhase] = useState('chat')
  const [messages, setMessages] = useState([])
  const [chatHistory, setChatHistory] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUsage, setLastUsage] = useState(null)

  const phaseConfig = PHASES[currentPhase]

  const switchPhase = useCallback((phase) => {
    setCurrentPhase(phase)
    setMessages([])
    setChatHistory([])
    setError(null)
    setLastUsage(null)
  }, [])

  const sendMessage = useCallback(async (message) => {
    if (!message.trim()) return

    setError(null)
    setIsLoading(true)

    // Add user message
    const userMessage = { role: 'user', content: message }
    setMessages((prev) => [...prev, userMessage])
    setChatHistory((prev) => [...prev, userMessage])

    try {
      // Call the appropriate API based on phase
      const apiMethod = aiApi[currentPhase]
      const data = await apiMethod(message, chatHistory)

      if (data.usage) setLastUsage(data.usage)

      // Add AI response
      const aiMessage = {
        role: 'ai',
        content: data.response,
        retrievedChunks: data.retrievedChunks,
        toolCalls: data.toolCalls,
        iterations: data.iterations,
        note: data.note,
      }
      setMessages((prev) => [...prev, aiMessage])
      setChatHistory((prev) => [...prev, { role: 'assistant', content: data.response }])
    } catch (err) {
      setError(err.message || 'Failed to send message')
      const errorMessage = {
        role: 'ai',
        content: `❌ ${err.message || 'Could not connect to backend. Make sure it\'s running on port 3001.'}`,
        isError: true,
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [currentPhase, chatHistory])

  const ingestDocs = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await aiApi.ingest()
      const successMessage = {
        role: 'ai',
        content: `✅ Ingested ${data.chunksIndexed} chunks from hotel documents.\n\nNow switch to Phase 2 (RAG Chat) and ask about policies!`,
      }
      setMessages((prev) => [...prev, successMessage])
    } catch (err) {
      const errorMessage = {
        role: 'ai',
        content: '❌ Backend not running. Start it first with: cd backend && npm run dev',
        isError: true,
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearChat = useCallback(() => {
    setMessages([])
    setChatHistory([])
    setError(null)
    setLastUsage(null)
  }, [])

  return {
    currentPhase,
    phaseConfig,
    phases: PHASES,
    messages,
    isLoading,
    error,
    lastUsage,
    switchPhase,
    sendMessage,
    ingestDocs,
    clearChat,
  }
}
