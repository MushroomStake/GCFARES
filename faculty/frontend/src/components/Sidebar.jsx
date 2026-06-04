// 📄 SIA/frontend/src/components/Sidebar.jsx

import { LayoutDashboard, History, User, Bell, LogOut } from "lucide-react";

const styles = `
  :root {
    --gc-green: #1a6b3c;
    --gc-green-dark: #134f2c;
    --gc-green-light: #228b4e;
    --gc-gold: #c9a84c;
    --gc-gold-light: #e8c96b;
    --white: #ffffff;
    --off-white: #f8f7f4;
    --text-muted: #6b7c70;
    --border: #dde5df;
    --sidebar-w: 240px;
    --bottom-nav-h: 64px;
  }

  /* ══ DESKTOP SIDEBAR ══ */
  .sb-root {
    width: var(--sidebar-w);
    min-height: 100vh;
    background: linear-gradient(180deg, var(--gc-green-dark) 0%, var(--gc-green) 60%, #1e5c35 100%);
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0; left: 0;
    z-index: 100;
    overflow: hidden;
  }
  .sb-root::before {
    content: ''; position: absolute; top: -80px; right: -80px;
    width: 240px; height: 240px; border-radius: 50%;
    background: rgba(201,168,76,0.07); pointer-events: none;
  }

  /* Brand */
  .sb-brand {
    padding: 22px 18px 18px;
    display: flex; flex-direction: column; align-items: center; gap: 10px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }
  .sb-logo {
    width: 68px; height: 68px; border-radius: 50%;
    background: var(--white);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 20px rgba(0,0,0,0.25);
    overflow: hidden;
  }
  .sb-logo img { width: 100%; height: 100%; object-fit: cover; }
  .sb-brand-name {
    font-family: 'Playfair Display', serif; font-size: 14.5px; font-weight: 600;
    color: var(--white); text-align: center; line-height: 1.3;
  }
  .sb-brand-sub {
    font-size: 9px; color: var(--gc-gold-light); letter-spacing: 1.8px;
    text-transform: uppercase; text-align: center; margin-top: 3px; font-weight: 500;
  }

  /* Nav items */
  .sb-nav {
    flex: 1; padding: 18px 10px;
    display: flex; flex-direction: column; gap: 3px;
  }
  .sb-nav-btn {
    display: flex; align-items: center; gap: 11px;
    padding: 10px 13px; border-radius: 10px; cursor: pointer;
    transition: background 0.2s, transform 0.15s;
    border: none; background: none; width: 100%; text-align: left;
    line-height: normal;
  }
  .sb-nav-btn:hover { background: rgba(255,255,255,0.1); transform: translateX(2px); }
  .sb-nav-btn.active {
    background: rgba(255,255,255,0.15);
    border-left: 3px solid var(--gc-gold);
    padding-left: 10px;
  }
  .sb-nav-icon {
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; color: white;
  }
  .sb-nav-label {
    font-size: 13px; font-weight: 500;
    color: rgba(255,255,255,0.88);
    font-family: 'Source Sans 3', sans-serif;
    line-height: normal;
  }
  .sb-nav-btn.active .sb-nav-label { color: var(--white); font-weight: 600; }
  .sb-nav-badge {
    margin-left: auto; background: var(--gc-gold); color: var(--gc-green-dark);
    font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 10px;
    line-height: 1.4;
  }

  /* Footer / logout */
  .sb-footer {
    padding: 14px 10px 22px;
    border-top: 1px solid rgba(255,255,255,0.1);
  }
  .sb-logout-btn {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 13px; border-radius: 8px; cursor: pointer;
    transition: background 0.2s; border: none; background: none;
    width: 100%; line-height: normal;
  }
  .sb-logout-btn:hover { background: rgba(255,255,255,0.08); }
  .sb-logout-icon {
    display: flex; align-items: center; justify-content: center;
    color: rgba(255,255,255,0.65);
  }
  .sb-logout-label {
    font-size: 13px; color: rgba(255,255,255,0.65);
    font-family: 'Source Sans 3', sans-serif; line-height: normal;
  }

  /* ══ MOBILE BOTTOM NAV ══ */
  .sb-bottom-nav {
    display: none;
    position: fixed; bottom: 0; left: 0; right: 0;
    height: var(--bottom-nav-h);
    background: linear-gradient(135deg, var(--gc-green-dark), var(--gc-green));
    border-top: 1px solid rgba(255,255,255,0.1);
    z-index: 100;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
  }
  .sb-bottom-nav-inner {
    display: flex; align-items: stretch;
    height: 100%;
  }
  .sb-bottom-btn {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 3px;
    background: none; border: none; cursor: pointer;
    padding: 8px 4px; border-radius: 0; margin: 0;
    transition: background 0.15s; position: relative;
  }
  .sb-bottom-btn:hover { background: rgba(255,255,255,0.08); }
  .sb-bottom-btn.active { background: rgba(0,0,0,0.2); }
  .sb-bottom-btn.active::before {
    content: '';
    position: absolute; bottom: 0; left: 0; right: 0;
    height: 3px; border-radius: 3px 3px 0 0;
    background: var(--gc-gold);
  }
  .sb-bottom-icon {
    display: flex; align-items: center; justify-content: center;
    color: white;
  }
  .sb-bottom-label {
    font-size: 9px; font-weight: 600;
    color: rgba(255,255,255,0.75);
    font-family: 'Source Sans 3', sans-serif;
    text-transform: uppercase; letter-spacing: 0.5px; line-height: 1;
  }
  .sb-bottom-btn.active .sb-bottom-label { color: var(--white); font-weight: 700; }
  .sb-bottom-badge {
    position: absolute; top: 6px; right: calc(50% - 18px);
    background: var(--gc-gold); color: var(--gc-green-dark);
    font-size: 9px; font-weight: 700; padding: 1px 5px;
    border-radius: 8px; line-height: 1.4;
  }

  /* ── RESPONSIVE ── */
  @media (max-width: 900px) {
    .sb-root       { display: none; }
    .sb-bottom-nav { display: block; }
  }
`;

const NAV_ITEMS = [
  { key: "home",          icon: LayoutDashboard, label: "Dashboard",     shortLabel: "Home"    },
  { key: "history",       icon: History,         label: "History",       shortLabel: "History" },
  { key: "profile",       icon: User,            label: "Profile",       shortLabel: "Profile" },
  { key: "notifications", icon: Bell,            label: "Notifications", shortLabel: "Notifs", badge: true },
];

export default function Sidebar({ activeTab, onNavigate, onLogout, notifCount, logo }) {
  return (
    <>
      <style>{styles}</style>

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="sb-root">
        <div className="sb-brand">
          <div className="sb-logo">
            <img src={logo} alt="Gordon College" />
          </div>
          <div>
            <div className="sb-brand-name">GCFARES</div>
            <div className="sb-brand-sub">Gordon College</div>
          </div>
        </div>

        <nav className="sb-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`sb-nav-btn${activeTab === item.key ? " active" : ""}`}
              onClick={() => onNavigate(item.key)}
            >
              <span className="sb-nav-icon"><item.icon size={16} /></span>
              <span className="sb-nav-label">{item.label}</span>
              {item.badge && notifCount > 0 && (
                <span className="sb-nav-badge">{notifCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sb-footer">
          <button className="sb-logout-btn" onClick={onLogout}>
            <span className="sb-logout-icon"><LogOut size={15} /></span>
            <span className="sb-logout-label">Logout</span>
          </button>
        </div>
      </aside>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="sb-bottom-nav">
        <div className="sb-bottom-nav-inner">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`sb-bottom-btn${activeTab === item.key ? " active" : ""}`}
              onClick={() => onNavigate(item.key)}
            >
              <span className="sb-bottom-icon"><item.icon size={17} /></span>
              <span className="sb-bottom-label">{item.shortLabel || item.label}</span>
              {item.badge && notifCount > 0 && (
                <span className="sb-bottom-badge">{notifCount}</span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
