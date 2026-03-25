import { useState, useEffect, useRef } from 'react'
import styles from './InsightPanel.module.css'

const BASE = import.meta.env.VITE_API_BASE ?? ''

export default function InsightPanel({ gameId, onClose }) {
  const [text, setText]     = useState('')
  const [status, setStatus] = useState('loading') // loading | streaming | done | error
  const bodyRef             = useRef(null)
  const abortRef            = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    abortRef.current = controller

    setText('')
    setStatus('loading')

    async function stream() {
      try {
        const res = await fetch(`${BASE}/api/games/${gameId}/insight`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`${res.status}`)
        if (!res.body) throw new Error('No response body')

        setStatus('streaming')
        const reader  = res.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          setText(prev => prev + chunk)
        }

        setStatus('done')
      } catch (err) {
        if (err.name === 'AbortError') return
        console.error('Insight stream error:', err)
        setStatus('error')
      }
    }

    stream()

    return () => controller.abort()
  }, [gameId])

  // Auto-scroll to bottom as text arrives
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [text])

  return (
    <div className={styles.panel}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className={styles.header}>
        <span className={styles.headerLabel}>
          <span className={styles.headerDot} />
          ANALYST BRIEFING
        </span>
        <span className={styles.headerMeta}>
          {status === 'loading'   && 'CONNECTING…'}
          {status === 'streaming' && 'GENERATING…'}
          {status === 'done'      && 'COMPLETE'}
          {status === 'error'     && 'ERROR'}
        </span>
        <button className={styles.close} onClick={onClose} aria-label="Close insight panel">
          ×
        </button>
      </div>

      {/* ── Divider ────────────────────────────────────────── */}
      <div className={styles.divider} />

      {/* ── Body ───────────────────────────────────────────── */}
      <div className={styles.body} ref={bodyRef}>

        {status === 'loading' && (
          <div className={styles.loadingBlock}>
            <div className={styles.loadingBar} />
            <div className={styles.loadingBar} style={{ width: '75%' }} />
            <div className={styles.loadingBar} style={{ width: '88%' }} />
            <div className={styles.loadingBar} style={{ width: '60%' }} />
          </div>
        )}

        {(status === 'streaming' || status === 'done') && (
          <div className={styles.narrative}>
            {text}
            {status === 'streaming' && <span className={styles.cursor}>▋</span>}
          </div>
        )}

        {status === 'error' && (
          <div className={styles.errorBlock}>
            <span className={styles.errorIcon}>!</span>
            Failed to generate briefing. Check server logs.
          </div>
        )}

      </div>

      {/* ── Footer ─────────────────────────────────────────── */}
      {status === 'done' && (
        <div className={styles.footer}>
          <span className={styles.footerLabel}>QUORUM · DOUGHNUT ECONOMICS FRAMEWORK</span>
        </div>
      )}

    </div>
  )
}
