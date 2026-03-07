import { useState, useRef, useEffect } from 'react'
import styles from './ChatInput.module.css'

const CONTEXT_WINDOW = 200_000

function ChatInput({ onSend, disabled, value: externalValue, onChange: externalOnChange, usage }) {
  const [internalValue, setInternalValue] = useState('')
  const textareaRef = useRef(null)

  // Support both controlled and uncontrolled modes
  const isControlled = externalValue !== undefined
  const value = isControlled ? externalValue : internalValue
  const setValue = isControlled ? externalOnChange : setInternalValue

  // Sync external value when it changes
  useEffect(() => {
    if (isControlled && textareaRef.current) {
      const el = textareaRef.current
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 140) + 'px'
    }
  }, [externalValue, isControlled])

  const handleSubmit = () => {
    if (!value.trim() || disabled) return
    onSend(value)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = ''
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = (e) => {
    setValue(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }

  const inputTokens = usage?.inputTokens ?? 0
  const pctNum = (inputTokens / CONTEXT_WINDOW) * 100
  const pct = pctNum.toFixed(1)

  return (
    <div className={styles.inputArea}>
      <div className={styles.inputRow}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Ask anything about the hotel..."
          className={styles.textarea}
        />
        <div className={styles.tokenMeter}>
          <div className={styles.tokenNumbers}>
            <span className={styles.tokenIn}>{inputTokens.toLocaleString()}</span>
            <span className={styles.tokenSep}>/</span>
            <span className={styles.tokenTotal}>{(CONTEXT_WINDOW / 1000).toFixed(0)}k</span>
          </div>
          <div className={styles.tokenBar}>
            <div
              className={styles.tokenBarFill}
              style={{ width: `${Math.min(pctNum, 100)}%` }}
            />
          </div>
          <div className={styles.tokenPct}>{pct}%</div>
        </div>
        <button
          className={styles.sendBtn}
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
        >
          ↑
        </button>
      </div>
    </div>
  )
}

export default ChatInput
