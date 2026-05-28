import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LogOut, Play, Users, Search, Edit2 } from 'lucide-react';
import { fetchWithAuth, getCookie } from '../utils/api';
import { useAuthStore } from '../store/authStore';

export default function ProblemsPage() {
  const [problems, setProblems] = useState([]);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const username = useAuthStore(state => state.username);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const logoutAction = useAuthStore(state => state.logout);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Global unauthorized handler
    const handleUnauthorized = () => {
      toast.error('Session expired. Please log in again.');
      navigate('/login');
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [navigate]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const initData = async () => {
      // Fetch problems
      try {
        const res = await fetchWithAuth('/api/problems/');
        if (res.ok) {
          const data = await res.json();
          setProblems(data);
          if (data.length > 0) setSelectedProblem(data[0]);
        }
      } catch (err) {
        toast.error("Failed to fetch problems");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    initData();
  }, [navigate, isAuthenticated]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('http://127.0.0.1:8000/api/jwt/token/blacklist/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include'
      });
    } catch (e) {
      console.error('Logout error', e);
    }
    logoutAction();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const handleStartPractice = () => {
    if (selectedProblem) {
      navigate('/room-settings', { state: { problem: selectedProblem } });
    }
  };

  const handleChangeUsername = async (e) => {
    e.preventDefault();
    
    try {
      // const res = await fetchWithAuth('http://127.0.0.1:8000/api/auth/users/reset_username/', {
      //   method: 'POST',
      //   body: JSON.stringify({ new_username: newUsername })
      // });

      // if (res.ok) {
      //   // Update Zustand global state, which automatically syncs with localStorage
      //   useAuthStore.getState().login(newUsername);
      //   setShowModal(false);
        // setNewUsername('');
        toast.success('Username updated successfully');
      // } else {
        // const data = await res.json().catch(() => ({}));
        // const errorMsg = data.detail || (typeof data === 'object' && Object.values(data)[0]) || 'Failed to update username';
        // toast.error(`Error: ${Array.isArray(errorMsg) ? errorMsg[0] : errorMsg}`);
      // }
    } catch (err) {
      console.error(err);
      toast.error('Network error occurred');
    }
  };

  const getDifficultyStyles = (diff) => {
    switch(diff?.toLowerCase()) {
      case 'easy': return 'bg-[#0F1A14] text-success border-[#0F6E56]';
      case 'medium': return 'bg-[#1A1400] text-warning border-[#854F0B]';
      case 'hard': return 'bg-[#1A0D0D] text-error border-[#A32D2D]';
      default: return 'bg-bg-elevated text-text-secondary border-bg-border';
    }
  };

  const getDisplayUsername = (name) => {
    if (!name) return 'user';
    return name.length > 6 ? name.substring(0, 6) + '...' : name;
  };

  const filteredProblems = problems.filter(prob => {
    const matchesSearch = prob.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          prob.category?.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesDifficulty = true;
    if (difficultyFilter !== 'all') {
      const probDiff = prob.difficulty?.toLowerCase() || 'easy';
      matchesDifficulty = probDiff === difficultyFilter;
    }
    
    return matchesSearch && matchesDifficulty;
  });

  return (
    <div className="h-screen flex flex-col bg-bg-base overflow-hidden">
      <header className="h-16 flex justify-between items-center px-6 bg-bg-surface/80 backdrop-blur-md border-b border-bg-border z-50 sticky top-0">
        <Link to="/problems" className="font-medium text-xl text-text-primary hover:text-text-primary transition-colors cursor-pointer">
          code<span className="text-accent">arena</span>
        </Link>
        <nav className="flex gap-8 text-sm">
          <span className="text-text-primary font-medium cursor-pointer">problems</span>
          <span className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer">sessions</span>
          <span className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer">history</span>
        </nav>
        <div className="flex items-center gap-4 relative" ref={dropdownRef}>
          <div 
            className="flex items-center text-sm font-medium text-accent-light cursor-pointer hover:text-accent transition-colors"
            onClick={() => setShowDropdown(!showDropdown)}
            title={username}
          >
            @{getDisplayUsername(username)}
          </div>
          
          {showDropdown && (
            <div className="absolute top-8 right-0 mt-2 w-48 bg-bg-surface border border-bg-border rounded-lg shadow-xl py-1 z-50">
              <button 
                onClick={() => {
                  setShowDropdown(false);
                  setShowModal(true);
                }}
                className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-bg-elevated hover:text-text-primary flex items-center gap-2 transition-colors"
              >
                <Edit2 size={14} /> Change Username
              </button>
              <button 
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-error hover:bg-bg-elevated flex items-center gap-2 transition-colors"
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {showModal && (
        <div className="fixed inset-0 bg-bg-base/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-bg-surface border border-bg-border rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-medium text-text-primary mb-4">Change Username</h2>
            <form onSubmit={handleChangeUsername}>
              <div className="mb-4">
                <label className="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-2">New Username</label>
                <input 
                  type="text" 
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-bg-base border border-bg-border rounded-lg px-3 py-2 text-text-primary outline-none focus:border-accent"
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-accent hover:bg-accent-dark text-accent-light text-sm font-medium rounded-lg transition-colors"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main className="flex-1 flex overflow-hidden p-6 gap-6 relative">
        {/* Background ambient light */}
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="flex-1 flex flex-col bg-bg-surface/50 backdrop-blur-sm rounded-xl border border-bg-border overflow-hidden shadow-lg z-10">
          <div className="flex p-4 gap-4 border-b border-bg-border items-center">
            <div className="flex-1 flex items-center bg-bg-base border border-bg-border rounded-lg px-3 py-2 focus-within:border-accent transition-colors">
              <Search size={16} className="text-text-muted mr-2" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="search problems or categories..." 
                className="bg-transparent text-text-primary text-sm font-ui outline-none w-full placeholder-text-muted" 
              />
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setDifficultyFilter('all')}
                className={`border rounded-lg px-3 py-2 text-xs transition-colors ${difficultyFilter === 'all' ? 'bg-bg-elevated border-text-secondary text-text-primary' : 'bg-bg-base border-bg-border text-text-secondary hover:bg-bg-elevated'}`}>
                all
              </button>
              <button 
                onClick={() => setDifficultyFilter('easy')}
                className={`border rounded-lg px-3 py-2 text-xs transition-colors ${difficultyFilter === 'easy' ? 'bg-[#0F1A14] border-[#0F6E56] text-success' : 'bg-bg-base border-bg-border text-success hover:bg-bg-elevated'}`}>
                easy
              </button>
              <button 
                onClick={() => setDifficultyFilter('medium')}
                className={`border rounded-lg px-3 py-2 text-xs transition-colors ${difficultyFilter === 'medium' ? 'bg-[#1A1400] border-[#854F0B] text-warning' : 'bg-bg-base border-bg-border text-warning hover:bg-bg-elevated'}`}>
                med
              </button>
              <button 
                onClick={() => setDifficultyFilter('hard')}
                className={`border rounded-lg px-3 py-2 text-xs transition-colors ${difficultyFilter === 'hard' ? 'bg-[#1A0D0D] border-[#A32D2D] text-error' : 'bg-bg-base border-bg-border text-error hover:bg-bg-elevated'}`}>
                hard
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="p-8 text-center text-text-secondary animate-pulse">loading problems...</div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="sticky top-0 bg-bg-surface border-b border-bg-border shadow-sm z-10">
                  <tr>
                    <th className="p-4 text-[10px] font-medium text-text-muted uppercase tracking-wider w-12">#</th>
                    <th className="p-4 text-[10px] font-medium text-text-muted uppercase tracking-wider">Title</th>
                    <th className="p-4 text-[10px] font-medium text-text-muted uppercase tracking-wider w-32">Diff</th>
                    <th className="p-4 text-[10px] font-medium text-text-muted uppercase tracking-wider w-32">Category</th>
                    <th className="p-4 text-[10px] font-medium text-text-muted uppercase tracking-wider w-24">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProblems.length > 0 ? (
                    filteredProblems.map((prob, idx) => {
                      const isSelected = selectedProblem?.id === prob.id;
                      return (
                        <tr 
                          key={prob.id}
                          onClick={() => setSelectedProblem(prob)}
                          className={`group border-b border-bg-border/50 cursor-pointer transition-colors ${isSelected ? 'bg-bg-elevated' : 'hover:bg-bg-base/80'}`}
                        >
                          <td className="p-4 text-sm text-text-muted group-hover:text-text-secondary transition-colors">{idx + 1}</td>
                          <td className="p-4 text-sm font-medium text-text-primary">{prob.title}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${getDifficultyStyles(prob.difficulty)}`}>
                              {prob.difficulty || 'easy'}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-text-secondary">{prob.category || 'arrays'}</td>
                          <td className="p-4 text-sm text-text-muted">-</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-sm text-text-secondary">
                        No problems found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="w-[400px] flex flex-col bg-bg-surface/50 backdrop-blur-sm rounded-xl border border-bg-border overflow-hidden shadow-lg z-10">
          {selectedProblem ? (
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-bg-border flex justify-between items-start gap-4">
                <h2 className="text-xl font-medium text-text-primary m-0 leading-tight">
                  {selectedProblem.title}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border shrink-0 ${getDifficultyStyles(selectedProblem.difficulty)}`}>
                  {selectedProblem.difficulty || 'medium'}
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                <div className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-2 mt-0">DESCRIPTION</div>
                <p className="text-sm text-text-secondary leading-relaxed m-0 mb-8">
                  {selectedProblem.description || 'Description not available.'}
                </p>
                
                <div className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-2">EXAMPLE</div>
                <div className="bg-bg-base p-4 rounded-lg font-mono text-[13px] text-text-secondary whitespace-pre-wrap border border-bg-border mb-8">
                  {selectedProblem.example || 'input: ...\noutput: ...'}
                </div>
                
                <div className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-2">CONSTRAINTS</div>
                <p className="text-sm text-text-secondary leading-relaxed m-0">
                  {selectedProblem.constraints || 'Constraints not available.'}
                </p>
              </div>

              <div className="p-6 border-t border-bg-border flex flex-col gap-3 bg-bg-surface">
                <button 
                  onClick={handleStartPractice} 
                  className="w-full p-3 bg-accent hover:bg-accent-dark text-accent-light border-none rounded-lg text-sm font-medium cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
                >
                  <Play size={16} /> start practice
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex justify-center items-center text-text-muted">
              select a problem
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
