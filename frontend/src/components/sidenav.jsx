import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import logo from "../assets/gclogo-Photoroom.png";
import './sidenav.css';

const navLinks = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    to: '/usermanagement',
    label: 'User Management',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  {
    to: '/review',
    label: 'Review & Score',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    to: '/ranking',
    label: 'Ranking Rubrics',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/>
        <path d="M9 12h6M9 16h4"/>
      </svg>
    ),
  },
];

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      console.log('🔄 Logging out...');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      console.log('✅ Logout successful');
      navigate('/login');
    } catch (error) {
      console.error('❌ Logout error:', error);
      alert('Error logging out: ' + error.message);
    }
  };

  return (
    <aside className="sidebar">

      <div className="sidebar-brand">

        <div className="brand-seal">
          <img src={logo} alt="GC Logo" className="logo" />
        </div>

        <h1>Gordon College</h1>
        <span>HR Admin Portal</span>

      </div>

      <nav className="nav">
        {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              'nav-item' + (isActive ? ' active' : '')
            }
          >
            {link.icon}
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <strong>Administrator</strong>
          <small>HR Admin Portal</small>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Logout
        </button>

      </div>

    </aside>
  );
}