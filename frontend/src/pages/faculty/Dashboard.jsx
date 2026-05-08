// 📄 SIA/frontend/src/pages/faculty/Dashboard.jsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import gcLogo from "../../assets/gclogo.png";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import Home from "./tabs/Home";
import History from "./tabs/History";
import Profile from "./tabs/Profile";
import Notifications from "./tabs/Notifications";
import { LogOut } from "lucide-react";
import { supabase } from "../../lib/supabase";

const NOTIFICATION_TABLE_CANDIDATES = (
    import.meta.env.VITE_SUPABASE_NOTIFICATION_TABLE_CANDIDATES ||
    "notifications,notification,alerts"
)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

function getFirstValue(source, keys, fallback = null) {
    if (!source) return fallback;
    for (const key of keys) {
        const value = source[key];
        if (value !== undefined && value !== null && value !== "") {
            return value;
        }
    }
    return fallback;
}

function normalizeNotificationRow(row, index) {
    const id = String(
        getFirstValue(row, ["id", "notification_id", "notif_id"], `row-${index}`),
    );
    const message = String(
        getFirstValue(row, ["message", "title", "description"], "Notification"),
    );
    const createdAt = getFirstValue(row, ["created_at", "createdAt", "timestamp"], null);

    const rawRead = getFirstValue(row, ["is_read", "read", "isRead"], false);
    const isRead =
        rawRead === true ||
        rawRead === 1 ||
        rawRead === "1" ||
        String(rawRead).toLowerCase() === "true";

    return {
        id,
        unread: !isRead,
        type: "system",
        title: message,
        desc: "",
        meta: createdAt
            ? new Date(createdAt).toLocaleString("en-PH", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
              })
            : "System",
        icon: "🔔",
        iconColor: "blue",
    };
}

async function queryNotifications(limit = 50) {
    for (const table of NOTIFICATION_TABLE_CANDIDATES) {
        const ordered = await supabase
            .from(table)
            .select("*")
            .order("created_at", { ascending: false })
            .limit(limit);

        if (!ordered.error && Array.isArray(ordered.data)) {
            return { table, rows: ordered.data };
        }

        const plain = await supabase.from(table).select("*").limit(limit);
        if (!plain.error && Array.isArray(plain.data)) {
            return { table, rows: plain.data };
        }
    }

    return { table: null, rows: [] };
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --gc-green: #1a6b3c;
    --gc-green-dark: #134f2c;
    --surface: #f1f3f1;
    --white: #ffffff;
    --text-dark: #1a1a1a;
    --text-muted: #6b7c70;
    --border: #dde5df;
    --danger: #c0392b;
    --sidebar-w: 240px;
  }

  .db-root {
    font-family: 'Source Sans 3', sans-serif;
    background: var(--surface);
    color: var(--text-dark);
    display: flex;
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* Main content */
  .db-main {
    margin-left: var(--sidebar-w);
    flex: 1; display: flex; flex-direction: column; min-height: 100vh;
  }

  .db-page { padding: 24px 28px 40px; }

  /* ── Logout modal ── */
  .db-logout-overlay {
    display: none; position: fixed; inset: 0;
    background: rgba(0,0,0,0.45); z-index: 999;
    align-items: center; justify-content: center;
  }
  .db-logout-overlay.open { display: flex; }
  .db-logout-box {
    background: var(--white); border-radius: 16px;
    padding: 32px 28px; width: 100%; max-width: 360px; margin: 24px;
    text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    animation: dbScaleIn 0.2s ease;
  }
  .db-lm-icon {
    width: 52px; height: 52px; border-radius: 50%;
    background: #fef0f0; border: 2px solid #f5c6c6;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; margin: 0 auto 16px;
  }
  .db-lm-title {
    font-family: 'Playfair Display', serif; font-size: 20px;
    font-weight: 600; color: var(--text-dark); margin-bottom: 8px;
  }
  .db-lm-desc { font-size: 13px; color: var(--text-muted); line-height: 1.6; margin-bottom: 24px; }
  .db-lm-actions { display: flex; gap: 10px; }
  .db-lm-cancel {
    flex: 1; padding: 11px; border-radius: 9px;
    border: 1.5px solid var(--border); background: var(--white);
    font-size: 14px; font-weight: 600; color: var(--text-muted);
    cursor: pointer; font-family: 'Source Sans 3', sans-serif;
    transition: background 0.15s;
  }
  .db-lm-cancel:hover { background: #f8f7f4; }
  .db-lm-confirm {
    flex: 1; padding: 11px; border-radius: 9px; border: none;
    background: linear-gradient(135deg, #c0392b, #e74c3c);
    font-size: 14px; font-weight: 600; color: var(--white);
    cursor: pointer; font-family: 'Source Sans 3', sans-serif;
    box-shadow: 0 4px 14px rgba(192,57,43,0.3);
    transition: opacity 0.15s, transform 0.15s;
  }
  .db-lm-confirm:hover { opacity: 0.9; transform: translateY(-1px); }

  @media (max-width: 900px) {
    .db-main { margin-left: 0; }
    /* Extra bottom padding so content doesn't hide behind the bottom nav */
    .db-page { padding: 16px 16px 88px; }
  }

  @keyframes dbScaleIn {
    from { opacity: 0; transform: scale(0.93); }
    to   { opacity: 1; transform: scale(1); }
  }
`;

const PAGE_TITLES = {
    home: "Dashboard",
    history: "Ranking History",
    profile: "My Profile",
    notifications: "Notifications",
};

export default function Dashboard({ user, onLogout, _devInitialTab }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialTab = searchParams.get("tab") || _devInitialTab || "home";
    const [activeTab, setActiveTab] = useState(initialTab);
    const [showLogout, setShowLogout] = useState(false);
    const [notificationTable, setNotificationTable] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [readOverrides, setReadOverrides] = useState([]);

    const navigate = (key) => {
        setActiveTab(key);
        try {
            const next = new URLSearchParams(searchParams.toString());
            next.set("tab", key);
            setSearchParams(next, { replace: false });
        } catch (e) {
            // ignore
        }
    };

    useEffect(() => {
        let active = true;

        const loadNotifications = async () => {
            const { table, rows } = await queryNotifications(80);
            if (!active) return;

            setNotificationTable(table);
            setNotifications(
                rows.map((row, index) => normalizeNotificationRow(row, index)),
            );
        };

        void loadNotifications();

        return () => {
            active = false;
        };
    }, []);

    const mergedNotifications = useMemo(() => {
        if (readOverrides.length === 0) {
            return notifications;
        }

        const readSet = new Set(readOverrides);
        return notifications.map((notif) =>
            readSet.has(notif.id)
                ? {
                      ...notif,
                      unread: false,
                  }
                : notif,
        );
    }, [notifications, readOverrides]);

    const notifCount = mergedNotifications.filter((item) => item.unread).length;

    const markOneRead = useCallback(
        async (id) => {
            if (!id) return;
            setReadOverrides((prev) => (prev.includes(id) ? prev : [...prev, id]));

            if (!notificationTable) return;

            await supabase
                .from(notificationTable)
                .update({ is_read: true })
                .eq("id", id);
        },
        [notificationTable],
    );

    const markAllRead = useCallback(async () => {
        const unreadIds = mergedNotifications
            .filter((item) => item.unread)
            .map((item) => item.id);

        if (unreadIds.length === 0) return;
        setReadOverrides((prev) => Array.from(new Set([...prev, ...unreadIds])));

        if (!notificationTable) return;

        await supabase
            .from(notificationTable)
            .update({ is_read: true })
            .in("id", unreadIds);
    }, [mergedNotifications, notificationTable]);

    const renderTab = () => {
        switch (activeTab) {
            case "home":
                return <Home user={user} onNavigate={navigate} />;
            case "history":
                return <History user={user} />;
            case "profile":
                return <Profile user={user} />;
            case "notifications":
                return (
                    <Notifications
                        user={user}
                        notifications={mergedNotifications}
                        onMarkAllRead={markAllRead}
                        onMarkRead={markOneRead}
                    />
                );
            default:
                return <Home user={user} onNavigate={navigate} />;
        }
    };

    return (
        <>
            <style>{styles}</style>
            <div className="db-root">
                {/* Sidebar — desktop sidebar + mobile bottom nav */}
                <Sidebar
                    activeTab={activeTab}
                    onNavigate={navigate}
                    onLogout={() => setShowLogout(true)}
                    notifCount={notifCount}
                    logo={gcLogo}
                />

                {/* Main */}
                <div className="db-main">
                    <Topbar
                        title={PAGE_TITLES[activeTab]}
                        user={user}
                        notifCount={notifCount}
                        notifications={mergedNotifications}
                        onMarkAllRead={markAllRead}
                        onMarkRead={markOneRead}
                        onViewAllNotifs={() => navigate("notifications")}
                        onLogout={() => setShowLogout(true)}
                    />

                    <main className="db-page">{renderTab()}</main>
                </div>

                {/* Logout modal */}
                <div
                    className={`db-logout-overlay${showLogout ? " open" : ""}`}
                    onClick={() => setShowLogout(false)}
                >
                    <div
                        className="db-logout-box"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="db-lm-icon">
                            <LogOut size={15} color="#c0392b" />
                        </div>
                        <div className="db-lm-title">Log Out?</div>
                        <div className="db-lm-desc">
                            You will be returned to the login page. Any unsaved
                            progress will remain as-is.
                        </div>
                        <div className="db-lm-actions">
                            <button
                                className="db-lm-cancel"
                                onClick={() => setShowLogout(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="db-lm-confirm"
                                onClick={() => {
                                    setShowLogout(false);
                                    if (onLogout) onLogout();
                                }}
                            >
                                Yes, Log Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
