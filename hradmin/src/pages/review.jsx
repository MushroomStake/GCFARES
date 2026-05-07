import { useState, useEffect } from 'react';
import Sidebar from '../components/sidenav';
import '../styles/layout.css';
import './review.css';
import { supabase } from '../supabase';
import { RANKING_RUBRICS } from '../data/rankingRubrics';
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
// ══ MAIN COMPONENT ═══════════════════════════════════════════
export default function Review() {
  const [view, setView] = useState(() => localStorage.getItem('review_view') || 'list'); // 'list' | 'detail' | 'summary'
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(() => {
    const stored = localStorage.getItem('review_selectedApplication');
    return stored ? JSON.parse(stored) : null;
  });
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [areaSubmissions, setAreaSubmissions] = useState([]);
  const [areas, setAreas] = useState([]);
  const [currentCycle, setCurrentCycle] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedAreaId, setExpandedAreaId] = useState(null);
  const [draftScores, setDraftScores] = useState({});
  const [savingAreaId, setSavingAreaId] = useState(null);
  const [selectedArea, setSelectedArea] = useState(() => {
    const stored = localStorage.getItem('review_selectedArea');
    return stored ? JSON.parse(stored) : null;
  });
  const [areaCriteria, setAreaCriteria] = useState([]);
  const [loadingAreaDetails, setLoadingAreaDetails] = useState(false);
  const [savingAreaScore, setSavingAreaScore] = useState(false);
  const [editingFinalScore, setEditingFinalScore] = useState(false);
  const [draftFinalScore, setDraftFinalScore] = useState('');
  const [savingFinalScore, setSavingFinalScore] = useState(false);
  const [applicationPage, setApplicationPage] = useState(1);

  const APPLICATION_PAGE_SIZE = 10;

  // Persist view state to localStorage
  useEffect(() => {
    localStorage.setItem('review_view', view);
  }, [view]);

  // Persist selectedApplication to localStorage
  useEffect(() => {
    if (selectedApplication) {
      localStorage.setItem('review_selectedApplication', JSON.stringify(selectedApplication));
    } else {
      localStorage.removeItem('review_selectedApplication');
    }
  }, [selectedApplication]);

  // Persist selectedArea to localStorage
  useEffect(() => {
    if (selectedArea) {
      localStorage.setItem('review_selectedArea', JSON.stringify(selectedArea));
    } else {
      localStorage.removeItem('review_selectedArea');
    }
  }, [selectedArea]);

  // Fetch data on component mount
  useEffect(() => {
    fetchApplicationsData();
  }, []);

  // When selectedApplication is restored from localStorage or changes, fetch its data
  useEffect(() => {
    if (selectedApplication?.id && view === 'detail' && areas.length > 0) {
      setSelectedFaculty(selectedApplication.faculty);
      fetchAreaSubmissions(selectedApplication.id);
    }
  }, [selectedApplication?.id, view, areas.length]);

  const fetchApplicationsData = async () => {
    try {
      setLoading(true);
      console.log('📊 Fetching applications data (Supabase)...');

      // ═══════════════════════════════════════════════════════════════
      // COMPREHENSIVE DEBUG: Check what's actually in cycle_participants
      // ═══════════════════════════════════════════════════════════════
      const { data: debugAllParticipants, error: debugError1 } = await supabase
        .from('cycle_participants')
        .select('*')
        .limit(100);
      
      console.log('🔍 DEBUG: Total participants in DB:', {
        count: debugAllParticipants?.length || 0,
        sampleRecords: debugAllParticipants?.slice(0, 5),
        allStatuses: debugAllParticipants?.map(p => ({ cycle_id: p.cycle_id, faculty_id: p.faculty_id, status: p.status, status_type: typeof p.status }))
      });

      // Strategy: Find cycles that HAVE participants, prioritizing those with status open/submissions_closed
      // First, get all cycles with any participants
      const { data: allCycles, error: allCyclesError } = await supabase
        .from('ranking_cycles')
        .select('*')
        .order('created_at', { ascending: false });
      if (allCyclesError) throw allCyclesError;

      console.log('📅 All cycles in system:', allCycles?.map(c => ({ id: c.cycle_id, status: c.status, sem: c.semester })));

      // Get cycles that have accepted participants
      const { data: cyclesWithParticipants, error: cyclesWithParticipantsError } = await supabase
        .from('cycle_participants')
        .select('cycle_id, status')
        .eq('status', 'accepted');
      if (cyclesWithParticipantsError) throw cyclesWithParticipantsError;

      console.log('🔍 RAW cycle_participants query (status=accepted):', {
        count: cyclesWithParticipants?.length || 0,
        data: cyclesWithParticipants
      });

      // Also get ALL participants to see what statuses exist
      const { data: allParticipantsDebug } = await supabase
        .from('cycle_participants')
        .select('cycle_id, status');
      
      const uniqueStatuses = new Set(allParticipantsDebug?.map(p => p.status) || []);
      console.log('🔎 DEBUG: ALL participant statuses in system:', Array.from(uniqueStatuses));

      // If no accepted found, try alternative statuses
      if ((!cyclesWithParticipants || cyclesWithParticipants.length === 0) && allParticipantsDebug && allParticipantsDebug.length > 0) {
        const firstStatus = allParticipantsDebug[0].status;
        console.warn(`⚠️ No 'accepted' status found! First status in DB is: "${firstStatus}". Trying that...`);
        
        const { data: cyclesWithFirstStatus } = await supabase
          .from('cycle_participants')
          .select('cycle_id, status')
          .eq('status', firstStatus);
        
        console.log(`🔄 Query with status="${firstStatus}":`, {
          count: cyclesWithFirstStatus?.length || 0,
          data: cyclesWithFirstStatus
        });
      }

      const cycleIdsWithParticipants = new Set(
        (cyclesWithParticipants || []).map((p) => p.cycle_id)
      );
      console.log('🎯 Cycles with accepted participants:', Array.from(cycleIdsWithParticipants));

      // Filter to cycles that both (a) exist and (b) have participants
      const cyclesWithData = (allCycles || []).filter((c) =>
        cycleIdsWithParticipants.has(c.cycle_id)
      );

      console.log('✅ Cycles WITH participants:', cyclesWithData?.map(c => ({ id: c.cycle_id, status: c.status })));

      // Prefer open/submissions_closed, otherwise latest
      let activeCycle = cyclesWithData.find(c =>
        ['open', 'submissions_closed'].includes(c.status)
      ) || cyclesWithData[0];

      if (!activeCycle) {
        console.warn('❌ No cycles with participants found');
        console.log('🔴 COMPREHENSIVE DEBUG INFO:', {
          totalCycles: allCycles?.length,
          allCycleIds: allCycles?.map(c => ({ id: c.cycle_id, status: c.status })),
          totalParticipants: debugAllParticipants?.length,
          participantsByStatus: {
            allRecords: allParticipantsDebug?.length,
            cycleIdsInParticipants: Array.from(cycleIdsWithParticipants),
            acceptedCount: cyclesWithParticipants?.length
          },
          cycleIdsWithDataCount: cyclesWithData?.length,
          cycleIdsWithData: cyclesWithData?.map(c => c.cycle_id),
          sample_first_participant: debugAllParticipants?.[0]
        });
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
      console.log('⚠️ IS THIS CYCLE 25?', activeCycle.cycle_id === 25 ? '✅ YES' : `❌ NO, it is ${activeCycle.cycle_id}`);

      // First check: ANY participants for this cycle (regardless of status)
      const { data: allParticipants, error: allParticipantsError } = await supabase
        .from('cycle_participants')
        .select('*')
        .eq('cycle_id', activeCycle.cycle_id);
      if (allParticipantsError) throw allParticipantsError;
      console.log('🔎 ALL participants (any status) for cycle', activeCycle.cycle_id, ':', {
        count: allParticipants?.length || 0,
        data: allParticipants
      });

      // Get participants for this cycle (only accepted are considered actively applied)
      const { data: participantsData, error: participantsError } = await supabase
        .from('cycle_participants')
        .select('faculty_id, status')
        .eq('cycle_id', activeCycle.cycle_id)
        .eq('status', 'accepted');
      if (participantsError) throw participantsError;

      console.log('📋 ACCEPTED participants response:', {
        count: participantsData?.length || 0,
        cycle_id: activeCycle.cycle_id,
        data: participantsData
      });

      const participantFacultyIds = Array.from(
        new Set((participantsData || []).map((p) => {
          console.log('🔍 Mapping participant:', p, '-> faculty_id:', p.faculty_id);
          return p.faculty_id;
        }).filter(Boolean))
      );

      console.log('👥 Extracted participant faculty IDs:', participantFacultyIds);

      if (participantFacultyIds.length === 0) {
        // No accepted participants found — try a broader fallback to include other statuses
        console.warn('⚠️ No accepted participants for this cycle — falling back to any participants with faculty_id');
        const { data: anyParticipants, error: anyParticipantsError } = await supabase
          .from('cycle_participants')
          .select('faculty_id, status')
          .eq('cycle_id', activeCycle.cycle_id)
          .not('faculty_id', 'is', null);

        if (!anyParticipantsError && (anyParticipants || []).length > 0) {
          const fallbackIds = Array.from(new Set((anyParticipants || []).map(p => p.faculty_id).filter(Boolean)));
          console.log('🔁 Fallback participant faculty IDs:', fallbackIds);
          participantFacultyIds.push(...fallbackIds);
        } else {
          // Still none — no one applied for this cycle
          console.warn('⚠️ No participants found for this cycle even after fallback');
          setApplications([]);
          return;
        }
      }

      // Get areas for lookup
      const { data: areasData, error: areasError } = await supabase
        .from('areas')
        .select('*');
      if (areasError) throw areasError;
      setAreas(areasData || []);

      // Get departments for faculty name lookup
      const { data: departmentsData, error: departmentsError } = await supabase
        .from('departments')
        .select('department_id, department_name');
      if (departmentsError) throw departmentsError;

      const departmentById = new Map(
        (departmentsData || []).map((dept) => [dept.department_id, dept.department_name])
      );

      // Get applications only for faculty who are participants in the active cycle
      // AND belong to the active cycle (critical for cycle isolation)
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('applications')
        .select('*')
        .in('faculty_id', participantFacultyIds)
        .eq('cycle_id', activeCycle.cycle_id)
        .order('created_at', { ascending: false });
      if (applicationsError) throw applicationsError;

      console.log('📊 Applications query result:', {
        participantFacultyIds,
        cycle_id: activeCycle.cycle_id,
        applicationsCount: applicationsData?.length || 0,
        firstApp: applicationsData?.[0],
        allApps: applicationsData
      });

      const applicationIdsForCycle = (applicationsData || []).map((app) => app.application_id);
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

      console.log('📎 Submission counts for cycle applications:', {
        cycle_id: activeCycle.cycle_id,
        submissionCountByApplicationId: Array.from(submissionCountByApplicationId.entries())
      });

      // Keep only one application per faculty for the active cycle view.
      // Prefer reviewed applications (VPAA_Completed / HR_Completed) over drafts and older submissions.
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
      const cycleScopedApplications = Array.from(latestByFaculty.values());

      console.log('🎯 After deduping (best per faculty):', {
        totalCount: cycleScopedApplications.length,
        facultyIds: cycleScopedApplications.map(a => a.faculty_id),
        selectedStatuses: cycleScopedApplications.map(a => a.status)
      });

      const applicationIds = cycleScopedApplications.map((app) => app.application_id);
      let fallbackScoreByApplicationId = new Map();

      // Auto-fetch score fallback by summing per-area HR points when final_score is not yet saved.
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

      const applicationsWithFaculty = [];
      for (const appData of cycleScopedApplications) {
        // Get faculty data
        const { data: facultyData, error: facultyError } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', appData.faculty_id)
          .single();
        if (facultyError) continue;

        const isRankingFaculty = (facultyData?.status || '').toString().trim().toLowerCase() === 'ranking';
        const hasSubmittedFiles = (submissionCountByApplicationId.get(appData.application_id) || 0) > 0;

        // Previously we required BOTH ranking status and submitted files to show an application.
        // Relax: show the application if EITHER the faculty is in `ranking` status OR the application has submissions.
        if (!isRankingFaculty && !hasSubmittedFiles) {
          console.log('⏭️ Skipping application because faculty is not ranking AND has no submissions', {
            application_id: appData.application_id,
            faculty_id: appData.faculty_id,
            faculty_status: facultyData?.status,
            hasSubmittedFiles,
          });
          continue;
        }

        // Skip VPAA users - only show faculty
        if ((facultyData?.role || '').toString().trim().toLowerCase() === 'vpaa') {
          console.log(`⏭️ Skipping VPAA user: ${facultyData.name_first} ${facultyData.name_last}`);
          continue;
        }

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
      setLoading(false);
    }
  };

  const fetchAreaSubmissions = async (applicationId) => {
    try {
      console.log('📄 Fetching area submissions for application:', applicationId, typeof applicationId);
      console.log('🔄 Current cycle:', currentCycle);

      // ⚠️ DEBUG: Check if application_id field exists
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('area_submissions')
        .select('*')
        .eq('application_id', applicationId);
      
      if (submissionsError) {
        console.error('❌ Database error:', submissionsError);
        throw submissionsError;
      }

      console.log('📊 Raw submissions from DB:', {
        count: submissionsData?.length || 0,
        applicationIdParam: applicationId,
        submissionIds: submissionsData?.map(s => s.submission_id),
        areaIds: submissionsData?.map(s => s.area_id),
        firstRecord: submissionsData?.[0],
        allApplicationIds: submissionsData?.map(s => ({ id: s.submission_id, app_id: s.application_id, area_id: s.area_id, cycle_id: s.cycle_id }))
      });

      const submissions = (submissionsData || []).map((submissionData) => {
        const area = areas.find((a) => a.area_id === submissionData.area_id);
        console.log(`[fetchAreaSubmissions] Submission ${submissionData.submission_id}:`, {
          area_id: submissionData.area_id,
          part_id: submissionData.part_id,
          file_path: submissionData.file_path,
          foundArea: area?.area_name || 'NOT FOUND',
          areasLength: areas.length,
          allAreas: areas.map(a => ({ id: a.area_id, name: a.area_name }))
        });

        return {
          id: submissionData.submission_id,
          ...submissionData,
          area: area || { area_name: `Unknown Area ${submissionData.area_id}`, max_possible_points: 0 }
        };
      });

      // Create placeholders for ALL areas from the database
      // This ensures every area is scorable, even if no submission yet
      // Normalize area_ids to numbers for consistent comparison
      const submittedAreaIds = new Set(submissions.map(s => Number(s.area_id)));
      
      console.log('📋 Submitted area IDs (normalized):', Array.from(submittedAreaIds));
      console.log('📚 All areas from database:', areas.map(a => ({ id: a.area_id, name: a.area_name })));
      
      const areasWithoutSubmissions = areas
        .filter(area => !submittedAreaIds.has(Number(area.area_id)))
        .map(area => {
          return {
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
              template_file_path: area.template_file_path,
              description: area.area_name
            }
          };
        });

      // Combine actual submissions (with files/data) and placeholders
      // Deduplicate by area_id: keep real submissions first, then placeholders
      const areaMap = new Map();
      
      // Normalize area_id to number for consistent Map key comparison
      submissions.forEach(sub => {
        const areaId = Number(sub.area_id);
        areaMap.set(areaId, sub);
      });
      
      areasWithoutSubmissions.forEach(placeholder => {
        const areaId = Number(placeholder.area_id);
        if (!areaMap.has(areaId)) {
          areaMap.set(areaId, placeholder);
        }
      });
      
      const dedupedSubmissions = Array.from(areaMap.values());
      
      console.log('🔍 DEBUG deduplication:', {
        submissionsCount: submissions.length,
        placeholdersCount: areasWithoutSubmissions.length,
        totalBeforeDedupe: submissions.length + areasWithoutSubmissions.length,
        mapSize: areaMap.size,
        dedupedCount: dedupedSubmissions.length,
        mapKeys: Array.from(areaMap.keys()),
        mapValues: dedupedSubmissions.map(s => ({ area_id: s.area_id, area_name: s.area?.area_name }))
      });
      
      const romanToNum = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10 };
      const extractRomanNum = (areaName) => {
        const match = String(areaName || '').match(/AREA\s+([IVX]+)/i);
        return match ? romanToNum[match[1].toUpperCase()] || 99 : 99;
      };
      
      dedupedSubmissions.sort((a, b) => {
        const aNum = extractRomanNum(a.area?.area_name);
        const bNum = extractRomanNum(b.area?.area_name);
        return aNum - bNum;
      });

      // Fetch scoring details from backend to get capped_score and excess_score
      // Only fetch for non-placeholder submissions
      const enrichedSubmissions = await Promise.all(
        dedupedSubmissions.map(async (submission) => {
          // Skip placeholders - they have no scores
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
            
            // Calculate capped score and excess based on area max
            const totalScore = Number(scoringData.totalScore || 0);
            const areaMax = Number(submission.area?.max_possible_points || 85);
            const cappedScore = Math.min(totalScore, areaMax);
            const excessScore = Math.max(0, totalScore - areaMax);
            
            // Merge the backend scoring data with the submission
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

      setAreaSubmissions(enrichedSubmissions);
      setDraftScores(
        enrichedSubmissions.reduce((acc, item) => {
          acc[item.id] = item.hr_points ?? '';
          return acc;
        }, {})
      );
      setExpandedAreaId(null);
      console.log('✅ Fetched area submissions:', submissions.length, 'actual +', areasWithoutSubmissions.length, 'placeholders, deduplicated to', enrichedSubmissions.length, 'sorted I-X with scoring data');
    } catch (error) {
      console.error('❌ Error fetching area submissions:', error);
    }
  };

  const handleReviewClick = async (application) => {
    setSelectedApplication(application);
    setSelectedFaculty(application.faculty);
    await fetchAreaSubmissions(application.id);
    setView('detail');
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedApplication(null);
    setSelectedFaculty(null);
    setAreaSubmissions([]);
    setDraftScores({});
    setExpandedAreaId(null);
  };

  const handleBackToDetail = () => {
    setView('detail');
  };

  const handleToggleArea = (areaId) => {
    setExpandedAreaId((prev) => (prev === areaId ? null : areaId));
  };

  const handleDraftScoreChange = (submissionId, value) => {
    setDraftScores((prev) => ({
      ...prev,
      [submissionId]: value
    }));
  };

  const calculateTotalScore = (submissions) => {
    return submissions.reduce((sum, submission) => sum + Number(submission.hr_points || 0), 0);
  };

  const handleSaveAreaScore = async (area) => {
    const parsedScore = Number.parseFloat(draftScores[area.id]);
    const maxPoints = Number(area.max || 0);
    const areaIvAreaId = (areas || []).find((entry) => /AREA\s+IV/i.test(String(entry.area_name || '')))?.area_id ?? 7;

    if (!Number.isFinite(parsedScore)) {
      alert('Please enter a valid numeric score before saving.');
      return;
    }

    if (parsedScore < 0 || parsedScore > maxPoints) {
      alert(`Score must be between 0 and ${maxPoints}.`);
      return;
    }

    try {
      setSavingAreaId(area.id);

      const isAreaIVPlaceholder = Number(area.area_id) === Number(areaIvAreaId) && String(area.id || '').startsWith('placeholder-');

      if (isAreaIVPlaceholder && selectedApplication?.id) {
        const { data: existingArea4Submission, error: existingError } = await supabase
          .from('area_submissions')
          .select('*')
          .eq('application_id', selectedApplication.id)
          .eq('area_id', areaIvAreaId)
          .eq('cycle_id', currentCycle?.cycle_id)
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
              application_id: selectedApplication.id,
              area_id: areaIvAreaId,
              cycle_id: currentCycle?.cycle_id,
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

      const updatedSubmissions = areaSubmissions.map((submission) => {
        if (submission.id === area.id) {
          return { ...submission, hr_points: parsedScore };
        }

        if (isAreaIVPlaceholder && Number(submission.area_id) === Number(areaIvAreaId) && String(submission.id || '').startsWith('placeholder-')) {
          return { ...submission, hr_points: parsedScore };
        }

        return submission;
      });
      setAreaSubmissions(updatedSubmissions);

      const totalScore = calculateTotalScore(updatedSubmissions);

      if (selectedApplication?.id) {
        const { error: appUpdateError } = await supabase
          .from('applications')
          .update({ hr_score: totalScore })
          .eq('application_id', selectedApplication.id);
        if (appUpdateError) throw appUpdateError;

        const updatedSelectedApplication = {
          ...selectedApplication,
          hr_score: totalScore,
          display_score: selectedApplication.final_score ?? totalScore
        };

        setSelectedApplication(updatedSelectedApplication);
        setApplications((prev) =>
          prev.map((app) =>
            app.id === selectedApplication.id
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
      setSavingAreaId(null);
    }
  };

  const handleEditFinalScore = () => {
    setDraftFinalScore(selectedApplication?.final_score || selectedApplication?.hr_score || '');
    setEditingFinalScore(true);
  };

  const handleSaveFinalScore = async () => {
    const parsedScore = Number.parseFloat(draftFinalScore);

    if (!Number.isFinite(parsedScore)) {
      alert('Please enter a valid numeric score.');
      return;
    }

    try {
      setSavingFinalScore(true);

      const { error: updateError } = await supabase
        .from('applications')
        .update({ final_score: parsedScore })
        .eq('application_id', selectedApplication.id);

      if (updateError) throw updateError;

      const updatedSelectedApplication = {
        ...selectedApplication,
        final_score: parsedScore,
        display_score: parsedScore
      };

      setSelectedApplication(updatedSelectedApplication);
      setApplications((prev) =>
        prev.map((app) =>
          app.id === selectedApplication.id
            ? { ...app, final_score: parsedScore, display_score: parsedScore }
            : app
        )
      );

      setEditingFinalScore(false);
      alert('Final score saved successfully.');
    } catch (error) {
      console.error('❌ Error saving final score:', error);
      alert('Failed to save final score. Please try again.');
    } finally {
      setSavingFinalScore(false);
    }
  };

  const handleCompleteQualifications = async (qualifications) => {
    if (!selectedApplication?.id) {
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
        .eq('application_id', selectedApplication.id);

      if (updateError) throw updateError;

      const updatedSelectedApplication = {
        ...selectedApplication,
        qual_experience: qualifications.qual_experience,
        qual_degree: qualifications.qual_degree,
        qual_teaching: qualifications.qual_teaching,
        qual_research: qualifications.qual_research,
        qual_eligibility: qualifications.qual_eligibility,
        status: 'HR_Completed',
        hr_completed_at: now,
      };

      setSelectedApplication(updatedSelectedApplication);
      setApplications((prev) =>
        prev.map((app) =>
          app.id === selectedApplication.id
            ? updatedSelectedApplication
            : app
        )
      );

      alert('Qualifications saved and HR review completed successfully.');
      setView('detail');
    } catch (error) {
      console.error('❌ Error saving qualifications:', error);
      alert('Failed to save qualifications. Please try again.');
    }
  };

  const handleSelectArea = async (area) => {
    setLoadingAreaDetails(true);
    try {
      const localSubmission = areaSubmissions.find((s) => s.id === area.id);

      // If this is a placeholder (generated from rubric template), don't call backend
      if (localSubmission?.is_placeholder) {
        setSelectedArea({
          ...area,
          submission: localSubmission || null,
          criteria: [],
          totalScore: 0,
          part_id: localSubmission?.part_id || area.part_id || null,
          label: `${area.label}`,
          description: localSubmission?.area?.description || area.description || ''
        });
        setAreaCriteria([]);
        return;
      }

      const submissionId = area.submission_id || area.id;

      try {
        const response = await fetch(`http://localhost:5000/review/submission-scoring/${submissionId}`);
        if (response.ok) {
          const data = await response.json();
          setSelectedArea({
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
          setAreaCriteria(data.criteria || []);
        } else {
          setSelectedArea({
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
          setAreaCriteria([]);
        }
      } catch (err) {
        console.log('Backend not available, using local area data');
        setSelectedArea({
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
        setAreaCriteria([]);
      }
    } catch (err) {
      console.error('Error in handleSelectArea:', err);
      setSelectedArea({ 
        ...area, 
        submission: {
          ...localSubmission,
          area_id: localSubmission?.area_id || area.area_id,
          application_id: localSubmission?.application_id || area.application_id
        },
        criteria: [] 
      });
      setAreaCriteria([]);
    } finally {
      setLoadingAreaDetails(false);
    }
  };

  const handleCloseAreaDetails = () => {
    setSelectedArea(null);
    setAreaCriteria([]);
  };

  const handleSaveCriteriaScores = async (submissionId, criteriaScores) => {
    if (!submissionId) {
      console.warn('No submission ID found for save');
      return;
    }

    // If this is a placeholder submission (generated locally from rubrics), skip backend and update local state
    if (typeof submissionId === 'string' && submissionId.startsWith('placeholder-')) {
      try {
        setSavingAreaScore(true);
        const totalScore = (criteriaScores || []).reduce((sum, c) => sum + Number(c.score || 0), 0);

        const updatedSubmissions = areaSubmissions.map((sub) =>
          sub.id === submissionId
            ? { ...sub, hr_points: totalScore }
            : sub
        );
        setAreaSubmissions(updatedSubmissions);

        setSelectedArea((prev) => {
          if (!prev) return prev;
          const currentSubmissionId = prev.submission?.submission_id || prev.id;
          if (String(currentSubmissionId) !== String(submissionId)) return prev;

          return {
            ...prev,
            submission: { ...(prev.submission || {}), hr_points: totalScore },
            criteria: criteriaScores,
            totalScore,
          };
        });

        setAreaCriteria(criteriaScores);

        // update application HR score locally as well
        const newTotalScore = updatedSubmissions.reduce((sum, submission) => sum + Number(submission.hr_points || 0), 0);
        if (selectedApplication?.id) {
          const updatedApp = { ...selectedApplication, hr_score: newTotalScore, display_score: selectedApplication.final_score ?? newTotalScore };
          setSelectedApplication(updatedApp);
          setApplications((prev) => prev.map((app) => app.id === selectedApplication.id ? updatedApp : app));
        }
      } catch (err) {
        console.error('Error updating local placeholder score:', err);
      } finally {
        setSavingAreaScore(false);
      }
      return;
    }

    setSavingAreaScore(true);
    try {
      const response = await fetch(`http://localhost:5000/review/submission-scoring/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criteria: criteriaScores }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update score');
      }

      const updatedSubmission = await response.json();

      const updatedSubmissions = areaSubmissions.map((sub) =>
        sub.id === Number(submissionId)
          ? { ...sub, hr_points: updatedSubmission.totalScore ?? updatedSubmission.submission?.hr_points ?? sub.hr_points }
          : sub
      );
      setAreaSubmissions(updatedSubmissions);

      setSelectedArea((prev) => {
        if (!prev) return prev;
        const currentSubmissionId = prev.submission?.submission_id || prev.id;
        if (Number(currentSubmissionId) !== Number(submissionId)) return prev;

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

      if (selectedApplication?.id) {
        const { error: appUpdateError } = await supabase
          .from('applications')
          .update({ hr_score: totalScore })
          .eq('application_id', selectedApplication.id);
        if (!appUpdateError) {
          const updatedApp = { ...selectedApplication, hr_score: totalScore, display_score: selectedApplication.final_score ?? totalScore };
          setSelectedApplication(updatedApp);
          setApplications((prev) =>
            prev.map((app) => app.id === selectedApplication.id ? { ...app, hr_score: totalScore, display_score: app.final_score ?? totalScore } : app)
          );
        }
      }

    } catch (err) {
      console.error('Error updating score:', err);
      alert('Failed to update score: ' + err.message);
    } finally {
      setSavingAreaScore(false);
    }
  };

  // Filter applications based on search and filters
  const filteredApplications = applications.filter(app => {
    const matchesSearch = !searchTerm || 
      app.faculty.name_first.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.faculty.name_last.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = departmentFilter === 'all' || 
      app.faculty.department_name === departmentFilter ||
      app.faculty.department === departmentFilter;
    
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'pending' && ['Draft', 'Submitted', 'Under_HR_Review'].includes(app.status)) ||
      (statusFilter === 'reviewed' && ['HR_Completed', 'VPAA_Completed', 'Under_VPAA_Review', 'For_Publishing', 'Published'].includes(app.status));

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

  useEffect(() => {
    setApplicationPage(1);
  }, [searchTerm, departmentFilter, statusFilter, applications.length]);

  const totalApplicationPages = Math.max(1, Math.ceil(sortedApplications.length / APPLICATION_PAGE_SIZE));
  const safeApplicationPage = Math.min(applicationPage, totalApplicationPages);
  const applicationPageStart = (safeApplicationPage - 1) * APPLICATION_PAGE_SIZE;
  const applicationPageEnd = applicationPageStart + APPLICATION_PAGE_SIZE;
  const paginatedApplications = sortedApplications.slice(applicationPageStart, applicationPageEnd);

  // Convert area submissions to the format expected by AreaCard
  const submittedAreas = areaSubmissions.map(submission => ({
    id: submission.id,
    submission_id: submission.id,
    part_id: submission.part_id,
    file_path: submission.file_path,
    label: submission.area.area_name,
    area_id: submission.area.area_id,
    max: Number(submission.area.max_possible_points || 0),
    score: Number(submission.hr_points || 0).toFixed(2),
    criteria: [] // For now, we'll keep this empty since criteria would need separate implementation
  }));

  const selectedDisplayScore = selectedApplication
    ? (selectedApplication.final_score ?? selectedApplication.hr_score ?? areaSubmissions.reduce((sum, submission) => sum + Number(submission.hr_points || 0), 0))
    : null;

  const selectedApplicationForDisplay = selectedApplication
    ? { ...selectedApplication, display_score: selectedDisplayScore }
    : selectedApplication;

  const summaryAreaScores = areaSubmissions
    .map((submission) => {
      const cappedScore = Number(submission.capped_score || 0);
      const excessScore = Number(submission.excess_score || 0);
      const max = Number(submission.area?.max_possible_points || 0);
      const pct = max > 0 ? Math.min(100, Math.round((cappedScore / max) * 100)) : 0;

      return {
        label: submission.area?.area_name || submission.area_id,
        max,
        cappedScore,      // base score (capped at area max)
        excessScore,      // excess points beyond area max
        pct
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

  if (loading) {
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

          <div className="rk-card-header">
            <span className="rk-card-title">Review and Score</span>
            <span className="rk-semester">{currentCycle ? `${currentCycle.semester} ${currentCycle.year}` : '1st Semester AY 2026–2027'}</span>
          </div>

          {/* ── LIST VIEW ── */}
          {view === 'list' && (
            <ApplicationsListView
              filteredApplications={filteredApplications}
              paginatedApplications={paginatedApplications}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              departmentFilter={departmentFilter}
              setDepartmentFilter={setDepartmentFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              applicationPageStart={applicationPageStart}
              applicationPageSize={APPLICATION_PAGE_SIZE}
              safeApplicationPage={safeApplicationPage}
              totalApplicationPages={totalApplicationPages}
              setApplicationPage={setApplicationPage}
              onReviewClick={handleReviewClick}
            />
          )}

          {/* ── DETAIL VIEW ── */}
          {view === 'detail' && (
            <ReviewDetailView
              FacultyInfoCard={FacultyInfoCard}
              AreaCard={AreaCard}
              ScoringCriteriaPanel={ScoringCriteriaPanel}
                AreaIVImportPanel={AreaIVImportPanel}
              selectedFaculty={selectedFaculty}
              selectedApplicationForDisplay={selectedApplicationForDisplay}
              onEditFinalScore={handleEditFinalScore}
              isEditingFinalScore={editingFinalScore}
              draftFinalScore={draftFinalScore}
              onDraftFinalScoreChange={setDraftFinalScore}
              onSaveFinalScore={handleSaveFinalScore}
              isSavingFinalScore={savingFinalScore}
              submittedAreas={submittedAreas}
              expandedAreaId={expandedAreaId}
              draftScores={draftScores}
              onToggleArea={handleToggleArea}
              onDraftScoreChange={handleDraftScoreChange}
              onSaveAreaScore={handleSaveAreaScore}
              savingAreaId={savingAreaId}
              areaSubmissions={areaSubmissions}
              areas={areas}
              selectedApplication={selectedApplication}
              onSelectArea={handleSelectArea}
              onBackToList={handleBackToList}
              onOpenSummary={() => setView('summary')}
              selectedArea={selectedArea}
              areaCriteria={areaCriteria}
              onCloseAreaDetails={handleCloseAreaDetails}
              onSaveCriteriaScores={handleSaveCriteriaScores}
              savingAreaScore={savingAreaScore}
              currentCycle={currentCycle}
              applications={applications}
            />
          )}

          {/* ── SUMMARY / QUALIFICATION VIEW ── */}
          {view === 'summary' && (
            <ReviewSummaryView
              FacultyInfoCard={FacultyInfoCard}
              selectedFaculty={selectedFaculty}
              selectedApplicationForDisplay={selectedApplicationForDisplay}
              onEditFinalScore={handleEditFinalScore}
              isEditingFinalScore={editingFinalScore}
              draftFinalScore={draftFinalScore}
              onDraftFinalScoreChange={setDraftFinalScore}
              onSaveFinalScore={handleSaveFinalScore}
              isSavingFinalScore={savingFinalScore}
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