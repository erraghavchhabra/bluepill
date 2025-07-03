import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Login from './Login';
import Signup from './Signup';

interface AuthProps {
  onAuthSuccess: () => void;
}

interface LocationState {
  from?: { pathname: string };
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [view, setView] = useState<'login' | 'signup'>('login');
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  
  // Get redirect path from location state or default to home
  const from = state?.from?.pathname || '/';
  
  const handleAuthSuccess = () => {
    onAuthSuccess();
    // Redirect to the page user was trying to access, or home by default
    navigate(from, { replace: true });
  };

  return (
    <div className="w-full max-w-md mx-auto py-12">
      {view === 'login' ? (
        <Login 
          onSwitch={() => setView('signup')} 
          onSuccess={handleAuthSuccess} 
        />
      ) : (
        <Signup 
          onSwitch={() => setView('login')} 
          onSuccess={handleAuthSuccess} 
        />
      )}
    </div>
  );
};

export default Auth;