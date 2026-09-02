import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ProgressDashboard } from '../progress/ProgressDashboard';
import { DashboardView } from '../pages/DashboardView';
import { SettingsView } from '../pages/SettingsView';
import { PracticeView } from '../pages/PracticeView';
import { LessonsView } from '../pages/LessonsView';
import { HistoryView } from '../pages/HistoryView';
import { FriendsView } from '../friends/FriendsView';
import { GroupLearningView } from '../groups/GroupLearningView';
import { CallInterface } from '../calls/CallInterface';
import { KnowrizonMascot } from '../ui/KnowrizonMascot';
import { useAuth } from '../../context/AuthContext';
import './dashboard.css';

/**
 * MainLayout — Dark AI operating system shell.
 *
 * Preserves: ALL routing logic, path handling, guest guards, CallInterface.
 * New: Dark bg with dot grid + ambient glow, floating Knowri assistant (bottom-right).
 */

/** Paths accessible to anonymous / guest users */
const GUEST_ALLOWED_PATHS = ['/dashboard', '/lessons'];

const KNOWRI_MESSAGES = [
  'Ready to continue learning? 📚',
  "You're doing great! Keep it up! 💪",
  'Try a quiz to test your knowledge! 🧠',
  'Upload some notes and I\'ll help! ✨',
  'Remember to take breaks! 🍵',
  'I found some new study material! 🔍',
];

export function MainLayout({ children }) {
  const [currentPath, setCurrentPath] = useState('/dashboard');
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [showKnowriTip, setShowKnowriTip] = useState(false);
  const [knowriMessage, setKnowriMessage] = useState(KNOWRI_MESSAGES[0]);
  const [showMascot, setShowMascot] = useState(true);
  const [welcomeShown, setWelcomeShown] = useState(false);
  const { isAnonymous, user } = useAuth();

  // Show welcome greeting once per session on mount
  useEffect(() => {
    const alreadyWelcomed = sessionStorage.getItem('knowri-welcomed');
    if (!alreadyWelcomed && user?.name) {
      setWelcomeShown(true);
      setShowKnowriTip(true);
      const firstName = user.name.split(' ')[0];
      setKnowriMessage(`Welcome, ${firstName}! Have a great study session! 🎓`);
      sessionStorage.setItem('knowri-welcomed', 'true');
    }
  }, [user]);

  // Auto-hide mascot after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowMascot(false);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  // Guard: if anonymous user somehow lands on a restricted path, redirect to dashboard
  useEffect(() => {
    if (isAnonymous && !GUEST_ALLOWED_PATHS.includes(currentPath)) {
      setCurrentPath('/dashboard');
      setActiveConversationId(null);
    }
  }, [isAnonymous, currentPath]);

  // Rotate Knowri messages when page changes (skip if welcome is still showing)
  useEffect(() => {
    if (!welcomeShown) {
      setKnowriMessage(KNOWRI_MESSAGES[Math.floor(Math.random() * KNOWRI_MESSAGES.length)]);
    }
    setShowKnowriTip(false);
    setWelcomeShown(false);
  }, [currentPath]);

  const handleNavigate = (path, conversationId = null) => {
    // Block anonymous users from navigating to restricted pages
    if (isAnonymous && !GUEST_ALLOWED_PATHS.includes(path)) {
      return;
    }

    setCurrentPath(path);
    if (conversationId) {
      setActiveConversationId(conversationId);
    } else if (path !== '/lessons') {
      // Clear conversation ID when navigating away from lessons (unless going to lessons)
      setActiveConversationId(null);
    }
  };

  // Render content based on current path — IDENTICAL logic to original
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
    <div className="h-screen flex bg-[#0B1220] relative overflow-hidden">
      {/* Subtle dot grid */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        aria-hidden="true"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Ambient glow blobs */}
      <div className="fixed -top-[30%] -right-[20%] w-[50%] h-[50%] bg-[#22C7FF]/[0.015] rounded-full blur-[120px] pointer-events-none z-0" aria-hidden="true" />
      <div className="fixed -bottom-[20%] -left-[15%] w-[40%] h-[40%] bg-[#5B5FFF]/[0.015] rounded-full blur-[120px] pointer-events-none z-0" aria-hidden="true" />

      {/* Sidebar */}
      <Sidebar currentPath={currentPath} onNavigate={handleNavigate} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Top bar */}
        <TopBar currentPath={currentPath} />

        {/* Content area */}
        <main className="flex-1 min-h-0 overflow-hidden">
          {renderContent()}
        </main>
      </div>

      {/* Floating Knowri assistant (bottom-right) — auto-hides after 10s */}
      <div
        className={`fixed bottom-6 right-6 z-50 transition-all duration-700 ${showMascot ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
      >
        <button
          onClick={() => setShowKnowriTip(!showKnowriTip)}
          className="relative dash-knowri-float group"
          aria-label="Talk to Knowri"
        >
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-full bg-[#22C7FF]/10 blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity" />

          <KnowrizonMascot className="w-[65px] relative z-10" autoGreet={false} state="idle" />
        </button>

        {/* Speech bubble */}
        {showKnowriTip && (
          <div className="absolute bottom-full right-0 mb-3 w-56 bg-[#1A2234]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-3.5 shadow-xl shadow-black/30 text-left">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-5 h-5 rounded-full bg-gradient-to-r from-[#22C7FF] to-[#5B5FFF] flex items-center justify-center text-[8px] font-bold text-white">K</div>
              <span className="text-xs font-medium text-white">Knowri</span>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">{knowriMessage}</p>
            {/* Pointer triangle */}
            <div className="absolute bottom-0 right-7 w-2.5 h-2.5 bg-[#1A2234]/90 border-r border-b border-white/[0.08] rotate-45 translate-y-1/2" />
          </div>
        )}
      </div>

      {/* Call Interface (full screen when active) — hidden for anonymous users */}
      {!isAnonymous && <CallInterface />}
    </div>
  );
}
