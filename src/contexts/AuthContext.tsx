import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState, WatchProgress } from '../types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, username: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (user: User) => void;
  updateWatchProgress: (seriesId: string, episodeId: string, progress: number, duration: number) => void;
  getWatchProgress: (seriesId: string, episodeId: string) => WatchProgress | null;
  getResumePrompt: (seriesId: string, episodeId: string) => { shouldPrompt: boolean; progress: WatchProgress | null };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    // Check for stored user data on app load
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error) {
        localStorage.removeItem('user');
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if admin login
      const isAdmin = email === 'admin@animestream.com';
      
      // Mock user data
      const user: User = {
        id: isAdmin ? 'admin-1' : '1',
        email,
        username: isAdmin ? 'Admin' : email.split('@')[0],
        avatar: `https://images.pexels.com/photos/1000000/pexels-photo-1000000.jpeg?auto=compress&cs=tinysrgb&w=100`,
        isVip: isAdmin ? true : false,
        isAdmin: isAdmin,
        createdAt: new Date().toISOString(),
        watchHistory: []
      };

      localStorage.setItem('user', JSON.stringify(user));
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      return true;
    } catch (error) {
      return false;
    }
  };

  const register = async (email: string, username: string, password: string): Promise<boolean> => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const user: User = {
        id: Date.now().toString(),
        email,
        username,
        avatar: `https://images.pexels.com/photos/1000000/pexels-photo-1000000.jpeg?auto=compress&cs=tinysrgb&w=100`,
        isVip: false,
        isAdmin: false,
        createdAt: new Date().toISOString(),
        watchHistory: []
      };

      localStorage.setItem('user', JSON.stringify(user));
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      return true;
    } catch (error) {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const updateUser = (user: User) => {
    localStorage.setItem('user', JSON.stringify(user));
    setAuthState(prev => ({
      ...prev,
      user,
    }));
  };

  const updateWatchProgress = (seriesId: string, episodeId: string, progress: number, duration: number) => {
    if (!authState.user) return;

    const percentage = duration > 0 ? Math.min((progress / duration) * 100, 100) : 0;
    const completed = percentage >= 90; // Consider 90%+ as completed

    const newProgress: WatchProgress = {
      seriesId,
      episodeId,
      progress,
      duration,
      percentage,
      lastWatchedAt: new Date().toISOString(),
      completed
    };

    const updatedUser = { ...authState.user };
    if (!updatedUser.watchHistory) {
      updatedUser.watchHistory = [];
    }

    // Remove existing progress for this episode
    updatedUser.watchHistory = updatedUser.watchHistory.filter(
      wp => !(wp.seriesId === seriesId && wp.episodeId === episodeId)
    );

    // Add new progress
    updatedUser.watchHistory.push(newProgress);

    // Keep only last 100 watch progress entries
    updatedUser.watchHistory = updatedUser.watchHistory
      .sort((a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime())
      .slice(0, 100);

    updateUser(updatedUser);
  };

  const getWatchProgress = (seriesId: string, episodeId: string): WatchProgress | null => {
    if (!authState.user?.watchHistory) return null;

    return authState.user.watchHistory.find(
      wp => wp.seriesId === seriesId && wp.episodeId === episodeId
    ) || null;
  };

  const getResumePrompt = (seriesId: string, episodeId: string) => {
    const progress = getWatchProgress(seriesId, episodeId);
    
    // Show resume prompt if:
    // 1. User has watched at least 2 minutes (120 seconds)
    // 2. User hasn't completed the episode (< 90%)
    // 3. Last watched within 30 days
    if (progress && progress.progress >= 120 && progress.percentage < 90) {
      const daysSinceLastWatch = (Date.now() - new Date(progress.lastWatchedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastWatch <= 30) {
        return { shouldPrompt: true, progress };
      }
    }

    return { shouldPrompt: false, progress: null };
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        register,
        logout,
        updateUser,
        updateWatchProgress,
        getWatchProgress,
        getResumePrompt,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};