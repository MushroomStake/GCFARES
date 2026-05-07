import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  History, 
  LogOut, 
  Bell, 
  Calendar,
  ChevronRight,
  AlertCircle,
  Check,
  Menu,
  X
} from 'lucide-react';
import { supabase } from '../supabaseClient'; 

// Define the notification type based on your Supabase table
interface AppNotification {
  id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // User Profile States
  const [userName, setUserName] = useState("Loading...");
  const [userInitials, setUserInitials] = useState("");

  // Notification States
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Fetch Logged-in User Profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData?.user) return;

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('name_first, name_last')
          .eq('domain_email', authData.user.email) 
          .single();

        if (userError) throw userError;

        if (userData) {
          const first = userData.name_first || '';
          const last = userData.name_last || '';
          setUserName(`Dr. ${first} ${last}`.trim());
          setUserInitials(`${first.charAt(0)}${last.charAt(0)}`.toUpperCase());
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setUserName("VPAA User");
        setUserInitials("VP");
      }
    };

    fetchUserProfile();
  }, []);

  // Fetch and subscribe to notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setNotifications(data);
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications((prev) => [payload.new as AppNotification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);
    }
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard': return 'Dashboard';
      case '/faculty-review': return 'Faculty Review';
      case '/history': return 'History';
      default: return 'Portal';
    }
  };

  const handleConfirmLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const getCurrentDate = () => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return new Date().toLocaleDateString('en-US', options);
  };

  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <Users size={20} />, label: 'Faculty Review', path: '/faculty-review' },
    { icon: <History size={20} />, label: 'History', path: '/history' },
  ];

  return (
    <div className="flex h-screen bg-[#f3f4f6] overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-white flex flex-col shrink-0
        transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 md:p-8 flex flex-col items-center border-b border-white/10 relative">
          {/* Close Menu Button (Mobile Only) */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute top-4 right-4 p-2 text-white/50 hover:text-white md:hidden rounded-lg hover:bg-white/10"
          >
            <X size={20} />
          </button>

          <img src="/assets/gc-logo.png" alt="Logo" className="w-12 h-12 md:w-16 md:h-16 mb-4" />
          <h1 className="text-sm font-bold tracking-tight text-center">Gordon College</h1>
          <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold">VPAA PORTAL</p>
        </div>

        <nav className="flex-1 py-6 md:py-10 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-lg transition-all group
                ${isActive ? 'bg-white/10 text-white font-semibold' : 'text-white/60 hover:text-white hover:bg-white/5'}
              `}
            >
              <div className="group-hover:scale-110 transition-transform">{item.icon}</div>
              <span className="text-sm">{item.label}</span>
              {location.pathname === item.path && (
                <ChevronRight size={14} className="ml-auto text-white/30" />
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 md:p-6 border-t border-white/10">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-white/10 shrink-0">
              <span className="font-bold text-primary-light text-sm">{userInitials || 'VP'}</span>
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate" title={userName}>{userName}</p>
              <p className="text-[10px] text-white/40 font-semibold uppercase">VPAA Director</p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowLogoutModal(true)} 
            className="flex items-center gap-3 px-4 py-3 w-full text-white/60 hover:text-white hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all text-sm font-semibold"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col w-full min-w-0">
    
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shadow-sm relative z-30">
          
          <div className="flex items-center gap-3">
            {/* Hamburger Menu Toggle (Mobile Only) */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg md:hidden"
            >
              <Menu size={24} />
            </button>
            
            <div>
              <h2 className="text-base md:text-lg font-bold text-sidebar">{getPageTitle()}</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest hidden sm:block">VPAA Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            
            {/* Date Badge (Hidden on very small mobile devices to save space) */}
            <div className="hidden sm:flex items-center gap-2 text-slate-500 bg-slate-50 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-slate-200">
              <Calendar size={14} className="md:w-4 md:h-4" />
              <span className="text-xs md:text-sm font-semibold">{getCurrentDate()}</span>
            </div>
            
            {/* Notification Bell */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-400 hover:text-primary transition-colors bg-slate-50 rounded-full border border-slate-200 cursor-pointer"
              >
                <Bell size={18} className="md:w-5 md:h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-3.5 h-3.5 md:w-4 md:h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
                  <div className="p-3 md:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 md:max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <Bell size={24} className="mx-auto mb-2 opacity-20" />
                        <p className="text-sm font-semibold">No notifications yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {notifications.map((notif) => (
                          <div 
                            key={notif.id} 
                            className={`p-3 md:p-4 flex gap-3 hover:bg-slate-50 transition-colors ${!notif.is_read ? 'bg-primary/5' : ''}`}
                          >
                            <div className="mt-1 shrink-0">
                              {!notif.is_read ? (
                                <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--color-primary),0.5)]"></div>
                              ) : (
                                <Check size={12} className="text-slate-300" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${!notif.is_read ? 'text-slate-800 font-semibold' : 'text-slate-600'} break-words`}>
                                {notif.message}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium mt-1">
                                {new Date(notif.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'})}
                              </p>
                            </div>
                            {!notif.is_read && (
                              <button 
                                onClick={() => markAsRead(notif.id)}
                                className="text-slate-300 hover:text-primary transition-colors cursor-pointer shrink-0 ml-2"
                                title="Mark as read"
                              >
                                <Check size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 relative">
          <Outlet />
        </main>
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-red-500 mb-4 mx-auto">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 text-center mb-2">Ready to leave?</h3>
              <p className="text-sm text-slate-500 text-center mb-6">
                Are you sure you want to log out of the VPAA portal? You will need to sign in again to access your account.
              </p>
              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <button 
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 px-4 py-2.5 sm:py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmLogout}
                  className="flex-1 px-4 py-2.5 sm:py-3 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-500/30 transition-colors cursor-pointer"
                >
                  Yes, Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;