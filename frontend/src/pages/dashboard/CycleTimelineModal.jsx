import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabase';

export default function CycleTimelineModal({ cycle, onClose, onSaved, focusDeadline = false }) {
  const pad2 = (value) => String(value).padStart(2, '0');

  // Extract numeric year start from either format: "2026" or "2026-2027"
  const extractYearStart = (yearValue) => {
    if (!yearValue) return '';
    if (typeof yearValue === 'number') return yearValue;
    if (typeof yearValue === 'string') {
      const match = yearValue.match(/^(\d{4})/);
      return match ? parseInt(match[1], 10) : '';
    }
    return '';
  };

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
    yearStart:   extractYearStart(cycle?.year),
    yearEnd:     extractYearStart(cycle?.year) ? extractYearStart(cycle?.year) + 1 : '',
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
          const lastYear = extractYearStart(data[0].year);
          const nextYear = lastYear ? lastYear + 1 : '';
          setForm(prev => ({
            ...prev,
            yearStart: lastYear,
            yearEnd: nextYear,
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
      year: `${Number(form.yearStart)}-${Number(form.yearStart) + 1}`,
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
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 01-2 2z"/>
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
