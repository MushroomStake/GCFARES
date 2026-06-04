import React, { useState, useEffect } from 'react';

export default function EducationModal({ isOpen, initialData, onClose, onSubmit, isLoading }) {
  const [level, setLevel] = useState("Bachelor's");
  const [degree, setDegree] = useState("");
  const [institution, setInstitution] = useState("");
  const [yearGraduated, setYearGraduated] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setLevel(initialData.level || "Bachelor's");
      setDegree(initialData.degree || "");
      setInstitution(initialData.institution || initialData.school || "");
      setYearGraduated((initialData.yearGraduated || "").slice(0, 4));
    } else {
      setLevel("Bachelor's"); setDegree(""); setInstitution(""); setYearGraduated("");
    }
  }, [isOpen, initialData]);

  const handleSubmit = () => {
    setError("");
    if (!degree.trim()) return setError('Degree title is required.');
    if (!institution.trim()) return setError('Institution is required.');
    if (yearGraduated && !/^\d{4}$/.test(yearGraduated)) return setError('Year must be in YYYY format.');

    onSubmit({ level, degree: degree.trim(), institution: institution.trim(), yearGraduated: yearGraduated.trim() });
  };

  if (!isOpen) return null;
  return (
    <div className="confirm-overlay" onClick={(e) => e.target.classList.contains('confirm-overlay') && onClose()}>
      <div className="confirm-modal" style={{ alignItems: 'stretch' }}>
        <h3 className="confirm-modal-title" style={{ textAlign: 'left' }}>{initialData ? 'Edit Educational Attainment' : 'Add Educational Attainment'}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {error && <div className="panel-error">{error}</div>}
          <div className="field-group">
            <label>Degree Level *</label>
            <select className="field-input" value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="Bachelor's">Bachelor's Degree</option>
              <option value="Master's">Master's Degree</option>
              <option value="Doctorate">Doctorate/PhD</option>
              <option value="Professional">Professional License</option>
              <option value="Certificate">Certificate/Diploma</option>
            </select>
          </div>
          <div className="field-group">
            <label>Degree / Title *</label>
            <input className="field-input" value={degree} onChange={(e) => setDegree(e.target.value)} placeholder="e.g., Bachelor of Science in Computer Science" />
          </div>
          <div className="field-group">
            <label>Institution / School *</label>
            <input className="field-input" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="e.g., Gordon College" />
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
