import React, { useState, useEffect } from 'react';
import { User, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient'; 

const SetPasswordPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [userData, setUserData] = useState({ name: '', email: '' });
  const [tempPassword, setTempPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Fetch current user details on load
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          navigate('/login'); 
          return;
        }

        const { data, error: dbError } = await supabase
  .from('users')
  .select('*')
  .eq('domain_email', user.email) // <-- Works perfectly!
  .single();

        if (!dbError && data) {
          setUserData({
            name: `${data.name_first || ''} ${data.name_last || ''}`.trim() || 'User', // Updated to match your schema's exact column names
            email: user.email || ''
          });
        }
      } catch (err) {
        console.error("Error fetching user data", err);
      } finally {
        setPageLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) throw new Error('No user found');

      // 1. Verify temporary password (Reauthenticate)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: tempPassword,
      });

      if (signInError) {
        throw new Error('auth/invalid-credential');
      }

      // 2. Update to new password
      const { error: updateAuthError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateAuthError) throw updateAuthError;

      // 3. Update 'is_first_login' status in the users table
     const { error: dbError } = await supabase
  .from('users')
  .update({ is_first_login: false })
  .eq('domain_email', user.email);

      if (dbError) throw dbError;

      // Redirect to dashboard on success
      navigate('/dashboard');

    } catch (err: any) {
      console.error(err);
      if (err.message === 'auth/invalid-credential' || err.message.includes('Invalid login')) {
        setError('Incorrect temporary password.');
      } else {
        setError('Failed to update password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="mb-6 flex flex-col items-center text-center">
        <img src="/assets/gc-logo.png" alt="Gordon College Logo" className="w-16 h-16 mb-4" />
        <h2 className="text-base font-bold text-sidebar tracking-tight">GORDON COLLEGE</h2>
        <p className="text-[9px] uppercase tracking-[0.2em] text-sidebar/60 font-bold mb-4">VPAA RANKING PORTAL</p>
        
        <div className="inline-flex items-center gap-2 bg-accent/10 text-accent-dark px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-6 border border-accent/20">
          First Login — Action Required
        </div>

        <h3 className="text-2xl font-bold text-slate-800 mb-2">Set New Password</h3>
        <p className="text-slate-500 text-sm max-w-[280px]">Replace your temporary password to activate your account.</p>
      </div>

      {/* User Info Card */}
      <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-4 mb-8">
        <div className="bg-primary/10 p-2.5 rounded-full">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">{userData.name || 'Loading...'}</p>
          <p className="text-xs text-slate-500">{userData.email || 'Loading...'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="w-full space-y-5">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-bold flex items-center gap-2 border border-red-100">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 px-1">Temporary Password</label>
          <input 
            type="password" 
            placeholder="Enter your temporary password"
            className="input-field"
            value={tempPassword}
            onChange={(e) => setTempPassword(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 px-1">New Password</label>
          <input 
            type="password" 
            placeholder="Create a strong password"
            className="input-field"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 px-1">Confirm New Password</label>
          <input 
            type="password" 
            placeholder="Re-enter your new password"
            className="input-field"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="btn-primary w-full shadow-lg shadow-primary/20 mt-4 flex justify-center items-center gap-2 disabled:opacity-50"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          Update Password
        </button>
      </form>

      <div className="mt-8 text-[10px] text-slate-400 font-medium">
        © 2026 Gordon College. All rights reserved.
      </div>
    </div>
  );
};

export default SetPasswordPage;