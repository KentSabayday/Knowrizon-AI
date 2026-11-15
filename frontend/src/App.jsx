import { MainLayout } from './components/layout'
import { LandingPage } from './components/pages'
import { AuthProvider, useAuth, FriendsProvider, ChatProvider, CallProvider } from './context'
import { IncomingCall } from './components/calls'
import { CallBubble } from './components/calls'
import pusherService from './lib/websocket'
import { useEffect } from 'react'
import './App.css'

function AppContent() {
  const { isAuthenticated, isLoading, token, user, isAnonymous } = useAuth();

  // Strict role normalization
  const rawRole = user?.role || (user?.isAdmin || user?.is_admin ? 'admin' : (isAnonymous ? 'guest' : 'student'));
  const userRole = String(rawRole).toLowerCase();
  const isAdmin = Boolean(user?.isAdmin || user?.is_admin || userRole === 'admin');

  // Connect Pusher when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      pusherService.connect(token).then(() => {
        // Subscribe to the user's private channel for direct events
        if (user?.id) {
          pusherService.subscribeUser(user.id);
        }
      }).catch(err => {
        console.error('Pusher connection failed:', err);
      });
    }

    return () => {
      if (!isAuthenticated) {
        pusherService.disconnect();
      }
    };
  }, [isAuthenticated, token, user?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] dark:bg-[#0F1115]">
        <div className="text-slate-600 dark:text-[#94A3B8]">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage onAuthSuccess={() => {}} />;
  }

  // Anonymous users and Admins get a streamlined layout without student social call bubbles
  if (isAnonymous || isAdmin) {
    return <MainLayout />;
  }

  // Registered students get the full peer-learning experience with social providers
  return (
    <FriendsProvider>
      <ChatProvider>
        <CallProvider>
          <MainLayout />
          <IncomingCall />
          <CallBubble />
        </CallProvider>
      </ChatProvider>
    </FriendsProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
