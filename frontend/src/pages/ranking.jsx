import React, { useEffect, useState } from 'react';
import Sidebar from '../components/sidenav';
import '../styles/layout.css';
import './ranking.css';
import { apiRequest } from '../lib/apiClient';
import { RANKING_RUBRICS } from '../data/rankingRubrics';

const UploadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ViewIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const TEMPLATE_BUCKET = 'documents';
const TEMPLATE_ROOT_FOLDER = 'Templates';

const makeTemplateKey = (areaId, partId) => `${Number(areaId)}::${String(partId || '').trim()}`;

const toAreaFolderName = (areaId) => `Area ${String(Number(areaId)).padStart(2, '0')}`;

const toPartFolderName = (subArea) => {
  const label = String(subArea?.label || '').trim();
  const letterMatch = label.match(/^([A-Z])(?:|\.|$)/i);
  const letter = letterMatch?.[1] || String(subArea?.id || '').split('_')[1] || 'Unknown';
  return `Part ${String(letter).toUpperCase()}`;
};

const buildTemplateStoragePath = (areaId, subAreaId) => (
  `${TEMPLATE_ROOT_FOLDER}/${toAreaFolderName(areaId)}/${toPartFolderName({ id: subAreaId, label: String(subAreaId).split('_').pop() })}/template.xlsx`
);

const resolveTemplateKind = (fileName) => {
  const lower = String(fileName || '').toLowerCase();
  if (lower.endsWith('.xlsx')) return 'xlsx';
  if (lower.endsWith('.csv')) return 'csv';
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.docx')) return 'docx';
  return 'other';
};

export default function Ranking() {
  const [selectedAreaId, setSelectedAreaId] = useState(RANKING_RUBRICS?.[0]?.areaId || null);
  const [uploadedTemplates, setUploadedTemplates] = useState({});
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const selectedArea = RANKING_RUBRICS.find((area) => area.areaId === selectedAreaId);

  useEffect(() => {
    const loadTemplates = async () => {
      const templates = {};

      let dbTemplates = [];
      try {
        dbTemplates = await apiRequest('/review/templates');
      } catch (error) {
        console.error('Error loading area_part_templates:', error);
      }

      const templateMap = new Map(dbTemplates.map((row) => [makeTemplateKey(row.area_id, row.part_id), row]));

      for (const area of RANKING_RUBRICS) {
        for (const subArea of area.subAreas) {
          const key = makeTemplateKey(area.areaId, subArea.id);
          const existingRecord = templateMap.get(key);

          if (existingRecord?.storage_path) {
            try {
              const bucket = existingRecord.storage_bucket || TEMPLATE_BUCKET;
              const resp = await apiRequest(`/review/storage-url?path=${encodeURIComponent(existingRecord.storage_path)}&bucket=${encodeURIComponent(bucket)}`);
              const url = resp?.url || null;
              if (url) {
                templates[key] = {
                  fileName: existingRecord.file_name || existingRecord.storage_path.split('/').pop(),
                  fileUrl: url,
                  storagePath: existingRecord.storage_path,
                  templateId: existingRecord.template_id,
                };
                continue;
              }
            } catch (error) {
              console.error(`Error resolving template URL for ${key}:`, error);
            }
          }

          const folderPath = `${TEMPLATE_ROLE_FOLDER}/area-${area.areaId}/sub-${subArea.id}`;

          // Listing bucket contents and uploads are not yet implemented on the backend.
          // If no DB record exists, we skip auto-discovery for now.
        }
      }

      setUploadedTemplates(templates);
    };

    loadTemplates();
  }, []);

  const handleFileUpload = async (areaId, subAreaId, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileNameLower = String(file.name || '').toLowerCase();
    const isAllowedTemplate =
      file.type === 'application/pdf' ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      fileNameLower.endsWith('.xlsx') ||
      fileNameLower.endsWith('.pdf');

    if (!isAllowedTemplate) {
      alert('Invalid file type. Please upload PDF or XLSX files only.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size too large. Please upload files smaller than 5MB.');
      return;
    }

    const selectedArea = RANKING_RUBRICS.find((area) => Number(area.areaId) === Number(areaId));
    const selectedSubArea = selectedArea?.subAreas.find((subArea) => String(subArea.id) === String(subAreaId));
    const path = `${TEMPLATE_ROOT_FOLDER}/${toAreaFolderName(areaId)}/${toPartFolderName(selectedSubArea || { id: subAreaId, label: String(subAreaId).split('_').pop() })}/template.xlsx`;

    try {
      const form = new FormData();
      form.append('area_id', String(areaId));
      form.append('part_id', String(subAreaId));
      form.append('file', file);

      const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8002/api').replace(/\/api\/?$/, '');
      const response = await fetch(`${apiBase}/review/templates/upload`, {
        method: 'POST',
        body: form,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Upload failed');
      }

      const json = await response.json();
      setUploadedTemplates((prev) => ({
        ...prev,
        [`${areaId}-${subAreaId}`]: {
          fileName: json.file_name,
          fileUrl: json.url,
          storagePath: json.storage_path,
        },
      }));

      event.target.value = '';
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
      event.target.value = '';
    }
  };

  const handleUploadClick = (areaId, subAreaId) => {
    const fileInput = document.getElementById(`file-input-${areaId}-${subAreaId}`);
    if (fileInput) {
      fileInput.click();
    }
  };

  return (
    <div className="app">
      <Sidebar />

      <div className="main">
        <div className="content">
          <div className="page-title">Ranking Rubrics</div>
          <div className="semester-tag">Manage rubric sections and upload templates per sub-area.</div>

          <div className="rk-section-layout">
            <aside className="rk-area-sidebar">
              <div className="rk-sidebar-title">Select an Area</div>
              {RANKING_RUBRICS.map((area) => {
                const isSelected = selectedAreaId === area.areaId;
                return (
                  <button
                    key={area.areaId}
                    type="button"
                    className={`rk-area-pill ${isSelected ? 'is-active' : ''}`}
                    onClick={() => setSelectedAreaId(area.areaId)}
                    title={area.areaName}
                  >
                    <div className="rk-area-pill-number">{area.areaCode}</div>
                    <div className="rk-area-pill-info">
                      <div className="rk-area-pill-name">{area.areaName}</div>
                      <div className="rk-area-pill-points">{area.maxPoints} pts</div>
                    </div>
                  </button>
                );
              })}
            </aside>

            <div className="rk-area-detail">
              {selectedArea ? (
                <section className="rk-area-panel">
                  <div className="rk-area-panel-header">
                    <div>
                      <div className="rk-area-code">AREA {selectedArea.areaCode}</div>
                      <h2 className="rk-area-title">{selectedArea.areaName}</h2>
                      <p className="rk-area-description">Manage templates, review sub-area requirements, and upload supporting documents for this area.</p>
                    </div>
                    <div className="rk-area-points large">{selectedArea.maxPoints} pts</div>
                  </div>

                  <div className="rk-area-body">
                    {selectedArea.subAreas.map((subArea) => {
                      const templateKey = `${selectedArea.areaId}-${subArea.id}`;
                      const template = uploadedTemplates[templateKey];
                      const hasTemplate = Boolean(template);

                      return (
                        <div key={subArea.id} className="rk-subarea-card">
                          <div className="rk-subarea-copy">
                            <div className="rk-subarea-label">{subArea.label}</div>
                            <div className="rk-subarea-title">{subArea.title}</div>
                            {subArea.maxPoints != null && (
                              <div className="rk-subarea-meta">Max points: <strong>{subArea.maxPoints}</strong></div>
                            )}
                          </div>

                          <input
                            type="file"
                            id={`file-input-${selectedArea.areaId}-${subArea.id}`}
                            style={{ display: 'none' }}
                            onChange={(e) => handleFileUpload(selectedArea.areaId, subArea.id, e)}
                            accept=".pdf"
                          />

                          <div className="rk-subarea-actions">
                            {hasTemplate ? (
                              <>
                                <span className="rk-file-pill">
                                  <CheckCircleIcon />
                                  {template.fileName}
                                </span>
                                <button
                                  type="button"
                                  className="rk-action-button rk-action-button--primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewTemplate(template);
                                  }}
                                >
                                  <ViewIcon /> View
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="rk-action-button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUploadClick(selectedArea.areaId, subArea.id);
                                }}
                              >
                                <UploadIcon /> Upload
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : (
                <div className="rk-empty-state">
                  Select an area to display the sub-area templates and upload controls.
                </div>
              )}
            </div>
          </div>

          {previewTemplate && (
            <div className="rk-preview" onClick={() => setPreviewTemplate(null)}>
              <div className="rk-preview__panel" onClick={(e) => e.stopPropagation()}>
                <div className="rk-preview__header">
                  <div className="rk-preview__title-group">
                    <div className="rk-preview__title">Template Preview</div>
                    <div className="rk-preview__subtitle">{previewTemplate.fileName}</div>
                  </div>
                  <button type="button" className="rk-preview__close" onClick={() => setPreviewTemplate(null)}>
                    Close
                  </button>
                </div>
                <div className="rk-preview__body">
                  <iframe
                    src={`${previewTemplate.fileUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                    title={previewTemplate.fileName}
                    className="rk-preview__iframe"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
