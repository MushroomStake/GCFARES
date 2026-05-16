import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import Sidebar from '../components/sidenav';
import { RANKING_RUBRICS } from '../data/rankingRubrics';
import './perfeval.css';
import '../styles/layout.css';

/* ── Icons ───────────────────────────────── */
const Icons = {
  User: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Briefcase: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  ),
  Star: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  GraduationCap: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  ),
  FileText: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      width="10" height="10">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Calendar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      width="12" height="12">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  ChevronLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      width="14" height="14">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      width="14" height="14">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
};

/* ── Data ────────────────────────────────── */
const faculty = {
  name:        'Jenkins, Sarah A.',
  instructor:  'Instructor II',
  department:  'CCS',
  presentRank: 'Instructor II',
  nature:      'Permanent',
  salary:      '₱45,000.00',
  teachingExp: '8 years',
  industryExp: '3 years',
  rating:      '4.8',
  ratingDesc:  'Very Satisfactory',
  education: [
    { degree: "Bachelor's in Computer Science", school: 'State University' },
    { degree: "Master's in Computer Science",   school: 'Tech Institute'   },
  ],
  eligibility:    'Civil Service Professional',
  applyingFor:    'Instructor II',
  lastPromotion:  '05 12, 21',
};

const areaResults = [
  { label: 'Area I',    status: 'Passed' },
  { label: 'Area II',   status: 'Passed' },
  { label: 'Area III',  status: 'Passed' },
  { label: 'Area IV',   status: 'Passed' },
  { label: 'Area V',    status: 'Passed' },
  { label: 'Area VI',   status: 'Passed' },
  { label: 'Area VII',  status: 'Passed' },
  { label: 'Area VIII', status: 'Passed' },
  { label: 'Area XI',   status: 'Passed' },
  { label: 'Area X',    status: 'Passed' },
];

const recommendations = [
  { label: 'Qualified for Professor I',   ok: true  },
  { label: 'Qualified for Professor II',  ok: true  },
  { label: 'Qualified for Professor III', ok: true  },
  { label: 'Qualified for Professor IV',  ok: false },
  { label: 'Not Qualified for',           ok: false },
];

const criteriaData = [
  { label: 'A. Associate Courses/Program (2 years)',      max: 25.00, score: 25.99 },
  { label: "B. Bachelor's Degree (4 years to 5 years)",   max: 45.00, score: 0     },
  { label: "C. Diploma course (Above Bachelor's Degree)", max: 45.00, score: 29.99 },
  { label: "D. Master's Program",                         max: null,  score: null  },
  { label: 'D.1 MA/MS Units (6-12 units)',                max: 47.00, score: 0     },
];

/* ══════════════════════════════════════════
   FACULTY INFORMATION CARD
   ══════════════════════════════════════════ */
function FacultyInfoCard({ faculty = faculty }) {
  return (
    <div className="pe-card">
      <div className="pe-card-header">
        <Icons.User />
        <span className="pe-card-title">Faculty Information</span>
      </div>

      <div className="pe-faculty-grid">
        {/* Personal Details */}
        <div className="pe-info-col">
          <div className="pe-col-label"><Icons.User /> Personal Details</div>
          <div className="pe-field">
            <div className="pe-field-label">Name</div>
            <div className="pe-field-value green">{faculty.name}</div>
          </div>
          <div className="pe-field">
            <div className="pe-field-label">Instructor</div>
            <div className="pe-field-value">{faculty.instructor}</div>
          </div>
          <div className="pe-field">
            <div className="pe-field-label">Department</div>
            <div className="pe-field-value">{faculty.department}</div>
          </div>
        </div>

        {/* Employment Status */}
        <div className="pe-info-col">
          <div className="pe-col-label"><Icons.Briefcase /> Employment Status</div>
          <div className="pe-field">
            <div className="pe-field-label">Present Rank</div>
            <div className="pe-field-value">{faculty.presentRank}</div>
          </div>
          <div className="pe-field">
            <div className="pe-field-label">Nature of Appointment</div>
            <div className="pe-field-value">{faculty.nature}</div>
          </div>
          <div className="pe-field">
            <div className="pe-field-label">Current Salary</div>
            <div className="pe-field-value salary">{faculty.salary}</div>
          </div>
        </div>

        {/* Experience & Rating */}
        <div className="pe-info-col">
          <div className="pe-col-label"><Icons.Star /> Experience &amp; Rating</div>
          <div className="pe-field">
            <div className="pe-field-label">Teaching Exp.</div>
            <div className="pe-field-value">{faculty.teachingExp}</div>
          </div>
          <div className="pe-field">
            <div className="pe-field-label">Industry Exp.</div>
            <div className="pe-field-value">{faculty.industryExp}</div>
          </div>
          <div className="pe-field">
            <div className="pe-field-label">Performance Rating</div>
            <div className="pe-field-value">
              <span className="pe-rating-badge">{faculty.rating} — {faculty.ratingDesc}</span>
            </div>
          </div>
        </div>

        {/* Educational Attainment */}
        <div className="pe-info-col">
          <div className="pe-col-label"><Icons.GraduationCap /> Educational Attainment</div>
          {faculty.education && faculty.education.map((ed, i) => (
            <div className="pe-edu-box" key={i}>
              <div className="pe-edu-degree">{ed.degree}</div>
              <div className="pe-edu-school">{ed.school}</div>
            </div>
          ))}
          <div className="pe-field">
            <div className="pe-field-label">Eligibility &amp; Exams</div>
            <div className="pe-field-value">{faculty.eligibility}</div>
          </div>
        </div>

        {/* Application Details */}
        <div className="pe-info-col">
          <div className="pe-col-label"><Icons.FileText /> Application Details</div>
          <div className="pe-field">
            <div className="pe-field-label">Applying For</div>
            <div className="pe-field-value green">{faculty.applyingFor}</div>
          </div>
          <div className="pe-field">
            <div className="pe-field-label">Last Promotion</div>
            <div className="pe-field-value">{faculty.lastPromotion}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   AREA SUMMARY CARD
   ══════════════════════════════════════════ */
function AreaSummaryCard({ filter, onChange }) {
  const visible = filter
    ? areaResults.filter(a => a.label.toLowerCase().includes(filter.toLowerCase()))
    : areaResults;

  return (
    <div className="pe-card">
      <div className="pe-card-header">
        <span className="pe-card-title">Summary Evaluation of Submitted Area</span>
      </div>

      <div className="pe-area-inner">
        {/* Left: filter input */}
        <div className="pe-area-filter-col">
          <input
            className="pe-filter-input"
            type="text"
            placeholder="Area I-X"
            value={filter}
            onChange={e => onChange(e.target.value)}
          />
        </div>

        {/* Right: 3-column area results grid */}
        <div className="pe-area-results-col">
          {visible.map(area => (
            <div key={area.label} className="pe-area-item">
              <span className="pe-area-name">{area.label}</span>
              <span className={`pe-status-badge ${area.status === 'Passed' ? 'passed' : 'failed'}`}>
                {area.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   FINAL RECOMMENDATION CARD
   ══════════════════════════════════════════ */
function RecommendationCard() {
  return (
    <div className="pe-card pe-rec-card">
      <div className="pe-rec-title">Final Recommendation</div>
      {recommendations.map((r, i) => (
        <div
          key={i}
          className={`pe-rec-item${r.ok ? ' qualified' : ' unqualified'}`}
        >
          <span className={`pe-rec-check${r.ok ? '' : ' empty'}`}>
            {r.ok && <Icons.Check />}
          </span>
          {r.label}
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════
   EVALUATOR + APPROVAL CARD
   ══════════════════════════════════════════ */
function EvaluatorCard() {
  return (
    <div className="pe-card pe-evaluator-card">
      {/* Evaluator section */}
      <div className="pe-eval-section">
        <div className="pe-eval-meta">Evaluator</div>
        <div className="pe-eval-heading">
          HR Admin <span>Dr. Maria Santos</span>
        </div>
        <div className="pe-eval-line"><strong>Department</strong> CCS</div>
        <div className="pe-eval-line">Professor Jenkins, Sarah A.</div>
        <div className="pe-eval-line">Dean Uy, Samuel D.</div>
        <div className="pe-eval-date">
          <Icons.Calendar /> Date Approved April 24, 2027
        </div>
      </div>

      {/* Approval section */}
      <div className="pe-eval-section">
        <div className="pe-eval-heading" style={{ marginBottom: 8 }}>Approval</div>
        <div className="pe-eval-meta">Evaluator</div>
        <div className="pe-eval-line">
          HR Admin <strong>Dr. Maria Santos</strong>
        </div>
        <div className="pe-eval-date">
          <Icons.Calendar /> Date Approved April 24, 2027
        </div>
        <div className="pe-eval-line">
          Professor Jenkins, Sarah A.
          <br />
          <span className="pe-eval-sub">Instructor III</span>
        </div>
      </div>
    </div>
  );
}



/* ══════════════════════════════════════════
   PAGE EXPORT
   ══════════════════════════════════════════ */
export default function PerfEval() {
  const [searchParams] = useSearchParams();
  const applicationId = searchParams.get('appId');
  const [filter, setFilter] = useState('');
  const [evalData, setEvalData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pdfRef = useRef(null);

  const handleDownloadPDF = async () => {
    try {
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 35;
      const contentWidth = pageWidth - margin * 2;
      const tableX = margin;
      let y = 28;

      const facultyForPdf = currentFaculty || faculty;
      const periodLabel = '1ST SEMESTER • AY 2026-2027';

      const getDisplayName = (name) => {
        const raw = String(name || '');
        const parts = raw.split(',').map((part) => part.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const lastName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
          return `${lastName}, ${parts.slice(1).join(', ')}`;
        }
        return raw || 'N/A';
      };

      const loadLogo = async () => {
        try {
          const response = await fetch('/gclogo.png');
          if (!response.ok) return null;
          const blob = await response.blob();
          return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result));
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.warn('Failed to load HR Admin logo for PDF', error);
          return null;
        }
      };

      const logoDataUrl = await loadLogo();

      const rankedSubmissions = [...(evalData?.submissions || [])]
        .map((submission) => {
          const areaRubric = RANKING_RUBRICS.find((area) => Number(area.areaId) === Number(submission.area_id));
          const score = Number(submission.hr_points ?? submission.vpaa_points ?? submission.csv_total_average_rate ?? 0);
          const max = Number(areaRubric?.maxPoints ?? 0);
          return {
            areaCode: areaRubric?.areaCode || `Area ${submission.area_id}`,
            areaName: areaRubric?.areaName || submission.area?.area_name || `Area ${submission.area_id}`,
            score,
            max,
            excess: Math.max(0, score - max),
          };
        })
        .sort((a, b) => {
          const order = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
          return order.indexOf(a.areaCode) - order.indexOf(b.areaCode);
        });

      const totalScore = rankedSubmissions.reduce((sum, item) => sum + item.score, 0);

      const nameValue = getDisplayName(facultyForPdf?.name);
      const positionValue = facultyForPdf?.presentRank || facultyForPdf?.instructor || 'N/A';
      const natureValue = facultyForPdf?.nature || facultyForPdf?.nature_of_appointment || 'N/A';

      const qualifications = [
        { label: 'Experience', value: facultyForPdf?.teachingExp || 'N/A' },
        { label: 'Degree', value: facultyForPdf?.education?.[0]?.degree || facultyForPdf?.education || facultyForPdf?.eligibility || 'N/A' },
        { label: 'Teaching Performance', value: facultyForPdf?.rating ? `${facultyForPdf.rating} — ${facultyForPdf.ratingDesc || ''}`.trim() : 'N/A' },
        { label: 'Research Output', value: facultyForPdf?.industryExp || 'N/A' },
        { label: 'Eligibility', value: facultyForPdf?.eligibility || 'N/A' },
      ];

      if (logoDataUrl) {
        pdf.addImage(logoDataUrl, 'PNG', (pageWidth - 56) / 2, y, 56, 56);
        y += 74;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.text('GORDON COLLEGE', pageWidth / 2, y, { align: 'center' });
      y += 24;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10.5);
      pdf.text(periodLabel, pageWidth / 2, y, { align: 'center' });
      y += 16;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('FACULTY EVALUATION REPORT', pageWidth / 2, y, { align: 'center' });
      y += 20;

      pdf.setDrawColor(120);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 16;

      pdf.setFontSize(11);
      pdf.text('APPLICANT INFORMATION', margin, y);
      y += 14;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`Name: ${nameValue}`, margin + 12, y);
      y += 12;
      pdf.text(`Position: ${positionValue}`, margin + 12, y);
      y += 12;
      pdf.text(`Nature of Appointment: ${natureValue}`, margin + 12, y);
      y += 22;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('EVALUATION SCORES BY AREA', margin, y);
      y += 18;

      const rowHeight = 22;
      const colAreaWidth = contentWidth * 0.56;
      const colScoreWidth = contentWidth * 0.14;
      const colMaxWidth = contentWidth * 0.14;
      const colExcessWidth = contentWidth - colAreaWidth - colScoreWidth - colMaxWidth;
      const cellPadding = 6;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setDrawColor(90);
      pdf.rect(tableX, y, contentWidth, rowHeight);
      const headerCenter = y + rowHeight / 2 + 1;
      pdf.text('Area', tableX + cellPadding, headerCenter, { align: 'left' });
      pdf.text('Score', tableX + colAreaWidth + colScoreWidth / 2, headerCenter, { align: 'center' });
      pdf.text('Max', tableX + colAreaWidth + colScoreWidth + colMaxWidth / 2, headerCenter, { align: 'center' });
      pdf.text('Excess', tableX + colAreaWidth + colScoreWidth + colMaxWidth + colExcessWidth / 2, headerCenter, { align: 'center' });
      pdf.line(tableX + colAreaWidth, y, tableX + colAreaWidth, y + rowHeight);
      pdf.line(tableX + colAreaWidth + colScoreWidth, y, tableX + colAreaWidth + colScoreWidth, y + rowHeight);
      pdf.line(tableX + colAreaWidth + colScoreWidth + colMaxWidth, y, tableX + colAreaWidth + colScoreWidth + colMaxWidth, y + rowHeight);
      y += rowHeight;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9.5);
      rankedSubmissions.forEach((row) => {
        const wrappedArea = pdf.splitTextToSize(`${row.areaCode}: ${row.areaName}`, colAreaWidth - cellPadding * 2);
        const cellHeight = Math.max(rowHeight, wrappedArea.length * 10 + 6);
        const rowTop = y;
        const rowCenter = rowTop + cellHeight / 2 + 1;

        pdf.rect(tableX, rowTop, contentWidth, cellHeight);
        pdf.line(tableX + colAreaWidth, rowTop, tableX + colAreaWidth, rowTop + cellHeight);
        pdf.line(tableX + colAreaWidth + colScoreWidth, rowTop, tableX + colAreaWidth + colScoreWidth, rowTop + cellHeight);
        pdf.line(tableX + colAreaWidth + colScoreWidth + colMaxWidth, rowTop, tableX + colAreaWidth + colScoreWidth + colMaxWidth, rowTop + cellHeight);

        pdf.text(wrappedArea, tableX + cellPadding, rowCenter - (wrappedArea.length - 1) * 4.5, { align: 'left' });
        pdf.text(row.score.toFixed(2), tableX + colAreaWidth + colScoreWidth / 2, rowCenter, { align: 'center' });
        pdf.text(row.max.toFixed(2), tableX + colAreaWidth + colScoreWidth + colMaxWidth / 2, rowCenter, { align: 'center' });
        pdf.text(row.excess > 0 ? `+${row.excess.toFixed(2)}` : '—', tableX + colAreaWidth + colScoreWidth + colMaxWidth + colExcessWidth / 2, rowCenter, { align: 'center' });

        y += cellHeight;
      });

      pdf.setFont('helvetica', 'bold');
      pdf.setDrawColor(80);
      pdf.setLineWidth(1.5);
      pdf.rect(tableX, y, contentWidth, rowHeight);
      pdf.line(tableX + colAreaWidth, y, tableX + colAreaWidth, y + rowHeight);
      pdf.line(tableX + colAreaWidth + colScoreWidth, y, tableX + colAreaWidth + colScoreWidth, y + rowHeight);
      pdf.line(tableX + colAreaWidth + colScoreWidth + colMaxWidth, y, tableX + colAreaWidth + colScoreWidth + colMaxWidth, y + rowHeight);
      const totalCenter = y + rowHeight / 2 + 1;
      pdf.text('TOTAL POINTS', tableX + cellPadding, totalCenter, { align: 'left' });
      pdf.text(totalScore.toFixed(2), tableX + colAreaWidth + colScoreWidth / 2, totalCenter, { align: 'center' });
      y += rowHeight + 18;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('QUALIFICATION SUMMARY', margin, y);
      y += 16;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      qualifications.forEach((item) => {
        const labelWidth = 120;
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${item.label}:`, margin + 12, y);
        pdf.setFont('helvetica', 'normal');
        const wrapped = pdf.splitTextToSize(String(item.value || 'N/A'), contentWidth - labelWidth - 24);
        pdf.text(wrapped, margin + 12 + labelWidth, y);
        y += Math.max(12, wrapped.length * 12) + 6;
      });

      pdf.setFontSize(8);
      pdf.setTextColor(110);
      pdf.text('This report is officially issued and contains the evaluation scores for the faculty applicant.', pageWidth / 2, pageHeight - 14, { align: 'center' });
      pdf.setTextColor(0);

      const fileName = facultyForPdf?.name ? `${facultyForPdf.name}_Evaluation.pdf` : 'Performance_Evaluation.pdf';
      pdf.save(fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.pdf');
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  // Fetch evaluation data if applicationId is provided
  useEffect(() => {
    if (applicationId) {
      fetchEvaluationData(applicationId);
    }
  }, [applicationId]);

  const fetchEvaluationData = async (appId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:5000/perfeval/${appId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch evaluation data');
      }
      const data = await response.json();
      setEvalData(data);
    } catch (err) {
      console.error('Error fetching evaluation:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCommitEvaluation = async () => {
    if (!applicationId) {
      alert('No application selected');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/perfeval/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: parseInt(applicationId),
          hrScore: 0,
          vpaaScore: 0,
          finalScore: 0,
          hrComment: 'Evaluation completed',
          reviewedBy: 1, // Replace with actual user ID
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to commit evaluation');
      }

      alert('Evaluation submitted successfully!');
    } catch (err) {
      console.error('Error submitting evaluation:', err);
      alert('Error submitting evaluation: ' + err.message);
    }
  };

  // Use fetched data if available, otherwise use hardcoded data
  const currentFaculty = evalData?.faculty ? {
    name: evalData.faculty.name_last + ', ' + evalData.faculty.name_first,
    instructor: evalData.application.current_rank_at_time,
    department: evalData.faculty.department,
    presentRank: evalData.application.current_rank_at_time,
    nature: evalData.faculty.nature_of_appointment || 'Permanent',
    salary: evalData.faculty.current_salary ? '₱' + evalData.faculty.current_salary.toLocaleString() : 'N/A',
    teachingExp: evalData.faculty.teaching_experience_years ? evalData.faculty.teaching_experience_years + ' years' : 'N/A',
    industryExp: evalData.faculty.industry_experience_years ? evalData.faculty.industry_experience_years + ' years' : 'N/A',
    rating: evalData.application.final_score || '0',
    ratingDesc: 'Very Satisfactory',
    education: [],
    eligibility: evalData.faculty.eligibility_exams || 'Civil Service Professional',
    applyingFor: evalData.faculty.applying_for || 'Instructor II',
    lastPromotion: evalData.faculty.date_of_last_promotion || 'Not set',
  } : faculty;

  if (loading) {
    return (
      <div className="app">
        <Sidebar />
        <div className="main">
          <div className="content">
            <div className="rk-card-header">
              <span className="rk-card-title">Performance Evaluation</span>
            </div>
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p>Loading evaluation data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && applicationId) {
    return (
      <div className="app">
        <Sidebar />
        <div className="main">
          <div className="content">
            <div className="rk-card-header">
              <span className="rk-card-title">Performance Evaluation</span>
            </div>
            <div style={{ padding: '2rem', color: 'red' }}>
              <p>Error: {error}</p>
            </div>
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
          <div className="rk-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="rk-card-title">Performance Evaluation</span>
              <span className="rk-semester" style={{ marginLeft: '12px' }}>1st Semester AY 2026–2027</span>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={handleDownloadPDF}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download PDF
            </button>
          </div>

          <div className="pe-body" ref={pdfRef}>
          <FacultyInfoCard faculty={currentFaculty} />

          <div className="pe-summary-row">
            <div className="pe-summary-left">
              <AreaSummaryCard filter={filter} onChange={setFilter} />
              <RecommendationCard />
            </div>
            <EvaluatorCard />
          </div>


          </div>
        </div>
      </div>
    </div>
  );
}