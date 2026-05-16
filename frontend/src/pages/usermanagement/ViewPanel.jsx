import React from 'react';

export default function ViewPanel({ faculty, onClose }) {
  const DEPARTMENTS = ['CAHS','CBA','CCS','CEAS','CHTM'];
  const RANKS = [
    'Instructor I','Instructor II','Instructor III',
    'Assistant Professor I','Assistant Professor II','Assistant Professor III','Assistant Professor IV',
    'Associate Professor I','Associate Professor II','Associate Professor III','Associate Professor IV','Associate Professor V',
    'Professor I','Professor II','Professor III','Professor IV','Professor V'
  ];
  const NATURES = ['Permanent','Full-Time','Part-Time'];

  const safe = (value, fallback = '') => (value == null ? fallback : value);
  const eduList = faculty?.educationalAttainment || [];

  function collapseRangesFromArray(selected = [], options = []) {
    if (!selected || selected.length === 0) return '';
    const idxMap = new Map();
    options.forEach((o, i) => idxMap.set(o, i));
    const indices = (Array.isArray(selected) ? selected : String(selected).split(/\s*,\s*/)).map(s => idxMap.get(s)).filter(n => typeof n === 'number').sort((a,b)=>a-b);
    if (indices.length === 0) return Array.isArray(selected) ? selected.join(', ') : String(selected);
    
    const parts = [];
    let i = 0;
    while (i < indices.length) {
      let start = indices[i];
      let end = start;
      while (i + 1 < indices.length && indices[i+1] === end + 1) { i++; end = indices[i]; }
      
      // Split by prefix
      const blockItems = [];
      for (let k = start; k <= end; k++) blockItems.push({ idx: k, text: options[k] });
      
      const prefixGroups = [];
      let currentPrefix = null;
      let currentGroup = [];
      for (const item of blockItems) {
        const split = item.text.lastIndexOf(' ');
        const prefix = split === -1 ? item.text : item.text.slice(0, split);
        if (prefix !== currentPrefix) {
          if (currentGroup.length > 0) prefixGroups.push({ prefix: currentPrefix, items: currentGroup });
          currentPrefix = prefix;
          currentGroup = [item];
        } else {
          currentGroup.push(item);
        }
      }
      if (currentGroup.length > 0) prefixGroups.push({ prefix: currentPrefix, items: currentGroup });
      
      for (const pg of prefixGroups) {
        const first = pg.items[0];
        const last = pg.items[pg.items.length - 1];
        const splitF = first.text.lastIndexOf(' ');
        const splitL = last.text.lastIndexOf(' ');
        const sufF = splitF === -1 ? first.text : first.text.slice(splitF + 1);
        const sufL = splitL === -1 ? last.text : last.text.slice(splitL + 1);
        
        if (pg.items.length > 1) {
          parts.push(`${pg.prefix} ${sufF}-${sufL}`);
        } else {
          parts.push(first.text);
        }
      }
      i++;
    }
    
    // include any freeform entries
    const unknowns = (Array.isArray(selected) ? selected : String(selected).split(/\s*,\s*/)).filter(s => !idxMap.has(s));
    return parts.concat(unknowns).join(', ');
  }

  return (
    <div className="panel-overlay open" onClick={(e) => e.target.classList.contains('panel-overlay') && onClose()}>
      <div className="panel">

        <div className="panel-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <h3>Faculty Details</h3>
        </div>

        <div className="panel-body">
          <div className="panel-two-col">
            <div>
              <div className="panel-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Personal Details
              </div>
              <div className="field-group">
                <label>Name</label>
                <input className="field-input" value={safe(faculty?.name)} readOnly disabled />
              </div>
              <div className="field-group">
                <label>Email</label>
                <input className="field-input" type="email" value={safe(faculty?.email)} readOnly disabled />
              </div>
              <div className="field-group">
                <label>Department</label>
                <div className="select-field">
                  <select value={safe(faculty?.department, 'CCS')} disabled>
                    {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="field-group">
                <label>Status</label>
                <div className="select-field">
                  <select value={safe(faculty?.status === 'inactive' ? 'inactive' : 'ranking', 'ranking')} disabled>
                    <option value="ranking">For Ranking</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <div className="panel-section-title panel-section-title--row">
                <span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                  Educational Attainment
                </span>
              </div>
              {eduList.length === 0 && (
                <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>No educational records provided.</p>
              )}
              {eduList.map((e, i) => (
                <div key={i} className="edu-item">
                  <div><strong>{e.degree}</strong><small>{e.school}</small></div>
                </div>
              ))}
            </div>
          </div>

          {/* Employment Status + Eligibility */}
          <div className="panel-two-col">
            <div>
              <div className="panel-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                Employment Status
              </div>
              <div className="field-group">
                <label>Present Rank</label>
                <div className="select-field">
                  <select value={safe(faculty?.presentRank, 'Instructor I')} disabled>
                    {RANKS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="field-group">
                <label>Nature of Appointment</label>
                <div className="select-field">
                  <select value={safe(faculty?.natureOfAppointment, 'Permanent')} disabled>
                    {NATURES.map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              {/* Current salary removed per redesign */}
            </div>

            <div>
              <div className="panel-section-title panel-section-title--row">
                <span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Eligibility
                </span>
              </div>
              {(faculty?.eligibilityList || []).length === 0 && <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>No eligibility records.</p>}
              {(faculty?.eligibilityList || []).map((e, i) => (
                <div key={i} style={{ padding: '8px', backgroundColor: '#f3f4f6', borderRadius: '4px', marginBottom: '4px' }}>
                  {e.text}
                </div>
              ))}
            </div>
          </div>

          {/* Doctorate */}
          <div className="panel-section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
            Doctorate
          </div>
          {(faculty?.doctoralList || []).length === 0 && <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>No doctorate records.</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            {(faculty?.doctoralList || []).map((d, i) => (
              <div key={i} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '6px' }}>
                <div><strong>{d.degree}</strong></div>
                <small>{d.school}</small>
              </div>
            ))}
          </div>

          {/* Experience & Promotion */}
          <div className="panel-section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Experience &amp; Promotion
          </div>
          <div className="panel-four-col" style={{ marginBottom: '20px' }}>
            <div className="field-group">
              <label>Teaching Exp. (yrs)</label>
              <input className="field-input" value={safe(faculty?.teachingYears)} readOnly disabled placeholder="0" />
            </div>
            <div className="field-group">
              <label>Industry Exp. (yrs)</label>
              <input className="field-input" value={safe(faculty?.industryYears)} readOnly disabled placeholder="0" />
            </div>
              <div className="field-group">
                <label>Applying For</label>
                <div className="field-value">
                  {(() => {
                    const v = faculty?.applyingFor ?? '';
                    const list = Array.isArray(v) ? v : String(v).split(/\s*,\s*/).filter(Boolean);
                    const collapsed = collapseRangesFromArray(list, RANKS);
                    return collapsed || '-';
                  })()}
                </div>
              </div>
            <div className="field-group">
              <label>Last Promotion Date</label>
              <input className="field-input" type="date" value={safe(faculty?.lastPromotionDate)} readOnly disabled />
            </div>
          </div>

        </div>

        <div className="panel-footer">
          <button className="btn btn-cancel" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
