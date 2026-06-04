import { useState, useEffect } from 'react';
import Sidebar from '../components/sidenav';
import '../styles/layout.css';
import './usermanagement.css';
import EducationModal from './usermanagement/EducationModal';
import EligibilityModal from './usermanagement/EligibilityModal';
import DoctoralModal from './usermanagement/DoctoralModal';
import ConfirmArchiveModal from './usermanagement/ConfirmDeleteModal';

import FacultyRow from './usermanagement/FacultyRow';
import ViewPanel from './usermanagement/ViewPanel';
import ApplyForInput from './usermanagement/ApplyForInput';
import AddUserModal from './usermanagement/AddUserModal';
import Loader from '../components/Loader';
import { apiRequest } from '../lib/apiClient';
// ── Helper Functions ────────────────────────────────────────
function parseIntegerOrNull(value) {
  const parsed = Number.parseInt(String(value).trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function isNumericId(value) {
  if (value === null || value === undefined) return false;
  const s = String(value).trim();
  return /^\d+$/.test(s);
}

function getFirstValue(source, keys, fallback = null) {
  if (!source) return fallback;
  for (const key of keys) {
    const val = source[key];
    if (val != null) return val;
  }
  return fallback;
}
function parseArrayField(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toDateInputValue(value) {
  if (!value) return '';
  const text = String(value).trim();
  const directMatch = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (directMatch) return directMatch[1];

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function normalizeEducationEntry(entry) {
        if (typeof entry === 'string') return { level: 'Credential', degree: entry, institution: '', yearGraduated: '', pending: false };
        return {
            level: String(getFirstValue(entry, ['level', 'type'], 'Credential')),
            degree: String(getFirstValue(entry, ['degree', 'title', 'name'], 'Untitled degree')),
            institution: String(getFirstValue(entry, ['institution', 'school', 'meta'], '')),
            yearGraduated: String(getFirstValue(entry, ['yearGraduated', 'year'], '')),
            pending: Boolean(getFirstValue(entry, ['pending'], false)),
        };
    }

    function normalizeEligibilityEntry(entry) {
      if (typeof entry === 'string') return { text: entry, examName: entry, datePassed: '', pending: false };
      return {
        text: String(getFirstValue(entry, ['text', 'name', 'title'], 'Eligibility')),
        examName: String(getFirstValue(entry, ['examName', 'name', 'text'], '')),
        datePassed: String(getFirstValue(entry, ['datePassed', 'date'], '')),
        pending: Boolean(getFirstValue(entry, ['pending'], false)),
      };
    }

    function normalizeDoctorateEntry(entry) {
      if (typeof entry === 'string') return { degree: entry, institution: '', yearGraduated: '', pending: false };
      return {
        degree: String(getFirstValue(entry, ['degree', 'title', 'name'], 'Untitled degree')),
        institution: String(getFirstValue(entry, ['institution', 'school', 'meta'], '')),
        yearGraduated: String(getFirstValue(entry, ['yearGraduated', 'year'], '')),
        pending: Boolean(getFirstValue(entry, ['pending'], false)),
      };
    }

    function buildEducationPayload(educationList) {
        return {
            educational_attainment_json: (educationList || []).map((entry) => ({
                level: entry.level,
                degree: entry.degree,
                institution: entry.institution || entry.school || null,
                yearGraduated: entry.yearGraduated || entry.year || null,
                pending: Boolean(entry.pending),
            })),
            educational_attainment: educationList?.[0]?.degree || null,
        };
    }

    function buildEligibilityPayload(eligibilityList) {
        return {
            eligibility_exams_json: (eligibilityList || []).map((entry) => ({
                text: entry.text,
                examName: entry.examName || entry.text || null,
                datePassed: entry.datePassed || null,
                pending: Boolean(entry.pending),
            })),
            eligibility_exams: (eligibilityList || []).map((entry) => entry.text).join('\n') || null,
        };
    }

    function buildDoctoratePayload(doctoralList) {
        return {
            doctorate: (doctoralList || []).map((entry) => ({
                degree: entry.degree,
                institution: entry.institution || entry.school || null,
                yearGraduated: entry.yearGraduated || entry.year || null,
                pending: Boolean(entry.pending),
            })),
        };
    }

    // Modal and row components are extracted to separate files in ./usermanagement/
    

// ── Edit Panel ───────────────────────────────────────────────
function EditPanel({ faculty, onClose, onSaved, departments = [], selectedCycleId = '', cycles = [] }) {
  const DEPARTMENT_ORDER = ['CCS', 'CHTM', 'CBA', 'CAHS', 'CEAS'];
  const CODE_ALIASES = {
    BA: 'CBA',
    CS: 'CCS',
    ENG: 'CEAS',
  };

  const toCanonicalDepartmentCode = (dept) => {
    const rawCode = String(dept?.department_code || '').trim().toUpperCase();
    const name = String(dept?.department_name || '').trim().toUpperCase();
    const aliased = CODE_ALIASES[rawCode] || rawCode;
    if (DEPARTMENT_ORDER.includes(aliased)) return aliased;

    if (name.includes('COMPUTER')) return 'CCS';
    if (name.includes('HOTEL') || name.includes('TOURISM')) return 'CHTM';
    if (name.includes('BUSINESS')) return 'CBA';
    if (name.includes('ALLIED HEALTH') || name.includes('HEALTH')) return 'CAHS';
    if (name.includes('ENGINEERING') || name.includes('ARCHITECTURE')) return 'CEAS';
    return null;
  };

  const orderedDepartmentOptions = DEPARTMENT_ORDER
    .map((code) => {
      const match = (departments || []).find((d) => toCanonicalDepartmentCode(d) === code);
      return match ? { value: String(match.department_id), label: code } : null;
    })
    .filter(Boolean);

  const RANKS = [
    'Instructor I','Instructor II','Instructor III',
    'Assistant Professor I','Assistant Professor II','Assistant Professor III','Assistant Professor IV',
    'Associate Professor I','Associate Professor II','Associate Professor III','Associate Professor IV','Associate Professor V',
    'Professor I','Professor II','Professor III','Professor IV','Professor V'
  ];
  const NATURES = ['Permanent', 'Full-Time', 'Part-Time'];

  const [form, setForm] = useState({
    nameLast: faculty?.name ? faculty.name.split(',')[0]?.trim() : '',
    nameFirst: faculty?.name ? faculty.name.split(',')[1]?.trim() : '',
    nameMiddle: '',
    email: faculty?.email ?? '',
    department: faculty?.department != null ? String(faculty.department) : '',
    presentRank: faculty?.presentRank || 'Instructor I',
    natureOfAppointment: faculty?.natureOfAppointment ?? 'Permanent',
    teachingYears: faculty?.teachingYears ?? '',
    industryYears: faculty?.industryYears ?? '',
    applyingFor: (function(){
      const v = faculty?.applyingFor ?? '';
      if (!v) return [];
      if (Array.isArray(v)) return v;
      return String(v).split(/\s*,\s*/).filter(Boolean);
    })(),
    lastPromotionDate: toDateInputValue(faculty?.lastPromotionDate),
    status: faculty?.status ?? 'ranking',
  });

  const [educationList, setEducationList] = useState(faculty?.educationList || []);
  const [eligibilityList, setEligibilityList] = useState(faculty?.eligibilityList || []);
  const [doctoralList, setDoctoralList] = useState(faculty?.doctoralList || []);
  
  const [editEduIndex, setEditEduIndex] = useState(null);
  const [editEligIndex, setEditEligIndex] = useState(null);
  const [editDoctoralIndex, setEditDoctoralIndex] = useState(null);
  
  const [eduModalOpen, setEduModalOpen] = useState(false);
  const [eligModalOpen, setEligModalOpen] = useState(false);
  const [doctoralModalOpen, setDoctoralModalOpen] = useState(false);
  
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleAddEdu = (eduData) => {
    setEducationList([...educationList, eduData]);
  };

  const handleUpdateEdu = (index, eduData) => {
    const updated = [...educationList];
    updated[index] = eduData;
    setEducationList(updated);
  };

  const handleDeleteEdu = (index) => {
    setEducationList(educationList.filter((_, i) => i !== index));
  };

  const handleAddElig = (eligData) => {
    setEligibilityList([...eligibilityList, eligData]);
  };

  const handleUpdateElig = (index, eligData) => {
    const updated = [...eligibilityList];
    updated[index] = eligData;
    setEligibilityList(updated);
  };

  const handleDeleteElig = (index) => {
    setEligibilityList(eligibilityList.filter((_, i) => i !== index));
  };

  const handleAddDoctoral = (docData) => {
    setDoctoralList([...doctoralList, docData]);
  };

  const handleUpdateDoctoral = (index, docData) => {
    const updated = [...doctoralList];
    updated[index] = docData;
    setDoctoralList(updated);
  };

  const handleDeleteDoctoral = (index) => {
    setDoctoralList(doctoralList.filter((_, i) => i !== index));
  };

  const syncCycleParticipantForStatus = async (nextStatus) => {
    const numericFacultyId = parseIntegerOrNull(faculty?.id);
    const fallbackOpenCycle = (cycles || []).find((c) => c?.status === 'open' || c?.status === 'submissions_closed');
    const cycleIdForSync = selectedCycleId || (fallbackOpenCycle ? String(fallbackOpenCycle.cycle_id) : '');

    if (!numericFacultyId) return;

    if (nextStatus === 'ranking') {
      if (!cycleIdForSync) {
        throw new Error('No active/selected period found. Please select a period before applying for ranking.');
      }

      await apiRequest(`/hr/cycles/${cycleIdForSync}/participants`, {
        method: 'POST',
        body: {
          faculty_id: numericFacultyId,
          invite_email: form.email,
          status: 'accepted',
        },
      });
    } else {
      if (!cycleIdForSync) return;

      await apiRequest(`/hr/cycles/${cycleIdForSync}/participants/${numericFacultyId}`, {
        method: 'DELETE',
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      // Creating new user
      if (!faculty?.id) {
        if (!form.email.trim()) {
          setError('Email is required to create a new user');
          return;
        }

        if (!password.trim()) {
          setError('Password is required to create a new user');
          return;
        }

        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          return;
        }

        await apiRequest('/hr/users', {
          method: 'POST',
          body: {
            email: form.email.trim(),
            name_first: form.nameFirst.trim(),
            name_middle: form.nameMiddle?.trim() || null,
            name_last: form.nameLast.trim(),
            current_rank: form.presentRank || null,
            nature_of_appointment: form.natureOfAppointment || null,
            last_promotion_date: form.lastPromotionDate || null,
            password: password,
            cycle_id: selectedCycleId || null,
            status: 'ranking',
          },
        });

        onSaved();
        return;
      }

      // Updating existing user
      const updateData = {
        name_last: form.nameLast.trim(),
        name_first: form.nameFirst.trim(),
        name_middle: form.nameMiddle?.trim() || null,
        department_id: parseIntegerOrNull(form.department),
        current_rank: form.presentRank || null,
        nature_of_appointment: form.natureOfAppointment || null,
        teaching_experience_years: form.teachingYears ? parseIntegerOrNull(form.teachingYears) : null,
        industry_experience_years: form.industryYears ? parseIntegerOrNull(form.industryYears) : null,
        // store both a human-readable string (legacy) and a structured json array
        applying_for: Array.isArray(form.applyingFor) ? (form.applyingFor.join(', ') || null) : (form.applyingFor || null),
        applying_for_json: Array.isArray(form.applyingFor)
          ? form.applyingFor
          : (form.applyingFor ? String(form.applyingFor).split(/\s*,\s*/).filter(Boolean) : null),
        last_promotion_date: form.lastPromotionDate || null,
        status: form.status || 'ranking',
        ...buildEducationPayload(educationList),
        ...buildEligibilityPayload(eligibilityList),
        ...buildDoctoratePayload(doctoralList),
      };

      await apiRequest(`/hr/users/${faculty?.id}`, {
        method: 'PUT',
        body: updateData,
      });

      // Keep cycle_participants in sync with user status for the selected/current cycle
      await syncCycleParticipantForStatus(form.status || 'ranking');

      onSaved();
    } catch (err) {
      setError('Failed to save: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };


  const handleArchive = async () => {
    if (!faculty?.id) return;
    try {
      await apiRequest(`/hr/users/${faculty.id}/archive`, {
        method: 'POST',
        body: {
          reason: 'Archived from HR Admin portal',
        },
      });
      onSaved();
    } catch (err) {
      setError('Failed to archive: ' + err.message);
    }
  };

  const handleToggleRankingStatus = async () => {
    if (!form.email) {
      setError('No email available to identify the user');
      return;
    }

    const nextStatus = form.status === 'ranking' ? 'inactive' : 'ranking';

    try {
      setSaving(true);
      setError('');

      // Persist toggled status
      await apiRequest(`/hr/users/${faculty?.id}/status`, {
        method: 'PUT',
        body: { status: nextStatus },
      });

      // Sync cycle participants for this toggle action as well
      await syncCycleParticipantForStatus(nextStatus);

      // Update local form state and refresh list
      set('status', nextStatus);
      onSaved();
    } catch (err) {
      setError('Failed to update status: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel-overlay open" onClick={(e) => e.target.classList.contains('panel-overlay') && onClose()}>
      <div className="panel">

        <div className="panel-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <h3>{faculty?.id ? 'Edit Faculty' : 'Add Faculty'}</h3>
        </div>

        <div className="panel-body">

          {/* Personal Details */}
          <div className="panel-section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Personal Details
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div className="field-group">
              <label>Last Name *</label>
              <input className="field-input" value={form.nameLast} onChange={e => set('nameLast', e.target.value)} placeholder="Sancon" />
            </div>
            <div className="field-group">
              <label>First Name *</label>
              <input className="field-input" value={form.nameFirst} onChange={e => set('nameFirst', e.target.value)} placeholder="John" />
            </div>
            <div className="field-group">
              <label>Middle Name</label>
              <input
                className="field-input"
                value={form.nameMiddle}
                onChange={e => set('nameMiddle', e.target.value)}
                onBlur={(e) => {
                  const v = (e.target.value || '').trim();
                  if (!v) { set('nameMiddle', ''); return; }
                  // convert to initial with dot: 'Carlos' -> 'C.'
                  const initial = v.charAt(0).toUpperCase() + '.';
                  set('nameMiddle', initial);
                }}
                placeholder="C."
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: !faculty?.id ? '1fr 1fr' : '1fr', gap: '16px', marginBottom: '24px' }}>
            <div className="field-group">
              <label>Email {!faculty?.id && '*'}</label>
              <input className="field-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="faculty@gordoncollege.edu.ph" disabled={!!faculty?.id} style={faculty?.id ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}} />
            </div>
            {!faculty?.id && (
              <div className="field-group">
                <label>Password *</label>
                <input className="field-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password (min 6 characters)" />
              </div>
            )}
            {faculty?.id && (
              <div className="field-group">
                <label>Department</label>
                <div className="select-field">
                  <select value={form.department} onChange={e => set('department', e.target.value)}>
                    <option value="">Select Department</option>
                    {orderedDepartmentOptions.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div className="field-group">
              <label>Status</label>
              <div className="select-field">
                <select value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="ranking">For Ranking</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Employment Status */}
          <div className="panel-section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
            Employment Status
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div className="field-group">
              <label>Present Rank</label>
              <div className="select-field">
                <select value={form.presentRank} onChange={e => set('presentRank', e.target.value)}>
                  {RANKS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="field-group">
              <label>Nature of Appointment</label>
              <div className="select-field">
                <select value={form.natureOfAppointment} onChange={e => set('natureOfAppointment', e.target.value)}>
                  {NATURES.map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div className="field-group">
              <label>Last Promotion Date</label>
              <input className="field-input" type="date" value={form.lastPromotionDate} onChange={e => set('lastPromotionDate', e.target.value)} />
            </div>
          </div>

          {/* Educational Attainment */}
          <div className="panel-section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
            Educational Attainment
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            {educationList.map((e, i) => (
              <div key={i} className="edu-item" style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{e.degree}</div>
                  <small style={{ color: '#666' }}>{e.institution || e.school || ''}</small>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" className="icon-del-btn" onClick={() => { setEditEduIndex(i); setEduModalOpen(true); }} title="Edit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button type="button" className="icon-del-btn" onClick={() => handleDeleteEdu(i)} title="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="icon-add-btn" onClick={() => { setEditEduIndex(null); setEduModalOpen(true); }} style={{ marginBottom: '24px', display: 'block' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '14px', height: '14px', display: 'inline', marginRight: '4px' }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Education
          </button>

          {/* Eligibility */}
          <div className="panel-section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Eligibility
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {eligibilityList.map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
                <span style={{ flex: 1, fontWeight: '500' }}>{e.text}</span>
                <button type="button" className="icon-del-btn" onClick={() => { setEditEligIndex(i); setEligModalOpen(true); }} title="Edit" style={{ padding: '4px 8px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px', display: 'inline' }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button type="button" className="icon-del-btn" onClick={() => handleDeleteElig(i)} title="Delete" style={{ padding: '4px 8px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px', display: 'inline' }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="icon-add-btn" onClick={() => { setEditEligIndex(null); setEligModalOpen(true); }} style={{ marginBottom: '24px', display: 'block' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '14px', height: '14px', display: 'inline', marginRight: '4px' }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Eligibility
          </button>

          {/* Doctorate */}
          <div className="panel-section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
            Doctorate
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            {doctoralList.map((d, i) => (
              <div key={i} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{d.degree}</div>
                  <small style={{ color: '#666' }}>{d.institution || d.school || ''}</small>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" className="icon-del-btn" onClick={() => { setEditDoctoralIndex(i); setDoctoralModalOpen(true); }} title="Edit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button type="button" className="icon-del-btn" onClick={() => handleDeleteDoctoral(i)} title="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="icon-add-btn" onClick={() => { setEditDoctoralIndex(null); setDoctoralModalOpen(true); }} style={{ marginBottom: '24px', display: 'block' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '14px', height: '14px', display: 'inline', marginRight: '4px' }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Doctorate
          </button>

          {/* Experience & Promotion */}
          <div className="panel-section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Experience & Promotion
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div className="field-group">
              <label>Teaching Experience (years)</label>
              <input className="field-input" value={form.teachingYears} onChange={e => set('teachingYears', e.target.value)} placeholder="0" type="number" />
            </div>
            <div className="field-group">
              <label>Industry Experience (years)</label>
              <input className="field-input" value={form.industryYears} onChange={e => set('industryYears', e.target.value)} placeholder="0" type="number" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div className="field-group">
              <label>Applying For</label>
              <ApplyForInput options={RANKS} value={form.applyingFor || []} onChange={(v) => set('applyingFor', v)} />
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 6 }}>Click "Add Rank" to select multiple ranks you're applying for.</div>
            </div>
          </div>

          {error && <p className="panel-error" style={{ marginBottom: '16px' }}>{error}</p>}

        </div>

        <div className="panel-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          {faculty?.id && (
            <button className="btn btn-danger" onClick={handleArchive}>Archive</button>
          )}
          <button className="btn btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn btn-save" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            className="btn btn-apply"
            onClick={handleToggleRankingStatus}
            disabled={saving}
            style={{ background: form.status === 'ranking' ? '#ef4444' : undefined }}
          >
            {form.status === 'ranking' ? 'Set Inactive' : 'Apply for Ranking'}
          </button>
        </div>

        <EducationModal
          isOpen={eduModalOpen}
          initialData={editEduIndex !== null ? educationList[editEduIndex] : null}
          onClose={() => { setEduModalOpen(false); setEditEduIndex(null); }}
          onSubmit={(data) => {
            if (editEduIndex !== null) {
              handleUpdateEdu(editEduIndex, data);
            } else {
              handleAddEdu(data);
            }
            setEduModalOpen(false);
            setEditEduIndex(null);
          }}
          isLoading={false}
        />
        <EligibilityModal
          isOpen={eligModalOpen}
          initialData={editEligIndex !== null ? eligibilityList[editEligIndex] : null}
          onClose={() => { setEligModalOpen(false); setEditEligIndex(null); }}
          onSubmit={(data) => {
            if (editEligIndex !== null) {
              handleUpdateElig(editEligIndex, data);
            } else {
              handleAddElig(data);
            }
            setEligModalOpen(false);
            setEditEligIndex(null);
          }}
          isLoading={false}
        />
        <DoctoralModal
          isOpen={doctoralModalOpen}
          initialData={editDoctoralIndex !== null ? doctoralList[editDoctoralIndex] : null}
          onClose={() => { setDoctoralModalOpen(false); setEditDoctoralIndex(null); }}
          onSubmit={(data) => {
            if (editDoctoralIndex !== null) {
              handleUpdateDoctoral(editDoctoralIndex, data);
            } else {
              handleAddDoctoral(data);
            }
            setDoctoralModalOpen(false);
            setEditDoctoralIndex(null);
          }}
          isLoading={false}
        />
      </div>
    </div>
  );
}

// ── Confirm Archive Modal ────────────────────────────────────
// ConfirmArchiveModal extracted to ./usermanagement/ConfirmDeleteModal.jsx

// ── View Panel (Read-only) ──────────────────────────────────
// ViewPanel extracted to ./usermanagement/ViewPanel.jsx

// ── Faculty Row ──────────────────────────────────────────────
// FacultyRow extracted to ./usermanagement/FacultyRow.jsx

// ── User Management Page ─────────────────────────────────────
export default function UserManagement() {
  const DEPARTMENT_ORDER = ['CCS', 'CHTM', 'CBA', 'CAHS', 'CEAS'];
  const CODE_ALIASES = {
    BA: 'CBA',
    CS: 'CCS',
    ENG: 'CEAS',
  };

  const toCanonicalDepartmentCode = (dept) => {
    const rawCode = String(dept?.department_code || '').trim().toUpperCase();
    const name = String(dept?.department_name || '').trim().toUpperCase();
    const aliased = CODE_ALIASES[rawCode] || rawCode;
    if (DEPARTMENT_ORDER.includes(aliased)) return aliased;

    if (name.includes('COMPUTER')) return 'CCS';
    if (name.includes('HOTEL') || name.includes('TOURISM')) return 'CHTM';
    if (name.includes('BUSINESS')) return 'CBA';
    if (name.includes('ALLIED HEALTH') || name.includes('HEALTH')) return 'CAHS';
    if (name.includes('ENGINEERING') || name.includes('ARCHITECTURE')) return 'CEAS';
    return null;
  };

  const [selected, setSelected]         = useState(null);
  const [showAddUser, setShowAddUser]   = useState(false);
  const [viewing, setViewing]           = useState(null);
  const [search, setSearch]             = useState('');
  const [deptFilter, setDeptFilter]     = useState('All Departments');
  const [statusFilter, setStatusFilter] = useState('All Status');
  // sync flow removed; using `users.status` ('ranking' / 'inactive') as source of participation
  const [loading, setLoading]           = useState(true);
  const [loadError, setLoadError]       = useState('');
  const [departments, setDepartments]   = useState([]);
  const [cycles, setCycles]             = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [facultyList, setFacultyList]   = useState([]);
  const [facultyPage, setFacultyPage]   = useState(1);

  const FACULTY_PAGE_SIZE = 10;

  const orderedDepartmentOptions = DEPARTMENT_ORDER
    .map((code) => {
      const match = (departments || []).find((d) => toCanonicalDepartmentCode(d) === code);
      return match ? { value: String(match.department_id), label: code } : null;
    })
    .filter(Boolean);

  const fetchFaculty = async () => {
    setLoading(true);
    setLoadError('');
    try {
      // Get all users
      const data = await apiRequest('/hr/users');

      // Get current cycle for checking active participants
      const allCycles = await apiRequest('/hr/cycles');

      const currentCycleId = allCycles?.[0]?.cycle_id;

      // Get active participants in current cycle
      const participants = currentCycleId
        ? await apiRequest(`/hr/cycles/${currentCycleId}/participants`)
        : [];

      const activeParticipantIds = new Set((participants || []).map(p => p.faculty_id));

      const mapped = (data || [])
        .filter((u) => (u?.role || '').toString().trim().toLowerCase() !== 'vpaa')
        .map((u) => {
        const eduList = parseArrayField(u.educational_attainment_json).map(normalizeEducationEntry);
        const eligList = parseArrayField(u.eligibility_exams_json).map(normalizeEligibilityEntry);
        const docList = parseArrayField(u.doctorate).map(normalizeDoctorateEntry);

        // Determine status: if they're an active participant in current cycle, they should be 'ranking'
        // Don't change status based on application HR_Completed - only based on cycle participation
        const determinedStatus = (function(){
          const isActiveParticipant = activeParticipantIds.has(u.user_id);
          if (isActiveParticipant) return 'ranking';
          
          const s = (u.status || '').toString().toLowerCase();
          if (s.includes('inactive')) return 'inactive';
          if (s.includes('rank') || s === 'ranking' || s === 'for ranking') return 'ranking';
          return 'ranking';
        })();

        return {
          id: u.user_id,
          name: `${u.name_last}, ${u.name_first}`,
          email: u.domain_email,
          department: u.department_id ?? '',
          presentRank: u.current_rank ?? '',
          status: determinedStatus,
          createdAt: u.created_at ? new Date(u.created_at).toLocaleDateString() : '',
          // Education, Eligibility, Doctorate data
          educationList: eduList,
          eligibilityList: eligList,
          doctoralList: docList,
          // Experience fields
          teachingYears: u.teaching_experience_years ?? null,
          industryYears: u.industry_experience_years ?? null,
          createdAtRaw: u.created_at ?? null,
          // Other fields
          natureOfAppointment: u.nature_of_appointment ?? 'Permanent',
          currentSalary: u.current_salary ?? '',
          applyingFor: parseArrayField(u.applying_for_json).length > 0
            ? parseArrayField(u.applying_for_json)
            : (u.applying_for ? String(u.applying_for).split(/\s*,\s*/).filter(Boolean) : []),
          lastPromotionDate: toDateInputValue(u.last_promotion_date ?? u.date_of_last_promotion),
        };
      });

      setFacultyList(mapped);
    } catch (err) {
      setLoadError(err.message || 'Failed to load faculty users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculty();
  }, []);

  const fetchDepartments = async () => {
    try {
      const data = await apiRequest('/hr/departments');
      setDepartments(data || []);
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchCycles = async () => {
    try {
      const data = await apiRequest('/hr/cycles');

      const rows = Array.isArray(data) ? data : [];
      setCycles(rows);

      if (rows.length > 0) {
        const newestCycleId = String(rows[0].cycle_id);
        setSelectedCycleId((currentSelectedId) => {
          if (!currentSelectedId) {
            return newestCycleId;
          }

          const currentIndex = rows.findIndex((c) => String(c.cycle_id) === String(currentSelectedId));
          const newestIndex = rows.findIndex((c) => String(c.cycle_id) === newestCycleId);

          if (currentIndex === -1) {
            return newestCycleId;
          }

          if (newestIndex !== -1 && newestIndex < currentIndex) {
            return newestCycleId;
          }

          return currentSelectedId;
        });
      }
    } catch (err) {
      console.error('Failed to load cycles', err);
    }
  };

  useEffect(() => {
    fetchCycles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddFaculty = () => {
    const newId = `f${facultyList.length + 1}`;
    setFacultyList([
      ...facultyList,
      {
        id: newId,
        name: `faculty_name_${newId}`,
        email: `faculty_email_${newId}`,
        department: 'faculty_dept_new',
        presentRank: 'Instructor I',
        status: 'ranking',
        createdAt: new Date().toLocaleDateString(),
      },
    ]);
  };

  const handleSaved = () => {
    setSelected(null);
    setShowAddUser(false);
    fetchFaculty();
  };

  const handleUserCreated = () => {
    setShowAddUser(false);
    fetchFaculty();
  };

  const handleArchiveFaculty = async (faculty) => {
    if (!faculty?.id) return;

    try {
      setLoadError('');
      await apiRequest(`/hr/users/${faculty.id}/archive`, {
        method: 'POST',
        body: {
          reason: 'Archived from HR Admin portal',
        },
      });

      await fetchFaculty();
    } catch (err) {
      setLoadError('Failed to archive: ' + (err.message || err));
    }
  };



  // Status is now managed via EditPanel; admin changes status to include/exclude from ranking

  // Confirmation flow removed — inclusion confirms immediately by setting users.status and participant row

  const filteredFaculty = facultyList
    .filter((faculty) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || `${faculty.name} ${faculty.email}`.toLowerCase().includes(term);
    const matchesDepartment = deptFilter === 'All Departments' || String(faculty.department) === String(deptFilter);
    const matchesStatus =
      statusFilter === 'All Status' ||
      (statusFilter === 'For Ranking' && faculty.status === 'ranking') ||
      (statusFilter === 'Inactive' && faculty.status === 'inactive');
    return matchesSearch && matchesDepartment && matchesStatus;
  })
    .sort((a, b) => {
      const aHasApplyingFor = Array.isArray(a.applyingFor) ? a.applyingFor.length > 0 : Boolean(String(a.applyingFor || '').trim());
      const bHasApplyingFor = Array.isArray(b.applyingFor) ? b.applyingFor.length > 0 : Boolean(String(b.applyingFor || '').trim());

      if (aHasApplyingFor !== bHasApplyingFor) {
        return aHasApplyingFor ? -1 : 1;
      }

      const aStatusRank = a.status === 'ranking' ? 1 : 0;
      const bStatusRank = b.status === 'ranking' ? 1 : 0;

      if (aStatusRank !== bStatusRank) {
        return bStatusRank - aStatusRank;
      }

      const aCreated = a.createdAtRaw ? new Date(a.createdAtRaw).getTime() : 0;
      const bCreated = b.createdAtRaw ? new Date(b.createdAtRaw).getTime() : 0;
      return bCreated - aCreated;
    });

  useEffect(() => {
    setFacultyPage(1);
  }, [search, deptFilter, statusFilter, facultyList.length]);

  const totalFacultyPages = Math.max(1, Math.ceil(filteredFaculty.length / FACULTY_PAGE_SIZE));
  const safeFacultyPage = Math.min(facultyPage, totalFacultyPages);
  const facultyPageStart = (safeFacultyPage - 1) * FACULTY_PAGE_SIZE;
  const facultyPageEnd = facultyPageStart + FACULTY_PAGE_SIZE;
  const paginatedFaculty = filteredFaculty.slice(facultyPageStart, facultyPageEnd);

  return (
    <div className="app">
      <Sidebar />

      <div className="main">
        <div className="content">
          <div className="page-title">Faculty Users</div>
          <div className="semester-tag">{facultyList.length} users</div>

          {/* Toolbar */}
          <div className="toolbar">
            <div className="toolbar-left">
              <div className="search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  type="text"
                  placeholder="Search faculty name"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="filter-wrap">
                <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                  <option value="All Departments">All Departments</option>
                  {orderedDepartmentOptions.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div className="filter-wrap">
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option>All Status</option>
                  <option>For Ranking</option>
                  <option>Inactive</option>
                </select>
              </div>
            </div>
            <button className="btn btn-add" onClick={() => setShowAddUser(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add User
            </button>
              {/* Sync removed — participation is driven by the user's Status (For Ranking) */}
          </div>

          {loadError && (
            <p className="panel-error" style={{ marginTop: '8px' }}>{loadError}</p>
          )}

          {/* Table */}
          {loading ? (
            <Loader message="Loading faculty users…" />
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Current Rank</th>
                    <th>Status</th>
                    {/* Participation column removed; use 'For Ranking' status instead */}
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedFaculty.map((faculty) => (
                    <FacultyRow
                      key={faculty.id}
                      faculty={faculty}
                      departments={departments}
                      onView={(f) => { setViewing(f); setSelected(null); }}
                      onEdit={(f) => setSelected(f)}
                      onArchive={handleArchiveFaculty}
                    />
                  ))}
                </tbody>
              </table>

              {filteredFaculty.length > 0 && (
                <div style={{
                  marginTop: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    Showing {facultyPageStart + 1}-{Math.min(facultyPageStart + FACULTY_PAGE_SIZE, filteredFaculty.length)} of {filteredFaculty.length}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setFacultyPage((p) => Math.max(1, p - 1))}
                      disabled={safeFacultyPage <= 1}
                    >
                      Previous
                    </button>
                    <span style={{ fontSize: '12px', color: '#4b5563' }}>
                      Page {safeFacultyPage} of {totalFacultyPages}
                    </span>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setFacultyPage((p) => Math.min(totalFacultyPages, p + 1))}
                      disabled={safeFacultyPage >= totalFacultyPages}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {viewing && (
        <ViewPanel
          faculty={viewing}
          onClose={() => setViewing(null)}
        />
      )}
      {selected && (
        <EditPanel
          faculty={selected}
          departments={departments}
          selectedCycleId={selectedCycleId}
          cycles={cycles}
          onClose={() => { setSelected(null); }}
          onSaved={handleSaved}
        />
      )}
      {showAddUser && (
        <AddUserModal
          selectedCycleId={selectedCycleId}
          departments={departments}
          onCreated={handleUserCreated}
          onClose={() => { setShowAddUser(false); }}
        />
      )}

      {/* sync UI removed */}
    </div>
  );
}

// ── Sync From For-Ranking Modal ─────────────────────────────
// Sync preview removed — participants are derived from `users.status`.
