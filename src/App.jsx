import { Routes, Route } from 'react-router-dom'
import Dashboard    from './pages/Dashboard'
import GameView     from './pages/GameView'
import PersonasPage from './pages/PersonasPage'
import ModelPage    from './pages/ModelPage'
import AboutPage    from './pages/AboutPage'

export default function App() {
  return (
    <Routes>
      <Route path="/"          element={<Dashboard />} />
      <Route path="/game/:id"  element={<GameView />} />
      <Route path="/personas"  element={<PersonasPage />} />
      <Route path="/model"     element={<ModelPage />} />
      <Route path="/about"     element={<AboutPage />} />
      <Route path="*"          element={<div style={{padding:'2rem',color:'var(--color-muted)'}}>Page not found.</div>} />
    </Routes>
  )
}
