import React, { useState } from 'react';
import { createPortal } from 'react-dom';

export default function ReviewDetailView({
  FacultyInfoCard,
  AreaCard,
  ScoringCriteriaPanel,
  AreaIVImportPanel,
  selectedFaculty,
  selectedApplicationForDisplay,
  onEditFinalScore,
  isEditingFinalScore,
  draftFinalScore,
  onDraftFinalScoreChange,
  onSaveFinalScore,
  isSavingFinalScore,
  submittedAreas,
  expandedAreaId,
  draftScores,
  onToggleArea,
  onDraftScoreChange,
  onSaveAreaScore,
  savingAreaId,
  areaSubmissions,
  areas,
  selectedApplication,
  onSelectArea,
  onBackToList,
  onOpenSummary,
  selectedArea,
  areaCriteria,
  onCloseAreaDetails,
  onSaveCriteriaScores,
  savingAreaScore,
  currentCycle,
  applications,
  onAutoScoreComplete = null,
}) {
  const [forceAreaIVModalOpen, setForceAreaIVModalOpen] = useState(false);
  const selectedAreaId = Number(selectedArea?.area?.area_id || selectedArea?.area_id || 0);
  const isAreaIV = selectedAreaId === 7;

  return (
    <>
      <div style={{ marginBottom: '20px' }}>
        <button
          className="btn-nav btn-nav-prev"
          onClick={onBackToList}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            color: '#495057',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Applications List
        </button>
      </div>

      <FacultyInfoCard
        facultyData={selectedFaculty}
        applicationData={selectedApplicationForDisplay}
        onEditFinalScore={onEditFinalScore}
        isEditingFinalScore={isEditingFinalScore}
        draftScore={draftFinalScore}
        onDraftScoreChange={onDraftFinalScoreChange}
        onSaveFinalScore={onSaveFinalScore}
        isSavingFinalScore={isSavingFinalScore}
      />
      <div className="submitted-label">Submitted Areas ({submittedAreas.length})</div>

      <div className="detail-grid">
        <div>
          {submittedAreas.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
              <div style={{ fontSize: '16px', marginBottom: '8px' }}>No area submissions found</div>
              <div style={{ fontSize: '14px' }}>This faculty member has not submitted any areas for review.</div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '16px', padding: '12px', background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '6px', fontSize: '13px', color: '#1e40af' }}>
                <strong>Documents:</strong> Click an area card to view criteria &amp; submission details
              </div>
              {submittedAreas.map((area, i) => (
                <AreaCard
                  key={area.id ?? i}
                  area={area}
                  isExpanded={expandedAreaId === area.id}
                  isSelected={selectedArea?.id === area.id}
                  draftScore={draftScores[area.id] ?? ''}
                  onToggle={onToggleArea}
                  onDraftChange={onDraftScoreChange}
                  onSave={onSaveAreaScore}
                  isSaving={savingAreaId === area.id}
                  onSelectArea={() => {
                    const submission = areaSubmissions.find((s) => s.id === area.id);
                    const fullAreaData = areas.find((a) => a.area_id === submission?.area_id);
                    onSelectArea({
                      ...area,
                      area_id: submission?.area_id,
                      application_id: selectedApplication?.id,
                      label: area.label,
                      area_name: fullAreaData?.area_name,
                    });
                  }}
                />
              ))}
            </>
          )}

          {submittedAreas.length > 0 && (
            <div className="area-nav">
              <button className="btn-nav btn-nav-prev" onClick={onBackToList}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                Back to List
              </button>
              <button className="btn-nav btn-nav-next" onClick={onOpenSummary}>
                Review Summary
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          )}
        </div>

        <div className="pdf-panel">
          {selectedArea ? (
            <ScoringCriteriaPanel
              area={selectedArea.area || selectedArea}
              submission={selectedArea.submission || areaSubmissions.find((s) => s.id === selectedArea.id)}
              criteria={selectedArea.criteria || areaCriteria}
              onClose={onCloseAreaDetails}
              areaEvalData={null}
              onSaveCriteriaScores={onSaveCriteriaScores}
              isSavingScore={savingAreaScore}
              onOpenSearchModal={selectedAreaId === 7 ? () => setForceAreaIVModalOpen(true) : null}
              currentCycle={currentCycle}
              applications={applications}
              selectedApplication={selectedApplication}
              selectedFaculty={selectedFaculty}
            />
          ) : (
            <>
              <div className="pdf-panel-header">
                <div className="pdf-panel-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Scoring &amp; Documents
                </div>
              </div>
              <div className="pdf-no-submission">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <div style={{ marginTop: '12px' }}>
                  <strong>Select an area to view:</strong>
                  <ul style={{ marginTop: '8px', textAlign: 'left', fontSize: '12px', lineHeight: '1.6' }}>
                    <li>Scoring criteria &amp; performance metrics</li>
                    <li>Faculty-submitted documents</li>
                    <li>Area-specific evaluation details</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {forceAreaIVModalOpen && typeof AreaIVImportPanel === 'function' && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          }}>
            <AreaIVImportPanel
              currentCycle={currentCycle}
              applications={applications}
              selectedApplication={selectedApplication}
              selectedFaculty={selectedFaculty}
              forceModalOpen={forceAreaIVModalOpen}
              onModalClose={() => setForceAreaIVModalOpen(false)}
              onAutoScoreComplete={(result) => {
                setForceAreaIVModalOpen(false);
                if (typeof onAutoScoreComplete === 'function') {
                  onAutoScoreComplete(result);
                }
              }}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
