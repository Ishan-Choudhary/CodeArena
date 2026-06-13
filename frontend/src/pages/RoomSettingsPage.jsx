import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

import { fetchWithAuth } from "../utils/api";
import toast from 'react-hot-toast';

export default function RoomSettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const username = useAuthStore(state => state.username);
  
  const problem = location.state?.problem;

  const [mode, setMode] = useState('practice');
  const [language, setLanguage] = useState('python');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (!problem) {
      navigate('/problems');
    }
  }, [isAuthenticated, problem, navigate]);

  if (!problem) return null;

  const getDifficultyStyles = (diff) => {
    switch(diff?.toLowerCase()) {
      case 'easy': return 'bg-[#0F1A14] text-success border-[#0F6E56]';
      case 'medium': return 'bg-[#1A1400] text-warning border-[#854F0B]';
      case 'hard': return 'bg-[#1A0D0D] text-error border-[#A32D2D]';
      default: return 'bg-bg-elevated text-text-secondary border-bg-border';
    }
  };

  const handleStartSession =  async () => {
    try {
      setLoading(true);
      if(mode === "mock") {
        const res = await fetchWithAuth("http://127.0.0.1:8000/api/rooms/", {
          "method": "POST",
          "body": JSON.stringify(
            {
              "testMode": mode.toUpperCase(),
              "language": language.toUpperCase(),
              "problem": problem?.id,
            }
          )
        })

        if(res.ok)  {
          const data = await res.json();
          navigate("/room", { state: {problem: problem, roomDetails: data}});
        }
      }
      else  {
      // TODO: ADD AI MODE
      }
    }
    catch (err) {
          toast.error("Failed to start room");
          console.error(err);
    }
    finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-base">
      <header className="h-16 flex justify-between items-center px-6 bg-bg-surface/80 backdrop-blur-md border-b border-bg-border sticky top-0 z-50">
        <Link to="/problems" className="font-medium text-xl text-text-primary hover:text-text-primary transition-colors cursor-pointer">
          code<span className="text-accent">arena</span>
        </Link>
        <nav className="flex gap-8 text-sm">
          <Link to="/problems" className="text-text-primary font-medium cursor-pointer">problems</Link>
          <span className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer">sessions</span>
          <span className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer">history</span>
        </nav>
        <div className="flex items-center gap-4">
          <div className="flex items-center text-sm font-medium text-accent-light cursor-pointer hover:text-accent transition-colors">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-accent-light font-bold mr-2">
              {username ? username.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-8 mt-8">
        <div className="w-full max-w-5xl flex flex-col md:flex-row gap-8">
          
          <div className="flex-1 flex flex-col">
            <div className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-4">SELECTED PROBLEM</div>
            
            <div className="bg-bg-surface border border-bg-border rounded-xl p-6 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <h2 className="text-xl font-medium text-text-primary m-0">{problem.title}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${getDifficultyStyles(problem.difficulty)}`}>
                  {problem.difficulty || 'easy'}
                </span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-6">
                {problem.description || 'Description not available.'}
              </p>
              
              <div className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-2">EXAMPLES</div>
              <div className="bg-bg-base p-4 rounded-lg font-mono text-[13px] text-text-secondary whitespace-pre-wrap border border-bg-border">
                {problem.example || 'input: ...\noutput: ...'}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-4">SESSION SETTINGS</div>
            
            <div className="bg-bg-surface border border-bg-border rounded-xl p-6">
              <div className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-3">MODE</div>
              <div className="flex gap-4 mb-8">
                <div 
                  className={`flex-1 border rounded-xl p-4 cursor-pointer transition-colors ${mode === 'practice' ? 'border-accent bg-bg-elevated' : 'border-bg-border hover:border-text-secondary'}`}
                  onClick={() => setMode('practice')}
                >
                  <div className="font-medium text-sm text-text-primary mb-1">practice mode</div>
                  <div className="text-xs text-text-secondary">solo with AI interviewer</div>
                </div>
                <div 
                  className={`flex-1 border rounded-xl p-4 cursor-pointer transition-colors ${mode === 'mock' ? 'border-accent bg-bg-elevated' : 'border-bg-border hover:border-text-secondary'}`}
                  onClick={() => setMode('mock')}
                >
                  <div className="font-medium text-sm text-text-primary mb-1">mock mode</div>
                  <div className="text-xs text-text-secondary">invite a friend</div>
                </div>
              </div>

              <div className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-3">LANGUAGE</div>
              <div className="flex gap-4 mb-8">
                {['python', 'javascript', 'java'].map((lang) => {
                  const isDisabled = lang === 'java';
                  return (
                    <div 
                      key={lang}
                      className={`flex-1 border rounded-xl p-3 text-center flex flex-col items-center justify-center transition-colors text-sm font-medium ${
                        isDisabled 
                          ? 'border-bg-border/50 text-text-muted bg-bg-base cursor-not-allowed opacity-50' 
                          : language === lang 
                            ? 'border-accent bg-bg-elevated text-text-primary cursor-pointer' 
                            : 'border-bg-border text-text-secondary hover:border-text-secondary cursor-pointer'
                      }`}
                      onClick={() => !isDisabled && setLanguage(lang)}
                    >
                      <div>{lang}</div>
                      {isDisabled && <div className="text-[10px] text-accent mt-1">coming soon</div>}
                    </div>
                  );
                })}
              </div>

              <button 
                onClick={handleStartSession}
                className="w-full py-3 bg-accent hover:bg-accent-dark text-accent-light border-none rounded-lg text-sm font-medium cursor-pointer transition-colors mt-4"
              >
                start session
              </button>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
