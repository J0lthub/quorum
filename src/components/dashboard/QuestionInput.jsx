import { useState, useRef } from 'react'
import styles from './QuestionInput.module.css'

export default function QuestionInput({ onSubmit }) {
  const [value, setValue] = useState('')
  const textareaRef = useRef(null)

  function handleInput(e) {
    setValue(e.target.value)
    // Auto-grow
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onSubmit(trimmed)
  }

  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>Ask a question</label>
      <form onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          placeholder="Ask a question about the world..."
          value={value}
          onInput={handleInput}
          onChange={handleInput}
          rows={2}
        />
        <div className={styles.footer}>
          <button
            className={styles.submitBtn}
            type="submit"
            disabled={!value.trim()}
          >
            Start Game →
          </button>
        </div>
      </form>
    </div>
  )
}
