import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      username: '',
      isAuthenticated: false,
      login: (username) => set({ username, isAuthenticated: true }),
      logout: () => set({ username: '', isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
