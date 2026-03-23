import { useState } from 'react'
import TopBar from '../components/layout/TopBar'
import QuestionInput from '../components/dashboard/QuestionInput'
import ActiveGamesGrid from '../components/dashboard/ActiveGamesGrid'
import RecentResults from '../components/dashboard/RecentResults'
import LeaderboardSidebar from '../components/dashboard/LeaderboardSidebar'
import PersonaModal from '../components/persona/PersonaModal'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const [pendingQuestion, setPendingQuestion] = useState(null)

  function handleQuestionSubmit(question) {
    setPendingQuestion(question)
  }

  function handleModalClose() {
    setPendingQuestion(null)
  }

  return (
    <div className={styles.page}>
      <TopBar />
      <div className={styles.inner}>
        <div className={styles.questionArea}>
          <QuestionInput onSubmit={handleQuestionSubmit} />
        </div>
        <div className={styles.gamesArea}>
          <ActiveGamesGrid />
        </div>
        <div className={styles.recentArea}>
          <RecentResults />
        </div>
        <div className={styles.sidebarArea}>
          <LeaderboardSidebar />
        </div>
      </div>

      {pendingQuestion && (
        <PersonaModal
          question={pendingQuestion}
          onClose={handleModalClose}
        />
      )}
    </div>
  )
}
