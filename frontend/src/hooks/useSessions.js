import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { fetchWithAuth } from '../utils/api';
import { useNavigate } from 'react-router-dom';

export function useSessions() {
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const navigate = useNavigate();

  const fetchRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/api/rooms/`);
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
  }, []);

  const fetchProblemDetails = async (problemId) => {
    if (!problemId) return null;
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/api/problems/${problemId}/`);
      if (res.ok) {
        return await res.json();
      }
      toast.error('Failed to fetch problem details');
      return null;
    } catch (err) {
      console.error(err);
      toast.error('Network error fetching problem details');
      return null;
    }
  };

  const handleDeleteRoom = async (roomCode) => {
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/api/rooms/${roomCode}/`, { method: 'DELETE' });
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
      const roomRes = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/api/rooms/${roomCode}/`);
      if (roomRes.ok) {
        const rDetails = await roomRes.json();
        const problemDetails = await fetchProblemDetails(rDetails.problem);
        if (problemDetails) {
          if (rDetails.testMode === "MOCK") {
            navigate("/room", { state: { problem: problemDetails, roomDetails: rDetails }});
          } else {
            navigate("/practice", { state: { problem: problemDetails, roomDetails: rDetails }});
          }
        }
      } else {
        toast.error('Failed to fetch room details');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error joining room');
    }
  };

  const calculatePlaybackBounds = (data) => {
    const {timeline = [], submissions = [], chats = []} = data;
    const endTimesList = [];
    const startTimesList = [];
    
    if(timeline.length > 0)   {
      endTimesList.push(timeline[timeline.length - 1].time);
      startTimesList.push(timeline[0].time);
    }
    if(submissions.length > 0)  {
      const lastSub = submissions[submissions.length - 1].submitted_at;
      endTimesList.push(new Date(lastSub).getTime());
      startTimesList.push(new Date(submissions[0].submitted_at).getTime());
    }
    if(chats.length > 0)  {
      const lastChat = chats[chats.length - 1].timestamp;
      endTimesList.push(new Date(lastChat).getTime());
      startTimesList.push(new Date(chats[0].timestamp).getTime());
    }
    if(endTimesList.length === 0 || startTimesList.length === 0)  {
      return {startTime: 0, endTime: 0, durationMs: 0};
    }
    
    const startTime = Math.min(...startTimesList);
    const endTime = Math.max(...endTimesList);
    const durationMs = endTime - startTime;
    return {startTime, endTime, durationMs};
  };

  const handleReplay = async (roomCode) => {    
    try {
      const roomRes = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/api/rooms/${roomCode}/`);
      if (!roomRes.ok) {
        toast.error('Failed to fetch room details for replay');
        return;
      }
      const rDetails = await roomRes.json();
      
      const problemDetails = await fetchProblemDetails(rDetails.problem);
      if (!problemDetails) return;

      const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/api/rooms/${roomCode}/replay/`);
      const data = await res.json();
      const replayData = typeof data === 'string' ? JSON.parse(data) : data;

      const playbackBounds = calculatePlaybackBounds(replayData);
    
      navigate("/replay", {
        state:  {
          roomDetails: rDetails,
          problem: problemDetails,
          replayData,
          playbackBounds
        }
      });
    } catch(err) {
      console.error(err);
      toast.error('Failed to load replay data');
    }
  };

  return { rooms, loadingRooms, fetchRooms, handleDeleteRoom, handleRejoinRoom, handleReplay, fetchProblemDetails };
}
