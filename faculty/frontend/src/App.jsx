import Login from "./pages/auth/Login";
import ChangePassword from "./pages/auth/ChangePassword";
import Dashboard from "./pages/faculty/Dashboard";
// HR and VPAA portal folders may be removed; avoid static imports that break the build.
import { useAuth } from "./context/AuthContext";
import { Navigate, Route, Routes } from "react-router-dom";

function LoadingScreen() {
    return (
        <div
            style={{
                minHeight: "100vh",
                display: "grid",
                placeItems: "center",
                fontFamily: "'Source Sans 3', sans-serif",
                background: "#f8f7f4",
                color: "#134f2c",
                fontWeight: 600,
                letterSpacing: "0.4px",
            }}
        >
            Loading session...
        </div>
    );
}

export default function App() {
    const {
        user,
        profile,
        role,
        isLoading,
        needsPasswordChange,
        signOut,
        markFirstLoginComplete,
    } = useAuth();

    const portalUser = user
        ? {
              ...user,
              ...profile,
              user_id: profile?.user_id ?? null,
              displayName:
                  user.user_metadata?.full_name ||
                  user.user_metadata?.display_name ||
                  user.email?.split("@")[0] ||
                  "Faculty Member",
          }
        : null;

    if (isLoading) return <LoadingScreen />;
    if (!user) return <Login />;

    if (needsPasswordChange) {
        return (
            <ChangePassword
                user={portalUser}
                onSuccess={markFirstLoginComplete}
            />
        );
    }

    const homePath = "/faculty"; // All users go to Faculty portal

    return (
        <Routes>
            <Route
                path="/faculty/*"
                element={
                    <Dashboard
                        user={portalUser}
                        onLogout={() => {
                            void signOut();
                        }}
                    />
                }
            />
            <Route path="*" element={<Navigate to={homePath} replace />} />
        </Routes>
    );
}
