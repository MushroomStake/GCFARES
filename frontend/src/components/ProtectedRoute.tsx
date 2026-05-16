import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isFirstLogin, setIsFirstLogin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    const checkSession = async (user: any) => {
      if (user) {
        if (isMounted) setIsAuthenticated(true);
        
        try {
          // Fetch the user's record from the database
          const { data, error } = await supabase
  .from('users')
  .select('is_first_login')
  .eq('domain_email', user.email) // <-- Change this line to use email
  .single();

          if (error) {
            console.error("Error fetching user data:", error);
          }

          if (isMounted) {
            setIsFirstLogin(data?.is_first_login === true);
          }
        } catch (error) {
          console.error("Error checking user status:", error);
        }
      } else {
        if (isMounted) {
          setIsAuthenticated(false);
          setIsFirstLogin(false);
        }
      }
      
      if (isMounted) setLoading(false);
    };

    // 1. Check initial session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkSession(session?.user ?? null);
    });

    // 2. Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkSession(session?.user ?? null);
    });

    // Cleanup subscription on unmount
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if it's their first login. 
  // We check location.pathname to prevent an infinite loop if they are already there.
  if (isFirstLogin && location.pathname !== '/set-password') {
    return <Navigate to="/set-password" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;