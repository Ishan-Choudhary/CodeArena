import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { fetchWithAuth, getCookie } from '../utils/api';

export default function LoginPage({ isRegister = false }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const url = isRegister ? '/api/auth/users/' : '/api/jwt/token/';
    const body = isRegister 
      ? { email, password, username } 
      : { email, password };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.detail) {
          throw new Error(data.detail);
        } else if (typeof data === 'object') {
          const firstErrorKey = Object.keys(data)[0];
          const firstErrorMsg = Array.isArray(data[firstErrorKey]) ? data[firstErrorKey][0] : data[firstErrorKey];
          throw new Error(`${firstErrorKey}: ${firstErrorMsg}`);
        }
        throw new Error('Authentication failed');
      }

      if (isRegister) {
        // Automatically login after register
        const loginRes = await fetch('/api/jwt/token/', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
          },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });
        if (loginRes.ok) {
          useAuthStore.getState().login(username);
          toast.success('Account created successfully!');
          navigate('/problems');
        } else {
          toast.success('Account created! Please login.');
          navigate('/login');
        }
      } else {
        // Login successful, fetch user profile to get username
        const userRes = await fetchWithAuth('/api/auth/users/me/');
        let fetchedUsername = 'user';
        if (userRes.ok) {
          const userData = await userRes.json();
          fetchedUsername = userData.username || (userData.email ? userData.email.split('@')[0] : 'user');
        }
        useAuthStore.getState().login(fetchedUsername);
        toast.success('Successfully logged in!');
        navigate('/problems');
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-bg-base relative overflow-hidden">
      {/* Background flair */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-accent/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent-dark/10 blur-[120px] rounded-full pointer-events-none"></div>

      <header className="w-full max-w-[1200px] h-16 flex items-center px-6 relative z-10">
        <Link to="/" className="font-medium text-xl text-text-primary hover:text-text-primary transition-colors cursor-pointer">
          code<span className="text-accent">arena</span>
        </Link>
      </header>

      <main className="flex-1 flex justify-center items-center w-full relative z-10">
        <div className="w-[360px] flex flex-col items-center p-8 bg-bg-surface/50 backdrop-blur-md rounded-2xl border border-bg-border shadow-2xl">
          <h1 className="text-2xl font-semibold text-text-primary mb-2">
            {isRegister ? 'create account' : 'welcome back'}
          </h1>
          <p className="text-sm text-text-secondary mb-8">
            {isRegister ? 'sign up to start practicing' : 'sign in to your account'}
          </p>

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
            {isRegister && (
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
                  Username
                </label>
                <input 
                  type="text" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full p-3 bg-bg-elevated border border-bg-border rounded-lg text-text-primary text-sm font-ui outline-none focus:border-accent transition-colors"
                  required 
                />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
                Email
              </label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full p-3 bg-bg-elevated border border-bg-border rounded-lg text-text-primary text-sm font-ui outline-none focus:border-accent transition-colors"
                placeholder="ishan@example.com"
                required 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
                Password
              </label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-3 bg-bg-elevated border border-bg-border rounded-lg text-text-primary text-sm font-ui outline-none focus:border-accent transition-colors"
                placeholder="••••••••"
                required 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full p-3 bg-accent hover:bg-accent-dark text-accent-light border-none rounded-lg text-sm font-medium cursor-pointer mt-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
            >
              {loading ? 'processing...' : (isRegister ? 'create account' : 'sign in')}
            </button>
          </form>

          <div className="mt-8 text-[13px] text-text-secondary">
            {isRegister ? (
              <span>already have an account? <Link to="/login" className="text-accent hover:text-accent-light transition-colors">sign in</Link></span>
            ) : (
              <span>don't have an account? <Link to="/register" className="text-accent hover:text-accent-light transition-colors">register</Link></span>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
