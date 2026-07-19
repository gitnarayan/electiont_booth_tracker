import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

// Dynamically determine the API URL. If loaded on a different machine in the local network,
// it will automatically point to the host's IP on port 5000.
const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;

function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark';

    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Check localStorage for existing session
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsInitializing(false);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLoginSuccess = (newToken, loggedInUser) => {
    setToken(newToken);
    setUser(loggedInUser);
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('auth_user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  if (isInitializing) {
    return <div className="spinner"></div>;
  }

  return (
    <div className="app-container">

      {!token ? (
        <Login onLoginSuccess={handleLoginSuccess} apiUrl={API_URL} />
      ) : (
        <>
          <header>
            <div className="brand">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
                <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
              </svg>
              <h1>Election Analytics</h1>
              <span className="brand-badge">Internal Dashboard</span>
            </div>
            
            <div className="user-profile">
              <span className="user-name">Welcome, <strong>{user?.name}</strong></span>
              <button className="btn-logout" onClick={handleLogout}>Logout</button>
              <button
                className="theme-toggle"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
              </button>
            </div>
          </header>

          <main>
            <Dashboard apiUrl={API_URL} />
          </main>

          <footer className="footer">
            Election Constituency & Booth Tracker &copy; {new Date().getFullYear()} &middot; Analytics & Field Staff Portal
          </footer>
        </>
      )}
    </div>
  );
}

export default App;
