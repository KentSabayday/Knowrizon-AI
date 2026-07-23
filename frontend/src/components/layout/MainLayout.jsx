import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { ProgressDashboard } from '../progress/ProgressDashboard'
import { DashboardView } from '../pages/DashboardView'
import { SettingsView } from '../pages/SettingsView'
import { PracticeView } from '../pages/PracticeView'
import { LessonsView } from '../pages/LessonsView'
import { HistoryView } from '../pages/HistoryView'
import { FriendsView } from '../friends/FriendsView'
import { GroupLearningView } from '../groups/GroupLearningView'
import { CallInterface } from '../calls/CallInterface'
import { useAuth } from '../../context/AuthContext'

/** Paths accessible to anonymous / guest users */
const GUEST_ALLOWED_PATHS = ['/dashboard', '/lessons'];

export function MainLayout({ children }) {
  const [currentPath, setCurrentPath] = useState('/dashboard')
  const [activeConversationId, setActiveConversationId] = useState(null)
  const { isAnonymous } = useAuth()

  // Guard: if anonymous user somehow lands on a restricted path, redirect to dashboard
  useEffect(() => {
    if (isAnonymous && !GUEST_ALLOWED_PATHS.includes(currentPath)) {
      setCurrentPath('/dashboard')
      setActiveConversationId(null)
    }
  }, [isAnonymous, currentPath])

  const handleNavigate = (path, conversationId = null) => {
    // Block anonymous users from navigating to restricted pages
    if (isAnonymous && !GUEST_ALLOWED_PATHS.includes(path)) {
      return
    }

    setCurrentPath(path)
    if (conversationId) {
      setActiveConversationId(conversationId)
    } else if (path !== '/lessons') {
      // Clear conversation ID when navigating away from lessons (unless going to lessons)
      setActiveConversationId(null)
    }
  }

  // Render content based on current path
  const renderContent = () => {
    switch (currentPath) {
      case '/lessons':
        return <LessonsView conversationId={activeConversationId} onConversationChange={setActiveConversationId} />;
      case '/practice':
        if (isAnonymous) return children || <DashboardView onNavigate={handleNavigate} />;
        return <PracticeView />;
      case '/progress':
        if (isAnonymous) return children || <DashboardView onNavigate={handleNavigate} />;
        return (
          <div className="p-6 overflow-auto h-full">
            <ProgressDashboard />
          </div>
        );
      case '/history':
        if (isAnonymous) return children || <DashboardView onNavigate={handleNavigate} />;
        return <HistoryView onNavigate={handleNavigate} />;
      case '/settings':
        if (isAnonymous) return children || <DashboardView onNavigate={handleNavigate} />;
        return <SettingsView />;
      case '/friends':
        if (isAnonymous) return children || <DashboardView onNavigate={handleNavigate} />;
        return <FriendsView />;
      case '/groups':
        if (isAnonymous) return children || <DashboardView onNavigate={handleNavigate} />;
        return <GroupLearningView />;
      case '/dashboard':
      default:
        return children || <DashboardView onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* Left sidebar */}
      <Sidebar currentPath={currentPath} onNavigate={handleNavigate} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <TopBar />

        {/* Content area */}
        <main className="flex-1 min-h-0 overflow-hidden">
          {renderContent()}
        </main>
      </div>
      
      {/* Call Interface (full screen when active) — hidden for anonymous users */}
      {!isAnonymous && <CallInterface />}
    </div>
  )
}

