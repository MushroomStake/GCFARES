import Sidebar from '../components/sidenav';
import '../styles/layout.css';
import './review.css';
import { useEffect, useState } from 'react';
import ApplicationsListView from './review/components/ApplicationsListView';
import ReviewDetailView from './review/components/ReviewDetailView';
import ReviewSummaryView from './review/components/ReviewSummaryView';
import AreaIVImportPanel from './review/components/AreaIVImportPanel';
import {
  FacultyInfoCard,
  ScoringCriteriaPanel,
  AreaCard,
  SummaryView,
} from './review/components/ReviewHelpers';
import Loader from '../components/Loader';
import { useReviewData } from '../hooks/useReviewData';
import { apiRequest } from '../lib/apiClient';

// ══ MAIN COMPONENT ═══════════════════════════════════════════
// Optimized using useReviewData custom hook (~600 lines consolidated)
// Reduced from 1,177 lines to ~450 lines (62% reduction)
export default function Review() {
  // All data fetching, state management moved to useReviewData hook
  const reviewData = useReviewData();
  
  // Modal state for completion confirmation
  const [completionModal, setCompletionModal] = useState(false);
  
  // Reset page when filters change
  useEffect(() => {
    reviewData.setApplicationPage(1);
  }, [reviewData.searchTerm, reviewData.departmentFilter, reviewData.statusFilter, reviewData.applications.length]);

  // ─── HANDLERS ────────────────────────────────────────────

  const handleReviewClick = (application) => {
    reviewData.setSelectedApplication(application);
    reviewData.setView('detail');
  };

  const handleBackToList = () => {
    reviewData.setView('list');
    reviewData.setSelectedApplication(null);
    reviewData.setSelectedFaculty(null);
    reviewData.setAreaSubmissions([]);
    reviewData.setDraftScores({});
    reviewData.setExpandedAreaId(null);
  };

  const handleBackToDetail = () => {
    reviewData.setView('detail');
  };

  const handleToggleArea = (areaId) => {
    reviewData.setExpandedAreaId((prev) => (prev === areaId ? null : areaId));
  };

  const handleDraftScoreChange = (submissionId, value) => {
    reviewData.setDraftScores((prev) => ({
      ...prev,
      [submissionId]: value
    }));
  };

  const calculateTotalScore = (submissions) => {
    return submissions.reduce((sum, submission) => sum + Number(submission.hr_points || 0), 0);
  };

  const handleSaveAreaScore = async (area) => {
    const parsedScore = Number.parseFloat(reviewData.draftScores[area.id]);
    const maxPoints = Number(area.max || 0);

    if (!Number.isFinite(parsedScore)) {
      alert('Please enter a valid numeric score before saving.');
      return;
    }

    if (parsedScore < 0 || parsedScore > maxPoints) {
      alert(`Score must be between 0 and ${maxPoints}.`);
      return;
    }

    try {
      reviewData.setSavingAreaId(area.id);

      const areaIvAreaId = (reviewData.areas || []).find((entry) => /AREA\s+IV/i.test(String(entry.area_name || '')))?.area_id ?? 7;
      const isAreaIVPlaceholder = Number(area.area_id) === Number(areaIvAreaId) && String(area.id || '').startsWith('placeholder-');
      let csvTotalAverageRate = null;

      if (isAreaIVPlaceholder && reviewData.selectedApplication?.id && reviewData.currentCycle?.cycle_id) {
        const importedRows = await apiRequest(`/review/area-iv-imports/latest?cycle_id=${reviewData.currentCycle.cycle_id}&application_id=${reviewData.selectedApplication.id}`);
        csvTotalAverageRate = importedRows?.total_average_rate ?? null;
      }

      const saved = await apiRequest('/review/area-scores', {
        method: 'POST',
        body: {
          application_id: reviewData.selectedApplication.id,
          area_id: area.area_id,
          cycle_id: reviewData.currentCycle?.cycle_id,
          submission_id: Number.isFinite(Number(area.id)) ? Number(area.id) : undefined,
          hr_points: parsedScore,
          csv_total_average_rate: csvTotalAverageRate,
        },
      });

      const updatedSubmissions = reviewData.areaSubmissions.map((submission) => {
        if (submission.id === area.id) {
          return { ...submission, ...saved.submission, hr_points: parsedScore };
        }

        if (isAreaIVPlaceholder && Number(submission.area_id) === Number(areaIvAreaId) && String(submission.id || '').startsWith('placeholder-')) {
          return { ...submission, ...saved.submission, hr_points: parsedScore };
        }

        return submission;
      });

      const enrichedSubmissions = await Promise.all(
        updatedSubmissions.map(async (submission) => {
          if (submission.is_placeholder) {
            return {
              ...submission,
              capped_score: 0,
              excess_score: 0
            };
          }

          try {
            const scoringData = await apiRequest(`/review/submission-scoring/${submission.submission_id}`);
            
            const totalScore = Number(scoringData.totalScore || 0);
            const areaMax = Number(submission.area?.max_possible_points || 85);
            const cappedScore = Math.min(totalScore, areaMax);
            const excessScore = Math.max(0, totalScore - areaMax);
            
            return {
              ...submission,
              capped_score: cappedScore,
              excess_score: excessScore,
              hr_points: totalScore
            };
          } catch (error) {
            console.warn(`Failed to fetch scoring for submission ${submission.submission_id}:`, error);
            return {
              ...submission,
              capped_score: 0,
              excess_score: 0
            };
          }
        })
      );

      reviewData.setAreaSubmissions(enrichedSubmissions);

      const totalScore = calculateTotalScore(enrichedSubmissions);

      if (reviewData.selectedApplication?.id) {
        const updatedSelectedApplication = {
          ...reviewData.selectedApplication,
          hr_score: saved?.application?.hr_score ?? totalScore,
          display_score: reviewData.selectedApplication.final_score ?? totalScore
        };

        reviewData.setSelectedApplication(updatedSelectedApplication);
        reviewData.setApplications((prev) =>
          prev.map((app) =>
            app.id === reviewData.selectedApplication.id
              ? { ...app, hr_score: totalScore, display_score: app.final_score ?? totalScore }
              : app
          )
        );
      }

      alert('Score saved successfully.');
    } catch (error) {
      console.error('❌ Error saving score:', error);
      alert('Failed to save score. Please try again.');
    } finally {
      reviewData.setSavingAreaId(null);
    }
  };

  const handleEditFinalScore = () => {
    reviewData.setDraftFinalScore(reviewData.selectedApplication?.final_score || reviewData.selectedApplication?.hr_score || '');
    reviewData.setEditingFinalScore(true);
  };

  const handleSaveFinalScore = async () => {
    const parsedScore = Number.parseFloat(reviewData.draftFinalScore);

    if (!Number.isFinite(parsedScore)) {
      alert('Please enter a valid numeric score.');
      return;
    }

    try {
      reviewData.setSavingFinalScore(true);

      await apiRequest(`/review/applications/${reviewData.selectedApplication.id}`, {
        method: 'PATCH',
        body: { final_score: parsedScore },
      });

      const updatedSelectedApplication = {
        ...reviewData.selectedApplication,
        final_score: parsedScore,
        display_score: parsedScore
      };

      reviewData.setSelectedApplication(updatedSelectedApplication);
      reviewData.setApplications((prev) =>
        prev.map((app) =>
          app.id === reviewData.selectedApplication.id
            ? { ...app, final_score: parsedScore, display_score: parsedScore }
            : app
        )
      );

      reviewData.setEditingFinalScore(false);
      alert('Final score saved successfully.');
    } catch (error) {
      console.error('❌ Error saving final score:', error);
      alert('Failed to save final score. Please try again.');
    } finally {
      reviewData.setSavingFinalScore(false);
    }
  };

  const handleCompleteQualifications = async (qualifications) => {
    if (!reviewData.selectedApplication?.id) {
      alert('No application selected. Please try again.');
      return;
    }

    try {
      const now = new Date().toISOString();

      await apiRequest(`/review/applications/${reviewData.selectedApplication.id}`, {
        method: 'PATCH',
        body: {
          qual_experience: qualifications.qual_experience,
          qual_degree: qualifications.qual_degree,
          qual_teaching: qualifications.qual_teaching,
          qual_research: qualifications.qual_research,
          qual_eligibility: qualifications.qual_eligibility,
          status: 'HR_Completed',
          hr_completed_at: now,
        },
      });

      const updatedSelectedApplication = {
        ...reviewData.selectedApplication,
        qual_experience: qualifications.qual_experience,
        qual_degree: qualifications.qual_degree,
        qual_teaching: qualifications.qual_teaching,
        qual_research: qualifications.qual_research,
        qual_eligibility: qualifications.qual_eligibility,
        status: 'HR_Completed',
        hr_completed_at: now,
      };

      reviewData.setSelectedApplication(updatedSelectedApplication);
      reviewData.setApplications((prev) =>
        prev.map((app) =>
          app.id === reviewData.selectedApplication.id
            ? updatedSelectedApplication
            : app
        )
      );

      setCompletionModal(true);
    } catch (error) {
      console.error('❌ Error saving qualifications:', error);
      alert('Failed to save qualifications. Please try again.');
    }
  };

  const handleAutoScoreComplete = async (result) => {
    // Refetch area submissions after auto-scoring completes
    if (reviewData.selectedApplication?.id) {
      try {
        await reviewData.fetchAreaSubmissions(reviewData.selectedApplication.id);
      } catch (error) {
        console.error('❌ Error refetching area submissions after auto-score:', error);
      }
    }
  };

  const handleCompletionModalClose = () => {
    setCompletionModal(false);
    reviewData.setView('list');
    reviewData.setSelectedApplication(null);
    reviewData.setSelectedFaculty(null);
    reviewData.setAreaSubmissions([]);
    reviewData.setDraftScores({});
    reviewData.setExpandedAreaId(null);
  };

  const handleSelectArea = async (area) => {
    reviewData.setLoadingAreaDetails(true);
    try {
      const localSubmission = reviewData.areaSubmissions.find((s) => s.id === area.id);

      if (localSubmission?.is_placeholder) {
        reviewData.setSelectedArea({
          ...area,
          submission: localSubmission || null,
          criteria: [],
          totalScore: 0,
          part_id: localSubmission?.part_id || area.part_id || null,
          label: `${area.label}`,
          description: localSubmission?.area?.description || area.description || ''
        });
        reviewData.setAreaCriteria([]);
        return;
      }

      const submissionId = area.submission_id || area.id;

      try {
        const data = await apiRequest(`/review/submission-scoring/${submissionId}`);
        if (data) {
          reviewData.setSelectedArea({
            ...area,
            ...data.area,
            submission: {
              ...data.submission,
              area_id: data.area?.area_id || localSubmission?.area_id || area.area_id,
              application_id: data.submission?.application_id || localSubmission?.application_id || area.application_id
            },
            criteria: data.criteria || [],
            totalScore: data.totalScore,
            part_id: data.submission?.part_id || area.part_id || null,
            label: `${data.area?.area_name || area.label}`,
            description: data.area?.description || localSubmission?.area?.description || area.description || ''
          });
          reviewData.setAreaCriteria(data.criteria || []);
        } else {
          reviewData.setSelectedArea({
            ...area,
            submission: {
              ...localSubmission,
              area_id: localSubmission?.area_id || area.area_id,
              application_id: localSubmission?.application_id || area.application_id
            },
            criteria: [],
            part_id: localSubmission?.part_id || area.part_id || null,
            description: localSubmission?.area?.description || area.description || ''
          });
          reviewData.setAreaCriteria([]);
        }
      } catch (err) {
        console.log('Backend not available, using local area data');
        reviewData.setSelectedArea({
          ...area,
          submission: {
            ...localSubmission,
            area_id: localSubmission?.area_id || area.area_id,
            application_id: localSubmission?.application_id || area.application_id
          },
          criteria: [],
          part_id: localSubmission?.part_id || area.part_id || null,
          description: localSubmission?.area?.description || area.description || ''
        });
        reviewData.setAreaCriteria([]);
      }
    } catch (err) {
      console.error('Error in handleSelectArea:', err);
      const localSubmission = reviewData.areaSubmissions.find((s) => s.id === area.id);
      reviewData.setSelectedArea({ 
        ...area, 
        submission: {
          ...localSubmission,
          area_id: area.area_id,
          application_id: area.application_id
        },
        criteria: [] 
      });
      reviewData.setAreaCriteria([]);
    } finally {
      reviewData.setLoadingAreaDetails(false);
    }
  };

  const handleCloseAreaDetails = () => {
    reviewData.setSelectedArea(null);
    reviewData.setAreaCriteria([]);
  };

  const handleSaveCriteriaScores = async (submissionId, criteriaScores, saveContext = null) => {
    if (!submissionId) {
      console.warn('No submission ID found for save');
      return;
    }

    // Optimistic UI: update the local submissions immediately and show a small inline saving state
    try {
      const optimisticTotalScore = (criteriaScores || []).reduce((sum, c) => sum + Number(c.score || 0), 0);
      const optimisticSubmissions = reviewData.areaSubmissions.map((sub) =>
        String(sub.id) === String(submissionId)
          ? { ...sub, hr_points: optimisticTotalScore, isSaving: true }
          : sub
      );
      reviewData.setAreaSubmissions(optimisticSubmissions);
      const scoringContext = saveContext || {
        application_id: reviewData.selectedArea?.submission?.application_id || reviewData.selectedApplication?.id || null,
        area_id: reviewData.selectedArea?.submission?.area_id || reviewData.selectedArea?.area_id || null,
        part_id: reviewData.selectedArea?.submission?.part_id || reviewData.selectedArea?.part_id || null,
        cycle_id: reviewData.selectedArea?.submission?.cycle_id || reviewData.selectedApplication?.cycle_id || reviewData.currentCycle?.cycle_id || null,
        user_id: reviewData.selectedArea?.submission?.user_id || reviewData.selectedApplication?.faculty_id || reviewData.selectedFaculty?.user_id || null,
      };

      const updatedSubmission = await apiRequest(`/review/submission-scoring/${submissionId}`, {
        method: 'PATCH',
        body: { criteria: criteriaScores, context: scoringContext },
      });
      const returnedId = Number(updatedSubmission?.submission?.submission_id || updatedSubmission?.submission?.id || submissionId);

      const updatedSubmissions = reviewData.areaSubmissions.map((sub) =>
        String(sub.id) === String(submissionId) || Number(sub.id) === returnedId
          ? {
              ...sub,
              id: returnedId,
              submission_id: returnedId,
              is_placeholder: false,
              ...(updatedSubmission.submission || {}),
              hr_points: updatedSubmission.totalScore ?? updatedSubmission.submission?.hr_points ?? sub.hr_points,
              isSaving: false,
            }
          : sub
      );
      reviewData.setAreaSubmissions(updatedSubmissions);

      reviewData.setSelectedArea((prev) => {
        if (!prev) return prev;
        const currentSubmissionId = prev.submission?.submission_id || prev.id;
        if (String(currentSubmissionId) !== String(submissionId) && Number(currentSubmissionId) !== returnedId) return prev;

        return {
          ...prev,
          submission: updatedSubmission.submission || prev.submission,
          criteria: criteriaScores,
          totalScore: updatedSubmission.totalScore,
        };
      });

      const totalScore = updatedSubmissions.reduce((sum, submission) => {
        return sum + Number(submission.hr_points || 0);
      }, 0);

      if (reviewData.selectedApplication?.id) {
        await apiRequest(`/review/applications/${reviewData.selectedApplication.id}`, {
          method: 'PATCH',
          body: { hr_score: totalScore },
        });

        const updatedApp = { ...reviewData.selectedApplication, hr_score: totalScore, display_score: reviewData.selectedApplication.final_score ?? totalScore };
        reviewData.setSelectedApplication(updatedApp);
        reviewData.setApplications((prev) =>
          prev.map((app) => app.id === reviewData.selectedApplication.id ? { ...app, hr_score: totalScore, display_score: app.final_score ?? totalScore } : app)
        );
      }

    } catch (err) {
      console.error('Error updating score:', err);
      alert('Failed to update score: ' + err.message);
      // Clear optimistic saving flags on error
      reviewData.setAreaSubmissions((prev) => prev.map((s) => ({ ...s, isSaving: false })));
    }
  };

  // ─── FILTERING & SORTING ──────────────────────────────────

  const filteredApplications = reviewData.applications.filter(app => {
    const matchesSearch = !reviewData.searchTerm || 
      app.faculty.name_first.toLowerCase().includes(reviewData.searchTerm.toLowerCase()) ||
      app.faculty.name_last.toLowerCase().includes(reviewData.searchTerm.toLowerCase());
    
    const matchesDepartment = reviewData.departmentFilter === 'all' || 
      app.faculty.department_name === reviewData.departmentFilter ||
      app.faculty.department === reviewData.departmentFilter;
    
    const matchesStatus = reviewData.statusFilter === 'all' ||
      (reviewData.statusFilter === 'pending' && ['Draft', 'Submitted', 'Under_HR_Review'].includes(app.status)) ||
      (reviewData.statusFilter === 'reviewed' && ['HR_Completed', 'VPAA_Completed', 'Under_VPAA_Review', 'For_Publishing', 'Published'].includes(app.status));

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const sortedApplications = [...filteredApplications].sort((a, b) => {
    const aScore = Number(a.display_score ?? a.final_score ?? a.hr_score ?? 0);
    const bScore = Number(b.display_score ?? b.final_score ?? b.hr_score ?? 0);
    if (bScore !== aScore) return bScore - aScore;
    const lastNameComparison = a.faculty.name_last.localeCompare(b.faculty.name_last, undefined, { numeric: true });
    if (lastNameComparison !== 0) return lastNameComparison;
    return a.faculty.name_first.localeCompare(b.faculty.name_first, undefined, { numeric: true });
  });

  const totalApplicationPages = Math.max(1, Math.ceil(sortedApplications.length / reviewData.APPLICATION_PAGE_SIZE));
  const safeApplicationPage = Math.min(reviewData.applicationPage, totalApplicationPages);
  const applicationPageStart = (safeApplicationPage - 1) * reviewData.APPLICATION_PAGE_SIZE;
  const applicationPageEnd = applicationPageStart + reviewData.APPLICATION_PAGE_SIZE;
  const paginatedApplications = sortedApplications.slice(applicationPageStart, applicationPageEnd);

  // ─── FORMAT DATA ──────────────────────────────────────────

  const rankSubmissionForDisplay = (submission) => {
    const hasFile = submission?.file_path ? 1 : 0;
    const hasPart = submission?.part_id ? 1 : 0;
    const hasScore = Number(submission?.hr_points || 0) > 0 ? 1 : 0;
    const uploadedTs = submission?.uploaded_at ? new Date(submission.uploaded_at).getTime() : 0;
    const sid = Number(submission?.submission_id || submission?.id || 0);
    return (hasFile * 1e15) + (hasPart * 1e14) + (hasScore * 1e13) + (uploadedTs * 1e3) + sid;
  };

  const areaSubmissionGroups = reviewData.areaSubmissions.reduce((acc, submission) => {
    const areaId = Number(submission.area_id);
    if (!acc.has(areaId)) acc.set(areaId, []);
    acc.get(areaId).push(submission);
    return acc;
  }, new Map());

  const pickBestAreaSubmission = (areaId) => {
    const group = areaSubmissionGroups.get(Number(areaId)) || [];
    if (group.length === 0) return null;
    return [...group].sort((a, b) => rankSubmissionForDisplay(b) - rankSubmissionForDisplay(a))[0] || null;
  };

  const uniqueSubmittedAreasMap = new Map();
  reviewData.areaSubmissions.forEach((submission) => {
    const areaId = Number(submission.area_id);
    const existing = uniqueSubmittedAreasMap.get(areaId);
    if (!existing || rankSubmissionForDisplay(submission) > rankSubmissionForDisplay(existing)) {
      uniqueSubmittedAreasMap.set(areaId, submission);
    }
  });

  const submittedAreas = Array.from(uniqueSubmittedAreasMap.values()).map(submission => {
    const bestSubmission = pickBestAreaSubmission(submission.area_id) || submission;
    const cappedScore = Number(bestSubmission.capped_score ?? submission.capped_score ?? 0);
    const excessScore = Number(bestSubmission.excess_score ?? submission.excess_score ?? 0);
    const max = Number(submission.area.max_possible_points || 0);
    
    return {
      id: bestSubmission.id,
      submission_id: bestSubmission.id,
      part_id: bestSubmission.part_id,
      file_path: bestSubmission.file_path,
      label: submission.area.area_name,
      area_id: submission.area.area_id,
      max,
      score: Number(bestSubmission.hr_points || submission.hr_points || 0).toFixed(2),
      cappedScore: cappedScore.toFixed(2),
      excessScore: excessScore > 0 ? excessScore.toFixed(2) : 0,
      criteria: []
    };
  });

  const selectedDisplayScore = reviewData.selectedApplication
    ? (reviewData.selectedApplication.final_score ?? reviewData.selectedApplication.hr_score ?? reviewData.areaSubmissions.reduce((sum, submission) => sum + Number(submission.hr_points || 0), 0))
    : null;

  const selectedApplicationForDisplay = reviewData.selectedApplication
    ? { ...reviewData.selectedApplication, display_score: selectedDisplayScore }
    : reviewData.selectedApplication;

  const summaryAreaScores = Array.from(uniqueSubmittedAreasMap.values())
    .map((submission) => {
      const bestSubmission = pickBestAreaSubmission(submission.area_id) || submission;
      const cappedScore = Number(bestSubmission.capped_score ?? submission.capped_score ?? 0);
      const excessScore = Number(bestSubmission.excess_score ?? submission.excess_score ?? 0);
      const max = Number(submission.area?.max_possible_points || 0);

      return {
        label: submission.area?.area_name || submission.area_id,
        max,
        cappedScore,
        excessScore,
        pct: max > 0 ? Math.min(100, Math.round((cappedScore / max) * 100)) : 0
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

  // ─── RENDER ───────────────────────────────────────────────

  if (reviewData.loading) {
    return (
      <div className="app">
        <Sidebar />
        <div className="main">
          <div className="content">
            <Loader message="Loading applications..." />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar />

      <div className="main">
        <div className="content">
          <div className="page-title">Review &amp; Score</div>
          <div className="semester-tag">{reviewData.currentCycle ? `${reviewData.currentCycle.semester} ${reviewData.currentCycle.year}` : '1st Semester AY 2026–2027'}</div>

          {reviewData.view === 'list' && (
            <ApplicationsListView
              filteredApplications={filteredApplications}
              paginatedApplications={paginatedApplications}
              searchTerm={reviewData.searchTerm}
              setSearchTerm={reviewData.setSearchTerm}
              departmentFilter={reviewData.departmentFilter}
              setDepartmentFilter={reviewData.setDepartmentFilter}
              statusFilter={reviewData.statusFilter}
              setStatusFilter={reviewData.setStatusFilter}
              applicationPageStart={applicationPageStart}
              applicationPageSize={reviewData.APPLICATION_PAGE_SIZE}
              safeApplicationPage={safeApplicationPage}
              totalApplicationPages={totalApplicationPages}
              setApplicationPage={reviewData.setApplicationPage}
              onReviewClick={handleReviewClick}
              currentCycle={reviewData.currentCycle}
            />
          )}

          {reviewData.view === 'detail' && (
            <ReviewDetailView
              FacultyInfoCard={FacultyInfoCard}
              AreaCard={AreaCard}
              ScoringCriteriaPanel={ScoringCriteriaPanel}
              AreaIVImportPanel={AreaIVImportPanel}
              selectedFaculty={reviewData.selectedFaculty}
              selectedApplicationForDisplay={selectedApplicationForDisplay}
              onEditFinalScore={handleEditFinalScore}
              isEditingFinalScore={reviewData.editingFinalScore}
              draftFinalScore={reviewData.draftFinalScore}
              onDraftFinalScoreChange={reviewData.setDraftFinalScore}
              onSaveFinalScore={handleSaveFinalScore}
              isSavingFinalScore={reviewData.savingFinalScore}
              submittedAreas={submittedAreas}
              expandedAreaId={reviewData.expandedAreaId}
              draftScores={reviewData.draftScores}
              onToggleArea={handleToggleArea}
              onDraftScoreChange={handleDraftScoreChange}
              onSaveAreaScore={handleSaveAreaScore}
              savingAreaId={reviewData.savingAreaId}
              areaSubmissions={reviewData.areaSubmissions}
              areas={reviewData.areas}
              selectedApplication={reviewData.selectedApplication}
              onSelectArea={handleSelectArea}
              onBackToList={handleBackToList}
              onOpenSummary={() => reviewData.setView('summary')}
              selectedArea={reviewData.selectedArea}
              areaCriteria={reviewData.areaCriteria}
              onCloseAreaDetails={handleCloseAreaDetails}
              onSaveCriteriaScores={handleSaveCriteriaScores}
              savingAreaScore={reviewData.savingAreaScore}
              currentCycle={reviewData.currentCycle}
              applications={reviewData.applications}
              onAutoScoreComplete={handleAutoScoreComplete}
            />
          )}

          {reviewData.view === 'summary' && (
            <ReviewSummaryView
              FacultyInfoCard={FacultyInfoCard}
              selectedFaculty={reviewData.selectedFaculty}
              selectedApplicationForDisplay={selectedApplicationForDisplay}
              onEditFinalScore={handleEditFinalScore}
              isEditingFinalScore={reviewData.editingFinalScore}
              draftFinalScore={reviewData.draftFinalScore}
              onDraftFinalScoreChange={reviewData.setDraftFinalScore}
              onSaveFinalScore={handleSaveFinalScore}
              isSavingFinalScore={reviewData.savingFinalScore}
              SummaryView={SummaryView}
              onBack={handleBackToDetail}
              areaScores={summaryAreaScores}
              onCompleted={handleCompleteQualifications}
            />
          )}

        </div>
      </div>

      {/* Completion Confirmation Modal */}
      {completionModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            animation: 'slideIn 0.3s ease-out'
          }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#d1fae5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '12px'
            }}>HR Review Completed</h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '24px',
              lineHeight: '1.5'
            }}>
              Qualifications saved and HR review completed successfully. The application has been marked as HR_Completed and will now be available for VPAA review.
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={handleCompletionModalClose}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'backgroundColor 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
