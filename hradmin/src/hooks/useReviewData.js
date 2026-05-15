import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
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
  const realtimeChannelRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const liveApplicationsChannelRef = useRef(null);

  const APPLICATION_PAGE_SIZE = 10;

  // ─── Initial Data Fetch ──────────────────────────────────
  useEffect(() => {
    void fetchApplicationsData();
  }, []);

  useEffect(() => {
    if (!currentCycle?.cycle_id) return undefined;

    const scheduleFullRefresh = () => {
      void fetchApplicationsData({ showLoader: false });
    };

    const channel = supabase
      .channel(`review-applications-live-${currentCycle.cycle_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, (payload) => {
        const newCycleId = payload?.new?.cycle_id != null ? Number(payload.new.cycle_id) : null;
        const oldCycleId = payload?.old?.cycle_id != null ? Number(payload.old.cycle_id) : null;
        if (newCycleId === Number(currentCycle.cycle_id) || oldCycleId === Number(currentCycle.cycle_id)) {
          scheduleFullRefresh();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cycle_participants' }, (payload) => {
        const newCycleId = payload?.new?.cycle_id != null ? Number(payload.new.cycle_id) : null;
        const oldCycleId = payload?.old?.cycle_id != null ? Number(payload.old.cycle_id) : null;
        if (newCycleId === Number(currentCycle.cycle_id) || oldCycleId === Number(currentCycle.cycle_id)) {
          scheduleFullRefresh();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ranking_cycles' }, (payload) => {
        const newCycleId = payload?.new?.cycle_id != null ? Number(payload.new.cycle_id) : null;
        const oldCycleId = payload?.old?.cycle_id != null ? Number(payload.old.cycle_id) : null;
        if (newCycleId === Number(currentCycle.cycle_id) || oldCycleId === Number(currentCycle.cycle_id)) {
          scheduleFullRefresh();
        }
      })
      .subscribe();

    liveApplicationsChannelRef.current = channel;

    return () => {
      if (liveApplicationsChannelRef.current) {
        supabase.removeChannel(liveApplicationsChannelRef.current);
        liveApplicationsChannelRef.current = null;
      }
    };
  }, [currentCycle?.cycle_id]);

  useEffect(() => {
    if (!currentCycle?.cycle_id) return undefined;

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = window.setTimeout(async () => {
        try {
          // Avoid refetching everything (which sets the global loading spinner).
          // For realtime submission/score events, do a lightweight refresh:
          // - If admin is viewing details for a specific application, refresh only its area submissions.
          // - Otherwise skip heavy refresh to prevent global spinner flicker.
          if (selectedApplication?.id && areas.length > 0 && (view === 'detail' || view === 'summary')) {
            await fetchAreaSubmissions(selectedApplication.id);
          }
        } catch (error) {
          console.error('❌ Error refreshing review data from realtime event:', error);
        }
      }, 250);
    };

    const matchesCurrentCycle = (payload) => {
      const newCycleId = payload?.new?.cycle_id != null ? Number(payload.new.cycle_id) : null;
      const oldCycleId = payload?.old?.cycle_id != null ? Number(payload.old.cycle_id) : null;
      return newCycleId === Number(currentCycle.cycle_id) || oldCycleId === Number(currentCycle.cycle_id);
    };

    const channel = supabase
      .channel(`review-live-updates-${currentCycle.cycle_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'area_submissions' }, (payload) => {
        if (matchesCurrentCycle(payload)) {
          scheduleRefresh();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'area_submission_criterion_scores' }, (payload) => {
        const payloadCycleId = payload?.new?.cycle_id != null ? Number(payload.new.cycle_id) : (payload?.old?.cycle_id != null ? Number(payload.old.cycle_id) : null);
        if (payloadCycleId === Number(currentCycle.cycle_id)) {
          scheduleRefresh();
        }
      })
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [currentCycle?.cycle_id, selectedApplication?.id, areas.length, view]);

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
      console.log('📊 Fetching applications data (Supabase)...');

      // Get all cycles and find the active one
      const { data: allCycles, error: allCyclesError } = await supabase
        .from('ranking_cycles')
        .select('*')
        .order('created_at', { ascending: false });
      if (allCyclesError) throw allCyclesError;

      const activeCycle = (allCycles || [])[0] || null;

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
      const { data: participantsData, error: participantsError } = await supabase
        .from('cycle_participants')
        .select('faculty_id, status')
        .eq('cycle_id', activeCycle.cycle_id)
        .eq('status', 'accepted');
      if (participantsError) throw participantsError;

      let participantFacultyIds = Array.from(
        new Set((participantsData || []).map(p => p.faculty_id).filter(Boolean))
      );

      // Fallback: include any participants if no accepted ones found
      if (participantFacultyIds.length === 0) {
        const { data: anyParticipants, error: anyError } = await supabase
          .from('cycle_participants')
          .select('faculty_id, status')
          .eq('cycle_id', activeCycle.cycle_id)
          .not('faculty_id', 'is', null);

        if (!anyError && (anyParticipants || []).length > 0) {
          participantFacultyIds = Array.from(
            new Set((anyParticipants || []).map(p => p.faculty_id).filter(Boolean))
          );
        } else {
          setApplications([]);
          return;
        }
      }

      // Get areas and departments for enrichment
      const { data: areasData, error: areasError } = await supabase
        .from('areas')
        .select('*');
      if (areasError) throw areasError;
      setAreas(areasData || []);

      const { data: departmentsData, error: departmentsError } = await supabase
        .from('departments')
        .select('department_id, department_name');
      if (departmentsError) throw departmentsError;

      const departmentById = new Map(
        (departmentsData || []).map(dept => [dept.department_id, dept.department_name])
      );

      // Get applications for participants in this cycle
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('applications')
        .select('*')
        .in('faculty_id', participantFacultyIds)
        .eq('cycle_id', activeCycle.cycle_id)
        .order('created_at', { ascending: false });
      if (applicationsError) throw applicationsError;

      // Track submission counts per application
      const applicationIdsForCycle = (applicationsData || []).map(app => app.application_id);
      let submissionCountByApplicationId = new Map();

      if (applicationIdsForCycle.length > 0) {
        const { data: applicationSubmissions, error: applicationSubmissionsError } = await supabase
          .from('area_submissions')
          .select('application_id')
          .eq('cycle_id', activeCycle.cycle_id)
          .in('application_id', applicationIdsForCycle);

        if (applicationSubmissionsError) throw applicationSubmissionsError;

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
        const { data: allSubmissions, error: submissionsError } = await supabase
          .from('area_submissions')
          .select('application_id, hr_points')
          .in('application_id', applicationIds);
        if (submissionsError) throw submissionsError;

        fallbackScoreByApplicationId = (allSubmissions || []).reduce((acc, row) => {
          const current = acc.get(row.application_id) || 0;
          acc.set(row.application_id, current + Number(row.hr_points || 0));
          return acc;
        }, new Map());
      }

      // Enrich applications with faculty data
      const applicationsWithFaculty = [];
      for (const appData of cycleScopedApplications) {
        const { data: facultyData, error: facultyError } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', appData.faculty_id)
          .single();
        if (facultyError) continue;

        const isRankingFaculty = (facultyData?.status || '').toString().trim().toLowerCase() === 'ranking';
        const hasSubmittedFiles = (submissionCountByApplicationId.get(appData.application_id) || 0) > 0;

        // Show if faculty is ranking OR has submitted files
        if (!isRankingFaculty && !hasSubmittedFiles) continue;

        // Skip VPAA users
        if ((facultyData?.role || '').toString().trim().toLowerCase() === 'vpaa') continue;

        const fallbackScore = fallbackScoreByApplicationId.get(appData.application_id);
        const displayScore = appData.final_score ?? appData.hr_score ?? fallbackScore ?? null;

        applicationsWithFaculty.push({
          id: appData.application_id,
          ...appData,
          display_score: displayScore,
          faculty: {
            ...facultyData,
            department_name: departmentById.get(facultyData.department_id) || 'Unknown'
          }
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
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('area_submissions')
        .select('*')
        .eq('application_id', applicationId);
      
      if (submissionsError) throw submissionsError;

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
