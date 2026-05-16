import React from 'react';

export default function ReviewSummaryView({
  FacultyInfoCard,
  selectedFaculty,
  selectedApplicationForDisplay,
  onEditFinalScore,
  isEditingFinalScore,
  draftFinalScore,
  onDraftFinalScoreChange,
  onSaveFinalScore,
  isSavingFinalScore,
  SummaryView,
  onBack,
  areaScores,
  onCompleted,
}) {
  return (
    <>
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
      <div className="submitted-label">Qualification Review</div>
      <SummaryView
        onBack={onBack}
        areaScores={areaScores}
        onCompleted={onCompleted}
        initialQuals={{
          qual_experience: selectedApplicationForDisplay?.qual_experience || '',
          qual_degree: selectedApplicationForDisplay?.qual_degree || '',
          qual_teaching: selectedApplicationForDisplay?.qual_teaching || '',
          qual_research: selectedApplicationForDisplay?.qual_research || '',
          qual_eligibility: selectedApplicationForDisplay?.qual_eligibility || '',
        }}
      />
    </>
  );
}
