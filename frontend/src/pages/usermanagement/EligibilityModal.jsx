import React, { useState, useEffect } from 'react';

export default function EligibilityModal({ isOpen, initialData, onClose, onSubmit, isLoading }) {
  const [examName, setExamName] = useState("");
  const [datePassed, setDatePassed] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setExamName(initialData.examName || initialData.text || "");
      setDatePassed(initialData.datePassed || "");
    } else {
      setExamName(""); setDatePassed("");
    }
  }, [isOpen, initialData]);

  const handleSubmit = () => {
    setError("");
    if (!examName.trim()) return setError('Exam/License name is required.');
    if (datePassed && !/^\d{4}-\d{2}-\d{2}$/.test(datePassed)) return setError('Date must be in YYYY-MM-DD format.');

    let text = examName.trim();
    if (datePassed) {
      const d = new Date(datePassed);
      const formatted = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      text += ` — Passed ${formatted}`;
    }

    onSubmit({ text, examName: examName.trim(), datePassed: datePassed.trim() });
  };

  if (!isOpen) return null;
  return (
    <div className="confirm-overlay" onClick={(e) => e.target.classList.contains('confirm-overlay') && onClose()}>
      <div className="confirm-modal" style={{ alignItems: 'stretch' }}>
        <h3 className="confirm-modal-title" style={{ textAlign: 'left' }}>{initialData ? 'Edit Eligibility or License' : 'Add Eligibility or License'}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {error && <div className="panel-error">{error}</div>}
          <div className="field-group">
            <label>Exam / License Name *</label>
            <input className="field-input" value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="e.g., Civil Service Professional (CSC)" />
          </div>
          <div className="field-group">
            <label>Date Passed</label>
            <input className="field-input" type="date" value={datePassed} onChange={(e) => setDatePassed(e.target.value)} />
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
