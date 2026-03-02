import { useState } from 'react'
import { formatResponse, escapeHtml } from '../../utils/formatters'
import LoadingDots from '../common/LoadingDots'
import styles from './ChatMessage.module.css'

function ChatMessage({ message, isLoading }) {
  const [openTools, setOpenTools] = useState({})

  const toggleTool = (idx) => {
    setOpenTools((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  if (isLoading) {
    return (
      <div className={`${styles.msg} ${styles.ai}`}>
        <div className={styles.avatar}>✦</div>
        <div className={styles.content}>
          <div className={styles.bubble}>
            <LoadingDots />
          </div>
        </div>
      </div>
    )
  }

  const isUser = message.role === 'user'

  return (
    <div className={`${styles.msg} ${isUser ? styles.user : styles.ai}`}>
      <div className={styles.avatar}>{isUser ? 'V' : '✦'}</div>
      <div className={styles.content}>
        {/* RAG chunks */}
        {message.retrievedChunks?.length > 0 && (
          <div className={styles.ragChunks}>
            <div className={styles.ragHeader}>
              📚 Retrieved {message.retrievedChunks.length} chunks:
            </div>
            {message.retrievedChunks.map((chunk, idx) => (
              <div key={idx} className={styles.ragChunk}>
                <span className={styles.ragScore}>{chunk.score.toFixed(2)}</span>
                <strong>{chunk.title}</strong> — {escapeHtml(chunk.snippet)}
              </div>
            ))}
          </div>
        )}

        {/* Tool calls */}
        {message.toolCalls?.length > 0 && (
          <div className={styles.toolCalls}>
            <div className={styles.toolHeader}>
              🔧 {message.toolCalls.length} tool call(s) · {message.iterations} iteration(s)
            </div>
            {message.toolCalls.map((tc, idx) => (
              <div key={idx} className={styles.toolCall}>
                <div
                  className={styles.toolCallHeader}
                  onClick={() => toggleTool(idx)}
                >
                  <span className={styles.toolIcon}>⚙</span>
                  <span>{tc.name}</span>
                  <span className={styles.toolExpand}>▾ click to expand</span>
                </div>
                <div
                  className={`${styles.toolBody} ${openTools[idx] ? styles.open : ''}`}
                >
                  INPUT:  {JSON.stringify(tc.input, null, 2)}
                  {'\n\n'}
                  OUTPUT: {JSON.stringify(tc.output, null, 2)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Message bubble */}
        <div
          className={styles.bubble}
          dangerouslySetInnerHTML={{
            __html: isUser
              ? escapeHtml(message.content).replace(/\n/g, '<br>')
              : formatResponse(message.content),
          }}
        />

        {/* Note */}
        {message.note && <div className={styles.note}>{message.note}</div>}
      </div>
    </div>
  )
}

export default ChatMessage
