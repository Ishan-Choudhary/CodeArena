import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Play, Users } from 'lucide-react';
import { fetchWithAuth } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import ProblemDescription from "../components/ProblemDescription";
import ProblemTable from "../components/ProblemTable";
import FilterBar from "../components/FilterBar";
import UserProfileMenu from "../components/UserProfileMenu";

export default function ProblemsPage() {
  const [problems, setProblems] = useState([]);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const username = useAuthStore(state => state.username);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const navigate = useNavigate();

  useEffect(() => {
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
      try {
        const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/api/problems/`);
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

  const handleStartPractice = () => {
    if (selectedProblem) {
      navigate('/room-settings', { state: { problem: selectedProblem } });
    }
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
          <span className="font-medium cursor-default text-text-primary">
            problems
          </span>
        </nav>
        <UserProfileMenu username={username} />
      </header>

      <main className="flex-1 flex overflow-hidden p-6 gap-6 relative">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-[100px] pointer-events-none"></div>

        <>
          <div className="flex-1 flex flex-col bg-bg-surface/50 backdrop-blur-sm rounded-xl border border-bg-border overflow-hidden shadow-lg z-10">
              <FilterBar 
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                difficultyFilter={difficultyFilter}
                setDifficultyFilter={setDifficultyFilter}
              />
              
              <ProblemTable 
                filteredProblems={filteredProblems}
                loading={loading}
                selectedProblem={selectedProblem}
                setSelectedProblem={setSelectedProblem}
              />
            </div>

            <div className="w-[400px] flex flex-col bg-bg-surface/50 backdrop-blur-sm rounded-xl border border-bg-border overflow-hidden shadow-lg z-10">
              {selectedProblem ? (<ProblemDescription problem={selectedProblem} />) : (
                <div className="flex-1 flex justify-center items-center text-text-muted">
                  select a problem
                </div>
              )}
              <div className="p-6 border-t border-bg-border flex flex-col gap-3 bg-bg-surface">
                    <button 
                      onClick={handleStartPractice} 
                      className="w-full p-3 bg-accent hover:bg-accent-dark text-accent-light border-none rounded-lg text-sm font-medium cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
                    >
                      <Play size={16} /> start practice
                    </button>
                    <button 
                      onClick={() => navigate('/join-session')} 
                      className="w-full p-3 bg-bg-elevated hover:bg-bg-border text-text-primary border border-bg-border rounded-lg text-sm font-medium cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <Users size={16} /> Manage sessions
                    </button>
              </div>
            </div>
          </>
      </main>
    </div>
  );
}
