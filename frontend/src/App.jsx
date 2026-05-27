import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ProblemsPage from './pages/ProblemsPage';
import './index.css';

import { Toaster } from 'react-hot-toast';

function App() {
  useEffect(() => {
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
      </Routes>
    </Router>
  );
}

export default App;
