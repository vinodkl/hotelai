import { useState, useRef, useEffect } from 'react'
import styles from './ChatInput.module.css'

function ChatInput({ onSend, disabled, value: externalValue, onChange: externalOnChange }) {
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
