import { useState, useEffect } from 'react';
import { apiRequest } from '../lib/apiClient';
import { RANKING_RUBRICS } from '../data/rankingRubrics';

/**
 * Custom hook for managing review & score data fetching and state
 * Consolidates ~600 lines of data fetching, transformation, and scoring logic
 * 
 * Returns all review-related state and handlers to reduce component complexity
 */
export function useReviewData() {
  // ─── State: Data Loading ─────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [areas, setAreas] = useState([]);
  const [currentCycle, setCurrentCycle] = useState(null);

  // ─── State: Current Selection ────────────────────────────
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [areaSubmissions, setAreaSubmissions] = useState([]);
  const [selectedArea, setSelectedArea] = useState(null);
  const [areaCriteria, setAreaCriteria] = useState([]);

  // ─── State: UI Interactions ──────────────────────────────
  const [view, setView] = useState('list'); // 'list' | 'detail' | 'summary'
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedAreaId, setExpandedAreaId] = useState(null);
  const [applicationPage, setApplicationPage] = useState(1);

  // ─── State: Form Drafts & Saving ─────────────────────────
  const [draftScores, setDraftScores] = useState({});
  const [savingAreaId, setSavingAreaId] = useState(null);
  const [loadingAreaDetails, setLoadingAreaDetails] = useState(false);
  const [savingAreaScore, setSavingAreaScore] = useState(false);
  const [editingFinalScore, setEditingFinalScore] = useState(false);
  const [draftFinalScore, setDraftFinalScore] = useState('');
  const [savingFinalScore, setSavingFinalScore] = useState(false);

  const APPLICATION_PAGE_SIZE = 10;

  // ─── Initial Data Fetch ──────────────────────────────────
  useEffect(() => {
    void fetchApplicationsData();
  }, []);

  // ─── Fetch Area Submissions When Selection Changes ───────
  useEffect(() => {
    if (selectedApplication?.id && areas.length > 0 && (view === 'detail' || view === 'summary')) {
      setSelectedFaculty(selectedApplication.faculty);
      fetchAreaSubmissions(selectedApplication.id);
    }
  }, [selectedApplication?.id, view, areas.length]);

  /**
   * Fetches all applications for the active cycle with filtering and deduplication
   * (~350 lines of logic consolidated here)
   */
  const fetchApplicationsData = async ({ showLoader = true } = {}) => {
    try {
      if (showLoader) setLoading(true);
      console.log('📊 Fetching applications data (Laravel API)...');

      // Get all cycles and pick one that actually has applications.
      const allCycles = await apiRequest('/review/cycles');

      const cycles = Array.isArray(allCycles) ? allCycles : [];
      let activeCycle = null;
      let rawApplicationsForCycle = [];

      for (const cycle of cycles) {
        const rows = await apiRequest(`/review/applications?cycle_id=${cycle.cycle_id}`);
        const apps = Array.isArray(rows) ? rows : [];
        if (apps.length > 0) {
          activeCycle = cycle;
          rawApplicationsForCycle = apps;
          break;
        }
      }

      if (!activeCycle && cycles.length > 0) {
        activeCycle = cycles[0];
      }

      if (!activeCycle) {
        console.warn('❌ No active cycle found');
        setCurrentCycle(null);
        setApplications([]);
        return;
      }

      setCurrentCycle(activeCycle);
      console.log('✅ Active cycle selected:', { 
        cycle_id: activeCycle.cycle_id, 
        status: activeCycle.status, 
        semester: activeCycle.semester, 
        year: activeCycle.year
      });

      // Get participants for this cycle
      const participantsData = await apiRequest(`/review/cycles/${activeCycle.cycle_id}/participants`);

      let participantFacultyIds = Array.from(
        new Set(
          (participantsData || [])
            .filter((p) => String(p.status || '').toLowerCase() === 'accepted')
            .map((p) => Number(p.faculty_id))
            .filter((id) => Number.isFinite(id))
        )
      );

      // Fallback: include any participants if no accepted ones found
      if (participantFacultyIds.length === 0) {
        const anyParticipants = (participantsData || []).filter((participant) => participant.faculty_id != null);

        if (anyParticipants.length > 0) {
          participantFacultyIds = Array.from(
            new Set(
              anyParticipants
                .map((p) => Number(p.faculty_id))
                .filter((id) => Number.isFinite(id))
            )
          );
        }
      }

      console.log('ℹ️ Participants for cycle:', {
        cycle_id: activeCycle.cycle_id,
        total_participants: (participantsData || []).length,
        accepted_participants: participantFacultyIds.length,
      });

      // Get areas and departments for enrichment
      const areasData = await apiRequest('/review/areas');
      setAreas(areasData || []);

      // Get applications for this cycle, then narrow to participants only when possible.
      const rawApplications = rawApplicationsForCycle.length > 0
        ? rawApplicationsForCycle
        : (await apiRequest(`/review/applications?cycle_id=${activeCycle.cycle_id}`));

      const normalizedRawApplications = Array.isArray(rawApplications) ? rawApplications : [];

      let applicationsData = normalizedRawApplications;
      if (participantFacultyIds.length > 0) {
        const filteredByParticipants = normalizedRawApplications.filter((application) => {
          const facultyId = Number(application.faculty_id);
          return Number.isFinite(facultyId) && participantFacultyIds.includes(facultyId);
        });

        // If participant matching removes everything due to data mismatch, keep cycle applications.
        applicationsData = filteredByParticipants.length > 0
          ? filteredByParticipants
          : normalizedRawApplications;
      }

      console.log('ℹ️ Applications fetched for cycle:', {
        cycle_id: activeCycle.cycle_id,
        raw_cycle_applications: normalizedRawApplications.length,
        post_participant_filter: applicationsData.length,
      });

      // Track submission counts per application
      const applicationIdsForCycle = (applicationsData || []).map(app => app.application_id);
      let submissionCountByApplicationId = new Map();

      if (applicationIdsForCycle.length > 0) {
        const applicationSubmissions = await Promise.all(
          applicationIdsForCycle.map(async (applicationId) => {
            const rows = await apiRequest(`/review/applications/${applicationId}/submissions`);
            return (rows || []).map(() => ({ application_id: applicationId }));
          })
        ).then((groups) => groups.flat());

        submissionCountByApplicationId = (applicationSubmissions || []).reduce((acc, row) => {
          const current = acc.get(row.application_id) || 0;
          acc.set(row.application_id, current + 1);
          return acc;
        }, new Map());
      }

      // Deduplicate: keep best application per faculty
      const applicationStatusPriority = {
        VPAA_Completed: 4,
        HR_Completed: 3,
        Under_VPAA_Review: 2,
        Under_HR_Review: 2,
        Submitted: 2,
        Draft: 1,
      };

      const getApplicationPriority = (app) => {
        const statusScore = applicationStatusPriority[app.status] || 0;
        const createdAtScore = new Date(app.created_at).getTime() || 0;
        return statusScore * 1e13 + createdAtScore;
      };

      const latestByFaculty = new Map();
      for (const app of (applicationsData || [])) {
        const existing = latestByFaculty.get(app.faculty_id);
        if (!existing || getApplicationPriority(app) > getApplicationPriority(existing)) {
          latestByFaculty.set(app.faculty_id, app);
        }
      }

      // Get fallback scores by summing area points
      const cycleScopedApplications = Array.from(latestByFaculty.values());
      const applicationIds = cycleScopedApplications.map(app => app.application_id);
      let fallbackScoreByApplicationId = new Map();

      if (applicationIds.length > 0) {
        const allSubmissions = await Promise.all(
          applicationIds.map(async (applicationId) => {
            const rows = await apiRequest(`/review/applications/${applicationId}/submissions`);
            return (rows || []).map((row) => ({
              application_id: applicationId,
              hr_points: row.hr_points,
            }));
          })
        ).then((groups) => groups.flat());

        fallbackScoreByApplicationId = (allSubmissions || []).reduce((acc, row) => {
          const current = acc.get(row.application_id) || 0;
          acc.set(row.application_id, current + Number(row.hr_points || 0));
          return acc;
        }, new Map());
      }

      // Enrich applications with faculty data
      const applicationsWithFaculty = [];
      for (const appData of cycleScopedApplications) {
        const facultyData = appData.faculty;
        if (!facultyData) continue;

        // Skip VPAA users
        if ((facultyData?.role || '').toString().trim().toLowerCase() === 'vpaa') continue;

        const fallbackScore = fallbackScoreByApplicationId.get(appData.application_id);
        const displayScore = appData.final_score ?? appData.hr_score ?? fallbackScore ?? null;

        applicationsWithFaculty.push({
          id: appData.application_id,
          ...appData,
          display_score: displayScore,
          faculty: facultyData,
        });
      }

      setApplications(applicationsWithFaculty);
      console.log('✅ Fetched applications:', applicationsWithFaculty.length);

    } catch (error) {
      console.error('❌ Error fetching applications:', error);
      alert('Error loading applications data');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  /**
   * Fetches area submissions for a specific application
   * Creates placeholders for missing areas, batch-fetches scoring data
   * (~200 lines of logic consolidated here)
   */
  const fetchAreaSubmissions = async (applicationId) => {
    try {
      console.log('📄 Fetching area submissions for application:', applicationId);

      // Get actual submissions from database
      const submissionsData = await apiRequest(`/review/applications/${applicationId}/submissions`);

      const submissions = (submissionsData || []).map(submissionData => {
        const area = areas.find(a => a.area_id === submissionData.area_id);
        return {
          id: submissionData.submission_id,
          ...submissionData,
          area: area || { area_name: `Unknown Area ${submissionData.area_id}`, max_possible_points: 0 }
        };
      });

      // Re-add empty areas so the review list displays all areas, not just submitted ones.
      // These placeholders are display-only; scoring/upload logic still updates real rows in place.
      const submittedAreaIds = new Set(submissions.map((sub) => Number(sub.area_id)));
      const placeholderAreas = areas
        .filter((area) => !submittedAreaIds.has(Number(area.area_id)))
        .map((area) => ({
          id: `placeholder-${area.area_id}-${applicationId}`,
          submission_id: `placeholder-${area.area_id}-${applicationId}`,
          application_id: applicationId,
          area_id: area.area_id,
          file_path: null,
          hr_points: 0,
          vpaa_points: 0,
          csv_total_average_rate: null,
          uploaded_at: null,
          is_placeholder: true,
          area: {
            area_id: area.area_id,
            area_name: area.area_name,
            max_possible_points: area.max_possible_points,
            description: area.area_name,
          },
        }));

      const submissionsWithPlaceholders = [...submissions, ...placeholderAreas];

      // Deduplicate submissions: keep only the best submission per area.
      // If part_id exists, keep parts separate (Area I part A/B/... remain separate).
      // For submissions without part_id, remove duplicates by keeping the one with highest hr_points or latest upload.
      const submissionKey = (sub) => {
        const areaId = Number(sub.area_id);
        const partId = String(sub.part_id || '').trim().toLowerCase();
        // Only include part_id in key if it exists; otherwise just use area_id
        return partId ? `${areaId}::${partId}` : `${areaId}`;
      };

      // Helper to rank submission quality (for picking best when duplicates exist)
      const rankSubmission = (sub) => {
        const hasScore = Number(sub.hr_points || 0) > 0 ? 1 : 0;
        const uploadTime = sub.uploaded_at ? new Date(sub.uploaded_at).getTime() : 0;
        const isPlaceholder = sub.is_placeholder ? -1000000 : 0;
        return hasScore * 1000 + uploadTime + isPlaceholder;
      };

      const areaMap = new Map();
      submissionsWithPlaceholders.forEach(sub => {
        const key = submissionKey(sub);
        const existing = areaMap.get(key);
        // Keep the submission with higher rank (better score or newer upload)
        if (!existing || rankSubmission(sub) > rankSubmission(existing)) {
          areaMap.set(key, sub);
        }
      });
      
      const dedupedSubmissions = Array.from(areaMap.values());
      
      const romanToNum = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10 };
      const extractRomanNum = (areaName) => {
        const match = String(areaName || '').match(/AREA\s+([IVX]+)/i);
        return match ? romanToNum[match[1].toUpperCase()] || 99 : 99;
      };
      
      dedupedSubmissions.sort((a, b) => {
        const aNum = extractRomanNum(a.area?.area_name);
        const bNum = extractRomanNum(b.area?.area_name);
        if (aNum !== bNum) return aNum - bNum;

        const aPart = String(a.part_id || '').localeCompare(String(b.part_id || ''), undefined, { numeric: true, sensitivity: 'base' });
        if (aPart !== 0) return aPart;

        return Number(b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0) - Number(a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0);
      });

      // Batch-fetch scoring details for non-placeholder submissions
      const enrichedSubmissions = await Promise.all(
        dedupedSubmissions.map(async (submission) => {
          if (submission.is_placeholder) {
            return { ...submission, capped_score: 0, excess_score: 0 };
          }

          try {
            const scoringData = await apiRequest(`/review/submission-scoring/${submission.submission_id}`);

            // If the backend has no per-criterion rows but the submission has a total,
            // create a deterministic fallback criterion so UI remains consistent.
            const existingCriteria = Array.isArray(scoringData?.criteria) ? scoringData.criteria : [];
            if ((!existingCriteria || existingCriteria.length === 0) && Number(submission.hr_points || 0) > 0) {
              try {
                const partId = submission.part_id || null;
                const filePath = submission.file_path || null;
                const fallbackKey = partId ? `part:${partId}` : (filePath ? `file:${String(filePath).split('/').pop()}` : `submission:${submission.submission_id}`);
                const fallbackLabel = partId || (filePath ? String(filePath).split('/').pop() : fallbackKey);
                const scoreValue = Number(submission.hr_points ?? submission.vpaa_points ?? submission.csv_total_average_rate ?? 0) || 0;

                const criteriaPayload = [{
                  criterion_key: fallbackKey,
                  label: fallbackLabel,
                  title: 'Auto-created fallback criterion on view',
                  maxPoints: submission.area?.max_possible_points || 0,
                  score: scoreValue,
                  cappedScore: scoreValue,
                }];

                await apiRequest(`/review/submission-scoring/${submission.submission_id}`, {
                  method: 'PATCH',
                  body: {
                    criteria: criteriaPayload,
                    context: {
                      application_id: submission.application_id || null,
                      area_id: submission.area_id || null,
                      cycle_id: submission.cycle_id || null,
                      part_id: submission.part_id || null,
                      user_id: submission.user_id || null,
                      file_path: submission.file_path || null,
                      csv_total_average_rate: submission.csv_total_average_rate || null,
                    }
                  }
                });
              } catch (err) {
                console.warn('Failed to upsert fallback criterion while reconciling on view for submission', submission.submission_id, err);
              }
            }

            const totalScore = Number(scoringData.totalScore || submission.hr_points || 0);
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
            return { ...submission, capped_score: 0, excess_score: 0 };
          }
        })
      );

      setAreaSubmissions(enrichedSubmissions);
      setDraftScores(
        enrichedSubmissions.reduce((acc, item) => {
          acc[item.id] = item.hr_points ?? '';
          return acc;
        }, {})
      );
      setExpandedAreaId(null);
      console.log('✅ Fetched', enrichedSubmissions.length, 'area submissions (with scoring data)');

    } catch (error) {
      console.error('❌ Error fetching area submissions:', error);
    }
  };

  /**
   * Utility: Calculate total score from submissions
   */
  const calculateTotalScore = (submissions) => {
    return submissions.reduce((sum, submission) => sum + Number(submission.hr_points || 0), 0);
  };

  return {
    // Data State
    loading,
    applications,
    areas,
    currentCycle,
    selectedApplication,
    selectedFaculty,
    areaSubmissions,
    selectedArea,
    areaCriteria,

    // UI State
    view,
    searchTerm,
    departmentFilter,
    statusFilter,
    expandedAreaId,
    applicationPage,

    // Form State
    draftScores,
    savingAreaId,
    loadingAreaDetails,
    savingAreaScore,
    editingFinalScore,
    draftFinalScore,
    savingFinalScore,

    // Setters
    setLoading,
    setApplications,
    setAreas,
    setCurrentCycle,
    setView,
    setSearchTerm,
    setDepartmentFilter,
    setStatusFilter,
    setExpandedAreaId,
    setApplicationPage,
    setSelectedApplication,
    setSelectedFaculty,
    setAreaSubmissions,
    setSelectedArea,
    setAreaCriteria,
    setDraftScores,
    setSavingAreaId,
    setLoadingAreaDetails,
    setSavingAreaScore,
    setEditingFinalScore,
    setDraftFinalScore,
    setSavingFinalScore,

    // Async Data Fetchers
    fetchApplicationsData,
    fetchAreaSubmissions,

    // Utility Functions
    calculateTotalScore,

    // Constants
    APPLICATION_PAGE_SIZE,
  };
}
