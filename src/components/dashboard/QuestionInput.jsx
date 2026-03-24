import { useState, useRef } from 'react'
import styles from './QuestionInput.module.css'

export default function QuestionInput({ onSubmit }) {
  const [value, setValue] = useState('')
  const textareaRef = useRef(null)

  function handleChange(e) {
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
    setValue('')
    if (e.target && e.target.elements) {
      const textarea = textareaRef.current
      if (textarea) textarea.style.height = 'auto'
    }
  }

  return (
    <div className={styles.wrapper}>
      <label className={styles.label} htmlFor="question-input">Ask a question</label>
      <form onSubmit={handleSubmit}>
        <textarea
          id="question-input"
          ref={textareaRef}
          className={styles.textarea}
          placeholder="Ask a question about the world..."
          value={value}
          onChange={handleChange}
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
