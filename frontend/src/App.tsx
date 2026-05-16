import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from './layouts/AuthLayout';
import LoginPage from './pages/LoginPage';
import SetPasswordPage from './pages/SetPasswordPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import FacultyReviewPage from './pages/FacultyReviewPage';
import HistoryPage from './pages/HistoryPage';
import CycleDetailsPage from './pages/CycleDetailsPage';
import ProtectedRoute from './components/ProtectedRoute'; // <-- Import your new route guard

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/set-password" element={<SetPasswordPage />} />
        </Route>

        {/* Dashboard Routes (Protected) */}
        <Route 
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          {/* UPDATED: Changed path and added /:id to catch the cycle.id */}
          <Route path="/faculty-review" element={<FacultyReviewPage />} />
          <Route path="/FacultyReviewPage/:id" element={<FacultyReviewPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/history/:id" element={<CycleDetailsPage />} />
          <Route path="/HistoryPage/:id" element={<HistoryPage />} />
        </Route>

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        {/* Unmatched routes fallback to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;