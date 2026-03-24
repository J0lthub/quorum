import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import GameView  from './pages/GameView'

export default function App() {
  return (
    <Routes>
      <Route path="/"          element={<Dashboard />} />
      <Route path="/game/:id"  element={<GameView />} />
      <Route path="*"          element={<div style={{padding:'2rem',color:'var(--color-muted)'}}>Page not found.</div>} />
    </Routes>
  )
}
