import { useState } from 'react';
import { AuthPage } from '../auth';
import { LandingView } from '../landing/LandingPage';

export function LandingPage({ onAuthSuccess }) {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const handleGetStarted = () => {
    setShowAuth(true);
    setAuthMode('register');
  };

  const handleSignIn = () => {
    setShowAuth(true);
    setAuthMode('login');
  };

  if (showAuth) {
    return (
      <AuthPage
        mode={authMode}
        onBack={() => setShowAuth(false)}
        onSuccess={onAuthSuccess}
      />
    );
  }

  return <LandingView onGetStarted={handleGetStarted} onSignIn={handleSignIn} />;
}

export default LandingPage;
