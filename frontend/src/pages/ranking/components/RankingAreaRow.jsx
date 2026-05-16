import React from 'react';

export default function RankingAreaRow({
  area,
  isEditing,
  editDescription,
  setEditDescription,
  onFileUpload,
  onUploadClick,
  onViewFile,
  onSave,
  onCancel,
  onEdit,
  toRoman,
  icons,
}) {
  const {
    UploadIcon,
    CheckCircleIcon,
    ResubmitIcon,
    SaveIcon,
    EditIcon,
  } = icons;

  return (
    <tr className="rk-row">
      <td className="rk-td rk-td-num">{toRoman(area.id)}</td>
      <td className="rk-td rk-td-title">{area.title}</td>
      <td className="rk-td rk-td-desc">
        {isEditing ? (
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="rk-edit-textarea"
            rows={3}
          />
        ) : (
          area.description
        )}
      </td>
      <td className="rk-td rk-td-template">
        <input
          type="file"
          id={`file-input-${area.id}`}
          style={{ display: 'none' }}
          onChange={(e) => onFileUpload(area.id, e)}
          accept=".pdf"
        />

        {area.uploaded ? (
          <span className={`rk-badge ${isEditing ? 'resubmit' : 'uploaded'}`}>
            {isEditing ? (
              <>
                <ResubmitIcon />
                <span
                  className="rk-badge-clickable"
                  onClick={() => onUploadClick(area.id)}
                >
                  Resubmit
                </span>
              </>
            ) : (
              <>
                <CheckCircleIcon />
                <span
                  className="rk-badge-clickable"
                  style={{ marginLeft: 4 }}
                  onClick={() => onViewFile(area)}
                >
                  View
                </span>
              </>
            )}
          </span>
        ) : (
          <span
            className="rk-badge upload rk-badge-clickable"
            onClick={() => onUploadClick(area.id)}
          >
            <UploadIcon /> Upload
          </span>
        )}
      </td>
      <td className="rk-td rk-td-points">{area.points.toFixed(2)}</td>
      <td className="rk-td rk-td-actions">
        {isEditing ? (
          <div className="rk-edit-actions">
            <button
              className="rk-save-btn"
              title="Save"
              onClick={() => onSave(area.id)}
            >
              <SaveIcon />
            </button>
            <button
              className="rk-cancel-btn"
              title="Cancel"
              onClick={onCancel}
            >
              ×
            </button>
          </div>
        ) : (
          <button
            className="rk-edit-btn"
            title="Edit"
            onClick={() => onEdit(area)}
          >
            <EditIcon />
          </button>
        )}
      </td>
    </tr>
  );
}
