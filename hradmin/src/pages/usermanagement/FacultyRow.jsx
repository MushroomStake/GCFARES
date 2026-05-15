import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import ConfirmArchiveModal from './ConfirmDeleteModal';

export default function FacultyRow({ faculty, departments, onView, onEdit, onArchive }) {
  const [showConfirm, setShowConfirm] = useState(false);

  const departmentMatch = (departments || []).find((d) => {
    if (!d) return false;
    const depId = d.department_id;
    return String(depId) === String(faculty.department);
  });
  const departmentLabel = departmentMatch?.department_code || departmentMatch?.department_name || faculty.department || '';

  return (
    <>
      <tr>
        <td className="faculty-name">{faculty.name}</td>
        <td className="faculty-email">{faculty.email}</td>
        <td>{departmentLabel}</td>
        <td>{faculty.presentRank}</td>
        <td>
          <span className={`badge ${faculty.status === 'ranking' ? 'badge-ranking' : 'badge-inactive'}`}>
            {faculty.status === 'ranking' ? 'For Ranking' : 'Inactive'}
          </span>
        </td>
        <td>{faculty.createdAt}</td>
        <td>
          <div className="row-actions">
            <button className="action-btn" onClick={() => onEdit(faculty)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button className="action-btn action-btn--archive" onClick={() => setShowConfirm(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
      {showConfirm && typeof document !== 'undefined' && createPortal(
        <ConfirmArchiveModal
          name={faculty.name}
          onConfirm={() => { setShowConfirm(false); onArchive?.(faculty); }}
          onCancel={() => setShowConfirm(false)}
        />,
        document.body
      )}
    </>
  );
}
