import { createContext, useState, useEffect } from 'react';
import api from '../lib/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data.user);
    return data;
  };

  const register = async (userData) => {
    const { data } = await api.post('/auth/register', userData);
    setUser(data.user);
    return data;
  };

  const updateUser = (updatedUser) => setUser(updatedUser);

  const logout = async () => {
    try {
      await api.get('/auth/logout');
    } catch (error) {
      console.error('Logout failed on backend:', error);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, checkAuth, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
