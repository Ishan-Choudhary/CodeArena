import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { getCookie } from '../utils/api';

export default function DeleteAccountPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const logoutAction = useAuthStore(state => state.logout);
  const username = useAuthStore(state => state.username);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      toast.error('Please enter your password to confirm deletion.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/users/${username}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include',
        body: JSON.stringify({ current_password: password })
      });

      if (res.ok || res.status === 204) {
        logoutAction();
        toast.success('Account deleted successfully');
        navigate('/');
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.current_password) {
           toast.error(data.current_password[0] || 'Invalid password');
        } else {
           toast.error(data.detail || 'Failed to delete account');
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-bg-base relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-error/10 blur-[120px] rounded-full pointer-events-none"></div>
      
      <header className="w-full max-w-[1200px] h-16 flex items-center px-6 relative z-10">
        <Link to="/problems" className="font-medium text-xl text-text-primary hover:text-text-primary transition-colors cursor-pointer">
          code<span className="text-accent">arena</span>
        </Link>
      </header>

      <main className="flex-1 flex justify-center items-center w-full relative z-10">
        <div className="w-[360px] flex flex-col items-center p-8 bg-bg-surface/50 backdrop-blur-md rounded-2xl border border-error/50 shadow-2xl">
          <h1 className="text-2xl font-semibold text-error mb-2">delete account</h1>
          <p className="text-sm text-text-secondary mb-8 text-center">
            this action cannot be undone. please enter your password to confirm.
          </p>

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-medium text-error uppercase tracking-wider">
                Current Password
              </label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-3 bg-bg-elevated border border-error/30 rounded-lg text-text-primary text-sm font-ui outline-none focus:border-error transition-colors"
                placeholder="••••••••"
                required 
              />
            </div>

            <div className="flex gap-4 mt-2">
              <button 
                type="button" 
                onClick={() => navigate('/problems')}
                className="flex-1 p-3 bg-bg-elevated hover:bg-bg-border text-text-primary border-none rounded-lg text-sm font-medium cursor-pointer transition-all"
              >
                cancel
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="flex-1 p-3 bg-error hover:bg-error/80 text-white border-none rounded-lg text-sm font-medium cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
              >
                {loading ? 'processing...' : 'delete'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
