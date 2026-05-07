import React, { useEffect, useState } from 'react';
import Sidebar from '../components/sidenav';
import '../styles/layout.css';
import './ranking.css';
import { supabase } from '../supabase';
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

export default function Ranking() {
  const [selectedAreaId, setSelectedAreaId] = useState(RANKING_RUBRICS?.[0]?.areaId || null);
  const [uploadedTemplates, setUploadedTemplates] = useState({});
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const selectedArea = RANKING_RUBRICS.find((area) => area.areaId === selectedAreaId);

  useEffect(() => {
    const loadTemplates = async () => {
      const bucket = 'documents';
      const roleFolder = 'Admin';
      const templates = {};

      for (const area of RANKING_RUBRICS) {
        for (const subArea of area.subAreas) {
          const folderPath = `${roleFolder}/area-${area.areaId}/sub-${subArea.id}`;

          try {
            const { data: files } = await supabase.storage
              .from(bucket)
              .list(folderPath, { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });

            if (files && files.length > 0) {
              const latest = files[0];
              const fullPath = `${folderPath}/${latest.name}`;
              const { data: signedData } = await supabase.storage
                .from(bucket)
                .createSignedUrl(fullPath, 60 * 60);

              if (signedData?.signedUrl) {
                templates[`${area.areaId}-${subArea.id}`] = {
                  fileName: latest.name,
                  fileUrl: signedData.signedUrl,
                };
              }
            }
          } catch (error) {
            console.error(`Error loading template for ${area.areaId}-${subArea.id}:`, error);
          }
        }
      }

      setUploadedTemplates(templates);
    };

    loadTemplates();
  }, []);

  const handleFileUpload = async (areaId, subAreaId, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Invalid file type. Please upload PDF files only.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size too large. Please upload files smaller than 5MB.');
      return;
    }

    const bucket = 'documents';
    const roleFolder = 'Admin';
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const path = `${roleFolder}/area-${areaId}/sub-${subAreaId}/${Date.now()}-${safeName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: signedData, error: signedError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60);

      if (signedError) throw signedError;

      setUploadedTemplates((prev) => ({
        ...prev,
        [`${areaId}-${subAreaId}`]: {
          fileName: file.name,
          fileUrl: signedData.signedUrl,
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
