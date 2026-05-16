import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { apiRequest } from '../lib/apiClient';

export default function ProtectedRoute({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function check() {
      const token = localStorage.getItem('api_token');
      if (!token) {
        if (mounted) setLoading(false);
        return;
      }
      try {
        const res = await apiRequest('/auth/validate', { method: 'POST', body: { token } });
        const valid = res?.valid;
        const user = res?.user ?? null;
        if (mounted) {
          if (valid && user?.domain_email === 'admin@gordoncollege.edu.ph') setUser(user);
          else setUser(null);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    }
    check();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'DM Sans, sans-serif'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    console.log('❌ Not authenticated or not admin - redirecting to login');
    return <Navigate to="/login" replace />;
  }

  return children;
}
