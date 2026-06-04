import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/apiClient';

export default function LoginRedirect({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
        const user = res?.user;
        if (mounted) {
          if (user?.domain_email === 'admin@gordoncollege.edu.ph') {
            console.log('✅ Admin already logged in - redirecting to dashboard');
            navigate('/dashboard');
          } else {
            setUser(null);
          }
          setLoading(false);
        }
      } catch (err) {
        if (mounted) setLoading(false);
      }
    }
    check();
    return () => { mounted = false; };
  }, [navigate]);

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

  return children;
}
