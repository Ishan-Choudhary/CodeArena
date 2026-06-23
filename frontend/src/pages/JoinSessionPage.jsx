import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchWithAuth } from '../utils/api';
import { ArrowLeft, Users, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function JoinSessionPage() {
  const [activeTab, setActiveTab] = useState('join');
  const [code, setCode] = useState('');
  const [roomDetails, setRoomDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  
  // Sessions state
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const username = useAuthStore(state => state.username);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoomForReplay, setSelectedRoomForReplay] = useState(null);

  const navigate = useNavigate();

  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      const res = await fetchWithAuth('http://127.0.0.1:8000/api/rooms/');
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      } else {
        toast.error('Failed to fetch rooms');
      }
    } catch (err) {
      toast.error('Network error fetching rooms');
      console.error(err);
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'sessions') {
      fetchRooms();
    }
  }, [activeTab]);

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

  const handleDeleteRoom = async (roomCode) => {
    try {
      const res = await fetchWithAuth(`http://127.0.0.1:8000/api/rooms/${roomCode}/`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Room deleted successfully');
        fetchRooms();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.detail || 'Failed to delete room');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error deleting room');
    }
  };

  const handleRejoinRoom = async (roomCode) => {
    try {
      const roomRes = await fetchWithAuth(`http://127.0.0.1:8000/api/rooms/${roomCode}/`);
      if (roomRes.ok) {
        const rDetails = await roomRes.json();
        const probRes = await fetchWithAuth(`http://127.0.0.1:8000/api/problems/${rDetails.problem}/`);
        if (probRes.ok) {
          const problemDetails = await probRes.json();
          if (rDetails.testMode === "MOCK") {
            navigate("/room", { state: { problem: problemDetails, roomDetails: rDetails }});
          } else {
            navigate("/practice", { state: { problem: problemDetails, roomDetails: rDetails }});
          }
        } else {
          toast.error('Failed to fetch problem details');
        }
      } else {
        toast.error('Failed to fetch room details');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error joining room');
    }
  };

  const handleOpenReplayModal = (roomCode) => {
    setSelectedRoomForReplay(roomCode);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base p-6">
      <div className={`w-full ${activeTab === 'sessions' ? 'max-w-4xl' : 'max-w-md'} bg-bg-surface/50 backdrop-blur-sm border border-bg-border rounded-xl shadow-2xl p-8 relative transition-all duration-300`}>
        <div className="flex justify-between items-center mb-8 border-b border-bg-border pb-4">
          <button 
            onClick={() => navigate('/problems')} 
            className="text-text-muted hover:text-text-primary transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={20} /> <span className="text-sm font-medium">Back</span>
          </button>

          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('join')}
              className={`text-sm font-medium transition-colors ${activeTab === 'join' ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Join via Code
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`text-sm font-medium transition-colors ${activeTab === 'sessions' ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}
            >
              My Sessions
            </button>
          </div>
        </div>

        {activeTab === 'join' && (
          <div className="animate-in fade-in">
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
        )}

        {activeTab === 'sessions' && (
          <div className="animate-in fade-in">
            <h2 className="text-text-primary font-medium text-lg mb-4">Active Sessions</h2>
            <div className="overflow-auto bg-bg-base rounded-lg border border-bg-border max-h-[500px]">
              {loadingRooms ? (
                <div className="p-8 text-center text-text-secondary animate-pulse">loading sessions...</div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="sticky top-0 bg-bg-surface border-b border-bg-border shadow-sm z-10">
                    <tr>
                      <th className="p-4 text-[10px] font-medium text-text-muted uppercase tracking-wider">Room Code</th>
                      <th className="p-4 text-[10px] font-medium text-text-muted uppercase tracking-wider">Host</th>
                      <th className="p-4 text-[10px] font-medium text-text-muted uppercase tracking-wider">Language</th>
                      <th className="p-4 text-[10px] font-medium text-text-muted uppercase tracking-wider">Mode</th>
                      <th className="p-4 text-[10px] font-medium text-text-muted uppercase tracking-wider">Status</th>
                      <th className="p-4 text-[10px] font-medium text-text-muted uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.length > 0 ? (
                      rooms.map((room, idx) => (
                        <tr key={room.code} className="group border-b border-bg-border/50 transition-colors hover:bg-bg-surface/50">
                          <td className="p-4 text-sm font-medium text-text-primary">{room.code}</td>
                          <td className="p-4 text-sm text-text-secondary">{room.host}</td>
                          <td className="p-4 text-sm text-text-secondary">{room.language}</td>
                          <td className="p-4 text-sm text-text-secondary">{room.testMode}</td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium border bg-[#1A1400] text-warning border-[#854F0B]">
                              {room.status}
                            </span>
                          </td>
                          <td className="p-4 flex gap-2 justify-end">
                            {(room.status === 'ACTIVE' || room.status === 'WAITING') && (room.host === username || room.participant === username) && (
                              <button 
                                onClick={() => handleRejoinRoom(room.code)}
                                className="text-xs bg-accent/20 text-accent hover:bg-accent/30 transition-colors px-3 py-1 rounded cursor-pointer"
                              >
                                Join
                              </button>
                            )}
                            <button 
                              onClick={() => handleOpenReplayModal(room.code)}
                              className="text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors px-3 py-1 rounded cursor-pointer"
                            >
                              Replay
                            </button>
                            {room.host === username && (
                              <button 
                                onClick={() => handleDeleteRoom(room.code)}
                                className="text-xs bg-error/20 text-error hover:bg-error/30 transition-colors px-3 py-1 rounded cursor-pointer"
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-sm text-text-secondary">
                          No sessions found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Replay Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/80 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="relative bg-bg-surface border border-bg-border shadow-2xl rounded-xl w-[800px] h-[600px] max-w-[90vw] max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b border-bg-border">
              <h2 className="text-lg font-medium text-text-primary">
                Replay Session: {selectedRoomForReplay}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-full hover:bg-bg-elevated"
              >
                <X size={20} />
              </button>
            </div>
            {/* Modal Content - Left empty for user */}
            <div className="flex-1 p-4 overflow-auto">
              {/* Content will go here */}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
