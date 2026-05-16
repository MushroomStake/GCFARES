import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function LoginRedirect({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user;
      if (currentUser && currentUser.email === 'admin@gordoncollege.edu.ph') {
        console.log('✅ Admin already logged in - redirecting to dashboard');
        navigate('/dashboard');
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
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
