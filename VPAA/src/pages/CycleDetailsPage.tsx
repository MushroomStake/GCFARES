import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Search, Filter, CheckCircle2, User, Loader2, X } from 'lucide-react';
import ExcelJS from 'exceljs';
import { supabase } from '../supabaseClient'; 
import FacultyDetailModal from '../components/FacultyDetailModal'; 
import { RANKING_RUBRICS } from '../../rankingRubrics';

interface CycleStats {
  totalFaculty: number;
  completed: number;
  underReview: number;
  pending: number;
  avgPoints: number;
  totalPoints: number;
}

interface CycleState {
  title: string;
  semester: string;
  year: string;
  status: string;
  stats: CycleStats;
}

export interface RankingEntry {
  id: string; 
  name: string;
  department: string;
  points: number;
  dbStatus: string;
  originalData: any;
}

const CycleDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");

  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<RankingEntry | null>(null);
  const fetchCycleDetailsRef = useRef<null | ((silent?: boolean) => Promise<void>)>(null);

  const normalizeStatus = (value: unknown) => String(value || '').trim().toLowerCase();

  const getDepartmentCode = (department: string) => {
    const normalizedDepartment = String(department || '').trim();
    if (!normalizedDepartment) return 'N/A';

    const knownCodes: Record<string, string> = {
      'College of Business Administration': 'CBA',
      'College of Computer Studies': 'CCS',
      'College of Education': 'COED',
      'College of Engineering and Architecture': 'CEA',
      'College of Hospitality and Tourism Management': 'CHTM',
      'College of Arts and Sciences': 'CAS',
      'College of Nursing': 'CN',
      'School of Law': 'SOL',
      'School of Medicine': 'SOM',
    };

    if (knownCodes[normalizedDepartment]) {
      return knownCodes[normalizedDepartment];
    }

    const code = normalizedDepartment
      .split(/\s+/)
      .map((word) => word.replace(/[^A-Za-z]/g, ''))
      .filter((word) => word && !['of', 'and', 'the', 'for', 'in'].includes(word.toLowerCase()))
      .map((word) => word[0]?.toUpperCase())
      .join('');

    return code || normalizedDepartment;
  };

  const [cycle, setCycle] = useState<CycleState>({
    title: '',
    semester: '',
    year: '',
    status: '',
    stats: { totalFaculty: 0, completed: 0, underReview: 0, pending: 0, avgPoints: 0, totalPoints: 0 }
  });
  const [facultyRankings, setFacultyRankings] = useState<RankingEntry[]>([]);
  const [exportingWorkbook, setExportingWorkbook] = useState(false);

  const sanitizeFilePart = (value: string) => String(value || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  const getAcademicYearLabel = () => {
    const titleMatch = String(cycle.title || '').match(/\b\d{4}\s*-\s*\d{4}\b/);
    if (titleMatch) return titleMatch[0].replace(/\s+/g, '');

    if (cycle.year) {
      const startYear = Number(cycle.year);
      if (!Number.isNaN(startYear)) {
        return `${startYear}-${startYear + 1}`;
      }
    }

    return '';
  };

  const getSemesterLabel = () => {
    if (cycle.semester) return String(cycle.semester).trim();

    const title = String(cycle.title || '');
    const semesterMatch = title.match(/\b(?:1st|2nd|3rd|first|second|third|summer)\s+semester\b/i);
    if (semesterMatch) return semesterMatch[0];

    return '';
  };

  const toCanonicalSemesterLabel = (value: unknown) => {
    const normalized = String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!normalized) return '';

    if (/(^|\b)(1st|first|1)\b/.test(normalized)) return '1st Semester';
    if (/(^|\b)(2nd|second|2)\b/.test(normalized)) return '2nd Semester';

    return '';
  };

  const getExportSemesterLabel = () => {
    const fromSemester = toCanonicalSemesterLabel(cycle.semester);
    if (fromSemester) return fromSemester;

    return toCanonicalSemesterLabel(cycle.title);
  };

  useEffect(() => {
    let isMounted = true;

    const fetchCycleDetails = async (silent = false) => {
      if (!id) return;
      
      try {
        if (!silent) setLoading(true);
        
        // 1. Fetch period details
        const { data: cycleData, error: cycleError } = await supabase
          .from('ranking_cycles')
          .select('*')
          .eq('cycle_id', id)
          .single();
        
        if (cycleError || !cycleData) {
          console.error("Cycle not found or error fetching:", cycleError);
          if (isMounted && !silent) setLoading(false);
          return;
        }
        
      // 2. Fetch applications with joined user and department data
        const { data: appsData, error: appsError } = await supabase
          .from('applications')
          .select(`
            *,
            users!applications_faculty_id_fkey ( 
              name_first,
              name_last,
              department_id,
              departments (
                department_name
              )
            )
          `)
          .eq('cycle_id', id)
          .not('status', 'ilike', '%draft%');
        
        if (appsError) throw appsError;

        const visibleApps = (appsData || []).filter((appData: any) => normalizeStatus(appData.status) !== 'draft');

        let totalScore = 0;
        let completedCount = 0;
        let underReviewCount = 0;
        let pendingCount = 0;

        const resolvedRankings: RankingEntry[] = visibleApps.map((appData: any) => {
          const score = Number(appData.hr_score) || 0;
          totalScore += score;
          
          const statusLower = normalizeStatus(appData.status);
          
          if (['approved_unpublished', 'published', 'approved', 'vpaa_completed'].includes(statusLower)) {
            completedCount++;
          } else if (['pending_vpaa', 'under_review', 'reviewing'].includes(statusLower)) {
            underReviewCount++;
          } else if (statusLower === 'hr_completed') {
            pendingCount++;
          } else {
            pendingCount++;
          }

          // Supabase joins can sometimes return arrays instead of objects depending on constraints. 
          // This safely handles both.
          const userObj = Array.isArray(appData.users) ? appData.users[0] : appData.users;
          const user = userObj || {};
          
          const deptObj = Array.isArray(user.departments) ? user.departments[0] : user.departments;
          const departmentData = deptObj || {};

          let facultyName = "Unknown Faculty";
          if (user.name_last || user.name_first) {
            facultyName = `${user.name_last || ''}, ${user.name_first || ''}`.trim();
            if (facultyName.endsWith(',')) facultyName = facultyName.slice(0, -1);
          }

          let department = departmentData.department_name || 
            (user.department_id ? `Dept ${user.department_id}` : 'Unknown Dept');

          return {
            id: String(appData.application_id), 
            name: facultyName,
            department: department,
            points: Number(score.toFixed(2)),
            dbStatus: appData.status || 'Pending',
            originalData: appData
          };
        });
        
        resolvedRankings.sort((a, b) => b.points - a.points);
        const totalFaculty = visibleApps.length;

        // Expanded logic to match what constitutes an active period
        const isCycleActive = ['open', 'submissions_closed', 'finished'].includes(cycleData.status);

        if (isMounted) {
          setCycle({
            title: cycleData.title || 'Ranking Period',
            semester: cycleData.semester || 'N/A',
            year: cycleData.year ? String(cycleData.year) : 'N/A',
            status: isCycleActive ? 'Current' : 'Finished',
            stats: {
              totalFaculty,
              completed: completedCount,
              underReview: underReviewCount,
              pending: pendingCount,
              avgPoints: totalFaculty > 0 ? Number((totalScore / totalFaculty).toFixed(1)) : 0,
              totalPoints: Number(totalScore.toFixed(1))
            }
          });
          setFacultyRankings(resolvedRankings);
        }

      } catch (error) {
        console.error("Error fetching cycle details from Supabase:", error);
      } finally {
        if (isMounted && !silent) setLoading(false);
      }
    };

    fetchCycleDetailsRef.current = fetchCycleDetails;

    fetchCycleDetails();

    const applicationsChannel = supabase
      .channel(`cycle-details-applications-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications', filter: `cycle_id=eq.${id}` }, () => {
        void fetchCycleDetails(true);
      })
      .subscribe();

    const cyclesChannel = supabase
      .channel(`cycle-details-cycle-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ranking_cycles', filter: `cycle_id=eq.${id}` }, () => {
        void fetchCycleDetails(true);
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(applicationsChannel);
      supabase.removeChannel(cyclesChannel);
    };
  }, [id]);

  const getStatusDisplay = (dbStatus: string) => {
    const status = dbStatus || 'Pending';
    const normalizedStatus = status.toLowerCase();
    const formattedLabel = status.replace(/_/g, ' ');

    if (['approved_unpublished', 'published', 'approved', 'finished', 'vpaa_completed'].includes(normalizedStatus)) {
      return { label: formattedLabel, classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: true };
    }
    if (['pending_vpaa', 'under_review', 'reviewing'].includes(normalizedStatus)) {
      return { label: 'Under Review', classes: 'bg-amber-50 text-amber-700 border border-amber-200', icon: false };
    }
    if (['pending', 'submitted', 'open', 'draft'].includes(normalizedStatus)) {
      return { label: formattedLabel, classes: 'bg-blue-50 text-blue-700 border border-blue-200', icon: false };
    }
    if (['rejected', 'needs_revision', 'returned'].includes(normalizedStatus)) {
      return { label: formattedLabel, classes: 'bg-red-50 text-red-700 border border-red-200', icon: false };
    }
    
    return { label: formattedLabel, classes: 'bg-slate-50 text-slate-600 border border-slate-200', icon: false };
  };

  const uniqueDepartments = ['All', ...new Set(facultyRankings.map(f => f.department))].sort();
  const uniqueStatuses = ['All', ...new Set(facultyRankings.map(f => f.dbStatus))].sort();

  const filteredRankings = facultyRankings.filter(faculty => {
    const matchesSearch = faculty.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          faculty.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || faculty.dbStatus === statusFilter;
    const matchesDept = departmentFilter === "All" || faculty.department === departmentFilter;
    
    return matchesSearch && matchesStatus && matchesDept;
  });

  const handleExportWorkbook = async () => {
    if (!id) return;

    try {
      setExportingWorkbook(true);

      const { data: appsData, error: appsError } = await supabase
        .from('applications')
        .select(`
          application_id, status, hr_score, final_score,
          current_rank_at_time,
          qual_experience, qual_degree, qual_teaching, qual_research, qual_eligibility,
          faculty:faculty_id ( user_id, name_last, name_first, name_middle, department_id, current_rank, nature_of_appointment, departments ( department_name, department_code ) )
        `)
        .eq('cycle_id', id)
        .in('status', ['HR_Completed', 'VPAA_Completed', 'For_Publishing', 'Published']);

      if (appsError) throw appsError;

      const appsList = (appsData || []) as any[];
      const appIds = appsList.map((app) => app.application_id ?? app.id).filter(Boolean);

      const { data: submissions = [], error: subsError } = await supabase
        .from('area_submissions')
        .select('application_id, area_id, hr_points, areas ( area_id, area_name, max_possible_points )')
        .in('application_id', appIds);

      if (subsError) throw subsError;

      const submissionsByApp = new Map<string, Record<number, { hr_points?: number | string | null }>>();
      (submissions as any[]).forEach((submission) => {
        const appKey = String(submission.application_id);
        if (!submissionsByApp.has(appKey)) {
          submissionsByApp.set(appKey, {});
        }
        submissionsByApp.get(appKey)![Number(submission.area_id)] = submission;
      });

      const rubricAreas = (RANKING_RUBRICS || [])
        .slice()
        .sort((left, right) => Number(left.areaId) - Number(right.areaId))
        .filter((area) => Number(area.areaId) <= 10);

      const semesterText = getExportSemesterLabel();
      const academicYear = getAcademicYearLabel();
      const periodLabel = [academicYear ? `A.Y ${academicYear}` : '', semesterText].filter(Boolean).join(', ') || cycle.title;

      const rows: Array<Array<string | number>> = [];
      rows.push(['GORDON COLLEGE']);
      rows.push(['OVERAL SCORING FOR FACULTY PLANTILLA APPLICANTS']);
      rows.push([periodLabel]);

      const headerRow1: Array<string | number> = ['Rank', 'Faculty Applicants', 'Present Rank/Position', 'Nature of Appointment'];
      const headerRow2: Array<string | number> = ['', '', '', ''];
      const headerRow3: Array<string | number> = ['', '', '', ''];

      rubricAreas.forEach((area) => {
        headerRow1.push(String(area.areaCode || area.areaId));
        headerRow2.push(Number(area.maxPoints ?? 0));
        if (Number(area.areaId) === 10) {
          headerRow3.push('PROFESSIONAL EXAMINATION (PRC,CSC AND TESDA)(ONLY VALID AND UPDATED)');
        } else {
          headerRow3.push(String(area.areaName || '').trim());
        }
      });

      headerRow1.push('Total');
      headerRow1.push('Experience');
      headerRow1.push('Degree');
      headerRow1.push('Teaching Performance');
      headerRow1.push('Research Output');
      headerRow1.push('Eligibility');
      headerRow2.push('', '', '', '', '', '');
      headerRow3.push('', '', '', '', '', '');

      rows.push(headerRow1);
      rows.push(headerRow2);
      rows.push(headerRow3);

      const appsWithTotals = appsList
        .map((app) => {
          const appKey = String(app.application_id ?? app.id);
          const appSubmissions = submissionsByApp.get(appKey) || {};
          const areaPoints = rubricAreas.map((area) => {
            const submission = appSubmissions[Number(area.areaId)];
            return Number(submission?.hr_points ?? 0);
          });
          const computedTotal = areaPoints.reduce((sum, value) => sum + Number(value || 0), 0);
          const total = Number(app.hr_score ?? app.final_score ?? computedTotal);

          return { app, areaPoints, total, rank: 0 };
        })
        .sort((left, right) => right.total - left.total);

      let currentRank = 0;
      let lastScore: number | null = null;
      appsWithTotals.forEach((entry, index) => {
        if (lastScore === null || entry.total !== lastScore) {
          currentRank = index + 1;
          lastScore = entry.total;
        }
        (entry as { rank?: number }).rank = currentRank;
      });

      appsWithTotals.forEach(({ app, areaPoints, total, rank }) => {
        const faculty = Array.isArray(app.faculty) ? app.faculty[0] : app.faculty;
        const name = `${faculty?.name_last || ''}, ${faculty?.name_first || ''}${faculty?.name_middle ? ` ${faculty.name_middle}` : ''}`
          .replace(/\s+/g, ' ')
          .trim();

        rows.push([
          rank || '',
          name,
          app.current_rank_at_time || faculty?.current_rank || '',
          faculty?.nature_of_appointment || '',
          ...areaPoints,
          total,
          app.qual_experience || '',
          app.qual_degree || '',
          app.qual_teaching || '',
          app.qual_research || '',
          app.qual_eligibility || '',
        ]);
      });

      while (rows.length < 21) {
        rows.push([]);
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'VPAA';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Overall Scoring', {
        views: [{ showGridLines: true }],
      });

      const totalCols = headerRow1.length;
      const borderStyle = {
        top: { style: 'thin' as const, color: { argb: 'FFBFBFBF' } },
        left: { style: 'thin' as const, color: { argb: 'FFBFBFBF' } },
        bottom: { style: 'thin' as const, color: { argb: 'FFBFBFBF' } },
        right: { style: 'thin' as const, color: { argb: 'FFBFBFBF' } },
      };

      const centerAlignment = { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true };
      const leftAlignment = { horizontal: 'left' as const, vertical: 'middle' as const, wrapText: true };

      rows.forEach((values, index) => {
        const row = worksheet.addRow(values);
        const rowNumber = index + 1;

        if (rowNumber <= 6) {
          row.height = rowNumber === 3 ? 32.4 : rowNumber === 6 ? 124.8 : rowNumber === 1 ? 30 : rowNumber === 2 ? 30.6 : 22.8;
        } else {
          row.height = 17.4;
        }

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.border = borderStyle;
          cell.font = { ...(cell.font || {}), bold: rowNumber <= 6 };
          cell.alignment = colNumber === 2 && rowNumber >= 7 ? leftAlignment : centerAlignment;
        });
      });

      const endColumn = String.fromCharCode(64 + totalCols);
      worksheet.mergeCells(`A1:${endColumn}1`);
      worksheet.mergeCells(`A2:${endColumn}2`);
      worksheet.mergeCells(`A3:${endColumn}3`);

      for (let column = 1; column <= 4; column += 1) {
        worksheet.mergeCells(4, column, 6, column);
      }

      for (let column = 15; column <= 20; column += 1) {
        worksheet.mergeCells(4, column, 6, column);
      }

      worksheet.columns = [
        { width: 6.3 },
        { width: 36.3 },
        { width: 20.4 },
        { width: 22.3 },
        { width: 14.7 },
        { width: 17.7 },
        { width: 14.6 },
        { width: 14.3 },
        { width: 12.3 },
        { width: 12.3 },
        { width: 15.0 },
        { width: 16.3 },
        { width: 12.3 },
        { width: 16.5 },
        { width: 12.3 },
        { width: 18.3 },
        { width: 18.3 },
        { width: 20.3 },
        { width: 16.3 },
        { width: 16.3 },
      ];

      const areaHeaderRow = worksheet.getRow(6);
      areaHeaderRow.height = 124.8;
      for (let column = 5; column <= 14; column += 1) {
        const cell = areaHeaderRow.getCell(column);
        cell.alignment = centerAlignment;
        cell.border = borderStyle;
        cell.font = { ...(cell.font || {}), bold: true };
        cell.value = String(cell.value || '').replace(/\s+/g, '\n');
      }

      for (let rowNumber = 7; rowNumber <= worksheet.rowCount; rowNumber += 1) {
        const nameCell = worksheet.getRow(rowNumber).getCell(2);
        nameCell.alignment = leftAlignment;
      }

      worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.border = borderStyle;
          if (rowNumber <= 6) {
            cell.font = { ...(cell.font || {}), bold: true };
          }
          if (rowNumber >= 7 && colNumber === 2) {
            cell.alignment = leftAlignment;
          } else {
            cell.alignment = centerAlignment;
          }
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${sanitizeFilePart(cycle.title || 'Ranking_Period').toLowerCase()}_overall_scoring.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting XLSX:', error);
      alert(`Failed to export XLSX: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setExportingWorkbook(false);
    }
  };

  const activeFilterCount = (statusFilter !== "All" ? 1 : 0) + (departmentFilter !== "All" ? 1 : 0);

  const handleViewSubmission = (faculty: RankingEntry) => {
    setSelectedFaculty(faculty);
    setIsFacultyModalOpen(true);
  };

  const handleCloseFacultyModal = () => {
    setIsFacultyModalOpen(false);
    setSelectedFaculty(null);
  };

  // Safe percentage calculations for display
  const completionPercentage = cycle.stats.totalFaculty > 0 ? Math.round((cycle.stats.completed / cycle.stats.totalFaculty) * 100) : 0;
  const rawMaxPoints = Math.max(...facultyRankings.map(f => f.points), 1);
  const safeMaxPoints = rawMaxPoints > 0 ? rawMaxPoints : 1; // Prevents division by 0 in the table visuals

  // Card Dynamic Colors
  const isCycleActive = cycle.status === 'Active';
  const statusCardBg = isCycleActive ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200';
  const statusLabelColor = isCycleActive ? 'text-emerald-700' : 'text-slate-500';
  const statusDotColor = isCycleActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400';
  const statusTextColor = isCycleActive ? 'text-emerald-800' : 'text-slate-700';

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading period data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 relative">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          title="Go back"
          aria-label="Go back"
          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-primary hover:border-primary transition-all shadow-sm cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-sidebar">{cycle.title}</h2>
          <p className="text-[11px] font-bold text-primary uppercase tracking-wider mt-0.5 mb-1">
            {cycle.semester} • AY {cycle.year}
          </p>
          <p className="text-xs text-slate-500">Comprehensive period report and faculty rankings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className={`${statusCardBg} border p-6 rounded-2xl transition-colors`}>
          <p className={`text-[10px] font-bold ${statusLabelColor} uppercase tracking-wider mb-2`}>Period Status</p>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${statusDotColor}`} />
            <h4 className={`text-xl font-bold ${statusTextColor}`}>{cycle.status}</h4>
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Total Faculty</p>
          <h4 className="text-2xl font-bold text-sidebar">{cycle.stats.totalFaculty}</h4>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Completion Rate</p>
          <div className="flex items-end gap-2">
            <h4 className="text-2xl font-bold text-sidebar">{completionPercentage}%</h4>
            <p className="text-xs text-slate-400 mb-1">({cycle.stats.completed}/{cycle.stats.totalFaculty})</p>
          </div>
           <div className="mt-3">
             <progress
              value={completionPercentage}
              max={100}
              aria-label="Completion progress"
              className="w-full h-1.5 overflow-hidden rounded-full bg-slate-100 [&::-webkit-progress-bar]:bg-slate-100 [&::-webkit-progress-value]:bg-amber-500 [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:bg-amber-500"
             />
           </div>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Pending Faculty</p>
          <div className="flex items-end gap-2">
            <h4 className="text-2xl font-bold text-sidebar">{cycle.stats.pending}</h4>
            <p className="text-xs text-slate-400 mb-1">HR Completed</p>
          </div>
          <p className="text-[11px] font-semibold text-primary mt-1">Ready for VPAA review</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-sidebar/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="text-base font-bold text-sidebar">Faculty Rankings</h3>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Search faculty or dept..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            
            <button 
              onClick={() => setIsFilterModalOpen(true)}
              className="relative p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:text-primary transition-all cursor-pointer"
            >
              <Filter size={16} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-primary text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button 
              onClick={handleExportWorkbook}
              disabled={filteredRankings.length === 0 || exportingWorkbook}
              className="flex items-center gap-2 px-4 py-1.5 bg-sidebar text-white rounded-lg text-xs font-bold hover:bg-sidebar-dark transition-all disabled:opacity-50 cursor-pointer"
            >
              {exportingWorkbook ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {exportingWorkbook ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rank</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Faculty Name</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Department</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Points</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRankings.length === 0 ? (
                 <tr>
                   <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">
                     {searchTerm || activeFilterCount > 0 ? 'No faculty found matching your filters.' : 'No faculty applications found for this period.'}
                   </td>
                 </tr>
              ) : (
                filteredRankings.map((faculty, index) => {
                  const statusUI = getStatusDisplay(faculty.dbStatus);
                  return (
                    <tr key={faculty.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`
                          inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold
                          ${index === 0 ? 'bg-amber-100 text-amber-700' : index === 1 ? 'bg-slate-100 text-slate-700' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-400'}
                        `}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                            <User size={16} />
                          </div>
                          <span className="text-sm font-bold text-slate-800">{faculty.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-500" title={faculty.department}>{getDepartmentCode(faculty.department)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <progress
                            value={(faculty.points / safeMaxPoints) * 100}
                            max={100}
                            aria-label={`${faculty.name} score progress`}
                            className="w-24 h-1.5 overflow-hidden rounded-full bg-slate-100 [&::-webkit-progress-bar]:bg-slate-100 [&::-webkit-progress-value]:bg-primary [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:bg-primary"
                          />
                          <span className="text-sm font-bold text-slate-800">{faculty.points}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1.5 rounded-md text-[10px] font-bold shadow-sm ${statusUI.classes}`}>
                          {statusUI.icon && <CheckCircle2 size={10} className="inline mr-1" />}
                          {statusUI.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                       <button 
                         onClick={() => handleViewSubmission(faculty)}
                         className="text-xs font-bold text-primary hover:underline cursor-pointer"
                       >
                         View Submission
                       </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Filter size={16} className="text-primary" />
                Filter Rankings
              </h3>
              <button onClick={() => setIsFilterModalOpen(false)} title="Close filters" aria-label="Close filters" className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Department</label>
                <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} title="Filter by department" aria-label="Filter by department" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                  {uniqueDepartments.map(dept => <option key={dept} value={dept}>{dept === 'All' ? 'All Departments' : getDepartmentCode(dept)}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Application Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} title="Filter by application status" aria-label="Filter by application status" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                  {uniqueStatuses.map(status => <option key={status} value={status}>{status === 'All' ? 'All Statuses' : String(status).replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button onClick={() => { setDepartmentFilter("All"); setStatusFilter("All"); }} className="flex-1 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">Reset</button>
              <button onClick={() => setIsFilterModalOpen(false)} className="flex-1 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-primary-dark cursor-pointer">Apply</button>
            </div>
          </div>
        </div>
      )}
      {isFacultyModalOpen && selectedFaculty && (
        <FacultyDetailModal 
          faculty={selectedFaculty} 
          onClose={handleCloseFacultyModal}
          onStatusUpdate={() => {
              void fetchCycleDetailsRef.current?.(true);
          }}
        />
      )}
    </div>
  );
};

export default CycleDetailsPage;