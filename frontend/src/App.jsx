import { useEffect } from 'react';
import { fetchCsrfToken } from './utils/api';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ProblemsPage from './pages/ProblemsPage';
import RoomSettingsPage from './pages/RoomSettingsPage';
import MockMode from './pages/MockMode';
import JoinSessionPage from './pages/JoinSessionPage';
import ReplayPage from "./pages/ReplayPage";
import DeleteAccountPage from "./pages/DeleteAccountPage";
import './index.css';

import { Toaster } from 'react-hot-toast';
import PracticeMode from './pages/PracticeMode';

function App() {
  useEffect(() => {
    // Fetch the CSRF token from the backend
    fetchCsrfToken();
    
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
        <Route path="/practice" element={<PracticeMode />} />
        <Route path="/join-session" element={<JoinSessionPage />} />
        <Route path="/replay" element={<ReplayPage />} />
        <Route path="/delete" element={<DeleteAccountPage />} />
      </Routes>
    </Router>
  );
}

export default App;
