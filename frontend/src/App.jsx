import { MainLayout } from './components/layout'
import { LandingPage } from './components/pages'
import { AuthProvider, useAuth, FriendsProvider, ChatProvider, CallProvider } from './context'
import { IncomingCall } from './components/calls'
import { CallBubble } from './components/calls'
import pusherService from './lib/websocket'
import { useEffect } from 'react'
import './App.css'

function AppContent() {
  const { isAuthenticated, isLoading, token, user } = useAuth();

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage onAuthSuccess={() => {}} />;
  }

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
