import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Code, Server, PlayCircle, Sparkles } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function LandingPage() {
  const navigate = useNavigate();

  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/problems');
    }
  }, [navigate, isAuthenticated]);

  return (
    <div className="min-h-screen flex flex-col items-center bg-bg-base relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] bg-accent/10 blur-[150px] rounded-full pointer-events-none"></div>

      <header className="w-full max-w-[1200px] h-16 flex justify-between items-center px-6 border-b border-bg-border/50 bg-bg-base/50 backdrop-blur-md z-10 sticky top-0">
        <Link to="/" className="font-medium text-xl text-text-primary hover:text-text-primary transition-colors cursor-pointer">
          code<span className="text-accent">arena</span>
        </Link>
        <div className="flex gap-4 items-center">
          <Link to="/login" className="text-sm text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-md border border-transparent hover:border-bg-border transition-all">
            log in
          </Link>
          <Link to="/register" className="text-sm font-medium bg-accent hover:bg-accent-dark text-accent-light px-4 py-1.5 rounded-md transition-all hover:scale-[1.02]">
            get started
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-[900px] py-24 px-6 relative z-10">
        <div className="flex flex-col items-center text-center mb-24 relative">
          <div className="absolute -top-12 animate-bounce">
            <Sparkles className="text-accent w-6 h-6 opacity-80" />
          </div>
          <div className="text-[11px] font-medium text-accent bg-bg-elevated/80 backdrop-blur-sm border border-accent/30 px-3 py-1 rounded-full mb-8 shadow-[0_0_15px_rgba(127,119,221,0.2)]">
            ai-powered interview practice
          </div>
          <h1 className="text-5xl md:text-6xl font-medium leading-tight m-0 mb-6 text-text-primary tracking-tight">
            practice coding interviews.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent-light">get hired faster.</span>
          </h1>
          <p className="text-lg text-text-secondary leading-relaxed m-0 mb-12 max-w-[600px]">
            solo practice with an AI interviewer that watches your code live —<br/>
            or invite a friend for a mock session.
          </p>
          <div className="flex gap-4">
            <Link to="/register" className="text-base font-medium bg-accent hover:bg-accent-dark text-accent-light px-6 py-3 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-accent/25">
              start practicing free
            </Link>
            <Link to="/problems" className="text-base font-medium text-text-secondary hover:text-text-primary border border-bg-border hover:bg-bg-elevated px-6 py-3 rounded-lg transition-all active:scale-[0.98]">
              view problems
            </Link>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 w-full">
          <div className="flex-1 bg-bg-surface/50 backdrop-blur-sm border border-bg-border rounded-xl p-6 hover:bg-bg-surface hover:-translate-y-1 transition-all group">
            <div className="w-10 h-10 rounded-lg bg-bg-elevated border border-bg-border flex items-center justify-center mb-4 group-hover:border-accent/50 transition-colors">
              <Code className="text-accent w-5 h-5" />
            </div>
            <h3 className="text-sm font-medium text-text-primary m-0 mb-2 group-hover:text-accent transition-colors">ai interviewer</h3>
            <p className="text-sm text-text-secondary m-0 leading-relaxed">watches your code live, asks follow-up questions tailored to your solution</p>
          </div>
          <div className="flex-1 bg-bg-surface/50 backdrop-blur-sm border border-bg-border rounded-xl p-6 hover:bg-bg-surface hover:-translate-y-1 transition-all group">
            <div className="w-10 h-10 rounded-lg bg-bg-elevated border border-bg-border flex items-center justify-center mb-4 group-hover:border-warning/50 transition-colors">
              <Server className="text-warning w-5 h-5" />
            </div>
            <h3 className="text-sm font-medium text-text-primary m-0 mb-2 group-hover:text-warning transition-colors">real execution</h3>
            <p className="text-sm text-text-secondary m-0 leading-relaxed">code runs in isolated docker containers providing real-time feedback and results</p>
          </div>
          <div className="flex-1 bg-bg-surface/50 backdrop-blur-sm border border-bg-border rounded-xl p-6 hover:bg-bg-surface hover:-translate-y-1 transition-all group">
            <div className="w-10 h-10 rounded-lg bg-bg-elevated border border-bg-border flex items-center justify-center mb-4 group-hover:border-success/50 transition-colors">
              <PlayCircle className="text-success w-5 h-5" />
            </div>
            <h3 className="text-sm font-medium text-text-primary m-0 mb-2 group-hover:text-success transition-colors">session replay</h3>
            <p className="text-sm text-text-secondary m-0 leading-relaxed">review your full problem-solving approach and identify areas for improvement</p>
          </div>
        </div>
      </main>
    </div>
  );
}
