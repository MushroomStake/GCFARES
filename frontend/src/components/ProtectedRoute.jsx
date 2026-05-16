import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function ProtectedRoute({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user;
      console.log('🔄 Auth state changed:', currentUser?.email);
      if (currentUser && currentUser.email === 'admin@gordoncollege.edu.ph') {
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
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
