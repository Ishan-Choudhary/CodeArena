import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import JoinRoomForm from '../components/JoinRoomForm';
import SessionListTable from '../components/SessionListTable';
import { useSessions } from '../hooks/useSessions';

export default function JoinSessionPage() {
  const [activeTab, setActiveTab] = useState('join');
  const navigate = useNavigate();
  const username = useAuthStore(state => state.username);
  
  const { 
    rooms, 
    loadingRooms, 
    fetchRooms, 
    handleDeleteRoom, 
    handleRejoinRoom, 
    handleReplay, 
    fetchProblemDetails 
  } = useSessions();

  useEffect(() => {
    if (activeTab === 'sessions') {
      fetchRooms();
    }
  }, [activeTab, fetchRooms]);

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
            <JoinRoomForm fetchProblemDetails={fetchProblemDetails} />
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="animate-in fade-in">
            <h2 className="text-text-primary font-medium text-lg mb-4">Active Sessions</h2>
            <SessionListTable 
              rooms={rooms}
              loadingRooms={loadingRooms}
              username={username}
              handleRejoinRoom={handleRejoinRoom}
              handleReplay={handleReplay}
              handleDeleteRoom={handleDeleteRoom}
            />
          </div>
        )}
      </div>
    </div>
  );
}
