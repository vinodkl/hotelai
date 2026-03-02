import styles from './ChatSidebar.module.css'

function ChatSidebar({
  phases,
  currentPhase,
  onPhaseChange,
  onIngestDocs,
  onClearChat,
  onPromptClick,
}) {
  const phaseConfig = phases[currentPhase]

  return (
    <aside className={styles.sidebar}>
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Learning Phases</div>

        {Object.entries(phases).map(([key, phase]) => (
          <button
            key={key}
            className={`${styles.phaseBtn} ${currentPhase === key ? styles.active : ''}`}
            onClick={() => onPhaseChange(key)}
          >
            <span className={styles.phaseNum}>
              {key === 'chat' ? '01' : key === 'rag' ? '02' : '03'}
            </span>
            <div className={styles.phaseInfo}>
              <div className={styles.phaseName}>
                {key === 'chat' ? 'Basic LLM' : key === 'rag' ? 'RAG Chat' : 'AI Agent'}
              </div>
              <div className={styles.phaseDesc}>
                {key === 'chat' && 'Raw API call, no context. Watch it hallucinate hotel policies.'}
                {key === 'rag' && 'LLM + retrieval from hotel knowledge base. See source chunks.'}
                {key === 'agent' && 'Multi-step ReAct loop. Book rooms, check availability, cancel.'}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Try These Prompts</div>
        {phaseConfig.prompts.map((prompt, idx) => (
          <button
            key={idx}
            className={styles.quickBtn}
            onClick={() => onPromptClick(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Actions</div>
        <button className={styles.quickBtn} onClick={onIngestDocs}>
          📚 Ingest Hotel Docs (RAG)
        </button>
        <button className={styles.quickBtn} onClick={onClearChat}>
          🗑 Clear Chat
        </button>
        <button
          className={styles.quickBtn}
          onClick={() => window.open('/api/ai/finetune/dataset')}
        >
          📄 View Fine-tune Dataset
        </button>
      </div>
    </aside>
  )
}

export default ChatSidebar
