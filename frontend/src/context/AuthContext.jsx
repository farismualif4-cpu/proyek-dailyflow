import { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { AuthContext } from './authContextDef';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('dailyflow_token'));
  const [loading, setLoading] = useState(true);

  // Periksa status login saat inisialisasi aplikasi
  useEffect(() => {
    let isMounted = true;
    const verifyUser = async () => {
      const storedToken = localStorage.getItem('dailyflow_token');
      if (!storedToken) {
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const response = await authAPI.getMe();
        if (isMounted && response.data.success) {
          setUser(response.data.user);
          localStorage.setItem('dailyflow_user', JSON.stringify(response.data.user));
        }
      } catch (err) {
        console.warn('Session verification failed:', err.message);
        localStorage.removeItem('dailyflow_token');
        localStorage.removeItem('dailyflow_user');
        if (isMounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    verifyUser();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    if (response.data.success) {
      const { user: userData, token: userToken } = response.data;
      setToken(userToken);
      setUser(userData);
      localStorage.setItem('dailyflow_token', userToken);
      localStorage.setItem('dailyflow_user', JSON.stringify(userData));
    }
    return response.data;
  };

  const register = async (name, email, password) => {
    const response = await authAPI.register({ name, email, password });
    if (response.data.success) {
      const { user: userData, token: userToken } = response.data;
      setToken(userToken);
      setUser(userData);
      localStorage.setItem('dailyflow_token', userToken);
      localStorage.setItem('dailyflow_user', JSON.stringify(userData));
    }
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('dailyflow_token');
    localStorage.removeItem('dailyflow_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
