import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchWithAuth } from '../utils/api';
import { ArrowLeft, Users } from 'lucide-react';

export default function JoinSessionPage() {
  const [code, setCode] = useState('');
  const [roomDetails, setRoomDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();

  const handleSearchRoom = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    
    setLoading(true);
    setRoomDetails(null);
    try {
      const res = await fetchWithAuth(`http://127.0.0.1:8000/api/rooms/${code}/`);
      if (res.ok) {
        const data = await res.json();
        setRoomDetails(data);
        toast.success('Room found');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || 'Room not found');
      }
    } catch (err) {
      toast.error('Failed to fetch room details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomDetails) return;
    
    setJoining(true);
    try {
      const res = await fetchWithAuth(`http://127.0.0.1:8000/api/rooms/${code}/join/`, {
        method: 'POST'
      });
      
      if (res.ok) {
        const joinData = await res.json();
        const problemId = joinData.problem || roomDetails.problem;
        
        if (problemId) {
          const probRes = await fetchWithAuth(`http://127.0.0.1:8000/api/problems/${problemId}/`);
          if (probRes.ok) {
            const problemDetails = await probRes.json();
            console.log(problemDetails);
            console.log(roomDetails);
            navigate('/room', { 
              state: { 
                problem: problemDetails,
                roomDetails: roomDetails,
              } 
            });
            toast.success('Joined room successfully');
          } else {
            toast.error('Failed to fetch problem details');
          }
        } else {
          toast.error('No problem associated with this room');
        }
      } else {
        const err = await res.json()
        toast.error(err.message || 'Room not found');
      }
    } catch (err) {
      toast.error('Error joining room');
      console.error(err);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base p-6">
      <div className="w-full max-w-md bg-bg-surface/50 backdrop-blur-sm border border-bg-border rounded-xl shadow-2xl p-8 relative">
        <button 
          onClick={() => navigate('/problems')} 
          className="absolute top-6 left-6 text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className="flex flex-col items-center mb-8 pt-4">
          <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mb-4">
            <Users className="text-accent" size={24} />
          </div>
          <h1 className="text-2xl font-medium text-text-primary">Join Mock Session</h1>
          <p className="text-sm text-text-secondary mt-2 text-center">
            Enter a room code to join an existing session
          </p>
        </div>

        <form onSubmit={handleSearchRoom} className="space-y-4">
          <div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Room Code (e.g., ABCD-1234)"
              className="w-full bg-bg-base border border-bg-border rounded-lg px-4 py-3 text-text-primary outline-none focus:border-accent font-mono text-center placeholder:font-ui"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full p-3 bg-bg-elevated hover:bg-bg-border text-text-primary border border-bg-border rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : 'Find Room'}
          </button>
        </form>

        {roomDetails && (
          <div className="mt-8 pt-6 border-t border-bg-border animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-sm font-medium text-text-primary mb-4">Room Details</h3>
            <div className="space-y-3 mb-6 bg-bg-base rounded-lg p-4 border border-bg-border/50">
              <div className="flex justify-between">
                <span className="text-text-muted text-sm">Room Code</span>
                <span className="text-text-primary text-sm font-medium font-mono">{roomDetails.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted text-sm">Host</span>
                <span className="text-text-primary text-sm font-medium">
                  {roomDetails.host_details?.username || roomDetails.host || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted text-sm">Status</span>
                <span className="text-accent text-sm font-medium capitalize">{roomDetails.status || 'waiting'}</span>
              </div>
            </div>
            
            <button
              onClick={handleJoinRoom}
              disabled={joining}
              className="w-full p-3 bg-accent hover:bg-accent-dark text-accent-light border-none rounded-lg text-sm font-medium transition-all flex justify-center items-center gap-2 shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {joining ? 'Joining...' : 'Join Room'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
