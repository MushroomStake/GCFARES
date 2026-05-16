import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import { RANKING_RUBRICS } from '../data/rankingRubrics';
import Sidebar from '../components/sidenav';
import '../styles/layout.css';
import './dashboard.css';
import { supabase } from '../supabase';
import AreaIVImportPanel from './review/components/AreaIVImportPanel';
import Loader from '../components/Loader';
import CycleTimelineModal from './dashboard/CycleTimelineModal';

const sanitizeFilePart = (value) => String(value || '')
  .trim()
  .replace(/\s+/g, '_')
  .replace(/[^a-zA-Z0-9._-]/g, '_')
  .replace(/_+/g, '_')
  .replace(/^_+|_+$/g, '');

const getAcademicYearLabel = (cycle) => {
  if (!cycle) return '';

  const explicitYear = cycle.academic_year || cycle.academicYear;
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

const getSemesterLabel = (cycle) => {
  if (!cycle) return '';
  if (cycle.semester) return String(cycle.semester).trim();

  const title = String(cycle.title || '');
  const semesterMatch = title.match(/\b(?:1st|2nd|3rd|first|second|third|summer)\s+semester\b/i);
  if (semesterMatch) return semesterMatch[0];

  return '';
};

const toCanonicalSemesterLabel = (value) => {
  const normalized = String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!normalized) return '';

  if (/(^|\b)(1st|first|1)\b/.test(normalized)) return '1st Semester';
  if (/(^|\b)(2nd|second|2)\b/.test(normalized)) return '2nd Semester';

  return '';
};

const getExportSemesterLabel = (cycle) => {
  if (!cycle) return '';

  const fromSemester = toCanonicalSemesterLabel(cycle.semester);
  if (fromSemester) return fromSemester;

  return toCanonicalSemesterLabel(cycle.title);
};

const getCyclePeriodLabel = (cycle) => {
  const semester = getSemesterLabel(cycle);
  const academicYear = getAcademicYearLabel(cycle);
  return [semester, academicYear].filter(Boolean).join(' ').trim() || cycle?.title || 'Ranking Period';
};

const formatFacultyPdfFileName = (app, cycle) => {
  const lastName = sanitizeFilePart(app?.faculty?.name_last || 'Faculty');
  const firstName = sanitizeFilePart(app?.faculty?.name_first || 'Name');
  const academicYear = sanitizeFilePart(getAcademicYearLabel(cycle) || 'AY');
  const semester = sanitizeFilePart(getSemesterLabel(cycle) || 'Semester');
  return `${lastName}_${firstName}_${academicYear}_${semester}.pdf`;
};

const formatCyclePdfFileName = (cycle) => {
  const titlePart = sanitizeFilePart(cycle?.title || 'Ranking_Period');
  return `${titlePart}_Masterlist.pdf`;
};

const formatCycleCsvFileName = (cycle) => {
  const titlePart = sanitizeFilePart(cycle?.title || 'Ranking_Period');
  return `${titlePart}_Masterlist.csv`;
};

// Logo assets removed from exports to avoid large data embedding issues.

const drawPdfHeader = (pdf, pageWidth, title, subtitle) => {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('GORDON COLLEGE', pageWidth / 2, 74, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10.5);
  pdf.text(subtitle, pageWidth / 2, 92, { align: 'center' });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text(title, pageWidth / 2, 112, { align: 'center' });

  pdf.setDrawColor(120);
  pdf.line(40, 124, pageWidth - 40, 124);
};

const DB_AREA_ID_TO_RUBRIC_AREA_ID = {
  4: 1,
  5: 2,
  6: 3,
  7: 4,
  8: 5,
  9: 6,
  10: 7,
  11: 8,
  12: 9,
  13: 10,
};

const DOWNLOAD_RESULT_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const VIEW_HISTORY_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

function normalizePartLookupKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function compressRankRange(rankStr) {
  if (!rankStr) return rankStr;
  const parts = String(rankStr).split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) {
    const romanValues = { I: 1, II: 2, III: 3, IV: 4, V: 5 };
    const extracted = parts.map((part) => {
      const match = part.match(/^(.+?)\s+([IVX]+)$/);
      return match ? { prefix: match[1].trim(), numeral: match[2].trim() } : null;
    }).filter(Boolean);

    if (extracted.length === parts.length && extracted.length > 1) {
      const firstPrefix = extracted[0]?.prefix;
      const allSamePrefix = extracted.every((item) => item?.prefix === firstPrefix);
      if (allSamePrefix) {
        const nums = extracted.map((item) => romanValues[item?.numeral || ''] || 0).sort((a, b) => a - b).filter(Boolean);
        const isConsecutive = nums.every((num, index, arr) => index === 0 || num === arr[index - 1] + 1);
        if (isConsecutive) {
          const reverseValues = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V' };
          return `${firstPrefix} ${reverseValues[nums[0]]}-${reverseValues[nums[nums.length - 1]]}`;
        }
      }
    }
  }

  return rankStr;
}

function getPublicFileUrl(storagePath) {
  if (!storagePath) return null;
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) return storagePath;
  const supabaseUrl = supabase.supabaseUrl;
  const bucket = 'documents';
  const encodedPath = storagePath.split('/').map((segment) => encodeURIComponent(segment)).join('/');
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

function flattenAreaCriteria(areaDefinition) {
  const rows = [];
  const walk = (items) => {
    items.forEach((item) => {
      rows.push({
        criterionKey: item.label,
        label: item.label,
        title: item.title,
        maxPoints: item.maxPoints ?? null,
      });
      if (Array.isArray(item.children) && item.children.length > 0) {
        walk(item.children);
      }
    });
  };

  if (areaDefinition?.subAreas) {
    walk(areaDefinition.subAreas);
  }

  return rows;
}

function formatQualificationValue(textValue, jsonValue) {
  if (textValue && String(textValue).trim()) return String(textValue).trim();

  if (typeof jsonValue === 'string' && String(jsonValue).trim()) return String(jsonValue).trim();

  if (Array.isArray(jsonValue) && jsonValue.length > 0) {
    const mapped = jsonValue
      .map((entry) => {
        if (!entry) return '';
        if (typeof entry === 'string') return entry.trim();
        return String(entry.degree || entry.text || entry.name || entry.title || entry.institution || '').trim();
      })
      .filter(Boolean);

    if (mapped.length > 0) return mapped.join('\n');
  }

  return 'No data provided';
}

function QualificationStatusIcon({ qualified }) {
  return qualified ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 9 6 6" />
      <path d="m15 9-6 6" />
    </svg>
  );
}

function DownloadResultIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

// â”€â”€ Cycle Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CycleCard({ cycle, onEdit, onCycleAction }) {
  if (!cycle) {
    return (
      <div className="cycle-card">
        <div className="cycle-header">
          <div>
            <div className="cycle-label">No Active Period</div>
            <div className="cycle-title">Create your first evaluation period</div>
          </div>
          <span className="badge badge-inactive">Not Started</span>
        </div>
        <div className="cycle-footer">
          <div className="btn-group">
            <button className="btn btn-edit" onClick={onEdit}>Create Period</button>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Not set';
    // Handle both Timestamp objects and date strings
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 'Not set';
    return date.toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  };

  const getStatusBadge = () => {
    // Use the cycle's status field first, then fall back to date logic
    if (cycle.status === 'finished') {
      return { class: 'badge-closed', text: 'Finished' };
    }

    if (cycle.status === 'submissions_closed') {
      return { class: 'badge-warning', text: 'Submissions Closed' };
    }

    if (cycle.status === 'open') {
      // For open cycles, check if they've actually started based on dates
      const now = new Date();
      const start = cycle.start_date?.toDate ? cycle.start_date.toDate() : new Date(cycle.start_date);
      const end = cycle.deadline?.toDate ? cycle.deadline.toDate() : new Date(cycle.deadline);

      // Compare dates only (ignore time) for start date check
      const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      
      if (nowDate < startDate) {
        return { class: 'badge-inactive', text: 'Not Started' };
      }
      if (now > end) {
        return { class: 'badge-warning', text: 'Overdue' };
      }
      return { class: 'badge-progress', text: 'In Progress' };
    }
    
    // Default fallback
    return { class: 'badge-inactive', text: 'Unknown Status' };
  };

  const getActionButtons = () => {
    const isOpen = cycle.status === 'open';
    const isSubmissionsClosed = cycle.status === 'submissions_closed';
    const isFinished = cycle.status === 'finished';
    const profileLocked = cycle.profile_edit_open === false;

    if (isOpen) {
      // Active cycle: Edit + Lock/Unlock Profile + Close Submissions + Finish Evaluation
      return (
        <>
          <button className="btn btn-edit" onClick={onEdit}>Edit</button>
          <button
            className="btn btn-outline-warning"
            onClick={() => onCycleAction(profileLocked ? 'unlock-profile' : 'lock-profile')}
          >
            {profileLocked ? 'Unlock Profile' : 'Lock Profile'}
          </button>
          <button className="btn btn-outline-danger" onClick={() => onCycleAction('close')}>Close Submissions</button>
          <button className="btn btn-primary" onClick={() => onCycleAction('finish')}>Finish Evaluation</button>
        </>
      );
    } else if (isSubmissionsClosed) {
      // Submissions closed but evaluation ongoing: Edit + Lock/Unlock Profile + Re-open Submissions + Finish Evaluation
      return (
        <>
          <button className="btn btn-edit" onClick={onEdit}>Edit</button>
          <button
            className="btn btn-outline-warning"
            onClick={() => onCycleAction(profileLocked ? 'unlock-profile' : 'lock-profile')}
          >
            {profileLocked ? 'Unlock Profile' : 'Lock Profile'}
          </button>
          <button className="btn btn-outline-success" onClick={() => onCycleAction('reopen')}>Re-open Submissions</button>
          <button className="btn btn-primary" onClick={() => onCycleAction('finish')}>Finish Evaluation</button>
        </>
      );
    } else if (isFinished) {
      // Evaluation finished: Edit + Open Cycle (restart from beginning)
      return (
        <>
          <button className="btn btn-edit" onClick={onEdit}>Edit</button>
          <button className="btn btn-outline-success" onClick={() => onCycleAction('open')}>Open Period</button>
        </>
      );
    } else {
      // Unknown state: Edit + Open Cycle
      return (
        <>
          <button className="btn btn-edit" onClick={onEdit}>Edit</button>
          <button className="btn btn-outline-success" onClick={() => onCycleAction('open')}>Open Period</button>
        </>
      );
    }
  };

  const status = getStatusBadge();
  const profileEditingAllowed = cycle.profile_edit_open !== false;

  return (
    <div className="cycle-card">
      <div className="cycle-header">
        <div>
          <div className="cycle-label">Current Period</div>
          <div className="cycle-title">{cycle.title}</div>
          <div className="cycle-meta">
            Started: {formatDate(cycle.start_date)}<br />
            Deadline: {formatDate(cycle.deadline)}<br />
            Profile Access: {profileEditingAllowed ? 'Open' : 'Locked'}
          </div>
        </div>
        <span className={`badge ${status.class}`}>{status.text}</span>
      </div>
      <div className="cycle-footer">
        <span className={`badge ${status.class}`}>{status.text}</span>
        <div className="btn-group">
          {getActionButtons()}
        </div>
      </div>
    </div>
  );
}

// â”€â”€ Stat Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StatCard({ iconClass, icon, label, value }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${iconClass}`}>{icon}</div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
      </div>
    </div>
  );
}

// ─── History Item ─────────────────────────────────────────
function HistoryItem({ cycle, onReview, onExport }) {
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Not set';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const getStatus = () => {
    return cycle.status === 'open' ? 'Active' : 'Completed';
  };

  return (
    <div 
      className="history-item" 
      onClick={() => onReview(cycle.cycle_id)}
      style={{ cursor: 'pointer' }}
    >
      <div className="history-badge">{getStatus()}</div>
      <div className="history-title">{cycle.title}</div>
      <div className="history-meta">
        Started: {formatDate(cycle.start_date)}<br />
        Deadline: {formatDate(cycle.deadline)}
      </div>
      <div className="history-footer" onClick={(e) => e.stopPropagation()}>
        <button
          className="btn btn-outline-primary history-export-btn"
          onClick={() => onExport(cycle)}
          title="Export"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v12" />
            <path d="m7 10 5 5 5-5" />
            <path d="M5 21h14" />
          </svg>
          Export
        </button>
      </div>
    </div>
  );
}

function HistoryFacultyModal({ open, cycle, app, onClose, onDownloadResult }) {
  const [loading, setLoading] = useState(true);
  const [fullUserData, setFullUserData] = useState(null);
  const [appData, setAppData] = useState(null);
  const [areas, setAreas] = useState([]);
  const [fileModalOpen, setFileModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [openAreaAccordions, setOpenAreaAccordions] = useState({});
  const [qualExperience, setQualExperience] = useState('No data provided');
  const [qualDegree, setQualDegree] = useState('No data provided');
  const [qualTeaching, setQualTeaching] = useState('No data provided');
  const [qualResearch, setQualResearch] = useState('No data provided');
  const [qualEligibility, setQualEligibility] = useState('No data provided');

  useEffect(() => {
    if (!open || !app) return undefined;

    let active = true;

    const fetchData = async () => {
      const applicationId = app.application_id ?? app.id;
      if (!applicationId) return;

      try {
        setLoading(true);
        setOpenAreaAccordions({});
        setFileModalOpen(false);
        setSelectedFile(null);

        const { data: applicationData, error: appError } = await supabase
          .from('applications')
          .select('*')
          .eq('application_id', applicationId)
          .single();

        if (appError) throw appError;

        const { data: areasData, error: areasError } = await supabase
          .from('areas')
          .select('*')
          .order('area_id');

        if (areasError) throw areasError;

        const { data: submissionsData, error: subError } = await supabase
          .from('area_submissions')
          .select('*')
          .eq('application_id', applicationId);

        if (subError) throw subError;

        let userData = null;
        if (applicationData?.faculty_id) {
          const { data: fetchedUser, error: userError } = await supabase
            .from('users')
            .select(`*, departments(department_name)`)
            .eq('user_id', applicationData.faculty_id)
            .single();

          if (!userError && fetchedUser) {
            userData = fetchedUser;
          }
        }

        const scoreMap = {};
        (submissionsData || []).forEach((submission) => {
          const score = Number(submission.hr_points || submission.csv_total_average_rate || submission.vpaa_points || 0) || 0;
          if (score > 0 && submission.part_id) {
            scoreMap[normalizePartLookupKey(submission.part_id)] = { score, submissionId: submission.submission_id };
            scoreMap[String(submission.part_id)] = { score, submissionId: submission.submission_id };
          }
        });

        const fetchedSubmissions = {};
        const titleMap = {};
        (submissionsData || []).forEach((submission) => {
          const areaId = String(submission.area_id);
          if (!fetchedSubmissions[areaId]) fetchedSubmissions[areaId] = [];
          fetchedSubmissions[areaId].push(submission);
          if (submission.submission_id && submission.part_id) {
            titleMap[submission.submission_id] = submission.part_id;
          }
        });

        const mergedAreas = (areasData || []).map((area) => {
          const dbId = Number(area.area_id);
          const rubricAreaId = DB_AREA_ID_TO_RUBRIC_AREA_ID[dbId] || dbId;
          const rubricArea = RANKING_RUBRICS.find((item) => Number(item.areaId) === Number(rubricAreaId));
          const criteriaDefinitions = flattenAreaCriteria(rubricArea);
          const submissions = fetchedSubmissions[String(area.area_id)] || [];
          const submissionLookup = {};
          let areaCurrentPoints = 0;

          submissions.forEach((submission) => {
            if (!submission.file_path) return;

            let rawKey = submission.part_id || null;
            if (!rawKey) rawKey = titleMap[submission.submission_id] || null;
            if (!rawKey && submission.part_name) rawKey = submission.part_name;
            if (!rawKey && submission.file_path) {
              const match = submission.file_path.split('/').find((part) => /part\s*\w+/i.test(part));
              rawKey = match || submission.file_path.split('/').pop() || 'other';
            }

            const partKey = normalizePartLookupKey(rawKey || 'other');
            const fullFileUrl = getPublicFileUrl(submission.file_path) || '';
            const fileName = String(submission.file_path).split('/').pop() || 'Untitled File';
            const submissionPoints = Number(submission.vpaa_points ?? submission.hr_points ?? submission.csv_total_average_rate ?? 0) || 0;
            areaCurrentPoints += submissionPoints;

            [rawKey, partKey, titleMap[submission.submission_id], submission.part_name].filter(Boolean).forEach((candidateKey) => {
              const normalizedCandidate = normalizePartLookupKey(candidateKey);
              if (normalizedCandidate && !submissionLookup[normalizedCandidate]) {
                submissionLookup[normalizedCandidate] = { url: fullFileUrl, fileName };
              }
              if (candidateKey && !submissionLookup[String(candidateKey)]) {
                submissionLookup[String(candidateKey)] = { url: fullFileUrl, fileName };
              }
            });
          });

          const criteriaRows = criteriaDefinitions.map((criterion) => {
            const partLabel = criterion.label || '';
            const partLetter = partLabel.split('.')[0];
            const compactPartLabel = normalizePartLookupKey(partLabel);
            const compactPartLetter = normalizePartLookupKey(partLetter);

            const candidateKeys = [partLabel, partLetter, `Part ${partLabel}`, `Part ${partLetter}`];
            if (rubricArea?.areaCode) {
              candidateKeys.unshift(`${rubricArea.areaCode}-${partLabel}`, `${rubricArea.areaCode}-${partLetter}`, `${rubricArea.areaCode}-${compactPartLabel}`);
            }

            const normalizedCandidates = candidateKeys.flatMap((key) => [key, normalizePartLookupKey(key)]).filter(Boolean);
            const fileMatch = normalizedCandidates.map((key) => submissionLookup[key]).find(Boolean) || null;

            let scoreRow = null;
            for (const key of normalizedCandidates) {
              if (scoreMap[key]) {
                scoreRow = scoreMap[key];
                break;
              }
            }

            const score = scoreRow ? Number(scoreRow.score || 0) : 0;
            return {
              criterionKey: criterion.criterionKey,
              label: criterion.label,
              title: criterion.title,
              maxPoints: criterion.maxPoints,
              score,
              fileUrl: fileMatch?.url || null,
              fileName: fileMatch?.fileName || 'Untitled File',
            };
          });

          return {
            id: String(area.area_id),
            title: area.area_name || `Area ${area.area_id}`,
            max: Number(area.max_possible_points) || 0,
            current: areaCurrentPoints,
            criteriaRows,
            color: 'bg-[#0a5e2f]',
          };
        });

        if (!active) return;

        setAppData(applicationData || null);
        setFullUserData(userData || null);
        setAreas(mergedAreas.filter((area) => Number(area.id) >= 1));
        setQualExperience(formatQualificationValue(applicationData?.qual_experience, null));
        setQualDegree(formatQualificationValue(applicationData?.qual_degree, null));
        setQualTeaching(formatQualificationValue(applicationData?.qual_teaching, null));
        setQualResearch(formatQualificationValue(applicationData?.qual_research, null));
        setQualEligibility(formatQualificationValue(applicationData?.qual_eligibility, userData?.eligibility_exams_json));
      } catch (error) {
        console.error('Failed to fetch history faculty details', error);
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchData();

    return () => {
      active = false;
    };
  }, [open, app]);

  if (!open || !app) return null;

  const firstName = fullUserData?.name_first || app.faculty?.name_first || '';
  const middleInitial = fullUserData?.name_middle ? `${fullUserData.name_middle.charAt(0)}.` : '';
  const lastName = fullUserData?.name_last || app.faculty?.name_last || '';
  const fullName = `${firstName} ${middleInitial} ${lastName}`.trim() || 'N/A';
  const departmentName = fullUserData?.departments?.department_name || app.faculty?.departments?.department_name || app.faculty?.department_id || 'Not specified';
  const departmentCode = fullUserData?.departments?.department_code || app.faculty?.departments?.department_code || null;
  const departmentDisplay = departmentCode || departmentName;
  const totalPoints = areas.reduce((sum, area) => sum + Number(area.current || 0), 0);
  const fileViewerOpen = fileModalOpen && selectedFile;
  const educationalAttainmentValue = formatQualificationValue(fullUserData?.educational_attainment, fullUserData?.educational_attainment_json);
  const eligibilityExamsValue = formatQualificationValue(fullUserData?.eligibility_exams, fullUserData?.eligibility_exams_json);

  const toggleAreaAccordion = (index) => {
    setOpenAreaAccordions((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const isPdfUrl = (url) => {
    if (!url) return false;
    const cleanUrl = String(url).toLowerCase();
    return cleanUrl.endsWith('.pdf') || cleanUrl.includes('application/pdf');
  };

  const isPreviewImageUrl = (url) => {
    if (!url) return false;
    const cleanUrl = String(url).split('?')[0].split('#')[0].toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(cleanUrl.slice(cleanUrl.lastIndexOf('.') + 1));
  };

  const facultyName = `${firstName} ${middleInitial} ${lastName}`.replace(/\s+/g, ' ').trim();

  return (
    <>
      <div className="history-faculty-overlay" onClick={onClose}>
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'relative', width: '100%', maxWidth: '1120px', height: '90vh', background: '#f8fafc', borderRadius: '24px', boxShadow: '0 25px 50px rgba(15, 23, 42, 0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
          <button onClick={onClose} title="Close modal" aria-label="Close modal" style={{ position: 'absolute', top: '18px', right: '18px', zIndex: 20, border: 'none', borderRadius: '9999px', width: '44px', height: '44px', background: '#fff', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.12)', color: '#64748b', cursor: 'pointer', fontSize: '24px', lineHeight: 1 }}>
            ×
          </button>

          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'row' }}>
            <div style={{ width: '41.6667%', padding: '40px', overflowY: 'auto', borderRight: '1px solid #e2e8f0', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
                <div style={{ padding: '8px', color: '#0a5e2f' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937' }}>Faculty Information</h3>
              </div>

              <div style={{ display: 'grid', gap: '32px' }}>
                <section>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ color: '#94a3b8' }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    Personal Details
                  </h4>
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>Name</p>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937', wordBreak: 'break-word' }}>{loading ? 'Loading...' : facultyName || 'N/A'}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>Department</p>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937', wordBreak: 'break-word' }}>{loading ? 'Loading...' : departmentDisplay}</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ color: '#94a3b8' }}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>
                    Employment Status
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>Present Rank</p>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>{appData?.current_rank_at_time || fullUserData?.current_rank || app.faculty?.current_rank || 'N/A'}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>Nature of Appointment</p>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>{fullUserData?.nature_of_appointment || app?.faculty?.nature_of_appointment || 'Permanent'}</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ color: '#94a3b8' }}><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
                    Educational Attainment
                  </h4>
                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '16px' }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>{educationalAttainmentValue}</p>
                  </div>
                </section>

                <section>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ color: '#94a3b8' }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                    Eligibility & Exams
                  </h4>
                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '16px' }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>{eligibilityExamsValue}</p>
                  </div>
                </section>

                <section>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ color: '#94a3b8' }}><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
                    Experience
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>Teaching Exp.</p>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>{fullUserData?.teaching_experience_years || 0} years</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>Industry Exp.</p>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>{fullUserData?.industry_experience_years || 0} years</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ color: '#94a3b8' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                    Application Details
                  </h4>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>Applying For</p>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#0a5e2f', wordBreak: 'break-word' }}>{compressRankRange(fullUserData?.applying_for || appData?.applying_for || 'Not specified')}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>Last Promotion</p>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>{fullUserData?.date_of_last_promotion ? new Date(fullUserData.date_of_last_promotion).toLocaleDateString() : 'Not specified'}</p>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <div style={{ width: '58.3333%', padding: '40px', overflowY: 'auto', background: '#fff', display: 'flex', flexDirection: 'column' }}>
              {loading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.8)', zIndex: 10 }}>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#64748b' }}>Loading data...</p>
                </div>
              )}

              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '24px' }}>Submitted Areas</h3>
                <div style={{ display: 'grid', gap: '18px' }}>
                  {areas.length > 0 ? areas.map((area, idx) => (
                    <div key={idx} style={{ overflow: 'hidden', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff' }}>
                      <button type="button" onClick={() => toggleAreaAccordion(idx)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: 'none', background: '#fff', cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ paddingRight: '20px' }}>
                          <p style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>{area.title}</p>
                          <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>Max: {Number(area.max || 0).toFixed(2)} pts <span style={{ color: '#f59e0b', marginLeft: '4px' }}>+0 excess</span></p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#0a5e2f' }}>
                          <span style={{ fontSize: '14px', fontWeight: 700 }}>{Number(area.current || 0).toFixed(2)} pts</span>
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ color: '#94a3b8', transform: openAreaAccordions[idx] ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', flexShrink: 0 }}>
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </button>

                      {openAreaAccordions[idx] && (
                        <div style={{ padding: '0 16px 16px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', overflowX: 'auto' }}>
                          {area.criteriaRows && area.criteriaRows.length > 0 ? (
                            <table style={{ width: '100%', textAlign: 'left', whiteSpace: 'nowrap', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ background: '#e2e8f0', borderBottom: '1px solid #cbd5e1' }}>
                                  <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 700, color: '#475569' }}>Criteria / Title</th>
                                  <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 700, color: '#475569', textAlign: 'right' }}>Max Pts</th>
                                  <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 700, color: '#475569', textAlign: 'right' }}>Score</th>
                                  <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {area.criteriaRows.map((criterion, criterionIdx) => {
                                  const hasMaxPoints = Number(criterion.maxPoints || 0) > 0;
                                  return (
                                    <tr key={`${criterion.criterionKey}-${criterionIdx}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                      <td style={{ padding: '12px', fontSize: '11px', color: '#1f2937', whiteSpace: 'normal' }}>
                                        <span style={{ fontWeight: 700, color: '#0a5e2f', marginRight: '6px' }}>{criterion.label}</span>
                                        {criterion.title}
                                      </td>
                                      <td style={{ padding: '12px', fontSize: '11px', fontWeight: 700, color: '#0a5e2f', textAlign: 'right' }}>
                                        {hasMaxPoints ? Number(criterion.maxPoints).toFixed(2) : '—'}
                                      </td>
                                      <td style={{ padding: '12px', fontSize: '11px', fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>
                                        {Number(criterion.score || 0).toFixed(2)}
                                      </td>
                                      <td style={{ padding: '12px', textAlign: 'center' }}>
                                        {criterion.fileUrl ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedFile({ url: criterion.fileUrl || '', fileName: criterion.fileName || 'Untitled File' });
                                              setFileModalOpen(true);
                                            }}
                                            style={{ border: 'none', background: '#d7f4e7', color: '#0a5e2f', fontSize: '11px', fontWeight: 700, padding: '6px 12px', borderRadius: '9999px', cursor: 'pointer' }}
                                            title={criterion.fileName}
                                          >
                                            View File
                                          </button>
                                        ) : (
                                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>—</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          ) : (
                            <p style={{ fontSize: '14px', color: '#64748b', fontStyle: 'italic', padding: '8px 0' }}>No criteria available for this area.</p>
                          )}
                        </div>
                      )}
                      <div style={{ height: '6px', background: '#f1f5f9' }}>
                        <div style={{ height: '100%', width: `${Math.min((Number(area.current || 0) / Math.max(Number(area.max || 1), 1)) * 100, 100)}%`, background: '#0a5e2f', borderRadius: '0 9999px 9999px 0' }} />
                      </div>
                    </div>
                  )) : (
                    <p style={{ fontSize: '14px', color: '#64748b', fontStyle: 'italic' }}>No areas available.</p>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 'auto', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#1f2937' }}>TOTAL POINTS:</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '10px', color: '#94a3b8', marginRight: '12px' }}>Max: 200.00 pts</span>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#0a5e2f' }}>{totalPoints.toFixed(2)} pts</span>
                  </div>
                </div>

                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1f2937', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '16px' }}>Qualification</h3>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '20px', marginBottom: '24px' }}>
                  {[
                    ['Experience', qualExperience],
                    ['Degree', qualDegree],
                    ['Teaching Experience', qualTeaching],
                    ['Research Output', qualResearch],
                    ['Eligibility', qualEligibility],
                  ].map(([label, value]) => {
                    const text = String(value || 'N/A');
                    const isQualified = !/not qualified/i.test(text);
                    return (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', borderBottom: '1px solid rgba(226, 232, 240, 0.7)', paddingBottom: '12px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937', background: '#fff', padding: '6px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>{text}</span>
                          <span style={{ color: isQualified ? '#0a5e2f' : '#ef4444', display: 'inline-flex', alignItems: 'center' }}>
                            <QualificationStatusIcon qualified={isQualified} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => onDownloadResult(app)}
                    style={{ flex: 1, padding: '14px 18px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                  >
                    <DownloadResultIcon />
                    Download Result
                  </button>
                </div>
              </div>
            </div>
          </div>

          {fileViewerOpen && selectedFile && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.35)', backdropFilter: 'blur(2px)' }} onClick={() => setFileModalOpen(false)} />
              <div style={{ position: 'relative', background: '#fff', width: '100%', maxWidth: '960px', height: '85vh', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.25)', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile.fileName}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <a href={selectedFile.url} download style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: '#3b82f6', color: '#fff', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>
                      <DownloadResultIcon />
                      Download
                    </a>
                    <button type="button" onClick={() => setFileModalOpen(false)} style={{ border: 'none', background: '#f1f5f9', color: '#475569', width: '40px', height: '40px', borderRadius: '10px', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>×</button>
                  </div>
                </div>
                <div style={{ flex: 1, overflow: 'auto', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                  {isPdfUrl(selectedFile.url) ? (
                    <iframe src={selectedFile.url} title="PDF viewer" style={{ width: '100%', height: '100%', border: 0, borderRadius: '12px', background: '#fff' }} />
                  ) : isPreviewImageUrl(selectedFile.url) ? (
                    <img src={selectedFile.url} alt={selectedFile.fileName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '12px' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#64748b' }}>
                      <p style={{ fontWeight: 700, marginBottom: '8px' }}>Preview not available</p>
                      <p style={{ fontSize: '14px', marginBottom: '16px' }}>This file type cannot be previewed in the browser</p>
                      <a href={selectedFile.url} download style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: '#3b82f6', color: '#fff', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>
                        <DownloadResultIcon />
                        Download File
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// â”€â”€ Action Confirmation Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ActionConfirmModal({ open, title, message, confirmLabel, confirmTone = 'danger', onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div
      className="action-modal-overlay"
      onClick={(e) => e.target.classList.contains('action-modal-overlay') && onCancel()}
    >
      <div className="action-modal">
        <div className="action-modal-header">
          <div>
            <div className="action-modal-kicker">Confirm Action</div>
            <div className="action-modal-title">{title}</div>
          </div>
          <button className="action-modal-close" onClick={onCancel} aria-label="Close confirmation">âœ•</button>
        </div>
        <div className="action-modal-body">
          <p>{message}</p>
        </div>
        <div className="action-modal-footer">
          <button className="btn btn-edit" onClick={onCancel}>Cancel</button>
          <button className={`btn ${confirmTone === 'primary' ? 'btn-primary' : 'btn-outline-danger'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// â”€â”€ Dashboard Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€ Dashboard Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function Dashboard() {
  const navigate = useNavigate();
  const [currentCycle, setCurrentCycle] = useState(null);
  const [modalCycle, setModalCycle] = useState(null);
  const [focusDeadlineFields, setFocusDeadlineFields] = useState(false);
  const [cycleHistory, setCycleHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 6;
  const [pastPage, setPastPage] = useState(1);
  const PAST_PAGE_SIZE = 10;
  const [stats, setStats] = useState({
    totalFaculty: 0,
    pendingReviews: 0,
    completed: 0,
    deadline: 'Not set'
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [actionModal, setActionModal] = useState({
    open: false,
    action: null,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    confirmTone: 'danger',
  });
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [selectedPastCycle, setSelectedPastCycle] = useState(null);
  const [selectedPastFaculty, setSelectedPastFaculty] = useState(null);
  const [pastApplications, setPastApplications] = useState([]);
  const [pastSearchTerm, setPastSearchTerm] = useState('');
  const [pastDepartmentFilter, setPastDepartmentFilter] = useState('all');

  // importer is embedded in the dashboard UI now

  const handleReviewCycle = async (cycleId) => {
    const cycle = cycleHistory.find(c => c.cycle_id === cycleId);
    if (!cycle) return;
    
    setPastPage(1);
    setSelectedPastFaculty(null);
    setSelectedPastCycle(cycle);
    setLoading(true);
    try {
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
      setPastApplications(appsData || []);
    } catch (err) {
      console.error('Error fetching past apps:', err);
      alert('Failed to load past applications.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCycleCSV = async (cycle) => {
    try {
      const { data: appsData, error: appsError } = await supabase
        .from('applications')
        .select(`
          application_id, status, hr_score, final_score,
          current_rank_at_time,
          qual_experience, qual_degree, qual_teaching, qual_research, qual_eligibility,
          faculty:faculty_id ( user_id, name_last, name_first, name_middle, department_id, current_rank, nature_of_appointment, departments ( department_name, department_code ) )
        `)
        .eq('cycle_id', cycle.cycle_id)
        .in('status', ['HR_Completed', 'VPAA_Completed', 'For_Publishing', 'Published']);
      
      if (appsError) throw appsError;

      // Get application IDs
      const appIds = (appsData || []).map(a => a.application_id ?? a.id).filter(Boolean);

      // Fetch area submissions for these applications to compute area points
      const { data: submissions = [], error: subsError } = await supabase
        .from('area_submissions')
        .select(`application_id, area_id, hr_points, areas ( area_id, area_name, max_possible_points )`)
        .in('application_id', appIds);
      if (subsError) throw subsError;

      // Organize submissions by application -> area
      const subsByApp = new Map();
      submissions.forEach(s => {
        const aid = s.application_id;
        if (!subsByApp.has(aid)) subsByApp.set(aid, {});
        subsByApp.get(aid)[Number(s.area_id)] = s;
      });

      // Prepare rubric area ordering (Area I..X)
      const rubricAreas = (RANKING_RUBRICS || []).slice().sort((a, b) => Number(a.areaId) - Number(b.areaId)).filter(a => Number(a.areaId) <= 10);

      // Build rows: strict sample layout
      const rows = [];

      const semesterText = getExportSemesterLabel(cycle);
      const academicYear = getAcademicYearLabel(cycle) || '';
      const periodLabel = [academicYear ? `A.Y ${academicYear}` : '', semesterText].filter(Boolean).join(', ') || (cycle?.title || '');

      rows.push(['GORDON COLLEGE']);
      rows.push(['OVERAL SCORING FOR FACULTY PLANTILLA APPLICANTS']);
      rows.push([periodLabel]);

      const headerRow1 = [
        'Rank',
        'Faculty Applicants',
        'Present Rank/Position',
        'Nature of Appointment',
      ];
      const headerRow2 = ['', '', '', ''];
      const headerRow3 = ['', '', '', ''];

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

      // Compute totals per application and sort by total desc
      const appsWithTotals = (appsData || []).map((app) => {
        const aid = app.application_id ?? app.id;
        const subs = subsByApp.get(aid) || {};
        const areaPoints = rubricAreas.map((area) => {
          const sub = subs[Number(area.areaId)];
          return Number(sub?.hr_points ?? 0);
        });
        const computedTotal = areaPoints.reduce((sum, value) => sum + Number(value || 0), 0);
        const total = Number(app.hr_score ?? computedTotal);
        return { app, areaPoints, total };
      }).sort((a, b) => b.total - a.total);

      // Assign ranks
      let currentRank = 0;
      let lastScore = null;
      appsWithTotals.forEach((entry, idx) => {
        const score = entry.total;
        if (lastScore === null || score !== lastScore) {
          currentRank = idx + 1;
          lastScore = score;
        }
        entry.rank = currentRank;
      });

      // Build table rows: single row per faculty (area points already include excess)
      appsWithTotals.forEach(({ app, areaPoints, total, rank }) => {
        const name = `${app.faculty?.name_last || ''}, ${app.faculty?.name_first || ''}${app.faculty?.name_middle ? ` ${app.faculty?.name_middle}` : ''}`
          .replace(/\s+/g, ' ')
          .trim();

        const row = [
          rank,
          name,
          app.current_rank_at_time || app.faculty?.current_rank || '',
          app.faculty?.nature_of_appointment || '',
          ...areaPoints,
          total,
          app.qual_experience || '',
          app.qual_degree || '',
          app.qual_teaching || '',
          app.qual_research || '',
          app.qual_eligibility || '',
        ];

        rows.push(row);
      });

      while (rows.length < 21) {
        rows.push([]);
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'GCFARES';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Overall Scoring', {
        views: [{ showGridLines: true }],
      });

      const totalCols = headerRow1.length;
      const borderStyle = {
        top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
        left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
        bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
        right: { style: 'thin', color: { argb: 'FFBFBFBF' } },
      };

      const centerAlignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      const leftAlignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

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

      worksheet.mergeCells('A1:T1');
      worksheet.mergeCells('A2:T2');
      worksheet.mergeCells('A3:T3');

      for (let c = 1; c <= 4; c++) {
        worksheet.mergeCells(4, c, 6, c);
      }

      for (let c = 15; c <= 20; c++) {
        worksheet.mergeCells(4, c, 6, c);
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

      // Make area names wrap visibly in the third header row.
      const areaHeaderRow = worksheet.getRow(6);
      areaHeaderRow.height = 124.8;
      for (let c = 5; c <= 14; c++) {
        const cell = areaHeaderRow.getCell(c);
        cell.alignment = centerAlignment;
        cell.border = borderStyle;
        cell.font = { ...(cell.font || {}), bold: true };
        cell.value = String(cell.value || '').replace(/\s+/g, '\n');
      }

      // Reinforce left alignment for faculty names only.
      for (let r = 7; r <= worksheet.rowCount; r++) {
        const nameCell = worksheet.getRow(r).getCell(2);
        nameCell.alignment = leftAlignment;
      }

      // Apply borders and alignment across the full used range, including merged cells and blanks.
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
      link.setAttribute('download', `${cycle.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_overall_scoring.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      alert('Failed to export CSV: ' + err.message);
    }
  };

  const handleExportSingleFacultyPDF = async (app) => {
    try {
      const applicationId = app.application_id ?? app.id;

      const { data: applicationData, error: appError } = await supabase
        .from('applications')
        .select('*')
        .eq('application_id', applicationId)
        .single();

      if (appError) throw appError;

      const { data: areasData, error: areasError } = await supabase
        .from('areas')
        .select('*')
        .order('area_id');

      if (areasError) throw areasError;

      const { data: submissionsData, error: subError } = await supabase
        .from('area_submissions')
        .select('*')
        .eq('application_id', applicationId);

      if (subError) throw subError;

      let facultyData = {};
      if (applicationData?.faculty_id) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', applicationData.faculty_id)
          .single();
        if (!userError && userData) {
          facultyData = userData;
        }
      }

      const mergedAreas = (areasData || []).map((area) => {
        const dbId = Number(area.area_id);
        const rubricAreaId = DB_AREA_ID_TO_RUBRIC_AREA_ID[dbId] || dbId;
        const rubricArea = RANKING_RUBRICS.find((r) => Number(r.areaId) === Number(rubricAreaId));
        const areaSubmissions = (submissionsData || []).filter((submission) => Number(submission.area_id) === dbId);

        let areaCurrentPoints = 0;
        areaSubmissions.forEach((submission) => {
          const points = Number(submission.vpaa_points ?? submission.hr_points ?? submission.csv_total_average_rate ?? 0) || 0;
          areaCurrentPoints += points;
        });

        return {
          id: String(dbId),
          title: area.area_name || rubricArea?.areaName || `Area ${dbId}`,
          max: Number(rubricArea?.maxPoints ?? area.max_possible_points ?? 0),
          current: areaCurrentPoints,
          rubricAreaId,
        };
      });

      const areasForPdf = mergedAreas
        .filter((area) => Number(area.rubricAreaId) >= 1 && Number(area.rubricAreaId) <= 10)
        .sort((a, b) => Number(a.rubricAreaId) - Number(b.rubricAreaId));

      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 35;
      const contentWidth = pageWidth - margin * 2;
      const tableLeft = margin;
      let y = 28;

      // Logo removed from PDF output.

      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(18);
      pdf.text('GORDON COLLEGE', pageWidth / 2, y, { align: 'center' });
      y += 24;

      const periodLabel = currentCycle?.semester && currentCycle?.year
        ? `${String(currentCycle.semester).toUpperCase()} • AY ${currentCycle.year}`
        : '1ST SEMESTER • AY 2026-2027';

      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(10);
      pdf.text(periodLabel, pageWidth / 2, y, { align: 'center' });
      y += 16;

      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(12);
      pdf.text('FACULTY EVALUATION REPORT', pageWidth / 2, y, { align: 'center' });
      y += 20;

      pdf.setDrawColor(120);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 16;

      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(11);
      pdf.text('APPLICANT INFORMATION', margin, y);
      y += 14;

      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(10);
      const nameValue = `${facultyData?.name_last || ''}, ${facultyData?.name_first || ''}`.trim() || 'N/A';
      const positionValue = applicationData?.current_rank_at_time || facultyData?.current_rank || 'N/A';
      const natureValue = facultyData?.nature_of_appointment || 'N/A';

      pdf.text(`Name: ${nameValue}`, margin + 12, y);
      y += 12;
      pdf.text(`Position: ${positionValue}`, margin + 12, y);
      y += 12;
      pdf.text(`Nature of Appointment: ${natureValue}`, margin + 12, y);
      y += 22;

      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(11);
      pdf.text('EVALUATION SCORES BY AREA', margin, y);
      y += 18;

      const tableWidth = contentWidth;
      const colAreaWidth = tableWidth * 0.55;
      const colScoreWidth = tableWidth * 0.15;
      const colMaxWidth = tableWidth * 0.15;
      const colExcessWidth = tableWidth * 0.15;
      const cellPadding = 5;
      const rowHeight = 20;

      pdf.setDrawColor(80);
      pdf.setLineWidth(1);
      pdf.rect(tableLeft, y, tableWidth, rowHeight);

      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(10);
      const headerVerticalCenter = y + rowHeight / 2 + 1.5;
      pdf.text('Area', tableLeft + cellPadding, headerVerticalCenter, { align: 'left' });
      pdf.text('Score', tableLeft + colAreaWidth + colScoreWidth / 2, headerVerticalCenter, { align: 'center' });
      pdf.text('Max', tableLeft + colAreaWidth + colScoreWidth + colMaxWidth / 2, headerVerticalCenter, { align: 'center' });
      pdf.text('Excess', tableLeft + colAreaWidth + colScoreWidth + colMaxWidth + colExcessWidth / 2, headerVerticalCenter, { align: 'center' });

      pdf.setLineWidth(0.5);
      pdf.line(tableLeft + colAreaWidth, y, tableLeft + colAreaWidth, y + rowHeight);
      pdf.line(tableLeft + colAreaWidth + colScoreWidth, y, tableLeft + colAreaWidth + colScoreWidth, y + rowHeight);
      pdf.line(tableLeft + colAreaWidth + colScoreWidth + colMaxWidth, y, tableLeft + colAreaWidth + colScoreWidth + colMaxWidth, y + rowHeight);

      y += rowHeight;

      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(9.5);

      areasForPdf.forEach((area) => {
        const areaTitle = area.title || 'Area';
        const score = Number(area.current || 0);
        const max = Number(area.max || 0);
        const excess = Math.max(0, score - max);

        const titleLines = pdf.splitTextToSize(areaTitle, colAreaWidth - 2 * cellPadding);
        const actualRowHeight = Math.max(rowHeight, titleLines.length * 10 + 6);

        pdf.setDrawColor(150);
        pdf.setLineWidth(0.5);
        pdf.rect(tableLeft, y, tableWidth, actualRowHeight);
        pdf.line(tableLeft + colAreaWidth, y, tableLeft + colAreaWidth, y + actualRowHeight);
        pdf.line(tableLeft + colAreaWidth + colScoreWidth, y, tableLeft + colAreaWidth + colScoreWidth, y + actualRowHeight);
        pdf.line(tableLeft + colAreaWidth + colScoreWidth + colMaxWidth, y, tableLeft + colAreaWidth + colScoreWidth + colMaxWidth, y + actualRowHeight);

        const cellVerticalCenter = y + actualRowHeight / 2 + 1.5;

        pdf.text(titleLines, tableLeft + cellPadding, cellVerticalCenter - (titleLines.length - 1) * 4.5, { align: 'left' });
        pdf.text(score.toFixed(2), tableLeft + colAreaWidth + colScoreWidth / 2, cellVerticalCenter, { align: 'center' });
        pdf.text(max.toFixed(2), tableLeft + colAreaWidth + colScoreWidth + colMaxWidth / 2, cellVerticalCenter, { align: 'center' });
        pdf.text(excess > 0 ? `+${excess.toFixed(2)}` : '—', tableLeft + colAreaWidth + colScoreWidth + colMaxWidth + colExcessWidth / 2, cellVerticalCenter, { align: 'center' });

        y += actualRowHeight;
      });

      pdf.setDrawColor(80);
      pdf.setLineWidth(1.5);
      pdf.rect(tableLeft, y, tableWidth, rowHeight);

      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(10.5);
      const totalScore = areasForPdf.reduce((sum, area) => sum + Number(area.current || 0), 0);
      const totalVerticalCenter = y + rowHeight / 2 + 1.5;
      pdf.text('TOTAL POINTS', tableLeft + cellPadding, totalVerticalCenter, { align: 'left' });
      pdf.text(totalScore.toFixed(2), tableLeft + colAreaWidth + colScoreWidth / 2, totalVerticalCenter, { align: 'center' });

      y += rowHeight + 20;

      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(11);
      pdf.text('QUALIFICATION SUMMARY', margin, y);
      y += 18;

      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(10);
      const quals = [
        { label: 'Experience', value: applicationData?.qual_experience },
        { label: 'Degree', value: applicationData?.qual_degree },
        { label: 'Teaching Performance', value: applicationData?.qual_teaching },
        { label: 'Research Output', value: applicationData?.qual_research },
        { label: 'Eligibility', value: applicationData?.qual_eligibility },
      ];

      quals.forEach((q) => {
        const labelWidth = 130;
        pdf.setFont(undefined, 'bold');
        pdf.text(`${q.label}:`, margin + 12, y);
        pdf.setFont(undefined, 'normal');
        const valueLines = pdf.splitTextToSize(q.value || 'N/A', contentWidth - labelWidth - 30);
        pdf.text(valueLines, margin + 12 + labelWidth, y);
        y += Math.max(13, valueLines.length * 13) + 8;
      });

      y += 12;
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(100);
      pdf.text('This report is officially issued and contains the evaluation scores for the faculty applicant.', pageWidth / 2, pageHeight - 14, { align: 'center' });
      pdf.setTextColor(0);

      const fileName = `${nameValue.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_Evaluation.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Failed to export PDF: ' + err.message);
    }
  };

  const fetchData = async ({ showLoader = true } = {}) => {
    if (showLoader) {
      setLoading(true);
    }
    try {
      console.log('ðŸ”„ Starting data fetch (Supabase)...');

      // Fetch all cycles
      const { data: allCycles, error: cyclesError } = await supabase
        .from('ranking_cycles')
        .select('*');
      if (cyclesError) throw cyclesError;
      console.log('All cycles found:', allCycles);

      const sortedCycles = (allCycles || [])
        .slice()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Find the active cycle by priority: open first, then submissions_closed.
      const openCycle = sortedCycles.find((c) => String(c.status).trim() === 'open')
        || sortedCycles.find((c) => String(c.status).trim() === 'submissions_closed')
        || null;

      setCurrentCycle(openCycle);

      // History: all cycles except the currently selected active cycle.
      const history = sortedCycles.filter((c) => c.cycle_id !== openCycle?.cycle_id);
      setCycleHistory(history);

      // Faculty stats
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, role');
      if (usersError) throw usersError;

      const normalized = (role) => String(role || '').trim().toLowerCase();
      const facultyUsersCount = (usersData || []).filter((user) => {
        const role = normalized(user.role);
        return role === 'faculty' || role.includes('faculty');
      }).length;

      const normalizeStatus = (value) => String(value || '').trim();
      const isPendingReviewStatus = (status) => ['Draft', 'Submitted', 'Under_HR_Review'].includes(normalizeStatus(status));
      const isCompletedReviewStatus = (status) => ['HR_Completed', 'VPAA_Completed', 'Under_VPAA_Review', 'For_Publishing', 'Published'].includes(normalizeStatus(status));

      // Applications for current cycle
      let pendingCount = 0;
      let completedCount = 0;
      if (openCycle) {
        if (openCycle.cycle_id !== undefined && openCycle.cycle_id !== null) {
          const { data: applicationsData, error: appsError } = await supabase
            .from('applications')
            .select(`
              *,
              faculty:faculty_id (
                user_id,
                name_last,
                name_first,
                name_middle
              )
            `)
            .eq('cycle_id', openCycle.cycle_id);
          if (appsError) throw appsError;
          setApplications(applicationsData || []);
          (applicationsData || []).forEach((app) => {
            const status = normalizeStatus(app.status);
            if (isPendingReviewStatus(status)) {
              pendingCount++;
            } else if (isCompletedReviewStatus(status)) {
              completedCount++;
            }
          });
        }
      } else {
        setApplications([]);
      }

      // Calculate stats
      const deadline = openCycle?.deadline ?
        new Date(openCycle.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
        'Not set';

      let totalFaculty = facultyUsersCount;

      // Fallback: derive faculty count from unique faculty_id in applications when role labels are inconsistent.
      if (totalFaculty === 0) {
        const { data: applicationFacultyRows, error: applicationFacultyError } = await supabase
          .from('applications')
          .select('faculty_id');
        if (!applicationFacultyError && applicationFacultyRows) {
          totalFaculty = new Set(applicationFacultyRows.map((row) => row.faculty_id)).size;
        }
      }

      setStats({
        totalFaculty,
        pendingReviews: pendingCount,
        completed: completedCount,
        deadline
      });

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setCurrentCycle(null);
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();

    const dashboardChannel = supabase
      .channel('dashboard-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchData({ showLoader: false });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
        fetchData({ showLoader: false });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ranking_cycles' }, () => {
        fetchData({ showLoader: false });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(dashboardChannel);
    };
  }, []);

  useEffect(() => {
    if (!selectedPastCycle?.cycle_id) return undefined;

    const refreshPastCycle = () => {
      void handleReviewCycle(selectedPastCycle.cycle_id);
    };

    const pastCycleChannel = supabase
      .channel(`dashboard-past-cycle-${selectedPastCycle.cycle_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications', filter: `cycle_id=eq.${selectedPastCycle.cycle_id}` }, refreshPastCycle)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ranking_cycles', filter: `cycle_id=eq.${selectedPastCycle.cycle_id}` }, refreshPastCycle)
      .subscribe();

    return () => {
      supabase.removeChannel(pastCycleChannel);
    };
  }, [selectedPastCycle?.cycle_id]);

  const handleCycleSaved = () => {
    setModalOpen(false);
    setModalCycle(null);
    setFocusDeadlineFields(false);
    setHistoryPage(1);
    // Always refresh dashboard after saving a cycle
    fetchData({ showLoader: false });
  };

  const resetActionModal = () => {
    setActionModal({
      open: false,
      action: null,
      title: '',
      message: '',
      confirmLabel: 'Confirm',
      confirmTone: 'danger',
    });
  };

  const totalHistoryPages = Math.max(1, Math.ceil(cycleHistory.length / historyPageSize));
  const safeHistoryPage = Math.min(historyPage, totalHistoryPages);
  const historyStartIndex = (safeHistoryPage - 1) * historyPageSize;
  const visibleHistory = cycleHistory.slice(historyStartIndex, historyStartIndex + historyPageSize);

  useEffect(() => {
    if (historyPage > totalHistoryPages) {
      setHistoryPage(totalHistoryPages);
    }
  }, [historyPage, totalHistoryPages]);

  const handleCycleAction = async (action) => {
    if (!currentCycle) return;
    try {
      if (action === 'reopen') {
        const deadlineValue = currentCycle.deadline?.toDate ? currentCycle.deadline.toDate() : new Date(currentCycle.deadline);
        const hasDeadline = deadlineValue instanceof Date && !Number.isNaN(deadlineValue.getTime());
        const isDeadlineReached = hasDeadline && new Date() >= deadlineValue;

        setModalCycle({
          ...currentCycle,
          status: 'open',
        });
        setFocusDeadlineFields(isDeadlineReached);
        setModalOpen(true);
        return;
      }

      if (action === 'lock-profile' || action === 'unlock-profile') {
        setActionModal({
          open: true,
          action,
          title: action === 'unlock-profile' ? 'Unlock Faculty Profile Editing?' : 'Lock Faculty Profile Editing?',
          message: action === 'unlock-profile'
            ? 'Faculty will be able to edit their profile again, provided the current period window is still active.'
            : 'Faculty profile editing will be disabled until you unlock it again.',
          confirmLabel: action === 'unlock-profile' ? 'Unlock Profile' : 'Lock Profile',
          confirmTone: action === 'unlock-profile' ? 'primary' : 'danger',
        });
        return;
      }

      if (action === 'close') {
        setActionModal({
          open: true,
          action,
          title: 'Close Submissions?',
          message: 'This will stop faculty from submitting new files for the current period. It does not finish or publish the evaluation.',
          confirmLabel: 'Close Submissions',
          confirmTone: 'primary',
        });
        return;
      }

      if (action === 'finish') {
        setActionModal({
          open: true,
          action,
          title: 'Finish Evaluation?',
          message: 'This will finalize the evaluation workflow and lock faculty profile editing. Use this only when the evaluation is truly complete.',
          confirmLabel: 'Finish Evaluation',
          confirmTone: 'danger',
        });
        return;
      }

      if (action !== 'open' && action !== 'reopen') {
        alert('Invalid action. Allowed: open, close, lock-profile, unlock-profile, finish, reopen');
        return;
      }

      // 'open' and 'reopen' both set status to 'open' and enable profile editing
      console.log(`ðŸ”„ Updating cycle ${currentCycle.cycle_id} status to: open`);
      const { error } = await supabase
        .from('ranking_cycles')
        .update({
          status: 'open',
          profile_edit_open: true,
        })
        .eq('cycle_id', currentCycle.cycle_id);
      if (error) throw error;
      console.log('âœ… Cycle reopened successfully');
      fetchData({ showLoader: false }); // Refresh data silently
    } catch (err) {
      console.error('âŒ Error updating cycle status:', err);
      alert('Failed to update cycle status: ' + err.message);
    }
  };

  const confirmCycleAction = async () => {
    if (!currentCycle || !actionModal.action) return;

    try {
      if (actionModal.action === 'lock-profile' || actionModal.action === 'unlock-profile') {
        const nextProfileEditOpen = actionModal.action === 'unlock-profile';
        const { error } = await supabase
          .from('ranking_cycles')
          .update({ profile_edit_open: nextProfileEditOpen })
          .eq('cycle_id', currentCycle.cycle_id);
        if (error) throw error;
        console.log(`âœ… Profile access ${nextProfileEditOpen ? 'unlocked' : 'locked'} successfully`);
      }

      if (actionModal.action === 'finish') {
        const { error } = await supabase
          .from('ranking_cycles')
          .update({
            status: 'finished',
            profile_edit_open: false,
          })
          .eq('cycle_id', currentCycle.cycle_id);
        if (error) throw error;

        // When evaluation finishes, reset all for-ranking users to inactive
        const { error: resetError } = await supabase
          .from('users')
          .update({ status: 'inactive' })
          .eq('status', 'ranking');
        if (resetError) throw resetError;

        // Mark participants in this cycle as removed once evaluation is finished
        const { error: participantsError } = await supabase
          .from('cycle_participants')
          .update({ status: 'removed' })
          .eq('cycle_id', currentCycle.cycle_id)
          .in('status', ['invited', 'accepted']);
        if (participantsError) throw participantsError;

        console.log('âœ… Evaluation finalized successfully');
      }

      if (actionModal.action === 'close') {
        const { error } = await supabase
          .from('ranking_cycles')
          .update({
            status: 'submissions_closed',
          })
          .eq('cycle_id', currentCycle.cycle_id);
        if (error) throw error;
        console.log('âœ… Submissions closed successfully');
      }

      resetActionModal();
      fetchData({ showLoader: false });
    } catch (err) {
      console.error('âŒ Error updating cycle status:', err);
      alert('Failed to update cycle status: ' + err.message);
    }
  };

  const statCards = [
    {
      iconClass: 'blue', label: 'Total Faculty', value: String(stats.totalFaculty ?? 0),
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    },
    {
      iconClass: 'amber', label: 'Pending Reviews', value: stats.pendingReviews.toString(),
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    },
    {
      iconClass: 'green', label: 'Completed', value: stats.completed.toString(),
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
    },
    {
      iconClass: 'red', label: 'Deadline', value: stats.deadline,
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    },
  ];

  const filteredPastApplications = pastApplications.filter(app => {
    const matchesSearch = pastSearchTerm === '' ||
      `${app.faculty?.name_last} ${app.faculty?.name_first}`.toLowerCase().includes(pastSearchTerm.toLowerCase());
    
    const deptCode = app.faculty?.departments?.department_code || '';
    const deptName = app.faculty?.departments?.department_name || app.faculty?.department_id || '';
    const matchesDept = pastDepartmentFilter === 'all' || 
      String(deptCode || deptName).toLowerCase() === pastDepartmentFilter.toLowerCase();

    return matchesSearch && matchesDept;
  });
  // Sort by HR score descending (match the displayed Total Points column)
  filteredPastApplications.sort((a, b) => {
    const aPoints = Number(a.hr_score ?? 0);
    const bPoints = Number(b.hr_score ?? 0);
    return bPoints - aPoints;
  });

  const totalPastPages = Math.max(1, Math.ceil(filteredPastApplications.length / PAST_PAGE_SIZE));
  const safePastPage = Math.min(pastPage, totalPastPages);
  const pastStartIndex = (safePastPage - 1) * PAST_PAGE_SIZE;
  const paginatedPastApplications = filteredPastApplications.slice(pastStartIndex, pastStartIndex + PAST_PAGE_SIZE);

  useEffect(() => {
    if (pastPage > totalPastPages) {
      setPastPage(totalPastPages);
    }
  }, [pastPage, totalPastPages]);

  useEffect(() => {
    setPastPage(1);
  }, [pastSearchTerm, pastDepartmentFilter, selectedPastCycle]);

  if (loading) {
    return (
      <div className="app">
        <Sidebar />
        <div className="main">
          <div className="content">
            <div className="page-title">Dashboard Overview</div>
            <Loader message="Loading dashboard data..." />
          </div>
        </div>
      </div>
    );
  }

  if (selectedPastCycle) {
    return (
      <div className="app">
        <Sidebar />
        <div className="main">
          <div className="content">
            <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button className="btn btn-outline-primary" style={{ padding: '6px 12px' }} onClick={() => { setSelectedPastFaculty(null); setSelectedPastCycle(null); }}>← Back</button>
              Ranking Period: {selectedPastCycle.title}
            </div>
            
            <div className="toolbar" style={{ marginTop: '20px' }}>
              <div className="toolbar-left">
                <span className="toolbar-label">Completed Applications ({filteredPastApplications.length})</span>
                <div className="search-wrap" style={{ marginLeft: '20px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input
                    type="text"
                    placeholder="Search faculty name"
                    value={pastSearchTerm}
                    onChange={(e) => setPastSearchTerm(e.target.value)}
                  />
                </div>
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '13px', marginLeft: '12px', marginRight: '12px' }} onClick={() => handleExportCycleCSV(selectedPastCycle)}>
                  Export CSV
                </button>
                <div className="filter-wrap">
                  <select value={pastDepartmentFilter} onChange={(e) => setPastDepartmentFilter(e.target.value)}>
                    <option value="all">All Departments</option>
                    <option value="CCS">CCS</option>
                    <option value="CEAS">CEAS</option>
                    <option value="CBA">CBA</option>
                    <option value="BSA">BSA</option>
                  </select>
                </div>
              </div>
            </div>

            {filteredPastApplications.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#666', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', marginTop: '16px' }}>
                <div style={{ fontSize: '16px', marginBottom: '8px' }}>No completed applications found for this cycle.</div>
              </div>
            ) : (
              <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden', marginTop: '16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', fontSize: '13px' }}>No.</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', fontSize: '13px' }}>Name</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', fontSize: '13px' }}>Department</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', fontSize: '13px' }}>Current Rank</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', fontSize: '13px' }}>Total Points</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', fontSize: '13px' }}>Status</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', fontSize: '13px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPastApplications.map((app, index) => (
                      <tr key={app.application_id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#4b5563' }}>{pastStartIndex + index + 1}</td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', fontWeight: '500' }}>{app.faculty?.name_last}, {app.faculty?.name_first}</td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#4b5563' }}>{app.faculty?.departments?.department_code || app.faculty?.departments?.department_name || app.faculty?.department_id || 'N/A'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#4b5563' }}>{app.faculty?.current_rank || 'N/A'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', fontWeight: '500' }}>{Number(app.hr_score ?? 0).toFixed(2)}</td>
                        <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                          <span className="badge badge-reviewed" style={{ display: 'inline-block' }}>{app.status.replace(/_/g, ' ')}</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right' }}>
                          <button className="review-btn" onClick={() => setSelectedPastFaculty(app)} title="View History Details">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredPastApplications.length > PAST_PAGE_SIZE && (
                  <div className="history-pagination" style={{ justifyContent: 'space-between', marginTop: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      Showing {filteredPastApplications.length === 0 ? 0 : pastStartIndex + 1}-{Math.min(pastStartIndex + PAST_PAGE_SIZE, filteredPastApplications.length)} of {filteredPastApplications.length}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        className="history-page-btn"
                        onClick={() => setPastPage((page) => Math.max(1, page - 1))}
                        disabled={safePastPage <= 1}
                      >
                        Previous
                      </button>
                      <span className="history-page-info">Page {safePastPage} of {totalPastPages}</span>
                      <button
                        type="button"
                        className="history-page-btn"
                        onClick={() => setPastPage((page) => Math.min(totalPastPages, page + 1))}
                        disabled={safePastPage >= totalPastPages}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <HistoryFacultyModal
              open={Boolean(selectedPastFaculty)}
              cycle={selectedPastCycle}
              app={selectedPastFaculty}
              onClose={() => setSelectedPastFaculty(null)}
              onDownloadResult={handleExportSingleFacultyPDF}
            />
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
          <div className="page-title">Dashboard Overview</div>

          <CycleCard 
            cycle={currentCycle} 
            onEdit={() => {
              setModalCycle(currentCycle);
              setFocusDeadlineFields(false);
              setModalOpen(true);
            }} 
            onCycleAction={handleCycleAction}
          />

          <div className="stats-grid">
            {statCards.map((s) => <StatCard key={s.label} {...s} />)}
          </div>

          <div style={{ marginTop: '20px' }}>
            <AreaIVImportPanel currentCycle={currentCycle} applications={applications} showUploader={true} />
          </div>

          <div className="history-card">
            <div className="history-header">
              <div>
                <h3>Ranking Period History</h3>
                <p>All previous evaluation periods</p>
              </div>
              <span className="history-count">{cycleHistory.length} Periods</span>
            </div>
            <div className="history-grid">
              {cycleHistory.length === 0 ? (
                <p style={{ padding: '24px', color: '#6b7280', textAlign: 'center' }}>
                  No previous periods found.
                </p>
              ) : (
                visibleHistory.map((cycle) => <HistoryItem key={cycle.cycle_id} cycle={cycle} onReview={handleReviewCycle} onExport={handleExportCycleCSV} />)
              )}
            </div>
            {cycleHistory.length > historyPageSize && (
              <div className="history-pagination">
                <button
                  className="history-page-btn"
                  onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                  disabled={safeHistoryPage === 1}
                >
                  Previous
                </button>
                <div className="history-page-info">
                  Page {safeHistoryPage} of {totalHistoryPages}
                </div>
                <button
                  className="history-page-btn"
                  onClick={() => setHistoryPage((page) => Math.min(totalHistoryPages, page + 1))}
                  disabled={safeHistoryPage === totalHistoryPages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {modalOpen && (
        <CycleTimelineModal 
          cycle={modalCycle || currentCycle} 
          onClose={() => {
            setModalOpen(false);
            setModalCycle(null);
            setFocusDeadlineFields(false);
          }} 
          onSaved={handleCycleSaved}
          focusDeadline={focusDeadlineFields}
        />
      )}

      <ActionConfirmModal
        open={actionModal.open}
        title={actionModal.title}
        message={actionModal.message}
        confirmLabel={actionModal.confirmLabel}
        confirmTone={actionModal.confirmTone}
        onCancel={resetActionModal}
        onConfirm={confirmCycleAction}
      />
    </div>
  );
}
