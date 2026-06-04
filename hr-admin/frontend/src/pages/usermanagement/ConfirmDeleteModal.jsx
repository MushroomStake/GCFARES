import React from 'react';

export default function ConfirmArchiveModal({ name, onConfirm, onCancel }) {
  return (
    <div className="confirm-overlay" onClick={(e) => e.target.classList.contains('confirm-overlay') && onCancel()}>
      <div className="confirm-modal">
        <div className="confirm-modal-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 8v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8"/>
            <path d="M7 8V6a5 5 0 0 1 10 0v2"/>
            <path d="M12 12v5"/>
            <path d="M9 15l3 3 3-3"/>
          </svg>
        </div>
        <h3 className="confirm-modal-title">Archive Faculty</h3>
        <p className="confirm-modal-msg">
          Are you sure you want to archive <strong>{name}</strong>? The user will be removed from the active list but kept in the archive table.
        </p>
        <div className="confirm-modal-actions">
          <button className="btn btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="btn btn-confirm-archive" onClick={onConfirm}>Yes, Archive</button>
        </div>
      </div>
    </div>
  );
}
