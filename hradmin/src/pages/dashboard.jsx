import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import Sidebar from '../components/sidenav';
import '../styles/layout.css';
import './dashboard.css';
import { supabase } from '../supabase';
import AreaIVImportPanel from './review/components/AreaIVImportPanel';
import Loader from '../components/Loader';
import CycleTimelineModal from './dashboard/CycleTimelineModal';

// â”€â”€ Cycle Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CycleCard({ cycle, onEdit, onCycleAction }) {
  if (!cycle) {
    return (
      <div className="cycle-card">
        <div className="cycle-header">
          <div>
            <div className="cycle-label">No Active Period</div>
            <div className="cycle-title">Create your first evaluation period</div>
          </div>
          <span className="badge badge-inactive">Not Started</span>
        </div>
        <div className="cycle-footer">
          <div className="btn-group">
            <button className="btn btn-edit" onClick={onEdit}>Create Period</button>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Not set';
    // Handle both Timestamp objects and date strings
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 'Not set';
    return date.toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  };

  const getStatusBadge = () => {
    // Use the cycle's status field first, then fall back to date logic
    if (cycle.status === 'finished') {
      return { class: 'badge-closed', text: 'Finished' };
    }

    if (cycle.status === 'submissions_closed') {
      return { class: 'badge-warning', text: 'Submissions Closed' };
    }

    if (cycle.status === 'open') {
      // For open cycles, check if they've actually started based on dates
      const now = new Date();
      const start = cycle.start_date?.toDate ? cycle.start_date.toDate() : new Date(cycle.start_date);
      const end = cycle.deadline?.toDate ? cycle.deadline.toDate() : new Date(cycle.deadline);

      // Compare dates only (ignore time) for start date check
      const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      
      if (nowDate < startDate) {
        return { class: 'badge-inactive', text: 'Not Started' };
      }
      if (now > end) {
        return { class: 'badge-warning', text: 'Overdue' };
      }
      return { class: 'badge-progress', text: 'In Progress' };
    }
    
    // Default fallback
    return { class: 'badge-inactive', text: 'Unknown Status' };
  };

  const getActionButtons = () => {
    const isOpen = cycle.status === 'open';
    const isSubmissionsClosed = cycle.status === 'submissions_closed';
    const isFinished = cycle.status === 'finished';
    const profileLocked = cycle.profile_edit_open === false;

    if (isOpen) {
      // Active cycle: Edit + Lock/Unlock Profile + Close Submissions + Finish Evaluation
      return (
        <>
          <button className="btn btn-edit" onClick={onEdit}>Edit</button>
          <button
            className="btn btn-outline-warning"
            onClick={() => onCycleAction(profileLocked ? 'unlock-profile' : 'lock-profile')}
          >
            {profileLocked ? 'Unlock Profile' : 'Lock Profile'}
          </button>
          <button className="btn btn-outline-danger" onClick={() => onCycleAction('close')}>Close Submissions</button>
          <button className="btn btn-primary" onClick={() => onCycleAction('finish')}>Finish Evaluation</button>
        </>
      );
    } else if (isSubmissionsClosed) {
      // Submissions closed but evaluation ongoing: Edit + Lock/Unlock Profile + Re-open Submissions + Finish Evaluation
      return (
        <>
          <button className="btn btn-edit" onClick={onEdit}>Edit</button>
          <button
            className="btn btn-outline-warning"
            onClick={() => onCycleAction(profileLocked ? 'unlock-profile' : 'lock-profile')}
          >
            {profileLocked ? 'Unlock Profile' : 'Lock Profile'}
          </button>
          <button className="btn btn-outline-success" onClick={() => onCycleAction('reopen')}>Re-open Submissions</button>
          <button className="btn btn-primary" onClick={() => onCycleAction('finish')}>Finish Evaluation</button>
        </>
      );
    } else if (isFinished) {
      // Evaluation finished: Edit + Open Cycle (restart from beginning)
      return (
        <>
          <button className="btn btn-edit" onClick={onEdit}>Edit</button>
          <button className="btn btn-outline-success" onClick={() => onCycleAction('open')}>Open Period</button>
        </>
      );
    } else {
      // Unknown state: Edit + Open Cycle
      return (
        <>
          <button className="btn btn-edit" onClick={onEdit}>Edit</button>
          <button className="btn btn-outline-success" onClick={() => onCycleAction('open')}>Open Period</button>
        </>
      );
    }
  };

  const status = getStatusBadge();
  const profileEditingAllowed = cycle.profile_edit_open !== false;

  return (
    <div className="cycle-card">
      <div className="cycle-header">
        <div>
          <div className="cycle-label">Current Period</div>
          <div className="cycle-title">{cycle.title}</div>
          <div className="cycle-meta">
            Started: {formatDate(cycle.start_date)}<br />
            Deadline: {formatDate(cycle.deadline)}<br />
            Profile Access: {profileEditingAllowed ? 'Open' : 'Locked'}
          </div>
        </div>
        <span className={`badge ${status.class}`}>{status.text}</span>
      </div>
      <div className="cycle-footer">
        <span className={`badge ${status.class}`}>{status.text}</span>
        <div className="btn-group">
          {getActionButtons()}
        </div>
      </div>
    </div>
  );
}

// â”€â”€ Stat Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StatCard({ iconClass, icon, label, value }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${iconClass}`}>{icon}</div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
      </div>
    </div>
  );
}

// ─── History Item ─────────────────────────────────────────
function HistoryItem({ cycle, onReview, onExport }) {
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Not set';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const getStatus = () => {
    return cycle.status === 'open' ? 'Active' : 'Completed';
  };

  return (
    <div 
      className="history-item" 
      onClick={() => onReview(cycle.cycle_id)}
      style={{ cursor: 'pointer' }}
    >
      <div className="history-badge">{getStatus()}</div>
      <div className="history-title">{cycle.title}</div>
      <div className="history-meta">
        Started: {formatDate(cycle.start_date)}<br />
        Deadline: {formatDate(cycle.deadline)}
      </div>
      <div className="history-footer" onClick={(e) => e.stopPropagation()}>
        <button className="btn btn-outline-primary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => onExport(cycle.cycle_id, cycle.title)}>Export CSV</button>
      </div>
    </div>
  );
}

// â”€â”€ Action Confirmation Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ActionConfirmModal({ open, title, message, confirmLabel, confirmTone = 'danger', onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div
      className="action-modal-overlay"
      onClick={(e) => e.target.classList.contains('action-modal-overlay') && onCancel()}
    >
      <div className="action-modal">
        <div className="action-modal-header">
          <div>
            <div className="action-modal-kicker">Confirm Action</div>
            <div className="action-modal-title">{title}</div>
          </div>
          <button className="action-modal-close" onClick={onCancel} aria-label="Close confirmation">âœ•</button>
        </div>
        <div className="action-modal-body">
          <p>{message}</p>
        </div>
        <div className="action-modal-footer">
          <button className="btn btn-edit" onClick={onCancel}>Cancel</button>
          <button className={`btn ${confirmTone === 'primary' ? 'btn-primary' : 'btn-outline-danger'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// â”€â”€ Dashboard Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€ Dashboard Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function Dashboard() {
  const navigate = useNavigate();
  const [currentCycle, setCurrentCycle] = useState(null);
  const [modalCycle, setModalCycle] = useState(null);
  const [focusDeadlineFields, setFocusDeadlineFields] = useState(false);
  const [cycleHistory, setCycleHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 6;
  const [stats, setStats] = useState({
    totalFaculty: 0,
    pendingReviews: 0,
    completed: 0,
    deadline: 'Not set'
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [actionModal, setActionModal] = useState({
    open: false,
    action: null,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    confirmTone: 'danger',
  });
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [selectedPastCycle, setSelectedPastCycle] = useState(null);
  const [pastApplications, setPastApplications] = useState([]);
  const [pastSearchTerm, setPastSearchTerm] = useState('');
  const [pastDepartmentFilter, setPastDepartmentFilter] = useState('all');

  // importer is embedded in the dashboard UI now

  const handleReviewCycle = async (cycleId) => {
    const cycle = cycleHistory.find(c => c.cycle_id === cycleId);
    if (!cycle) return;
    
    setSelectedPastCycle(cycle);
    setLoading(true);
    try {
      const { data: appsData, error: appsError } = await supabase
        .from('applications')
        .select(`
          application_id, status, hr_score, final_score,
          faculty:faculty_id ( user_id, name_last, name_first, department_id, current_rank, departments ( department_name ) )
        `)
        .eq('cycle_id', cycleId)
        .in('status', ['HR_Completed', 'VPAA_Completed', 'For_Publishing', 'Published']);
      
      if (appsError) throw appsError;
      setPastApplications(appsData || []);
    } catch (err) {
      console.error('Error fetching past apps:', err);
      alert('Failed to load past applications.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async (cycleId, title) => {
    try {
      // Fetch applications for this cycle with faculty info
      const { data: appsData, error: appsError } = await supabase
        .from('applications')
        .select(`
          application_id, status, hr_score, final_score,
          faculty:faculty_id ( user_id, name_last, name_first, department_id, current_rank, departments ( department_name ) )
        `)
        .eq('cycle_id', cycleId)
        .in('status', ['HR_Completed', 'VPAA_Completed', 'For_Publishing', 'Published']);
      
      if (appsError) throw appsError;

      // Format data for CSV
      const csvData = (appsData || []).map(app => ({
        'Faculty Last Name': app.faculty?.name_last || '',
        'Faculty First Name': app.faculty?.name_first || '',
        'Department': app.faculty?.departments?.department_name || app.faculty?.department_id || '',
        'Status': app.status || '',
        'HR Score': app.hr_score || 0,
        'Final Score': app.final_score || 0,
      }));

      // Generate CSV
      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title.replace(/\s+/g, '_')}_Masterlist.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      alert('Failed to export CSV: ' + err.message);
    }
  };

  const handleExportSingleFacultyCSV = (app) => {
    try {
      const csvData = [{
        'Faculty Last Name': app.faculty?.name_last || '',
        'Faculty First Name': app.faculty?.name_first || '',
        'Department': app.faculty?.departments?.department_name || app.faculty?.department_id || '',
        'Status': app.status || '',
        'HR Score': app.hr_score || 0,
        'Final Score': app.final_score ?? app.hr_score ?? 0,
      }];
      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${app.faculty?.name_last || 'Faculty'}_${app.faculty?.name_first || 'Name'}_Evaluation.csv`.replace(/\s+/g, '_'));
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      alert('Failed to export CSV: ' + err.message);
    }
  };

  const fetchData = async ({ showLoader = true } = {}) => {
    if (showLoader) {
      setLoading(true);
    }
    try {
      console.log('ðŸ”„ Starting data fetch (Supabase)...');

      // Fetch all cycles
      const { data: allCycles, error: cyclesError } = await supabase
        .from('ranking_cycles')
        .select('*');
      if (cyclesError) throw cyclesError;
      console.log('All cycles found:', allCycles);

      // Find the active cycle (open or submissions_closed, but not finished)
      const openCycle = allCycles.find(c => c.status === 'open' || c.status === 'submissions_closed');
      if (openCycle) {
        setCurrentCycle(openCycle);
      } else {
        setCurrentCycle(null);
      }

      // History: closed cycles, sorted by created_at desc
      const history = allCycles
        .filter(c => c.status !== 'open')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setCycleHistory(history);

      // Faculty stats
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, role');
      if (usersError) throw usersError;

      const normalized = (role) => String(role || '').trim().toLowerCase();
      const facultyUsersCount = (usersData || []).filter((user) => {
        const role = normalized(user.role);
        return role === 'faculty' || role.includes('faculty');
      }).length;

      // Applications for current cycle
      let pendingCount = 0;
      let completedCount = 0;
      if (openCycle) {
        if (openCycle.cycle_id !== undefined && openCycle.cycle_id !== null) {
          const { data: applicationsData, error: appsError } = await supabase
            .from('applications')
            .select(`
              *,
              faculty:faculty_id (
                user_id,
                name_last,
                name_first,
                name_middle
              )
            `)
            .eq('cycle_id', openCycle.cycle_id);
          if (appsError) throw appsError;
          setApplications(applicationsData || []);
          (applicationsData || []).forEach(app => {
            if (app.status === 'Under_HR_Review' || app.status === 'Submitted') {
              pendingCount++;
            } else {
              completedCount++;
            }
          });
        }
      }

      // Calculate stats
      const deadline = openCycle?.deadline ?
        new Date(openCycle.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
        'Not set';

      let totalFaculty = facultyUsersCount;

      // Fallback: derive faculty count from unique faculty_id in applications when role labels are inconsistent.
      if (totalFaculty === 0) {
        const { data: applicationFacultyRows, error: applicationFacultyError } = await supabase
          .from('applications')
          .select('faculty_id');
        if (!applicationFacultyError && applicationFacultyRows) {
          totalFaculty = new Set(applicationFacultyRows.map((row) => row.faculty_id)).size;
        }
      }

      setStats({
        totalFaculty,
        pendingReviews: pendingCount,
        completed: completedCount,
        deadline
      });

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setCurrentCycle(null);
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();

    const dashboardChannel = supabase
      .channel('dashboard-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchData({ showLoader: false });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
        fetchData({ showLoader: false });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ranking_cycles' }, () => {
        fetchData({ showLoader: false });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(dashboardChannel);
    };
  }, []);

  const handleCycleSaved = () => {
    setModalOpen(false);
    setModalCycle(null);
    setFocusDeadlineFields(false);
    setHistoryPage(1);
    // Always refresh dashboard after saving a cycle
    fetchData();
  };

  const resetActionModal = () => {
    setActionModal({
      open: false,
      action: null,
      title: '',
      message: '',
      confirmLabel: 'Confirm',
      confirmTone: 'danger',
    });
  };

  const totalHistoryPages = Math.max(1, Math.ceil(cycleHistory.length / historyPageSize));
  const safeHistoryPage = Math.min(historyPage, totalHistoryPages);
  const historyStartIndex = (safeHistoryPage - 1) * historyPageSize;
  const visibleHistory = cycleHistory.slice(historyStartIndex, historyStartIndex + historyPageSize);

  useEffect(() => {
    if (historyPage > totalHistoryPages) {
      setHistoryPage(totalHistoryPages);
    }
  }, [historyPage, totalHistoryPages]);

  const handleCycleAction = async (action) => {
    if (!currentCycle) return;
    try {
      if (action === 'reopen') {
        const deadlineValue = currentCycle.deadline?.toDate ? currentCycle.deadline.toDate() : new Date(currentCycle.deadline);
        const hasDeadline = deadlineValue instanceof Date && !Number.isNaN(deadlineValue.getTime());
        const isDeadlineReached = hasDeadline && new Date() >= deadlineValue;

        setModalCycle({
          ...currentCycle,
          status: 'open',
        });
        setFocusDeadlineFields(isDeadlineReached);
        setModalOpen(true);
        return;
      }

      if (action === 'lock-profile' || action === 'unlock-profile') {
        setActionModal({
          open: true,
          action,
          title: action === 'unlock-profile' ? 'Unlock Faculty Profile Editing?' : 'Lock Faculty Profile Editing?',
          message: action === 'unlock-profile'
            ? 'Faculty will be able to edit their profile again, provided the current period window is still active.'
            : 'Faculty profile editing will be disabled until you unlock it again.',
          confirmLabel: action === 'unlock-profile' ? 'Unlock Profile' : 'Lock Profile',
          confirmTone: action === 'unlock-profile' ? 'primary' : 'danger',
        });
        return;
      }

      if (action === 'close') {
        setActionModal({
          open: true,
          action,
          title: 'Close Submissions?',
          message: 'This will stop faculty from submitting new files for the current period. It does not finish or publish the evaluation.',
          confirmLabel: 'Close Submissions',
          confirmTone: 'primary',
        });
        return;
      }

      if (action === 'finish') {
        setActionModal({
          open: true,
          action,
          title: 'Finish Evaluation?',
          message: 'This will finalize the evaluation workflow and lock faculty profile editing. Use this only when the evaluation is truly complete.',
          confirmLabel: 'Finish Evaluation',
          confirmTone: 'danger',
        });
        return;
      }

      if (action !== 'open' && action !== 'reopen') {
        alert('Invalid action. Allowed: open, close, lock-profile, unlock-profile, finish, reopen');
        return;
      }

      // 'open' and 'reopen' both set status to 'open' and enable profile editing
      console.log(`ðŸ”„ Updating cycle ${currentCycle.cycle_id} status to: open`);
      const { error } = await supabase
        .from('ranking_cycles')
        .update({
          status: 'open',
          profile_edit_open: true,
        })
        .eq('cycle_id', currentCycle.cycle_id);
      if (error) throw error;
      console.log('âœ… Cycle reopened successfully');
      fetchData(); // Refresh data
    } catch (err) {
      console.error('âŒ Error updating cycle status:', err);
      alert('Failed to update cycle status: ' + err.message);
    }
  };

  const confirmCycleAction = async () => {
    if (!currentCycle || !actionModal.action) return;

    try {
      if (actionModal.action === 'lock-profile' || actionModal.action === 'unlock-profile') {
        const nextProfileEditOpen = actionModal.action === 'unlock-profile';
        const { error } = await supabase
          .from('ranking_cycles')
          .update({ profile_edit_open: nextProfileEditOpen })
          .eq('cycle_id', currentCycle.cycle_id);
        if (error) throw error;
        console.log(`âœ… Profile access ${nextProfileEditOpen ? 'unlocked' : 'locked'} successfully`);
      }

      if (actionModal.action === 'finish') {
        const { error } = await supabase
          .from('ranking_cycles')
          .update({
            status: 'finished',
            profile_edit_open: false,
          })
          .eq('cycle_id', currentCycle.cycle_id);
        if (error) throw error;

        // When evaluation finishes, reset all for-ranking users to inactive
        const { error: resetError } = await supabase
          .from('users')
          .update({ status: 'inactive' })
          .eq('status', 'ranking');
        if (resetError) throw resetError;

        // Mark participants in this cycle as removed once evaluation is finished
        const { error: participantsError } = await supabase
          .from('cycle_participants')
          .update({ status: 'removed' })
          .eq('cycle_id', currentCycle.cycle_id)
          .in('status', ['invited', 'accepted']);
        if (participantsError) throw participantsError;

        console.log('âœ… Evaluation finalized successfully');
      }

      if (actionModal.action === 'close') {
        const { error } = await supabase
          .from('ranking_cycles')
          .update({
            status: 'submissions_closed',
          })
          .eq('cycle_id', currentCycle.cycle_id);
        if (error) throw error;
        console.log('âœ… Submissions closed successfully');
      }

      resetActionModal();
      fetchData();
    } catch (err) {
      console.error('âŒ Error updating cycle status:', err);
      alert('Failed to update cycle status: ' + err.message);
    }
  };

  const statCards = [
    {
      iconClass: 'blue', label: 'Total Faculty', value: String(stats.totalFaculty ?? 0),
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    },
    {
      iconClass: 'amber', label: 'Pending Reviews', value: stats.pendingReviews.toString(),
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    },
    {
      iconClass: 'green', label: 'Completed', value: stats.completed.toString(),
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
    },
    {
      iconClass: 'red', label: 'Deadline', value: stats.deadline,
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    },
  ];

  if (loading) {
    return (
      <div className="app">
        <Sidebar />
        <div className="main">
          <div className="content">
            <div className="page-title">Dashboard Overview</div>
            <Loader message="Loading dashboard data..." />
          </div>
        </div>
      </div>
    );
  }

  if (selectedPastCycle) {
    const filteredPastApplications = pastApplications.filter(app => {
      const matchesSearch = pastSearchTerm === '' ||
        `${app.faculty?.name_last} ${app.faculty?.name_first}`.toLowerCase().includes(pastSearchTerm.toLowerCase());
      
      const deptName = app.faculty?.departments?.department_name || app.faculty?.department_id || '';
      const matchesDept = pastDepartmentFilter === 'all' || 
        String(deptName).toLowerCase().includes(pastDepartmentFilter.toLowerCase());

      return matchesSearch && matchesDept;
    });

    return (
      <div className="app">
        <Sidebar />
        <div className="main">
          <div className="content">
            <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button className="btn btn-outline-primary" style={{ padding: '6px 12px' }} onClick={() => setSelectedPastCycle(null)}>← Back</button>
              Ranking Period: {selectedPastCycle.title}
            </div>
            
            <div className="toolbar" style={{ marginTop: '20px' }}>
              <div className="toolbar-left">
                <span className="toolbar-label">Completed Applications ({filteredPastApplications.length})</span>
                <div className="search-wrap" style={{ marginLeft: '20px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input
                    type="text"
                    placeholder="Search faculty name"
                    value={pastSearchTerm}
                    onChange={(e) => setPastSearchTerm(e.target.value)}
                  />
                </div>
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '13px', marginLeft: '12px', marginRight: '12px' }} onClick={() => handleExportCSV(selectedPastCycle.cycle_id, selectedPastCycle.title)}>
                  Export CSV
                </button>
                <div className="filter-wrap">
                  <select value={pastDepartmentFilter} onChange={(e) => setPastDepartmentFilter(e.target.value)}>
                    <option value="all">All Departments</option>
                    <option value="CCS">CCS</option>
                    <option value="CEAS">CEAS</option>
                    <option value="CBA">CBA</option>
                    <option value="BSA">BSA</option>
                  </select>
                </div>
              </div>
            </div>

            {filteredPastApplications.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#666', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', marginTop: '16px' }}>
                <div style={{ fontSize: '16px', marginBottom: '8px' }}>No completed applications found for this cycle.</div>
              </div>
            ) : (
              <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden', marginTop: '16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', fontSize: '13px' }}>No.</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', fontSize: '13px' }}>Name</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', fontSize: '13px' }}>Department</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', fontSize: '13px' }}>Current Rank</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', fontSize: '13px' }}>Final Score</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', fontSize: '13px' }}>Status</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', fontSize: '13px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPastApplications.map((app, index) => (
                      <tr key={app.application_id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#4b5563' }}>{index + 1}</td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', fontWeight: '500' }}>{app.faculty?.name_last}, {app.faculty?.name_first}</td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#4b5563' }}>{app.faculty?.departments?.department_name || app.faculty?.department_id || 'N/A'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#4b5563' }}>{app.faculty?.current_rank || 'N/A'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', fontWeight: '500' }}>{app.final_score ?? app.hr_score ?? 'Not scored'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                          <span className="badge badge-reviewed" style={{ display: 'inline-block' }}>{app.status.replace(/_/g, ' ')}</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right' }}>
                          <button className="btn btn-outline-primary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleExportSingleFacultyCSV(app)}>
                            Export CSV
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <div className="content">
          <div className="page-title">Dashboard Overview</div>

          <CycleCard 
            cycle={currentCycle} 
            onEdit={() => {
              setModalCycle(currentCycle);
              setFocusDeadlineFields(false);
              setModalOpen(true);
            }} 
            onCycleAction={handleCycleAction}
          />

          <div className="stats-grid">
            {statCards.map((s) => <StatCard key={s.label} {...s} />)}
          </div>

          <div style={{ marginTop: '20px' }}>
            <AreaIVImportPanel currentCycle={currentCycle} applications={applications} showUploader={true} />
          </div>

          <div className="history-card">
            <div className="history-header">
              <div>
                <h3>Ranking Period History</h3>
                <p>All previous evaluation periods</p>
              </div>
              <span className="history-count">{cycleHistory.length} Periods</span>
            </div>
            <div className="history-grid">
              {cycleHistory.length === 0 ? (
                <p style={{ padding: '24px', color: '#6b7280', textAlign: 'center' }}>
                  No previous periods found.
                </p>
              ) : (
                visibleHistory.map((cycle) => <HistoryItem key={cycle.cycle_id} cycle={cycle} onReview={handleReviewCycle} onExport={handleExportCSV} />)
              )}
            </div>
            {cycleHistory.length > historyPageSize && (
              <div className="history-pagination">
                <button
                  className="history-page-btn"
                  onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                  disabled={safeHistoryPage === 1}
                >
                  Previous
                </button>
                <div className="history-page-info">
                  Page {safeHistoryPage} of {totalHistoryPages}
                </div>
                <button
                  className="history-page-btn"
                  onClick={() => setHistoryPage((page) => Math.min(totalHistoryPages, page + 1))}
                  disabled={safeHistoryPage === totalHistoryPages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {modalOpen && (
        <CycleTimelineModal 
          cycle={modalCycle || currentCycle} 
          onClose={() => {
            setModalOpen(false);
            setModalCycle(null);
            setFocusDeadlineFields(false);
          }} 
          onSaved={handleCycleSaved}
          focusDeadline={focusDeadlineFields}
        />
      )}

      <ActionConfirmModal
        open={actionModal.open}
        title={actionModal.title}
        message={actionModal.message}
        confirmLabel={actionModal.confirmLabel}
        confirmTone={actionModal.confirmTone}
        onCancel={resetActionModal}
        onConfirm={confirmCycleAction}
      />
    </div>
  );
}
