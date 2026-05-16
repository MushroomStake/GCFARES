import React from 'react';
import jsPDF from 'jspdf';
import { RANKING_RUBRICS } from '../../../data/rankingRubrics';
import { apiRequest } from '../../../lib/apiClient';

// statuses that indicate the application has been reviewed by HR/VPAA
const REVIEWED_STATUSES = ['HR_Completed', 'VPAA_Completed'];

// Map DB area IDs to rubric area IDs (matches VPAA mapping)
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
export default function ApplicationsListView({
  filteredApplications,
  paginatedApplications,
  searchTerm,
  setSearchTerm,
  departmentFilter,
  setDepartmentFilter,
  statusFilter,
  setStatusFilter,
  applicationPageStart,
  applicationPageSize,
  safeApplicationPage,
  totalApplicationPages,
  setApplicationPage,
  onReviewClick,
  currentCycle,
}) {
  const handleDownloadEvaluationPDF = async (application) => {
    try {
      const applicationId = application.application_id ?? application.id;
      const areasData = await apiRequest('/review/areas');
      const submissionsData = await apiRequest(`/review/applications/${applicationId}/submissions`);
      const applicationData = application;
      const facultyData = application?.faculty || {};

      // Build areas for PDF using VPAA's DB->rubric mapping and aggregation
      const mergedAreas = (areasData || []).map((area) => {
        const dbId = Number(area.area_id);
        const rubricAreaId = DB_AREA_ID_TO_RUBRIC_AREA_ID[dbId] || dbId;
        const rubricArea = RANKING_RUBRICS.find((r) => Number(r.areaId) === Number(rubricAreaId));

        const areaSubmissions = (submissionsData || []).filter(s => Number(s.area_id) === dbId);

        let areaCurrentPoints = 0;
        areaSubmissions.forEach((sub) => {
          const points = Number(sub.vpaa_points ?? sub.hr_points ?? sub.csv_total_average_rate ?? 0) || 0;
          areaCurrentPoints += points;
        });

        return {
          id: String(dbId),
          title: area.area_name || (rubricArea?.areaName) || `Area ${dbId}`,
          max: Number(rubricArea?.maxPoints ?? area.max_possible_points ?? 0),
          current: areaCurrentPoints,
          rubricAreaId,
        };
      });

      // Only include those that map to rubric areas 1-10 and sort by rubric order
      const areasForPdf = mergedAreas
        .filter(a => Number(a.rubricAreaId) >= 1 && Number(a.rubricAreaId) <= 10)
        .sort((a, b) => Number(a.rubricAreaId) - Number(b.rubricAreaId));

      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 35;
      const contentWidth = pageWidth - margin * 2;
      const tableLeft = margin;
      let y = 28;

      // Load logo
      let logoDataUrl = null;
      try {
        const logoResponse = await fetch('/gclogo.png');
        if (logoResponse.ok) {
          const blob = await logoResponse.blob();
          logoDataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result));
            reader.readAsDataURL(blob);
          });
        }
      } catch (error) {
        console.warn('Failed to load logo for PDF', error);
      }

      if (logoDataUrl) {
        pdf.addImage(logoDataUrl, 'PNG', (pageWidth - 56) / 2, y, 56, 56);
        y += 74;
      }

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

      // Table setup - exactly like VPAA
      const tableWidth = contentWidth;
      const colAreaWidth = tableWidth * 0.55;
      const colScoreWidth = tableWidth * 0.15;
      const colMaxWidth = tableWidth * 0.15;
      const colExcessWidth = tableWidth * 0.15;
      const cellPadding = 5;
      const rowHeight = 20;

      // Draw table header
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

      // Draw column separators in header
      pdf.setLineWidth(0.5);
      pdf.line(tableLeft + colAreaWidth, y, tableLeft + colAreaWidth, y + rowHeight);
      pdf.line(tableLeft + colAreaWidth + colScoreWidth, y, tableLeft + colAreaWidth + colScoreWidth, y + rowHeight);
      pdf.line(tableLeft + colAreaWidth + colScoreWidth + colMaxWidth, y, tableLeft + colAreaWidth + colScoreWidth + colMaxWidth, y + rowHeight);

      y += rowHeight;

      // Draw area rows with proper table structure - exactly like VPAA
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(9.5);

      areasForPdf.forEach((area) => {
        const areaTitle = area.title || 'Area';
        const score = Number(area.current || 0);
        const max = Number(area.max || 0);
        const excess = Math.max(0, score - max);

        // Split area title
        const titleLines = pdf.splitTextToSize(areaTitle, colAreaWidth - 2 * cellPadding);
        const actualRowHeight = Math.max(rowHeight, titleLines.length * 10 + 6);

        // Draw row borders
        pdf.setDrawColor(150);
        pdf.setLineWidth(0.5);
        pdf.rect(tableLeft, y, tableWidth, actualRowHeight);
        pdf.line(tableLeft + colAreaWidth, y, tableLeft + colAreaWidth, y + actualRowHeight);
        pdf.line(tableLeft + colAreaWidth + colScoreWidth, y, tableLeft + colAreaWidth + colScoreWidth, y + actualRowHeight);
        pdf.line(tableLeft + colAreaWidth + colScoreWidth + colMaxWidth, y, tableLeft + colAreaWidth + colScoreWidth + colMaxWidth, y + actualRowHeight);

        // Calculate vertical center - adjusted for better centering
        const cellVerticalCenter = y + actualRowHeight / 2 + 1.5;

        // Draw content - vertically centered
        pdf.text(titleLines, tableLeft + cellPadding, cellVerticalCenter - (titleLines.length - 1) * 4.5, { align: 'left' });
        pdf.text(score.toFixed(2), tableLeft + colAreaWidth + colScoreWidth / 2, cellVerticalCenter, { align: 'center' });
        pdf.text(max.toFixed(2), tableLeft + colAreaWidth + colScoreWidth + colMaxWidth / 2, cellVerticalCenter, { align: 'center' });
        pdf.text(excess > 0 ? `+${excess.toFixed(2)}` : '—', tableLeft + colAreaWidth + colScoreWidth + colMaxWidth + colExcessWidth / 2, cellVerticalCenter, { align: 'center' });

        y += actualRowHeight;
      });

      // Total row
      pdf.setDrawColor(80);
      pdf.setLineWidth(1.5);
      pdf.rect(tableLeft, y, tableWidth, rowHeight);

      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(10.5);
      const totalScore = areasForPdf.reduce((s, a) => s + Number(a.current || 0), 0);
      const totalVerticalCenter = y + rowHeight / 2 + 1.5;
      pdf.text('TOTAL POINTS', tableLeft + cellPadding, totalVerticalCenter, { align: 'left' });
      pdf.text(totalScore.toFixed(2), tableLeft + colAreaWidth + colScoreWidth / 2, totalVerticalCenter, { align: 'center' });

      y += rowHeight + 20;

      // === QUALIFICATIONS SECTION ===
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

      quals.forEach(q => {
        const labelWidth = 130;
        pdf.setFont(undefined, 'bold');
        pdf.text(`${q.label}:`, margin + 12, y);
        pdf.setFont(undefined, 'normal');
        const valueLines = pdf.splitTextToSize(q.value || 'N/A', contentWidth - labelWidth - 30);
        pdf.text(valueLines, margin + 12 + labelWidth, y);
        y += Math.max(13, valueLines.length * 13) + 8;
      });

      // === FOOTER ===
      y += 12;
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(100);
      pdf.text('This report is officially issued and contains the evaluation scores for the faculty applicant.', pageWidth / 2, pageHeight - 14, { align: 'center' });
      pdf.setTextColor(0);

      const fileName = `${nameValue.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_Evaluation.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  // Map of applicationId -> total points computed from submissions
  const [totalsMap, setTotalsMap] = React.useState({});

  // Fetch totals for the current page of applications
  React.useEffect(() => {
    let mounted = true;
    const fetchTotalsForPage = async () => {
      try {
        const rawIds = (paginatedApplications || []).map((a) => a.application_id ?? a.id);
        const appIds = rawIds
          .map((v) => Number(v))
          .filter((n) => Number.isFinite(n) && n > 0);

        // Initialize map from application-level scores (hr_score or final_score) so we don't show 0
        const initialMap = {};
        (paginatedApplications || []).forEach((app) => {
          const aid = String(app.application_id ?? app.id ?? '');
          const hr = Number(app.hr_score ?? app.hrScore ?? 0) || 0;
          const fin = Number(app.final_score ?? app.finalScore ?? 0) || 0;
          const display = hr > 0 ? hr : (fin > 0 ? fin : null);
          if (display != null) initialMap[aid] = display;
        });

        // If no app IDs to query, set initialMap and return
        if (!appIds.length) {
          if (mounted) setTotalsMap(initialMap);
          return;
        }

        const submissions = (await Promise.all(appIds.map(async (applicationId) => {
          const rows = await apiRequest(`/review/applications/${applicationId}/submissions`);
          return rows || [];
        }))).flat();

        const map = { ...initialMap };
        (submissions || []).forEach((s) => {
          const aid = String(s.application_id);
          const val = Number(s.vpaa_points ?? s.hr_points ?? s.csv_total_average_rate ?? 0) || 0;
          // If initialMap already had a value (application-level), prefer it; else sum submissions
          if (map[aid] == null) map[aid] = 0;
          // Only add submission values if application-level score not present
          if (!(aid in initialMap)) {
            map[aid] = (map[aid] || 0) + val;
          }
        });

        // Ensure zeros for any ids not present
        appIds.forEach((id) => { if (map[String(id)] == null) map[String(id)] = 0; });

        if (mounted) setTotalsMap(map);
      } catch (err) {
        console.error('Error computing totals for page', err);
      }
    };

    fetchTotalsForPage();

    // Poll for updates every 8 seconds to keep totals near-real-time
    const iv = setInterval(() => { fetchTotalsForPage(); }, 8000);

    return () => { mounted = false; clearInterval(iv); };
  }, [paginatedApplications]);

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-left">
          <span className="toolbar-label">Faculty Applications ({filteredApplications.length})</span>
          <div className="search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              placeholder="Search faculty name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-wrap">
            <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
              <option value="all">All Departments</option>
              <option value="CCS">CCS</option>
              <option value="CEAS">CEAS</option>
              <option value="CBA">CBA</option>
              <option value="BSA">BSA</option>
            </select>
          </div>
          <div className="filter-wrap">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">Pending Review</option>
              <option value="reviewed">Reviewed</option>
            </select>
          </div>
        </div>
      </div>

      {filteredApplications.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>No ranking faculty submissions found</div>
          <div style={{ fontSize: '14px' }}>
            Applications are shown for ranking faculty or when an active-cycle submission exists.
          </div>
        </div>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>Rank</th><th>Name</th><th>Department</th>
                <th>Current Rank</th><th>Total Points</th>
                <th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const getTotal = (application) => {
                  const aid = String(application.application_id ?? application.id ?? '');
                  const v = totalsMap[aid];
                  if (typeof v === 'number') return v;
                  const hr = Number(application.hr_score ?? application.hrScore ?? 0) || 0;
                  const fin = Number(application.final_score ?? application.finalScore ?? 0) || 0;
                  return hr > 0 ? hr : (fin > 0 ? fin : 0);
                };

                const displayList = [...(paginatedApplications || [])].sort((a, b) => {
                  return getTotal(b) - getTotal(a);
                });

                return displayList.map((application, index) => (
                <tr key={application.id}>
                  <td>{applicationPageStart + index + 1}</td>
                  <td className="faculty-name">{application.faculty.name_last}, {application.faculty.name_first}</td>
                  <td>{(function(){
                    const name = String(application.faculty.department_name || '').toUpperCase();
                    if (!name) return 'N/A';
                    if (name.includes('COMPUTER')) return 'CCS';
                    if (name.includes('HOTEL') || name.includes('TOURISM')) return 'CHTM';
                    if (name.includes('BUSINESS')) return 'CBA';
                    if (name.includes('ALLIED HEALTH') || name.includes('HEALTH')) return 'CAHS';
                    if (name.includes('ENGINEERING') || name.includes('ARCHITECTURE')) return 'CEAS';
                    return application.faculty.department_name;
                  })()}</td>
                  <td>{application.faculty.current_rank}</td>
                  <td>{(() => {
                    const aid = String(application.application_id ?? application.id ?? '');
                    const t = totalsMap[aid];
                    if (typeof t === 'number') return t.toFixed(2);
                    return application.display_score != null ? String(application.display_score) : 'Not scored';
                  })()}</td>
                  <td>
                    {application.status === 'HR_Completed' && (
                      <span className="badge badge-reviewed">HR Completed</span>
                    )}
                    {application.status === 'VPAA_Completed' && (
                      <span className="badge badge-reviewed">VPAA Completed</span>
                    )}
                    {!REVIEWED_STATUSES.includes(application.status) && (
                      <span className="badge badge-pending">Pending</span>
                    )}
                  </td>
                  <td style={{ display: 'flex', gap: '8px' }}>
                    <button className="review-btn" onClick={() => onReviewClick(application)} title="Review Application">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <rect x="3" y="3" width="7" height="7" rx="1"/>
                        <rect x="14" y="3" width="7" height="7" rx="1"/>
                        <rect x="3" y="14" width="7" height="7" rx="1"/>
                        <path d="M14 17h7M17 14v7"/>
                      </svg>
                    </button>
                    {['HR_Completed', 'VPAA_Completed', 'For_Publishing', 'Published'].includes(application.status) && (
                      <button 
                        className="review-btn" 
                        style={{ color: '#dc2626' }}
                        onClick={() => handleDownloadEvaluationPDF(application)}
                        title="Download Evaluation PDF"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              ));
              })()}
            </tbody>
          </table>

          <div style={{
            marginTop: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              Showing {applicationPageStart + 1}-{Math.min(applicationPageStart + applicationPageSize, filteredApplications.length)} of {filteredApplications.length}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setApplicationPage((p) => Math.max(1, p - 1))}
                disabled={safeApplicationPage <= 1}
              >
                Previous
              </button>
              <span style={{ fontSize: '12px', color: '#4b5563' }}>
                Page {safeApplicationPage} of {totalApplicationPages}
              </span>
              <button
                type="button"
                className="btn"
                onClick={() => setApplicationPage((p) => Math.min(totalApplicationPages, p + 1))}
                disabled={safeApplicationPage >= totalApplicationPages}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
