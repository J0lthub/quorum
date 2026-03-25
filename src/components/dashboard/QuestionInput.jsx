import { useState, useRef } from 'react'
import styles from './QuestionInput.module.css'

const EXAMPLES = [
  'How should cities manage the transition to electric public transit?',
  'What policy would best reduce food waste at a national scale?',
  'How do we retrofit existing housing stock to be net-zero?',
]

export default function QuestionInput({ onSubmit }) {
  const [value, setValue] = useState('')
  const textareaRef = useRef(null)

  function handleChange(e) {
    setValue(e.target.value)
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
    const textarea = textareaRef.current
    if (textarea) textarea.style.height = 'auto'
  }

  function useExample(q) {
    setValue(q)
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
      el.focus()
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.prompt}>Convene the Council</div>
      <div className={styles.sub}>Pose any real-world challenge and watch 13 expert perspectives deliberate.</div>
      <form onSubmit={handleSubmit}>
        <textarea
          id="question-input"
          ref={textareaRef}
          className={styles.textarea}
          placeholder="What question should the Council deliberate on?"
          value={value}
          onChange={handleChange}
          rows={3}
          maxLength={500}
        />
        <div className={styles.footer}>
          <span className={styles.hint}>
            {value.length > 400 ? `${value.length}/500` : 'Try an example →\u00a0'}
            {value.length <= 400 && EXAMPLES.map((ex, i) => (
              <button
                key={i}
                type="button"
                className={styles.exampleBtn}
                onClick={() => useExample(ex)}
              >
                {i === 0 ? 'transit' : i === 1 ? 'food waste' : 'housing'}
              </button>
            ))}
          </span>
          <button
            className={styles.submitBtn}
            type="submit"
            disabled={!value.trim()}
          >
            Convene the Council →
          </button>
        </div>
      </form>
    </div>
  )
}
