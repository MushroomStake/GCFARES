import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Search, Filter, ArrowRight, Calendar, Download, Loader2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import ExcelJS from 'exceljs';
import { RANKING_RUBRICS } from '../../rankingRubrics';
import { supabase } from '../supabaseClient';

export interface CycleHistory {
  cycle_id: string;
  title: string;
  semester: string;
  year: string;
  status: string;
  started: string;
  published: string;
  totalFaculty: number;
  avgPoints: string;
  rawStartDate: string;
}

const normalizeStatus = (value: unknown) => String(value || '').trim().toLowerCase();

const sanitizeFilePart = (value: string) => String(value || '')
  .trim()
  .replace(/\s+/g, '_')
  .replace(/[^a-zA-Z0-9._-]/g, '_')
  .replace(/_+/g, '_')
  .replace(/^_+|_+$/g, '');

const getAcademicYearLabel = (cycle: CycleHistory | null | undefined) => {
  if (!cycle) return '';

  const explicitYear = (cycle as { academic_year?: string; academicYear?: string }).academic_year
    || (cycle as { academic_year?: string; academicYear?: string }).academicYear;
  if (explicitYear) return String(explicitYear).trim();

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

const getSemesterLabel = (cycle: CycleHistory | null | undefined) => {
  if (!cycle) return '';
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

const getExportSemesterLabel = (cycle: CycleHistory | null | undefined) => {
  if (!cycle) return '';

  const fromSemester = toCanonicalSemesterLabel(getSemesterLabel(cycle));
  if (fromSemester) return fromSemester;

  return toCanonicalSemesterLabel(cycle.title);
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function HistoryPage() {
  const [cycles, setCycles] = useState<CycleHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 6;
  const { id: highlightedCycleId } = useParams();
  const [stats, setStats] = useState({
    totalCycles: 0,
    avgParticipation: '0',
    highestAvg: '0',
  });

  useEffect(() => {
    let isMounted = true;

    const fetchHistoryData = async () => {
      try {
        setLoading(true);

        const [
          { data: cyclesData, error: cyclesError },
          { data: appsData, error: appsError },
        ] = await Promise.all([
          supabase.from('ranking_cycles').select('*'),
          supabase.from('applications').select('cycle_id, hr_score, status').not('status', 'ilike', '%draft%'),
        ]);

        if (cyclesError) throw cyclesError;
        if (appsError) throw appsError;

        const safeCyclesData = cyclesData || [];
        const safeAppsData = (appsData || []).filter((app) => normalizeStatus(app.status) !== 'draft');

        const fetchedCycles: CycleHistory[] = [];
        let highestAverage = 0;

        safeCyclesData.forEach((data: any) => {
          const cycleApps = safeAppsData.filter((app) => String(app.cycle_id) === String(data.cycle_id));
          const totalFaculty = cycleApps.length;

          const totalPoints = cycleApps.reduce((sum, app) => {
            const score = Number(app.hr_score) || 0;
            return sum + score;
          }, 0);

          const avgPoints = totalFaculty > 0 ? (totalPoints / totalFaculty).toFixed(1) : '0';

          if (Number(avgPoints) > highestAverage) {
            highestAverage = Number(avgPoints);
          }

          const isActive = ['open', 'submissions_closed', 'finished'].includes(String(data.status || '').toLowerCase());

          fetchedCycles.push({
            cycle_id: String(data.cycle_id),
            title: data.title || `${data.semester || 'Semester'} ${data.year || 'Year'}`,
            semester: data.semester || 'N/A',
            year: String(data.year || 'N/A'),
            status: isActive ? 'Current' : 'Finished',
            started: formatDate(data.start_date),
            published: formatDate(data.deadline),
            totalFaculty,
            avgPoints,
            rawStartDate: data.start_date || new Date().toISOString(),
          });
        });

        fetchedCycles.sort((a, b) => new Date(b.rawStartDate).getTime() - new Date(a.rawStartDate).getTime());

        if (isMounted) {
          setCycles(fetchedCycles);
          setStats({
            totalCycles: fetchedCycles.length,
            avgParticipation: fetchedCycles.length > 0 ? (safeAppsData.length / fetchedCycles.length).toFixed(1) : '0',
            highestAvg: highestAverage.toFixed(1),
          });
        }
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchHistoryData();

    const cycleChannel = supabase
      .channel('vpaa-history-cycles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ranking_cycles' }, () => {
        void fetchHistoryData();
      })
      .subscribe();

    const applicationChannel = supabase
      .channel('vpaa-history-applications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
        void fetchHistoryData();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(cycleChannel);
      supabase.removeChannel(applicationChannel);
    };
  }, []);

  const handleExport = async (cycleId: string, cycleTitle: string) => {
    try {
      setExportingId(cycleId);

      const { data: appsData, error: appsError } = await supabase
        .from('applications')
        .select(`
          application_id, status, hr_score, final_score,
          current_rank_at_time,
          qual_experience, qual_degree, qual_teaching, qual_research, qual_eligibility,
          faculty:faculty_id ( user_id, name_last, name_first, name_middle, department_id, current_rank, nature_of_appointment, departments ( department_name, department_code ) )
        `)
        .eq('cycle_id', cycleId)
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

      const cycle = cycles.find((item) => item.cycle_id === cycleId) || null;
      const semesterText = getExportSemesterLabel(cycle);
      const academicYear = getAcademicYearLabel(cycle);
      const periodLabel = [academicYear ? `A.Y ${academicYear}` : '', semesterText].filter(Boolean).join(', ') || cycleTitle;

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
      link.setAttribute('download', `${sanitizeFilePart(cycleTitle || 'Ranking_Period').toLowerCase()}_overall_scoring.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting XLSX:', error);
      alert(`Failed to export XLSX: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setExportingId(null);
    }
  };

  const filteredCycles = cycles.filter((cycle) =>
    cycle.title.toLowerCase().includes(searchTerm.toLowerCase())
    || cycle.semester.toLowerCase().includes(searchTerm.toLowerCase())
    || cycle.year.includes(searchTerm),
  );

  const totalHistoryPages = Math.max(1, Math.ceil(filteredCycles.length / historyPageSize));
  const safeHistoryPage = Math.min(historyPage, totalHistoryPages);
  const historyStartIndex = (safeHistoryPage - 1) * historyPageSize;
  const visibleCycles = filteredCycles.slice(historyStartIndex, historyStartIndex + historyPageSize);

  useEffect(() => {
    if (!highlightedCycleId || filteredCycles.length === 0) return;

    const targetIndex = filteredCycles.findIndex((cycle) => cycle.cycle_id === highlightedCycleId);
    if (targetIndex >= 0) {
      const targetPage = Math.floor(targetIndex / historyPageSize) + 1;
      if (historyPage !== targetPage) {
        setHistoryPage(targetPage);
        return;
      }
    }
  }, [filteredCycles, historyPage, highlightedCycleId, historyPageSize]);

  useEffect(() => {
    if (!highlightedCycleId) return;
    const element = document.getElementById(`history-cycle-${highlightedCycleId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [safeHistoryPage, visibleCycles, highlightedCycleId]);

  useEffect(() => {
    if (historyPage > totalHistoryPages) {
      setHistoryPage(totalHistoryPages);
    }
  }, [historyPage, totalHistoryPages]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading ranking history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-sidebar">Ranking Period History</h2>
          <p className="text-xs text-slate-500">Archive of all past and current ranking periods</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search cycles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <button className="p-2 border border-slate-200 rounded-lg bg-white text-slate-600 hover:text-primary hover:border-primary transition-colors" title="Filter ranking periods" aria-label="Filter ranking periods">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Periods', value: stats.totalCycles, color: 'bg-primary' },
          { label: 'Avg. Participation', value: stats.avgParticipation, color: 'bg-amber-500' },
          { label: 'Highest Avg. Points', value: stats.highestAvg, color: 'bg-emerald-500' },
          { label: 'System Status', value: 'Live', color: 'bg-sidebar' },
        ].map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{stat.label}</p>
            <div className="flex items-center gap-3">
              <div className={`w-2 h-6 rounded-full ${stat.color}`} />
              <p className="text-2xl font-black text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredCycles.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-500 font-bold">No ranking periods found.</p>
            <p className="text-sm text-slate-400">Try adjusting your search terms.</p>
          </div>
        ) : (
          visibleCycles.map((cycle) => (
            <div
              id={`history-cycle-${cycle.cycle_id}`}
              key={cycle.cycle_id}
              className={`group p-6 rounded-2xl border transition-all duration-300 ${cycle.cycle_id === highlightedCycleId ? 'bg-primary/5 border-primary/70 ring-4 ring-primary/20 shadow-[0_20px_50px_-20px_rgba(59,130,246,0.55)]' : 'bg-white border-slate-200 hover:border-primary/40 hover:shadow-md'}`}
            >
              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-xl bg-slate-50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors border border-slate-100">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-800 mb-0.5">{cycle.title}</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      {cycle.semester} • AY {cycle.year}
                    </p>
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                          cycle.status === 'Current' ? 'text-primary bg-primary/10 border border-primary/20' : 'text-slate-500 bg-slate-100 border border-slate-200'
                        }`}
                        title={cycle.status}
                      >
                        <CheckCircle2 size={12} />
                        {cycle.status}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">Started: {cycle.started}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8 lg:gap-16 lg:pr-10 border-l border-slate-100 pl-8">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Users size={12} /> Included
                    </p>
                    <p className="text-lg font-black text-slate-700">{cycle.totalFaculty} <span className="text-xs font-medium text-slate-400">faculty</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Avg. Points</p>
                    <p className="text-lg font-black text-slate-700">{cycle.avgPoints}</p>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">End Date</p>
                    <p className="text-sm font-bold text-slate-700">{cycle.published}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4 lg:mt-0">
                  <button
                    onClick={() => handleExport(cycle.cycle_id, cycle.title)}
                    disabled={exportingId === cycle.cycle_id}
                    className="flex-1 lg:flex-none px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exportingId === cycle.cycle_id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Download size={14} />
                    )}
                    {exportingId === cycle.cycle_id ? 'Exporting...' : 'Export'}
                  </button>
                  <Link
                    to={`/history/${cycle.cycle_id}`}
                    className="flex-1 lg:flex-none px-5 py-2.5 bg-sidebar text-white rounded-xl text-xs font-bold hover:bg-sidebar-dark shadow-sm transition-all group/btn flex items-center justify-center gap-2"
                  >
                    View Period Rankings
                    <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {filteredCycles.length > historyPageSize && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">
            Showing {historyStartIndex + 1}-{Math.min(historyStartIndex + historyPageSize, filteredCycles.length)} of {filteredCycles.length} periods
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
              disabled={safeHistoryPage === 1}
            >
              Previous
            </button>
            <span className="text-xs font-semibold text-slate-500">Page {safeHistoryPage} of {totalHistoryPages}</span>
            <button
              type="button"
              className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setHistoryPage((page) => Math.min(totalHistoryPages, page + 1))}
              disabled={safeHistoryPage === totalHistoryPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
