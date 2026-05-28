import { useEffect } from 'react';
import { fetchCsrfToken } from './utils/api';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ProblemsPage from './pages/ProblemsPage';
import RoomSettingsPage from './pages/RoomSettingsPage';
import MockMode from './pages/MockMode';
import './index.css';

import { Toaster } from 'react-hot-toast';

function App() {
  useEffect(() => {
    // Fetch the CSRF token from the backend
    fetchCsrfToken();
    
    // Clean up legacy tokens from before the cookie refactor
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    // Note: Zustand uses 'auth-storage', so we don't clear the whole localStorage
  }, []);

  return (
    <Router>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: 'var(--color-bg-elevated)',
          color: 'var(--color-text-primary)',
          border: '1px solid var(--color-bg-border)',
        }
      }} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<LoginPage isRegister={true} />} />
        <Route path="/problems" element={<ProblemsPage />} />
        <Route path="/room-settings" element={<RoomSettingsPage />} />
        <Route path="/room" element={<MockMode />} />
      </Routes>
    </Router>
  );
}

export default App;
