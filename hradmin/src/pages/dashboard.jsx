import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/sidenav';
import '../styles/layout.css';
import './dashboard.css';
import { supabase } from '../supabase';
import AreaIVImportPanel from './review/components/AreaIVImportPanel';
import Loader from '../components/Loader';

// ── Cycle Card ───────────────────────────────────────────────
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

// ── Stat Card ────────────────────────────────────────────────
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

// ── History Item ─────────────────────────────────────────────
function HistoryItem({ cycle }) {
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
    <div className="history-item">
      <div className="history-badge">{getStatus()}</div>
      <div className="history-title">{cycle.title}</div>
      <div className="history-meta">
        Started: {formatDate(cycle.start_date)}<br />
        Deadline: {formatDate(cycle.deadline)}
      </div>
      <div className="history-footer">
        <span className="badge badge-published">Published</span>
      </div>
    </div>
  );
}

// ── Action Confirmation Modal ─────────────────────────────────
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
          <button className="action-modal-close" onClick={onCancel} aria-label="Close confirmation">✕</button>
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

// ── Timeline Modal ───────────────────────────────────────────
function TimelineModal({ cycle, onClose, onSaved, focusDeadline = false }) {
  const pad2 = (value) => String(value).padStart(2, '0');

  const toDateObject = (timestamp) => {
    if (!timestamp) return null;
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }

    const parsed = new Date(timestamp);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const toDateInputValue = (timestamp) => {
    const date = toDateObject(timestamp);
    if (!date) return '';
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  };

  const toTimeInputValue = (timestamp, fallback = '23:59') => {
    const date = toDateObject(timestamp);
    if (!date) return fallback;
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  };

  const getCurrentTimeInputValue = () => {
    const now = new Date();
    return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  };

  const deadlineDateRef = useRef(null);

  const mergeLocalDateAndTimeToIso = (dateValue, timeValue) => {
    if (!dateValue) return null;
    const time = timeValue || '00:00';
    const composed = new Date(`${dateValue}T${time}:00`);
    return Number.isNaN(composed.getTime()) ? null : composed.toISOString();
  };

  const existingStartTime = toTimeInputValue(cycle?.start_date, getCurrentTimeInputValue());

  const [form, setForm] = useState({
    title:       cycle?.title       || '',
    yearStart:   cycle?.year        || '',
    yearEnd:     cycle?.year ? cycle.year + 1 : '',
    semester:    cycle?.semester    || 'First Semester',
    start_date:  toDateInputValue(cycle?.start_date),
    start_time:  cycle?.start_date ? toTimeInputValue(cycle.start_date, getCurrentTimeInputValue()) : getCurrentTimeInputValue(),
    deadline:    toDateInputValue(cycle?.deadline),
    deadline_time: cycle?.deadline ? toTimeInputValue(cycle.deadline, '23:59') : getCurrentTimeInputValue(),
    status:      cycle?.status      || 'open',
    profile_edit_open: cycle?.profile_edit_open !== false,
  });
  const [saving, setSaving] = useState(false);

  // Fetch last cycle on mount to pre-populate year if creating new
  useEffect(() => {
    const fetchLastCycle = async () => {
      if (cycle) return; // Skip if editing existing cycle
      
      try {
        const { data, error } = await supabase
          .from('ranking_cycles')
          .select('year')
          .order('cycle_id', { ascending: false })
          .limit(1);
        
        if (error) throw error;
        if (data && data.length > 0) {
          const lastYear = data[0].year;
          setForm(prev => ({
            ...prev,
            yearStart: lastYear,
            yearEnd: lastYear + 1,
          }));
        }
      } catch (err) {
        console.warn('Could not fetch last cycle year:', err);
      }
    };
    
    fetchLastCycle();
  }, [cycle]);

  useEffect(() => {
    if (focusDeadline && deadlineDateRef.current) {
      deadlineDateRef.current.focus();
      deadlineDateRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [focusDeadline]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // Format date to "May 10, 2026" format
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return 'No date';
    const date = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(date.getTime())) return 'No date';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Format time to 12-hour AM/PM format
  const formatTimeDisplay = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const m = minutes;
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHours = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayHours}:${m} ${period}`;
  };

  // Utility function to remove undefined values from object
  const cleanData = (data) => {
    const cleaned = {};
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        cleaned[key] = value;
      }
    });
    return cleaned;
  };

  const generateTitle = () => {
    if (form.yearStart && form.yearEnd) {
      return `${form.semester} ${form.yearStart}-${form.yearEnd}`;
    }
    return `${form.semester} [Enter academic year]`;
  };

  const handleSave = async () => {
    // Validate academic year - allow if populated (including from fetch)
    if (!form.yearStart || !form.yearEnd) {
      alert('Please enter both start and end years for the academic year.');
      return;
    }

    const title = form.title || generateTitle();
    // Keep local date/time from the form for deterministic cycle/profile window behavior.
    const startTimestamp = mergeLocalDateAndTimeToIso(form.start_date, form.start_time || existingStartTime) || new Date().toISOString();
    const deadlineTimestamp = mergeLocalDateAndTimeToIso(form.deadline, form.deadline_time) || new Date().toISOString();
    const startDateObj = new Date(startTimestamp);
    const deadlineDateObj = new Date(deadlineTimestamp);

    if (deadlineDateObj < startDateObj) {
      alert('Deadline cannot be earlier than start date/time.');
      return;
    }

    // Get the current logged-in user
    const {
      data: { user: sessionUser },
      error: userError
    } = await supabase.auth.getUser();
    if (userError || !sessionUser) {
      alert('Could not get current user. Please log in again.');
      return;
    }

    // Fetch the user's row from the users table to get the integer id
    let userId;
    let userRows, userRowError;
    ({ data: userRows, error: userRowError } = await supabase
      .from('users')
      .select('user_id')
      .eq('domain_email', sessionUser.email)
      .limit(1));
    if (!userRowError && userRows && userRows.length > 0) {
      userId = userRows[0].user_id;
    } else {
      // If not found, create a new profile row for this user
      const { data: inserted, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            name_last: 'Admin',
            name_first: 'System',
            domain_email: sessionUser.email,
            password_hash: 'supabase-auth',
            role: 'HR',
            created_at: new Date().toISOString(),
          }
        ])
        .select('user_id');
      if (insertError || !inserted || inserted.length === 0) {
        alert('Could not create user profile in database.');
        return;
      }
      userId = inserted[0].user_id;
    }

    const cycleData = {
      title,
      year: Number(form.yearStart),
      semester: form.semester,
      start_date: startTimestamp,
      deadline: deadlineTimestamp,
      status: form.status,
      profile_edit_start: startTimestamp,
      profile_edit_deadline: deadlineTimestamp,
      // Admin-controlled lock switch. Faculty-side still checks cycle time window.
      profile_edit_open: form.profile_edit_open,
      created_by: userId, // Use integer user_id
    };

    // Add timestamps
    if (cycle?.cycle_id) {
      // Updating existing cycle - preserve created_at or set it if missing
      cycleData.created_at = cycle.created_at || new Date().toISOString();
    } else {
      // New cycle
      cycleData.created_at = new Date().toISOString();
    }

    // Clean undefined values from the data
    const cleanedData = cleanData(cycleData);

    setSaving(true);
    try {
      // Validate that all required fields are defined
      const requiredFields = ['title', 'year', 'semester', 'start_date', 'deadline', 'status', 'created_at', 'created_by'];
      const missingFields = requiredFields.filter(field =>
        cleanedData[field] === undefined || cleanedData[field] === null
      );

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      console.log('💾 Saving cycle data:', cleanedData);
      
      if (cycle?.cycle_id) {
        // Update cycle in Supabase
        const { error } = await supabase
          .from('ranking_cycles')
          .update(cleanedData)
          .eq('cycle_id', cycle.cycle_id);
        if (error) throw error;
        console.log('✅ Cycle updated successfully');
      } else {
        // Insert new cycle in Supabase
        const { data, error } = await supabase
          .from('ranking_cycles')
          .insert([cleanedData]);
        if (error) throw error;
        console.log('✅ New cycle created:', data);

        // Reset all 'ranking' users to 'inactive' for the new cycle
        const { error: resetError } = await supabase
          .from('users')
          .update({ status: 'inactive' })
          .eq('status', 'ranking');
        if (resetError) {
          console.warn('⚠️ Warning: Could not reset users for new cycle:', resetError.message);
        } else {
          console.log('✅ All ranking users reset to inactive for new cycle');
        }
      }
      onSaved();
    } catch (err) {
      console.error('❌ Error saving cycle:', err);
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay open" onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-kicker">Ranking Period Builder</div>
            <h3>{cycle?.cycle_id ? 'Edit Period' : 'Create New Period'}</h3>
            <div className="modal-subtitle">
              Configure the semester cycle, lock/unlock faculty profile editing, and set the exact time window for submissions.
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        <div className="modal-body">
          <div className="summary-banner" style={{ marginBottom: '16px' }}>
            <strong>Tip:</strong> <b>Period Status</b> controls whether the period is active or closed. <b>Profile Access</b> controls whether faculty may edit their profile, and admin lock always wins.
          </div>

          <div className="modal-panel">
            <div className="modal-panel-body">
              <div className="modal-grid">
                <div className="modal-field">
                  <label>Academic Year</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      type="number"
                      value={form.yearStart}
                      onChange={e => {
                        const val = e.target.value;
                        const startYear = val === '' || val === '0' ? '' : Number(val);
                        set('yearStart', startYear);
                        // Auto-update end year if it's not manually set or is just +1
                        if (startYear && form.yearEnd === (form.yearStart || 0) + 1) {
                          set('yearEnd', startYear + 1);
                        }
                      }}
                      placeholder="2026"
                      style={{ width: '100px' }}
                    />
                    <span style={{ color: '#666' }}>—</span>
                    <input
                      type="number"
                      value={form.yearEnd}
                      onChange={e => {
                        const val = e.target.value;
                        const endYear = val === '' || val === '0' ? '' : Number(val);
                        set('yearEnd', endYear);
                      }}
                      placeholder="2027"
                      style={{ width: '100px' }}
                    />
                  </div>
                </div>
                <div className="modal-field">
                  <label>Semester</label>
                  <select value={form.semester} onChange={e => set('semester', e.target.value)}>
                    <option>First Semester</option>
                    <option>Second Semester</option>
                  </select>
                </div>
              </div>

              <div className="modal-grid">
                <div className="modal-field">
                  <label>Period Title</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => set('title', e.target.value)}
                    placeholder={generateTitle()}
                  />
                </div>
                <div className="modal-field">
                  <label>Period Status</label>
                  <select value={form.status} onChange={e => set('status', e.target.value)}>
                    <option value="open">Open</option>
                    <option value="submissions_closed">Submissions Closed</option>
                  </select>
                  <small>Use Submissions Closed to keep evaluation active.</small>
                </div>
              </div>

              <div className="modal-grid">
                <div className="modal-field">
                  <label>Start Date & Time</label>
                  <div className="year-range">
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={e => set('start_date', e.target.value)}
                    />
                    <input
                      type="time"
                      value={form.start_time}
                      onChange={e => set('start_time', e.target.value)}
                      style={{ width: '96px' }}
                    />
                  </div>
                  <small>Faculty profile editing opens from this time if profile access is allowed.</small>
                </div>
                <div className="modal-field">
                  <label>Deadline Date & Time</label>
                  <div className={`year-range deadline-row ${focusDeadline ? 'deadline-highlight' : ''}`}>
                    <input
                      type="date"
                      ref={deadlineDateRef}
                      value={form.deadline}
                      onChange={e => set('deadline', e.target.value)}
                    />
                    <input
                      type="time"
                      value={form.deadline_time}
                      onChange={e => set('deadline_time', e.target.value)}
                      style={{ width: '96px' }}
                    />
                  </div>
                  <small>Adjust this when reopening submissions after the deadline.</small>
                </div>
              </div>

              <div className="modal-grid">
                <div className="modal-field">
                  <label>Profile Access</label>
                  <select
                    value={form.profile_edit_open ? 'open' : 'locked'}
                    onChange={e => set('profile_edit_open', e.target.value === 'open')}
                  >
                    <option value="open">Open for faculty editing</option>
                    <option value="locked">Locked by admin</option>
                  </select>
                  <small>Locked overrides the current period, even while the period itself is open.</small>
                </div>
                <div className="modal-field">
                  <label>Access Result</label>
                  <input
                    type="text"
                    readOnly
                    value={form.profile_edit_open
                      ? 'Faculty may edit within the active time window.'
                      : 'Faculty profile is locked by admin.'}
                  />
                </div>
              </div>

              <div className="summary-box" style={{ marginTop: '10px', marginBottom: 0 }}>
                <div className="summary-row">
                  <div>
                    <label>Preview</label>
                    <span style={{ display: 'block', marginTop: '4px' }}>{form.title || generateTitle()}</span>
                    <span style={{ display: 'block', marginTop: '6px', color: 'var(--muted)', fontSize: '0.74rem' }}>
                      {formatDateDisplay(form.start_date)} {form.start_time ? `• ${formatTimeDisplay(form.start_time)}` : 'No start date'} {' '}→{' '}
                      {formatDateDisplay(form.deadline)} {form.deadline_time ? `• ${formatTimeDisplay(form.deadline_time)}` : 'No deadline'}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`summary-pill ${form.status}`}>
                        {form.status === 'open' ? 'Open' : 'Submissions Closed'}
                    </span>
                    <span className={`summary-pill ${form.profile_edit_open ? 'open' : 'closed'}`} style={{ marginLeft: '8px' }}>
                      {form.profile_edit_open ? 'Profile Open' : 'Profile Locked'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-save" onClick={handleSave} disabled={saving}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard Page ───────────────────────────────────────────
export default function Dashboard() {
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

  // importer is embedded in the dashboard UI now

  const fetchData = async ({ showLoader = true } = {}) => {
    if (showLoader) {
      setLoading(true);
    }
    try {
      console.log('🔄 Starting data fetch (Supabase)...');

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
      console.log(`🔄 Updating cycle ${currentCycle.cycle_id} status to: open`);
      const { error } = await supabase
        .from('ranking_cycles')
        .update({
          status: 'open',
          profile_edit_open: true,
        })
        .eq('cycle_id', currentCycle.cycle_id);
      if (error) throw error;
      console.log('✅ Cycle reopened successfully');
      fetchData(); // Refresh data
    } catch (err) {
      console.error('❌ Error updating cycle status:', err);
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
        console.log(`✅ Profile access ${nextProfileEditOpen ? 'unlocked' : 'locked'} successfully`);
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

        console.log('✅ Evaluation finalized successfully');
      }

      if (actionModal.action === 'close') {
        const { error } = await supabase
          .from('ranking_cycles')
          .update({
            status: 'submissions_closed',
          })
          .eq('cycle_id', currentCycle.cycle_id);
        if (error) throw error;
        console.log('✅ Submissions closed successfully');
      }

      resetActionModal();
      fetchData();
    } catch (err) {
      console.error('❌ Error updating cycle status:', err);
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
                visibleHistory.map((cycle) => <HistoryItem key={cycle.cycle_id} cycle={cycle} />)
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
        <TimelineModal 
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