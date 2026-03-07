import { useRef, useEffect, useState } from 'react'
import { useChat } from '../hooks/useChat'
import { getPhaseNumber } from '../utils/formatters'
import Header from '../components/common/Header'
import ChatSidebar from '../components/chat/ChatSidebar'
import ChatMessage from '../components/chat/ChatMessage'
import ChatInput from '../components/chat/ChatInput'
import WelcomeScreen from '../components/chat/WelcomeScreen'
import styles from './ChatPage.module.css'

function ChatPage() {
  const {
    currentPhase,
    phaseConfig,
    phases,
    messages,
    isLoading,
    lastUsage,
    switchPhase,
    sendMessage,
    ingestDocs,
    clearChat,
  } = useChat()

  const messagesRef = useRef(null)
  const [inputValue, setInputValue] = useState('')

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages])

  const handlePromptClick = (prompt) => {
    setInputValue(prompt)
  }

  const handleSend = (message) => {
    sendMessage(message)
    setInputValue('')
  }

  return (
    <div className={styles.page}>
      <Header
        statusLabel="localhost:3001"
        phaseLabel={`Phase ${getPhaseNumber(currentPhase)}`}
      />
      <div className={styles.app}>
        <ChatSidebar
          phases={phases}
          currentPhase={currentPhase}
          onPhaseChange={switchPhase}
          onIngestDocs={ingestDocs}
          onClearChat={clearChat}
          onPromptClick={handlePromptClick}
        />
        <main className={styles.main}>
          <div className={styles.phaseHeader}>
            <span className={styles.phaseTitle}>{phaseConfig.title}</span>
            <span
              className={styles.phaseBadge}
              style={{ borderColor: phaseConfig.color, color: phaseConfig.color }}
            >
              {phaseConfig.endpoint}
            </span>
          </div>

          <div className={styles.messages} ref={messagesRef}>
            {messages.length === 0 ? (
              <WelcomeScreen />
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <ChatMessage key={idx} message={msg} />
                ))}
                {isLoading && <ChatMessage isLoading />}
              </>
            )}
          </div>

          <ChatInput
            onSend={handleSend}
            disabled={isLoading}
            value={inputValue}
            onChange={setInputValue}
            usage={lastUsage}
          />
        </main>
      </div>
    </div>
  )
}

export default ChatPage
