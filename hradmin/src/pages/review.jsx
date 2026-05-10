import Sidebar from '../components/sidenav';
import '../styles/layout.css';
import './review.css';
import { supabase } from '../supabase';
import { useEffect } from 'react';
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

// ══ MAIN COMPONENT ═══════════════════════════════════════════
// Optimized using useReviewData custom hook (~600 lines consolidated)
// Reduced from 1,177 lines to ~450 lines (62% reduction)
export default function Review() {
  // All data fetching, state management moved to useReviewData hook
  const reviewData = useReviewData();
  
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
    const areaIvAreaId = (reviewData.areas || []).find((entry) => /AREA\s+IV/i.test(String(entry.area_name || '')))?.area_id ?? 7;

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

      const isAreaIVPlaceholder = Number(area.area_id) === Number(areaIvAreaId) && String(area.id || '').startsWith('placeholder-');

      if (isAreaIVPlaceholder && reviewData.selectedApplication?.id) {
        const { data: existingArea4Submission, error: existingError } = await supabase
          .from('area_submissions')
          .select('*')
          .eq('application_id', reviewData.selectedApplication.id)
          .eq('area_id', areaIvAreaId)
          .eq('cycle_id', reviewData.currentCycle?.cycle_id)
          .maybeSingle();

        if (existingError) throw existingError;

        if (existingArea4Submission) {
          const { error: updateArea4Error } = await supabase
            .from('area_submissions')
            .update({ hr_points: parsedScore })
            .eq('submission_id', existingArea4Submission.submission_id);

          if (updateArea4Error) throw updateArea4Error;
        } else {
          const { error: insertArea4Error } = await supabase
            .from('area_submissions')
            .insert({
              application_id: reviewData.selectedApplication.id,
              area_id: areaIvAreaId,
              cycle_id: reviewData.currentCycle?.cycle_id,
              file_path: null,
              hr_points: parsedScore,
              csv_total_average_rate: null,
              uploaded_at: new Date().toISOString(),
            });

          if (insertArea4Error) throw insertArea4Error;
        }
      } else {
        const { error: submissionUpdateError } = await supabase
          .from('area_submissions')
          .update({ hr_points: parsedScore })
          .eq('submission_id', area.id);
        if (submissionUpdateError) throw submissionUpdateError;
      }

      const updatedSubmissions = reviewData.areaSubmissions.map((submission) => {
        if (submission.id === area.id) {
          return { ...submission, hr_points: parsedScore };
        }

        if (isAreaIVPlaceholder && Number(submission.area_id) === Number(areaIvAreaId) && String(submission.id || '').startsWith('placeholder-')) {
          return { ...submission, hr_points: parsedScore };
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
            const response = await fetch(
              `http://localhost:5000/review/submission-scoring/${submission.submission_id}`
            );
            const scoringData = await response.json();
            
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
        const { error: appUpdateError } = await supabase
          .from('applications')
          .update({ hr_score: totalScore })
          .eq('application_id', reviewData.selectedApplication.id);
        if (appUpdateError) throw appUpdateError;

        const updatedSelectedApplication = {
          ...reviewData.selectedApplication,
          hr_score: totalScore,
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

      const { error: updateError } = await supabase
        .from('applications')
        .update({ final_score: parsedScore })
        .eq('application_id', reviewData.selectedApplication.id);

      if (updateError) throw updateError;

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

      const { error: updateError } = await supabase
        .from('applications')
        .update({
          qual_experience: qualifications.qual_experience,
          qual_degree: qualifications.qual_degree,
          qual_teaching: qualifications.qual_teaching,
          qual_research: qualifications.qual_research,
          qual_eligibility: qualifications.qual_eligibility,
          status: 'HR_Completed',
          hr_completed_at: now,
        })
        .eq('application_id', reviewData.selectedApplication.id);

      if (updateError) throw updateError;

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

      alert('Qualifications saved and HR review completed successfully.');
      reviewData.setView('detail');
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
        const response = await fetch(`http://localhost:5000/review/submission-scoring/${submissionId}`);
        if (response.ok) {
          const data = await response.json();
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

    reviewData.setSavingAreaScore(true);
    try {
      const scoringContext = saveContext || {
        application_id: reviewData.selectedArea?.submission?.application_id || reviewData.selectedApplication?.id || null,
        area_id: reviewData.selectedArea?.submission?.area_id || reviewData.selectedArea?.area_id || null,
        part_id: reviewData.selectedArea?.submission?.part_id || reviewData.selectedArea?.part_id || null,
        cycle_id: reviewData.selectedArea?.submission?.cycle_id || reviewData.selectedApplication?.cycle_id || reviewData.currentCycle?.cycle_id || null,
        user_id: reviewData.selectedArea?.submission?.user_id || reviewData.selectedApplication?.faculty_id || reviewData.selectedFaculty?.user_id || null,
      };

      const response = await fetch(`http://localhost:5000/review/submission-scoring/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criteria: criteriaScores, context: scoringContext }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update score');
      }

      const updatedSubmission = await response.json();
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
        const { error: appUpdateError } = await supabase
          .from('applications')
          .update({ hr_score: totalScore })
          .eq('application_id', reviewData.selectedApplication.id);
        if (!appUpdateError) {
          const updatedApp = { ...reviewData.selectedApplication, hr_score: totalScore, display_score: reviewData.selectedApplication.final_score ?? totalScore };
          reviewData.setSelectedApplication(updatedApp);
          reviewData.setApplications((prev) =>
            prev.map((app) => app.id === reviewData.selectedApplication.id ? { ...app, hr_score: totalScore, display_score: app.final_score ?? totalScore } : app)
          );
        }
      }

    } catch (err) {
      console.error('Error updating score:', err);
      alert('Failed to update score: ' + err.message);
    } finally {
      reviewData.setSavingAreaScore(false);
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

  const uniqueSubmittedAreasMap = new Map();
  reviewData.areaSubmissions.forEach((submission) => {
    const areaId = Number(submission.area_id);
    const existing = uniqueSubmittedAreasMap.get(areaId);
    if (!existing || rankSubmissionForDisplay(submission) > rankSubmissionForDisplay(existing)) {
      uniqueSubmittedAreasMap.set(areaId, submission);
    }
  });

  const submittedAreas = Array.from(uniqueSubmittedAreasMap.values()).map(submission => {
    const cappedScore = Number(submission.capped_score || 0);
    const excessScore = Number(submission.excess_score || 0);
    const max = Number(submission.area.max_possible_points || 0);
    
    return {
      id: submission.id,
      submission_id: submission.id,
      part_id: submission.part_id,
      file_path: submission.file_path,
      label: submission.area.area_name,
      area_id: submission.area.area_id,
      max,
      score: Number(submission.hr_points || 0).toFixed(2),
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

  const summaryAreaScores = reviewData.areaSubmissions
    .map((submission) => {
      const cappedScore = Number(submission.capped_score || 0);
      const excessScore = Number(submission.excess_score || 0);
      const max = Number(submission.area?.max_possible_points || 0);
      const pct = max > 0 ? Math.min(100, Math.round((cappedScore / max) * 100)) : 0;

      return {
        label: submission.area?.area_name || submission.area_id,
        max,
        cappedScore,
        excessScore,
        pct
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

    </div>
  );
}
