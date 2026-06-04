// 📄 SIA/frontend/src/components/Topbar.jsx

import { useState, useEffect, useRef } from "react";
import { Bell, Calendar, AlertTriangle, LogOut } from "lucide-react";

const styles = `
  :root {
    --gc-green: #1a6b3c;
    --gc-green-dark: #134f2c;
    --gc-green-pale: #eef7f2;
    --gc-gold: #c9a84c;
    --gc-gold-pale: #fdf8ec;
    --white: #ffffff;
    --off-white: #f8f7f4;
    --text-dark: #1a1a1a;
    --text-muted: #6b7c70;
    --border: #dde5df;
    --danger: #c0392b;
    --danger-pale: #fdf0ee;
    --blue-pale: #eaf3fb;
  }

  .tb-root {
    background: var(--white); border-bottom: 1px solid var(--border);
    padding: 0 28px; height: 62px;
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; z-index: 50;
    box-shadow: 0 1px 8px rgba(0,0,0,0.05);
    font-family: 'Source Sans 3', sans-serif;
  }

  .tb-left { display: flex; align-items: center; gap: 12px; }
  .tb-title {
    font-family: 'Playfair Display', serif; font-size: 17px; font-weight: 600;
    color: var(--gc-green-dark);
  }
  .tb-sub { font-size: 11px; color: var(--text-muted); margin-top: 1px; }

  .tb-right { display: flex; align-items: center; gap: 10px; }
  .tb-date {
    display: flex; align-items: center; gap: 5px;
    font-size: 12px; color: var(--text-muted);
  }

  /* Bell button */
  .tb-bell {
    position: relative; width: 36px; height: 36px; border-radius: 9px;
    border: 1.5px solid var(--border); background: var(--off-white);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: border-color 0.2s, background 0.2s;
    flex-shrink: 0; line-height: 0;
  }
  .tb-bell:hover { border-color: var(--gc-green); background: var(--gc-green-pale); }
  .tb-bell-dot {
    position: absolute; top: 5px; right: 5px;
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--gc-gold); border: 2px solid var(--white);
    pointer-events: none;
  }

  /* Logout button — hidden on desktop, shown on mobile */
  .tb-logout-btn {
    display: none; align-items: center; justify-content: center;
    width: 36px; height: 36px; border-radius: 9px;
    border: 1.5px solid #f5c6c6;
    background: var(--danger-pale); color: var(--danger);
    cursor: pointer; transition: background 0.15s; line-height: 0;
    flex-shrink: 0;
  }
  .tb-logout-btn:hover { background: #fce0de; }

  /* Notification dropdown */
  .tb-dropdown {
    display: none; position: absolute; top: calc(100% + 10px); right: 0;
    width: 340px; background: var(--white); border-radius: 14px;
    border: 1.5px solid var(--border); box-shadow: 0 12px 40px rgba(0,0,0,0.13);
    z-index: 500; overflow: hidden;
  }
  .tb-dropdown.open { display: block; }
  .tb-dd-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px 12px; border-bottom: 1px solid var(--border);
  }
  .tb-dd-title { font-size: 14px; font-weight: 700; color: var(--text-dark); font-family: 'Playfair Display', serif; }
  .tb-dd-mark {
    font-size: 11px; color: var(--gc-green); background: none; border: none;
    cursor: pointer; font-weight: 600; font-family: 'Source Sans 3', sans-serif;
  }
  .tb-dd-mark:hover { text-decoration: underline; }
  .tb-dd-list { max-height: 280px; overflow-y: auto; }
  .tb-dd-item {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 12px 16px; border-bottom: 1px solid #f3f5f4;
    cursor: pointer; transition: background 0.15s;
  }
  .tb-dd-item:last-child { border-bottom: none; }
  .tb-dd-item:hover { background: var(--gc-green-pale); }
  .tb-dd-item.unread { background: #f5fbf7; }
  .tb-dd-icon {
    width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; line-height: 0;
  }
  .tb-dd-blue { background: var(--blue-pale); }
  .tb-dd-gold { background: var(--gc-gold-pale); }
  .tb-dd-body { flex: 1; }
  .tb-dd-text { font-size: 12.5px; color: var(--text-dark); line-height: 1.45; margin-bottom: 3px; }
  .tb-dd-meta { font-size: 10.5px; color: var(--text-muted); }
  .tb-dd-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--gc-green); flex-shrink: 0; margin-top: 5px;
  }
  .tb-dd-footer {
    padding: 11px 16px; text-align: center; font-size: 12px; font-weight: 600;
    color: var(--gc-green); cursor: pointer; border-top: 1px solid var(--border);
    background: var(--off-white); transition: background 0.15s;
    border-left: none; border-right: none; border-bottom: none;
    width: 100%; font-family: 'Source Sans 3', sans-serif;
  }
  .tb-dd-footer:hover { background: var(--gc-green-pale); }

  @media (max-width: 900px) {
    .tb-root       { padding: 0 16px; height: 56px; }
    .tb-date       { display: none; }
    .tb-logout-btn { display: flex; }
    .tb-dropdown   { width: min(320px, 92vw); right: -8px; }
  }
`;

function toDropdownItem(item, index) {
  const iconColor = item.iconColor || "blue";
  const iconClass =
    iconColor === "gold"
      ? "tb-dd-gold"
      : iconColor === "green"
        ? "tb-dd-gold"
        : "tb-dd-blue";

  return {
    id: item.id || `item-${index}`,
    icon: iconColor === "gold"
      ? <AlertTriangle size={15} color="#b7950b" />
      : <Bell size={15} color="#2471a3" />,
    iconClass,
    text: item.title || "Notification",
    meta: item.meta || "System",
    unread: Boolean(item.unread),
  };
}

export default function Topbar({ title, notifCount, notifications, onMarkAllRead, onMarkRead, onViewAllNotifs, onLogout }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const today = new Date().toLocaleDateString("en-PH", {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
  });

  const dropdownItems = (Array.isArray(notifications) ? notifications : []).map(toDropdownItem);

  return (
    <>
      <style>{styles}</style>
      <header className="tb-root">

        {/* Left — title + subtitle */}
        <div className="tb-left">
          <div>
            <div className="tb-title">{title}</div>
            <div className="tb-sub">Faculty Member Portal</div>
          </div>
        </div>

        {/* Right — date, bell, logout (mobile only) */}
        <div className="tb-right">
          <span className="tb-date">
            <Calendar size={13} color="var(--text-muted)" />
            {today}
          </span>

          {/* Bell + dropdown */}
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <button className="tb-bell" onClick={() => setDropdownOpen((v) => !v)}>
              <Bell size={16} color="var(--text-muted)" />
              {notifCount > 0 && <span className="tb-bell-dot" />}
            </button>

            <div className={`tb-dropdown${dropdownOpen ? " open" : ""}`}>
              <div className="tb-dd-header">
                <span className="tb-dd-title">Notifications</span>
                <button
                  className="tb-dd-mark"
                  onClick={() => { onMarkAllRead(); setDropdownOpen(false); }}
                  disabled={notifCount <= 0}
                >
                  ✓ Mark all as read
                </button>
              </div>
              <div className="tb-dd-list">
                {dropdownItems.length > 0 ? (
                  dropdownItems.map((n, i) => (
                    <div
                      key={n.id || i}
                      className={`tb-dd-item${n.unread ? " unread" : ""}`}
                      onClick={() => {
                        if (n.unread && onMarkRead) {
                          onMarkRead(n.id);
                        }
                      }}
                    >
                      <div className={`tb-dd-icon ${n.iconClass}`}>{n.icon}</div>
                      <div className="tb-dd-body">
                        <div className="tb-dd-text">{n.text}</div>
                        <div className="tb-dd-meta">{n.meta}</div>
                      </div>
                      {n.unread && <div className="tb-dd-dot" />}
                    </div>
                  ))
                ) : (
                  <div className="tb-dd-item">
                    <div className="tb-dd-body">
                      <div className="tb-dd-text">No notifications yet.</div>
                      <div className="tb-dd-meta">Your updates will appear here.</div>
                    </div>
                  </div>
                )}
              </div>
              <button className="tb-dd-footer" onClick={() => { setDropdownOpen(false); onViewAllNotifs(); }}>
                View all notifications →
              </button>
            </div>
          </div>

          {/* Logout — visible on mobile only */}
          <button className="tb-logout-btn" onClick={onLogout}>
            <LogOut size={16} />
          </button>
        </div>

      </header>
    </>
  );
}
