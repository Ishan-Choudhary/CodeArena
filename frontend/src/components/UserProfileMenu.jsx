import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getCookie } from '../utils/api';
import { useAuthStore } from '../store/authStore';

export default function UserProfileMenu({ username }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const logoutAction = useAuthStore(state => state.logout);
  const navigate = useNavigate();

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
      await fetch(`${import.meta.env.VITE_API_URL}/api/jwt/token/blacklist/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include'
      });
    } catch (e) {
      console.error(e);
    }
    logoutAction();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const handleDeleteAccount = () => {
    navigate('/delete');
  };

  const getDisplayUsername = (name) => {
    if (!name) return 'user';
    return name.length > 6 ? name.substring(0, 6) + '...' : name;
  };

  return (
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
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-elevated flex items-center gap-2 transition-colors"
          >
            <LogOut size={14} /> Logout
          </button>
          <button 
            onClick={handleDeleteAccount}
            className="w-full text-left px-4 py-2 text-sm text-error hover:bg-bg-elevated flex items-center gap-2 transition-colors border-t border-bg-border mt-1 pt-2"
          >
            <Trash2 size={14} /> Delete Account
          </button>
        </div>
      )}
    </div>
  );
}
