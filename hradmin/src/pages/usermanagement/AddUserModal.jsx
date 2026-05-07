import { useState } from 'react';

const FIXED_EMAIL_DOMAIN = '@gordoncollege.edu.ph';

const RANKS = [
  'Instructor I', 'Instructor II', 'Instructor III',
  'Assistant Professor I', 'Assistant Professor II', 'Assistant Professor III', 'Assistant Professor IV',
  'Associate Professor I', 'Associate Professor II', 'Associate Professor III', 'Associate Professor IV', 'Associate Professor V',
  'Professor I', 'Professor II', 'Professor III', 'Professor IV', 'Professor V'
];

const NATURES = ['Permanent', 'Full-Time', 'Part-Time'];

export default function AddUserModal({ selectedCycleId = '', departments = [], onCreated, onClose }) {
  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    emailLocal: '',
    departmentId: '',
    presentRank: 'Instructor I',
    natureOfAppointment: 'Permanent',
    lastPromotionDate: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('');

    const emailLocal = form.emailLocal.trim();
    const email = `${emailLocal}${FIXED_EMAIL_DOMAIN}`;

    if (!form.firstName.trim() || !form.lastName.trim() || !emailLocal) {
      setStatus('First name, last name, and email are required.');
      return;
    }

    if (!form.departmentId) {
      setStatus('Department is required.');
      return;
    }

    if (!form.password.trim()) {
      setStatus('Password is required.');
      return;
    }

    if (form.password.trim().length < 6) {
      setStatus('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name_first: form.firstName.trim(),
          name_middle: form.middleName.trim() || null,
          name_last: form.lastName.trim(),
          department_id: form.departmentId ? Number(form.departmentId) : null,
          current_rank: form.presentRank || null,
          nature_of_appointment: form.natureOfAppointment || null,
          last_promotion_date: form.lastPromotionDate || null,
          password: form.password,
          cycle_id: selectedCycleId || null,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setForm({
        firstName: '',
        middleName: '',
        lastName: '',
        emailLocal: '',
        departmentId: '',
        presentRank: 'Instructor I',
        natureOfAppointment: 'Permanent',
        lastPromotionDate: '',
        password: '',
      });
      onCreated?.(data);
    } catch (error) {
      setStatus(error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="confirm-overlay" onClick={(event) => event.target.classList.contains('confirm-overlay') && onClose()}>
      <div className="confirm-modal" style={{ alignItems: 'stretch', maxWidth: '980px', width: 'min(980px, calc(100vw - 32px))', padding: '0', overflow: 'hidden', borderRadius: '28px', boxShadow: '0 30px 80px rgba(15, 23, 42, 0.25)' }}>
        <div style={{ padding: '24px 28px 16px', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <h3 className="confirm-modal-title" style={{ textAlign: 'left', margin: 0, fontSize: '1.5rem', letterSpacing: '-0.02em' }}>Add User</h3>
              <p className="confirm-modal-msg" style={{ textAlign: 'left', margin: '10px 0 0', maxWidth: '760px', lineHeight: 1.6 }}>
                Create a faculty account directly. The email domain is fixed to {FIXED_EMAIL_DOMAIN}, so only the username part is needed.
              </p>
            </div>
            <div style={{ padding: '10px 14px', borderRadius: '999px', background: '#eff6ff', color: '#1d4ed8', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
              New faculty account
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '22px 28px 28px', background: '#ffffff', textAlign: 'left' }}>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '14px' }}>
            <div className="field-group" style={{ textAlign: 'left' }}>
              <label style={{ textAlign: 'left' }}>Last Name *</label>
              <input className="field-input" type="text" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Dela Cruz" />
            </div>
            <div className="field-group" style={{ textAlign: 'left' }}>
              <label style={{ textAlign: 'left' }}>First Name *</label>
              <input className="field-input" type="text" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="Juan" />
            </div>
            <div className="field-group" style={{ textAlign: 'left' }}>
              <label style={{ textAlign: 'left' }}>Middle Name</label>
              <input className="field-input" type="text" value={form.middleName} onChange={(e) => set('middleName', e.target.value)} placeholder="C. (optional)" />
            </div>
          </section>

          <section style={{ padding: '16px', borderRadius: '20px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.78fr) 220px', gap: '14px', alignItems: 'end' }}>
              <div className="field-group" style={{ marginBottom: 0, textAlign: 'left' }}>
                <label style={{ textAlign: 'left' }}>Email Username *</label>
                <input
                  className="field-input"
                  type="text"
                  value={form.emailLocal}
                  onChange={(e) => set('emailLocal', e.target.value)}
                  placeholder="faculty.user"
                  style={{ maxWidth: '100%' }}
                />
              </div>
              <div className="field-group" style={{ marginBottom: 0, textAlign: 'left' }}>
                <label style={{ visibility: 'hidden', textAlign: 'left' }}>Domain</label>
                <div className="field-input" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0', color: '#334155', fontWeight: 700, whiteSpace: 'nowrap', minWidth: '220px' }}>
                  {FIXED_EMAIL_DOMAIN}
                </div>
              </div>
            </div>
          </section>

          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
            <div className="field-group" style={{ textAlign: 'left' }}>
              <label style={{ textAlign: 'left' }}>Present / Current Rank *</label>
              <div className="select-field">
                <select value={form.presentRank} onChange={(e) => set('presentRank', e.target.value)}>
                  {RANKS.map((rank) => (
                    <option key={rank} value={rank}>{rank}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field-group" style={{ textAlign: 'left' }}>
              <label style={{ textAlign: 'left' }}>Nature of Appointment *</label>
              <div className="select-field">
                <select value={form.natureOfAppointment} onChange={(e) => set('natureOfAppointment', e.target.value)}>
                  {NATURES.map((nature) => (
                    <option key={nature} value={nature}>{nature}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '14px' }}>
            <div className="field-group" style={{ textAlign: 'left' }}>
              <label style={{ textAlign: 'left' }}>Department *</label>
              <div className="select-field">
                <select value={form.departmentId} onChange={(e) => set('departmentId', e.target.value)}>
                  <option value="">Select a department</option>
                  {(departments || []).map((department) => (
                    <option key={department.department_id} value={department.department_id}>
                      {department.department_code || department.department_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
            <div className="field-group" style={{ textAlign: 'left' }}>
              <label style={{ textAlign: 'left' }}>Last Promotion Date</label>
              <input className="field-input" type="date" value={form.lastPromotionDate} onChange={(e) => set('lastPromotionDate', e.target.value)} />
            </div>
            <div className="field-group" style={{ textAlign: 'left' }}>
              <label style={{ textAlign: 'left' }}>Password *</label>
              <input className="field-input" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Enter password" />
            </div>
          </section>

          {status && <p className="panel-error" style={{ margin: '0' }}>{status}</p>}

          <div className="confirm-modal-actions" style={{ marginTop: '6px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-cancel" onClick={onClose} style={{ minWidth: '160px' }}>Cancel</button>
            <button type="submit" className="btn btn-apply" disabled={loading} style={{ minWidth: '200px' }}>{loading ? 'Creating…' : 'Create User'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
