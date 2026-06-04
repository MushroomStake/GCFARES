import React, { useState, useEffect } from 'react';

export default function DoctoralModal({ isOpen, initialData, onClose, onSubmit, isLoading }) {
  const [degree, setDegree] = useState("");
  const [institution, setInstitution] = useState("");
  const [yearGraduated, setYearGraduated] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setDegree(initialData.degree || "");
      setInstitution(initialData.institution || initialData.school || "");
      setYearGraduated((initialData.yearGraduated || "").slice(0,4));
    } else {
      setDegree(''); setInstitution(''); setYearGraduated('');
    }
  }, [isOpen, initialData]);

  const handleSubmit = () => {
    setError('');
    if (!degree.trim()) return setError('Degree title is required.');
    if (!institution.trim()) return setError('Institution is required.');
    if (yearGraduated && !/^\d{4}$/.test(yearGraduated)) return setError('Year must be in YYYY format.');

    onSubmit({ degree: degree.trim(), institution: institution.trim(), yearGraduated: yearGraduated.trim() });
  };

  if (!isOpen) return null;
  return (
    <div className="confirm-overlay" onClick={(e) => e.target.classList.contains('confirm-overlay') && onClose()}>
      <div className="confirm-modal" style={{ alignItems: 'stretch' }}>
        <h3 className="confirm-modal-title" style={{ textAlign: 'left' }}>{initialData ? 'Edit Doctorate Degree' : 'Add Doctorate Degree'}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {error && <div className="panel-error">{error}</div>}
          <div className="field-group">
            <label>Degree / Title *</label>
            <input className="field-input" value={degree} onChange={(e) => setDegree(e.target.value)} placeholder="e.g., Doctor of Philosophy in Computer Science" />
          </div>
          <div className="field-group">
            <label>Institution / University *</label>
            <input className="field-input" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="e.g., Massachusetts Institute of Technology" />
          </div>
          <div className="field-group">
            <label>Year Graduated</label>
            <input className="field-input" value={yearGraduated} onChange={(e) => setYearGraduated(e.target.value.slice(0,4))} placeholder="YYYY" maxLength={4} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn btn-cancel" onClick={onClose}>Cancel</button>
            <button className="btn btn-apply" onClick={handleSubmit} disabled={isLoading}>{isLoading ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
