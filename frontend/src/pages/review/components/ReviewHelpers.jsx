import React, { useEffect, useRef, useState } from 'react';
import { RANKING_RUBRICS } from '../../../data/rankingRubrics';
import { apiRequest } from '../../../lib/apiClient';
import Loader from '../../../components/Loader';

const RANKS = [
  'Instructor I', 'Instructor II', 'Instructor III',
  'Assistant Professor I', 'Assistant Professor II', 'Assistant Professor III', 'Assistant Professor IV',
  'Associate Professor I', 'Associate Professor II', 'Associate Professor III', 'Associate Professor IV', 'Associate Professor V',
  'Professor I', 'Professor II', 'Professor III', 'Professor IV', 'Professor V'
];

function collapseRangesFromArray(selected = [], options = []) {
  if (!selected || selected.length === 0) return '';
  const idxMap = new Map();
  options.forEach((o, i) => idxMap.set(o, i));
  const indices = (Array.isArray(selected) ? selected : String(selected).split(/\s*,\s*/)).map(s => idxMap.get(s)).filter(n => typeof n === 'number').sort((a,b)=>a-b);
  if (indices.length === 0) return Array.isArray(selected) ? selected.join(', ') : String(selected);
  
  const parts = [];
  let i = 0;
  while (i < indices.length) {
    let start = indices[i];
    let end = start;
    while (i + 1 < indices.length && indices[i+1] === end + 1) { i++; end = indices[i]; }
    
    const blockItems = [];
    for (let k = start; k <= end; k++) blockItems.push({ idx: k, text: options[k] });
    
    const prefixGroups = [];
    let currentPrefix = null;
    let currentGroup = [];
    for (const item of blockItems) {
      const split = item.text.lastIndexOf(' ');
      const prefix = split === -1 ? item.text : item.text.slice(0, split);
      if (prefix !== currentPrefix) {
        if (currentGroup.length > 0) prefixGroups.push({ prefix: currentPrefix, items: currentGroup });
        currentPrefix = prefix;
        currentGroup = [item];
      } else {
        currentGroup.push(item);
      }
    }
    if (currentGroup.length > 0) prefixGroups.push({ prefix: currentPrefix, items: currentGroup });
    
    for (const pg of prefixGroups) {
      const first = pg.items[0];
      const last = pg.items[pg.items.length - 1];
      const splitF = first.text.lastIndexOf(' ');
      const splitL = last.text.lastIndexOf(' ');
      const sufF = splitF === -1 ? first.text : first.text.slice(splitF + 1);
      const sufL = splitL === -1 ? last.text : last.text.slice(splitL + 1);
      
      if (pg.items.length > 1) {
        parts.push(`${pg.prefix} ${sufF}-${sufL}`);
      } else {
        parts.push(first.text);
      }
    }
    i++;
  }
  
  const unknowns = (Array.isArray(selected) ? selected : String(selected).split(/\s*,\s*/)).filter(s => !idxMap.has(s));
  return parts.concat(unknowns).join(', ');
}

// Expand compressed labels like "Instructor I-III, Professor II" back to full RANKS array
function expandCompressedRanges(input) {
  if (!input) return [];
  const tokens = String(input).split(/\s*,\s*/).map(t => t.trim()).filter(Boolean);
  const result = new Set();

  for (const token of tokens) {
    if (RANKS.includes(token)) {
      result.add(token);
      continue;
    }

    const lastSpace = token.lastIndexOf(' ');
    if (lastSpace === -1) {
      // fallback: include any rank containing the token
      RANKS.forEach(r => { if (r.toLowerCase().includes(token.toLowerCase())) result.add(r); });
      continue;
    }

    const prefix = token.slice(0, lastSpace);
    const suf = token.slice(lastSpace + 1);

    // If range like 'I-III'
    if (suf.includes('-')) {
      const [startS, endS] = suf.split('-').map(s => s.trim());
      // Get group of ranks with same prefix
      const group = RANKS.map((r, i) => ({ r, i })).filter(x => x.r.startsWith(prefix + ' '));
      if (group.length === 0) continue;
      const suffixes = group.map(x => x.r.slice(x.r.lastIndexOf(' ') + 1));
      const startIdx = suffixes.indexOf(startS);
      const endIdx = suffixes.indexOf(endS);
      if (startIdx === -1 || endIdx === -1) {
        group.forEach(x => result.add(x.r));
      } else {
        for (let k = startIdx; k <= endIdx; k++) result.add(group[k].r);
      }
    } else {
      // single suffix, try to match exact or by prefix
      const exact = `${prefix} ${suf}`;
      if (RANKS.includes(exact)) {
        result.add(exact);
      } else {
        RANKS.forEach(r => { if (r.startsWith(prefix + ' ') && r.endsWith(' ' + suf)) result.add(r); });
      }
    }
  }

  return Array.from(result);
}


function normalizePartLookupKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// Map department name or code to canonical short code used in UI
function toCanonicalDepartmentCodeFromName(name) {
  if (!name) return null;
  const s = String(name).trim().toUpperCase();
  if (s.includes('COMPUTER')) return 'CCS';
  if (s.includes('HOTEL') || s.includes('TOURISM')) return 'CHTM';
  if (s.includes('BUSINESS')) return 'CBA';
  if (s.includes('ALLIED HEALTH') || s.includes('HEALTH')) return 'CAHS';
  if (s.includes('ENGINEERING') || s.includes('ARCHITECTURE')) return 'CEAS';
  // common short codes
  if (s === 'CCS' || s === 'CBA' || s === 'CHTM' || s === 'CAHS' || s === 'CEAS') return s;
  return null;
}

// Helper function to convert storage path to a Laravel public storage URL
function getPublicFileUrl(storagePath) {
  if (!storagePath) return null;

  if (String(storagePath).startsWith('http://') || String(storagePath).startsWith('https://')) {
    try {
      const parsed = new URL(String(storagePath));
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001/api';
      const origin = apiBaseUrl.replace(/\/api\/?$/, '');
      if ((parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') && parsed.pathname.includes('/storage/')) {
        return `${origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch (e) {
      // ignore URL parse errors and fall through
    }

    return storagePath;
  }

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001/api';
  const origin = apiBaseUrl.replace(/\/api\/?$/, '');
  const normalizedPath = String(storagePath).replace(/^\/+/, '').replace(/^storage\/+/, '');
  const publicPath = normalizedPath.startsWith('documents/') ? normalizedPath : `documents/${normalizedPath}`;

  return `${origin}/storage/${publicPath.split('/').map((segment) => encodeURIComponent(segment)).join('/')}`;
}

function resolvePreviewFileUrl(fileUrl) {
  if (!fileUrl) return null;
  return getPublicFileUrl(fileUrl) || fileUrl;
}

function getApiOrigin() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001/api';
  return apiBaseUrl.replace(/\/api\/?$/, '');
}

function extractStoragePath(fileUrl) {
  if (!fileUrl) return null;

  const raw = String(fileUrl);
  try {
    const parsed = new URL(raw);
    const index = parsed.pathname.indexOf('/storage/');
    if (index >= 0) {
      return decodeURIComponent(parsed.pathname.slice(index + '/storage/'.length).replace(/^\/+/, ''));
    }
  } catch (error) {
    // Not an absolute URL; fall through.
  }

  const storageIndex = raw.indexOf('/storage/');
  if (storageIndex >= 0) {
    return decodeURIComponent(raw.slice(storageIndex + '/storage/'.length).replace(/^\/+/, ''));
  }

  if (raw.startsWith('documents/')) {
    return raw.replace(/^\/+/, '');
  }

  return raw.replace(/^\/+/, '');
}

function buildAuthenticatedFileUrl(fileUrl) {
  const storagePath = extractStoragePath(fileUrl);
  if (!storagePath) return null;
  return `${getApiOrigin()}/api/review/storage-file?path=${encodeURIComponent(storagePath)}&bucket=public`;
}

const CRITERIA_DEFINITIONS = {
  1: [
    { label: 'A', title: 'Associate Courses/Program (2 years)', points: 25.0, maxPoints: 25.0, weight: '30%' },
    { label: 'B', title: "Bachelor's Degree (4 years to 5 years)", points: 45.0, maxPoints: 45.0, weight: '30%' },
    { label: 'C', title: "Diploma course (above Bachelor's Degree)", points: 46.0, maxPoints: 46.0, weight: '30%' },
    { label: 'D', title: "Master's Program", points: 0, maxPoints: 0, weight: '30%' },
    { label: 'D.1', title: 'MA/MS Units (6-12 units)', points: 47.0, maxPoints: 47.0, weight: '30%' },
    { label: 'D.2', title: 'MA/MS Units (13-18 units)', points: 49.0, maxPoints: 49.0, weight: '30%' },
    { label: 'D.3', title: 'MA/MS Units (19-24 units)', points: 51.0, maxPoints: 51.0, weight: '30%' },
    { label: 'D.4', title: 'MA/MS Units (25-30 units)', points: 53.0, maxPoints: 53.0, weight: '30%' },
    { label: 'D.5', title: 'MA/MS Units (31-up units)', points: 55.0, maxPoints: 55.0, weight: '30%' },
    { label: 'E', title: 'Comprehensive Exam Passed', points: 58.0, maxPoints: 58.0, weight: '30%' },
    { label: 'F', title: "Master's Degree (non-thesis)", points: 60.0, maxPoints: 60.0, weight: '30%' },
    { label: 'G', title: 'Thesis Defended', points: 62.0, maxPoints: 62.0, weight: '30%' },
    { label: 'H', title: "Master's Degree (Additional 2 points for another discipline)", points: 65.0, maxPoints: 65.0, weight: '30%' },
    { label: 'I', title: 'LLB and MD (Passed the bar and board exam)', points: 65.0, maxPoints: 65.0, weight: '30%' },
    { label: 'J', title: 'Doctoral Program', points: 0, maxPoints: 0, weight: '30%' },
    { label: 'J.1', title: 'Doctoral Units (9-18 units)', points: 67.0, maxPoints: 67.0, weight: '30%' },
    { label: 'J.2', title: 'Doctoral Units (19-27 units)', points: 69.0, maxPoints: 69.0, weight: '30%' },
    { label: 'J.3', title: 'Doctoral Units (28-36 units)', points: 71.0, maxPoints: 71.0, weight: '30%' },
    { label: 'J.4', title: 'Doctoral Units (37-45 units)', points: 73.0, maxPoints: 73.0, weight: '30%' },
    { label: 'J.5', title: 'Doctoral Units (46-up units)', points: 75.0, maxPoints: 75.0, weight: '30%' },
    { label: 'K', title: 'Comprehensive Exam Passed', points: 80.0, maxPoints: 80.0, weight: '30%' },
    { label: 'L', title: 'Doctorate Degree (Additional 5 points for another discipline)', points: 85.0, maxPoints: 85.0, weight: '30%' },
  ],
  2: null,
  3: null,
  4: null,
  5: null,
  6: null,
  7: null,
  8: null,
  9: null,
  10: null,
};

export function FacultyInfoCard({ facultyData, applicationData, onEditFinalScore, isEditingFinalScore, draftScore, onDraftScoreChange, onSaveFinalScore, isSavingFinalScore }) {
  if (!facultyData || !applicationData) {
    return (
      <div className="faculty-card">
        <div className="faculty-card-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Faculty Information
        </div>
        <Loader message="Loading faculty information..." />
      </div>
    );
  }

  return (
    <div className="faculty-card">
      <div className="faculty-card-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Faculty Information
      </div>
      <div className="faculty-info-grid">
        <div>
          <div className="fi-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Personal Details</div>
          <div className="fi-field"><label>Name</label><span>{facultyData.name_last}, {facultyData.name_first} {facultyData.name_middle}.</span></div>
          <div className="fi-field"><label>Department</label><span>{(function(){ const code = toCanonicalDepartmentCodeFromName(facultyData.department_name); return code || facultyData.department_name || 'N/A'; })()}</span></div>
        </div>
        <div>
          <div className="fi-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2-2v2"/></svg>Employment Status</div>
            <div className="fi-field"><label>Present Rank</label><span>{facultyData.current_rank || 'N/A'}</span></div>
            <div className="fi-field"><label>Nature of Appointment</label><span>{facultyData.nature_of_appointment || 'N/A'}</span></div>
        </div>
        <div>
          <div className="fi-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Experience &amp; Rating</div>
          <div className="fi-field"><label>Teaching Exp.</label><span>{facultyData.teaching_experience_years || 0} years</span></div>
          <div className="fi-field"><label>Industry Exp.</label><span>{facultyData.industry_experience_years || 0} years</span></div>
          <div className="fi-field"><label>Status</label><span>{applicationData.status?.replace(/_/g, ' ') || 'N/A'}</span></div>
        </div>
        <div>
          <div className="fi-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>Educational Attainment</div>
          <div className="fi-edu"><strong>{facultyData.educational_attainment || 'Not specified'}</strong><small>Educational Background</small></div>
          <div className="fi-label" style={{ marginTop: '10px' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>Eligibility &amp; Exams</div>
          <div className="fi-field"><span>{facultyData.eligibility_exams || 'None specified'}</span></div>
        </div>
        <div>
          <div className="fi-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Application Details</div>
          <div className="fi-field"><label>Applying For</label>
            <span>
              {(function(){
                const raw = facultyData.applying_for || facultyData.applyingFor || '';
                const arr = Array.isArray(raw) ? raw : String(raw).split(/\s*,\s*/).filter(Boolean);
                const comp = collapseRangesFromArray(arr, RANKS);
                return comp || 'N/A';
              })()}
            </span>
          </div>
          <div className="fi-field"><label>Last Promotion</label><span>{facultyData.date_of_last_promotion ? new Date(facultyData.date_of_last_promotion).toLocaleDateString() : 'N/A'}</span></div>
        </div>
      </div>
    </div>
  );
}

export function DocumentViewer({ fileUrl, fileName, onClose }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewError, setPreviewError] = useState('');

  const resolvedFileUrl = resolvePreviewFileUrl(fileUrl);
  const isPDF = resolvedFileUrl ? (resolvedFileUrl.toLowerCase().endsWith('.pdf') || resolvedFileUrl.includes('application/pdf')) : false;

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;

    setPreviewUrl(null);
    setPreviewError('');

    const loadPreview = async () => {
      const endpoint = buildAuthenticatedFileUrl(resolvedFileUrl);
      const token = (() => {
        try {
          return localStorage.getItem('api_token');
        } catch {
          return null;
        }
      })();

      if (!endpoint) {
        setPreviewError('Unable to resolve file path.');
        return;
      }

      try {
        const headers = { Accept: 'application/octet-stream' };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(endpoint, { headers });
        if (!response.ok) {
          throw new Error(`Failed to load file (${response.status})`);
        }

        const blob = await response.blob();
        objectUrl = window.URL.createObjectURL(blob);

        if (!cancelled) {
          setPreviewUrl(objectUrl);
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewError(error?.message || 'Failed to load file preview.');
        }
      }
    };

    loadPreview();

    return () => {
      cancelled = true;
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
    };
  }, [resolvedFileUrl]);

  if (!fileUrl) return null;

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      const response = await fetch(previewUrl || resolvedFileUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.warn('Blob download failed (likely CORS), falling back to open in new tab:', error);
      window.open(previewUrl || resolvedFileUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: isFullscreen ? '95vw' : '90vw', height: isFullscreen ? '95vh' : '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', color: '#1f2937', fontSize: '14px', fontWeight: '600' }}>{fileName || 'Document Viewer'}</h3>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '12px' }}>{isPDF ? 'PDF Document' : 'Document'}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <a
              href={previewUrl || resolvedFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in new tab"
              style={{ padding: '8px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', transition: 'background 0.2s' }}
              onMouseEnter={(e) => e.target.style.background = '#2563eb'}
              onMouseLeave={(e) => e.target.style.background = '#3b82f6'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Open
            </a>
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              title="Download file"
              style={{ padding: '8px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: isDownloading ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: '600', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', transition: 'background 0.2s', opacity: isDownloading ? 0.6 : 1 }}
              onMouseEnter={(e) => !isDownloading && (e.target.style.background = '#059669')}
              onMouseLeave={(e) => !isDownloading && (e.target.style.background = '#10b981')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {isDownloading ? 'Downloading...' : 'Download'}
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              style={{ padding: '8px 12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'background 0.2s' }}
              onMouseEnter={(e) => e.target.style.background = '#4f46e5'}
              onMouseLeave={(e) => e.target.style.background = '#6366f1'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
                {isFullscreen ? (
                  <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
                ) : (
                  <path d="M8 3v4a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-4a2 2 0 012-2h3M3 16h4a2 2 0 012 2v4"/>
                )}
              </svg>
            </button>
            <button
              onClick={onClose}
              title="Close viewer"
              style={{ padding: '8px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'background 0.2s' }}
              onMouseEnter={(e) => e.target.style.background = '#dc2626'}
              onMouseLeave={(e) => e.target.style.background = '#ef4444'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', background: '#f3f4f6' }}>
          {previewError ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', color: '#dc2626', padding: '24px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontWeight: 600 }}>Preview unavailable</p>
              <p style={{ margin: '8px 0 0', fontSize: '12px' }}>{previewError}</p>
            </div>
          ) : previewUrl && isPDF ? (
            <iframe src={`${previewUrl}#toolbar=1&navpanes=0&scrollbar=1`} style={{ width: '100%', height: '100%', border: 'none' }} title={fileName} />
          ) : previewUrl && !isPDF ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', color: '#6b7280' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '48px', height: '48px', marginBottom: '12px' }}>
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500' }}>Document Preview</p>
              <p style={{ margin: 0, fontSize: '12px' }}>Use the buttons above to view or download</p>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', color: '#6b7280' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500' }}>Loading preview...</p>
              <p style={{ margin: 0, fontSize: '12px' }}>Fetching the file securely from the review server</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ScoringCriteriaPanel({ area, submission, criteria, onClose, areaEvalData, onSaveCriteriaScores, isSavingScore, onOpenSearchModal, currentCycle, applications, selectedApplication, selectedFaculty }) {
  const buildCriteriaFromRubric = (areaId, partId, areaName) => {
    try {
      // Extract Roman numeral from areaName - this is the source of truth
      // The database area_id may not match RANKING_RUBRICS areaId
      let resolvedAreaId = areaId;
      if (areaName) {
        const match = String(areaName).match(/AREA\s+([IVX]+)/i);
        if (match) {
          const romanNum = match[1].toUpperCase();
          const romanToNum = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10 };
          resolvedAreaId = romanToNum[romanNum] || areaId;
        }
      }

      const areaRubric = RANKING_RUBRICS.find((r) => Number(r.areaId) === Number(resolvedAreaId));
      if (!areaRubric) return [];
      const items = [];

      const pushRubricNode = (node, parentKey = null) => {
        if (!node) return;

        const hasChildren = Array.isArray(node.children) && node.children.length > 0;
        const rawMaxPoints = node.maxPoints;
        const hasDefinedMax = rawMaxPoints !== undefined && rawMaxPoints !== null && rawMaxPoints !== '';
        const maxPoints = hasDefinedMax ? Number(rawMaxPoints) : null;

        items.push({
          criterion_key: node.label || node.id,
          label: node.label || node.id,
          title: node.title || node.label || node.id,
          maxPoints: hasChildren ? null : maxPoints,
          score: 0,
          displayOnly: hasChildren,
          parentOnly: hasChildren,
          parent_key: parentKey,
        });

        if (hasChildren) {
          node.children.forEach((child) => pushRubricNode(child, node.label || node.id));
        }
      };

      // Recursively flatten every rubric node so no area criteria are skipped.
      areaRubric.subAreas.forEach((sa) => pushRubricNode(sa));

      return items;
    } catch (err) {
      console.error('Error building rubric criteria', err);
      return [];
    }
  };

  const fallbackCriteria = buildCriteriaFromRubric(area?.area_id || 1, submission?.part_id, area?.area_name || area?.label);
  const getRubricMaxForCriterion = (areaId, criterionKey, partId, areaName) => {
    try {
      // Extract Roman numeral from areaName - this is the source of truth
      let resolvedAreaId = areaId;
      if (areaName) {
        const match = String(areaName).match(/AREA\s+([IVX]+)/i);
        if (match) {
          const romanNum = match[1].toUpperCase();
          const romanToNum = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10 };
          resolvedAreaId = romanToNum[romanNum] || areaId;
        }
      }

      const areaRubric = RANKING_RUBRICS.find((r) => Number(r.areaId) === Number(resolvedAreaId));
      if (!areaRubric) return undefined; // rubric not found for this area
      const normalize = (str) => String(str || '').trim().toLowerCase().replace(/[^\w]/g, '');

      let partLabel = null;
      if (partId) {
        partLabel = String(partId).trim().split(/[-_\s\/]+/).pop();
      } else if (criterionKey) {
        const ck = String(criterionKey).trim();
        let m = ck.match(/(?:submission|file|part):(?:.*?-)?(\d+)$/i);
        if (m && m[1]) {
          partLabel = m[1];
        } else {
          const tokens = ck.split(/[-_:\s\/]+/).filter(Boolean);
          if (tokens.length) partLabel = tokens[tokens.length - 1];
        }
      }
      const normalizedKey = normalize(criterionKey);

      // return undefined => not found in rubric
      // return null => found in rubric but maxPoints explicitly missing/null
      // return number => explicit numeric maxPoints
      const findInList = (list) => {
        for (const item of list) {
          if (!item) continue;
          const itemLabel = String(item.label || '').trim();
          const itemId = String(item.id || '').trim();

          if (itemLabel === String(criterionKey) || itemId.endsWith(`_${criterionKey}`) || itemId.includes(`_${criterionKey}_`)) {
            return item.hasOwnProperty('maxPoints') ? (item.maxPoints == null ? null : Number(item.maxPoints)) : undefined;
          }

          if (normalize(item.label) === normalizedKey || normalize(item.title) === normalizedKey || normalize(itemId) === normalizedKey) {
            return item.hasOwnProperty('maxPoints') ? (item.maxPoints == null ? null : Number(item.maxPoints)) : undefined;
          }

          if (item.children && item.children.length) {
            const res = findInList(item.children);
            if (res !== undefined) return res;
          }
        }
        return undefined;
      };

      if (partLabel) {
        const subArea = areaRubric.subAreas.find((sa) => sa.label === partLabel || String(sa.id).endsWith(`_${partLabel}`) || String(sa.id).includes(`_${partLabel}_`));
        if (subArea) {
          const v = findInList([subArea]);
          if (v !== undefined) return v;
        }
      }

      const result = findInList(areaRubric.subAreas);
      if (result !== undefined) return result;

      for (const area of RANKING_RUBRICS) {
        const crossSearchResult = findInList(area.subAreas);
        if (crossSearchResult !== undefined) return crossSearchResult;
      }

      return undefined;
    } catch (err) {
      console.error('rubric lookup error', err);
      return undefined;
    }
  };

  // Build the canonical list of criteria to render.
  // Start with the full rubric-derived fallbackCriteria so every sub-area/criterion
  // is displayed. Then overlay any DB-provided criteria (scores or explicit maxes).
  const buildActiveCriteria = () => {
    const base = fallbackCriteria.map((c) => ({ ...c }));

    // Map base by normalized key for quick overlay
    const baseByKey = new Map();
    base.forEach((b) => {
      const k = String(b.criterion_key || b.label || '').trim();
      baseByKey.set(k, b);
    });

    if (Array.isArray(criteria) && criteria.length > 0) {
      for (const dbC of criteria) {
        const k = String(dbC.criterion_key || dbC.label || '').trim();
        if (!k) continue;
        if (baseByKey.has(k)) {
          const dest = baseByKey.get(k);
          // overlay values from DB when present
          if (dbC.maxPoints != null || dbC.max_points != null || dbC.max != null) {
            dest.maxPoints = Number((dbC.maxPoints ?? dbC.max_points ?? dbC.max ?? dest.maxPoints) || 0);
          }
          if (dbC.score != null) dest.score = Number(dbC.score || 0);
          if (dbC.excess_score != null || dbC.excessScore != null) dest.excessScore = Number((dbC.excess_score ?? dbC.excessScore) || 0);
        } else {
          // Unknown criterion found in DB — append it so it is visible
          base.push({
            criterion_key: k,
            label: dbC.label || k,
            title: dbC.title || dbC.label || k,
            maxPoints: Number(dbC.maxPoints ?? dbC.max_points ?? dbC.max ?? 0),
            score: Number(dbC.score ?? 0),
            excessScore: Number(dbC.excess_score ?? dbC.excessScore ?? 0),
          });
        }
      }
    }

    // Finalize each criterion by resolving rubric max if still missing.
    // Preserve rubric: undefined = no rubric entry, null = rubric exists but no max, number = explicit max.
    return base.map((criterion) => {
      const key = criterion.criterion_key || criterion.label;
      const providedRaw = criterion.maxPoints ?? criterion.max_points ?? criterion.max;
      const providedMax = providedRaw != null ? Number(providedRaw) : undefined;
      const rubricMax = getRubricMaxForCriterion(area?.area_id || 1, key, submission?.part_id, area?.area_name || area?.label);

      let finalMax = null; // null represents "no max / display as —"
      if (rubricMax !== undefined) {
        // Rubric has info: null => explicitly no max; number => use it (even 0 -> treat as no max)
        finalMax = rubricMax === null ? null : (Number(rubricMax) > 0 ? Number(rubricMax) : null);
      } else if (providedMax !== undefined && providedMax > 0) {
        finalMax = providedMax;
      } else {
        finalMax = null;
      }

      const parsedScore = Number(criterion.score ?? 0);
      const excess = finalMax != null
        ? Number(criterion.excessScore ?? criterion.excess_score ?? Math.max(0, parsedScore - finalMax))
        : Number(criterion.excessScore ?? criterion.excess_score ?? 0);

      return {
        criterion_key: key,
        label: criterion.label || key || 'Unnamed Criterion',
        title: criterion.title || key || criterion.label || '',
        maxPoints: finalMax,
        score: parsedScore,
        excessScore: excess,
      };
    });
  };

  const activeCriteria = buildActiveCriteria();

  const areaMaxPoints = Number(area?.maxPoints ?? area?.max ?? area?.max_possible_points ?? 85);

  const applyAreaMaxExcess = (criteriaList) => {
    let runningScore = 0;

    return criteriaList.map((criterion) => {
      const score = Number(criterion.score ?? 0);
      const scoreBeforeThisRow = Math.max(0, runningScore - areaMaxPoints);
      runningScore += score;
      const scoreAfterThisRow = Math.max(0, runningScore - areaMaxPoints);
      const excessScore = Math.max(0, scoreAfterThisRow - scoreBeforeThisRow);

      return {
        ...criterion,
        score,
        cappedScore: Math.max(0, score - excessScore),
        excessScore,
      };
    });
  };

  const [draftCriteriaScores, setDraftCriteriaScores] = useState(applyAreaMaxExcess(activeCriteria));
  const [partSubmissions, setPartSubmissions] = useState({});
  const [viewerModalOpen, setViewerModalOpen] = useState(false);
  const [viewerModalFile, setViewerModalFile] = useState(null);
  const [areaIVModalOpen, setAreaIVModalOpen] = useState(false);
  const [areaIVImportedRows, setAreaIVImportedRows] = useState([]);
  const [areaIVLoadingRows, setAreaIVLoadingRows] = useState(false);
  const [areaIVSearch, setAreaIVSearch] = useState('');
  const [areaIVDebouncedSearch, setAreaIVDebouncedSearch] = useState('');
  const skipAutoSaveRef = useRef(true);
  const lastSaveTimeRef = useRef(0);
  const hasUnsavedUserEditsRef = useRef(false);
  const latestDraftCriteriaRef = useRef(draftCriteriaScores);

  const buildSaveContext = () => ({
    application_id: submission?.application_id || selectedApplication?.id || null,
    area_id: submission?.area_id || area?.area_id || null,
    part_id: submission?.part_id || area?.part_id || null,
    cycle_id: submission?.cycle_id || currentCycle?.cycle_id || currentCycle?.id || selectedApplication?.cycle_id || null,
    user_id: submission?.user_id || selectedApplication?.faculty_id || selectedFaculty?.user_id || null,
  });

  useEffect(() => {
    latestDraftCriteriaRef.current = draftCriteriaScores;
  }, [draftCriteriaScores]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAreaIVDebouncedSearch(areaIVSearch.trim().toLowerCase());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [areaIVSearch]);

  useEffect(() => {
    if (!areaIVModalOpen) {
      setAreaIVSearch('');
      setAreaIVDebouncedSearch('');
    }
  }, [areaIVModalOpen]);

  // Fetch existing criterion scores from database
  useEffect(() => {
    const fetchCriterionScores = async () => {
      const startedForSubmissionId = submission?.submission_id;

      if (!submission?.submission_id || String(submission?.submission_id)?.startsWith('placeholder-')) {
        skipAutoSaveRef.current = true;
        hasUnsavedUserEditsRef.current = false;
        setDraftCriteriaScores(activeCriteria);
        return;
      }

      try {
        console.log('[ScoringCriteriaPanel] Fetching criterion scores for submission:', submission.submission_id);
        const scoringData = await apiRequest(`/review/submission-scoring/${submission.submission_id}`);
        const dbScores = Array.isArray(scoringData?.criteria) ? scoringData.criteria : [];

        // Create map of criterion_key -> score data
        const scoreMap = {};
        dbScores?.forEach(s => {
          scoreMap[s.criterion_key] = {
            score: Number(s.score || 0),
            excessScore: Number(s.excess_score || 0),
            cappedScore: Number(s.capped_score || 0),
          };
        });

        console.log('[ScoringCriteriaPanel] Built scoreMap:', scoreMap);

        // Merge database scores with criteria
        const mergedCriteria = activeCriteria.map(criterion => ({
          ...criterion,
          score: scoreMap[criterion.criterion_key]?.score ?? criterion.score ?? 0,
          excessScore: scoreMap[criterion.criterion_key]?.excessScore ?? criterion.excessScore ?? 0,
          cappedScore: scoreMap[criterion.criterion_key]?.cappedScore ?? 0,
        }));

        if (String(submission?.submission_id) !== String(startedForSubmissionId)) return;
        skipAutoSaveRef.current = true;
        hasUnsavedUserEditsRef.current = false;
        setDraftCriteriaScores(applyAreaMaxExcess(mergedCriteria));
      } catch (err) {
        console.error('[ScoringCriteriaPanel] Error fetching criterion scores:', err);
        if (String(submission?.submission_id) !== String(startedForSubmissionId)) return;
        skipAutoSaveRef.current = true;
        hasUnsavedUserEditsRef.current = false;
        setDraftCriteriaScores(applyAreaMaxExcess(activeCriteria));
      }
    };

    fetchCriterionScores();
  }, [submission?.submission_id]);

  // Fetch all part submissions for this area
  useEffect(() => {
    const fetchPartSubmissions = async () => {
      if (!submission?.area_id || String(submission?.submission_id)?.startsWith('placeholder-')) {
        console.log('[ScoringCriteriaPanel] Skipping fetch: placeholder or no area_id');
        setPartSubmissions({});
        return;
      }
      
      try {
        console.log('[ScoringCriteriaPanel] Fetching partSubmissions:', {
          area_id: submission?.area_id,
          application_id: submission?.application_id,
          submission_id: submission?.submission_id,
        });
        
        const submissions = await apiRequest(`/review/applications/${submission?.application_id}/submissions`);

        console.log('[ScoringCriteriaPanel] Laravel query result:', {
          count: submissions?.length || 0,
          query: { application_id: submission?.application_id, area_id: submission?.area_id }
        });

        // Map submissions by raw and normalized part_id so nested parts like A.1/A.2 resolve correctly
        const partMap = {};
        submissions?.forEach(sub => {
          console.log('[ScoringCriteriaPanel] Processing submission:', { part_id: sub.part_id, file_path: sub.file_path });
          if (sub.part_id && sub.file_path) {
            const rawKey = String(sub.part_id).trim();
            const normalizedKey = normalizePartLookupKey(rawKey);
            partMap[rawKey] = sub.file_path;
            partMap[normalizedKey] = sub.file_path;
          }
        });
        console.log('[ScoringCriteriaPanel] Built partMap:', partMap);
        setPartSubmissions(partMap);
      } catch (err) {
        console.error('[ScoringCriteriaPanel] Error fetching part submissions:', err);
      }
    };

    fetchPartSubmissions();
  }, [submission?.area_id, submission?.application_id]);

  useEffect(() => {
    // Only reset if we have a new submission ID (don't reset on criteria changes as that's handled by the fetch above)
    skipAutoSaveRef.current = true;
  }, [submission?.submission_id]);

  useEffect(() => {
    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return undefined;
    }

    // Allow autosave for placeholders too: backend will create/resolve submission row.
    const sid = submission?.submission_id;
    if (!sid || !onSaveCriteriaScores) return undefined;

    // Only autosave when the user actually changed something.
    if (!hasUnsavedUserEditsRef.current) return undefined;

    // Prevent autosave within 1 second of last save to avoid rapid loops
    const now = Date.now();
    if (now - lastSaveTimeRef.current < 1000) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      lastSaveTimeRef.current = Date.now();
      hasUnsavedUserEditsRef.current = false;
      onSaveCriteriaScores(submission.submission_id, draftCriteriaScores, buildSaveContext());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [draftCriteriaScores, submission?.submission_id, onSaveCriteriaScores]);

  // If user switches area before debounce fires, persist pending edits immediately.
  useEffect(() => {
    const sidAtRender = submission?.submission_id;
    return () => {
      if (!sidAtRender || !onSaveCriteriaScores) return;
      if (!hasUnsavedUserEditsRef.current) return;

      lastSaveTimeRef.current = Date.now();
      hasUnsavedUserEditsRef.current = false;
      onSaveCriteriaScores(sidAtRender, latestDraftCriteriaRef.current, buildSaveContext());
    };
  }, [submission?.submission_id, onSaveCriteriaScores]);

  useEffect(() => {
    if (!areaIVModalOpen || area?.area_id !== 7) return;

    const fetchImportedRows = async () => {
      setAreaIVLoadingRows(true);
      try {
        // Try multiple sources for cycle_id
        let cycleId = null;

        // Try submission first
        if (submission?.cycle_id) {
          cycleId = Number(submission.cycle_id);
        }
        // Try currentCycle
        else if (currentCycle?.cycle_id) {
          cycleId = Number(currentCycle.cycle_id);
        }
        // Try alternate cycle_id property
        else if (currentCycle?.id) {
          cycleId = Number(currentCycle.id);
        }
        // Try selectedApplication
        else if (selectedApplication?.cycle_id) {
          cycleId = Number(selectedApplication.cycle_id);
        }

        let rows = [];

        // First try: load rows for resolved cycle.
        if (Number.isFinite(cycleId) && cycleId > 0) {
          rows = await apiRequest(`/review/area-iv-imports?cycle_id=${cycleId}`) || [];
        }

        // Fallback: if active cycle has no rows, show latest imported cycle rows.
        if (rows.length === 0) {
          const latestRows = await apiRequest('/review/area-iv-imports?cycle_id=0').catch(() => []);
          if (Array.isArray(latestRows) && latestRows.length > 0) {
            const latestCycleId = latestRows[0].cycle_id;
            rows = latestRows.filter((row) => Number(row.cycle_id) === Number(latestCycleId));
          }
        }

        setAreaIVImportedRows(rows);
      } catch (err) {
        console.error('[ScoringCriteriaPanel] Exception fetching Area IV rows:', err);
        setAreaIVImportedRows([]);
      } finally {
        setAreaIVLoadingRows(false);
      }
    };

    fetchImportedRows();
  }, [areaIVModalOpen, area?.area_id, currentCycle, submission, selectedApplication]);

  const totalCriteriaScore = draftCriteriaScores.reduce((sum, criterion) => sum + Number(criterion.score || 0), 0);
  const displayedCriteriaScore = Math.min(totalCriteriaScore, areaMaxPoints);
  const totalExcessScore = Math.max(0, totalCriteriaScore - areaMaxPoints);
  const maxCriteriaScore = areaMaxPoints;
  const areaIVFilteredRows = areaIVDebouncedSearch
    ? areaIVImportedRows.filter((row) => {
        const employee = String(row.employee_name || '').toLowerCase();
        const rate = String(row.total_average_rate || '').toLowerCase();
        return employee.includes(areaIVDebouncedSearch) || rate.includes(areaIVDebouncedSearch);
      })
    : areaIVImportedRows;

  const handleCriterionChange = (criterionKey, value) => {
    // Coerce empty or invalid entries to 0 to avoid backend validation errors
    const parsed = (value === null || value === undefined || String(value).trim() === '') ? 0 : Number(value);
    const normalized = Number.isFinite(parsed) ? parsed : 0;
    hasUnsavedUserEditsRef.current = true;

    setDraftCriteriaScores((prev) => {
      const updated = prev.map((criterion) => (
        criterion.criterion_key === criterionKey
          ? { ...criterion, score: normalized }
          : criterion
      ));

      return applyAreaMaxExcess(updated);
    });
  };

  if (!area) {
    return (
      <div className="pdf-panel">
        <div className="pdf-panel-header">
          <div className="pdf-panel-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Scoring Details
          </div>
          <button className="close-btn" onClick={onClose} style={{ fontSize: '20px', cursor: 'pointer', background: 'none', border: 'none' }}>×</button>
        </div>
        <div className="pdf-no-submission"><p>Select an area to view scoring criteria and submitted documents</p></div>
      </div>
    );
  }

  return (
    <div className="pdf-panel">
      <div className="pdf-panel-header">
          <div className="pdf-panel-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span>{area.label || area.area_name}</span>
        </div>
        <button className="close-btn" onClick={onClose} style={{ fontSize: '20px', cursor: 'pointer', background: 'none', border: 'none' }}>×</button>
      </div>

      {submission?.is_placeholder && (
        <div style={{ padding: '12px 16px', background: '#fef3c7', borderBottom: '1px solid #fcd34d', color: '#92400e' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px', flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span><strong>⏳ Pending Faculty Submission</strong> — Faculty has not yet submitted for this area. You can still view and apply the rubric template.</span>
          </div>
        </div>
      )}

      {submission && (
        <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Accumulated Criteria Score</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#059669', marginTop: '4px' }}>
                {displayedCriteriaScore.toFixed(2)}
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginLeft: '8px' }}>/ {maxCriteriaScore > 0 ? maxCriteriaScore.toFixed(2) : '—'} pts</span>
              </div>
            </div>
          </div>

          {/* Total excess points (summed across criteria) shown below accumulated score */}
          <div style={{ marginTop: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Excess Points</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: totalExcessScore > 0 ? '#dc2626' : '#9ca3af' }}>
              {totalExcessScore > 0 ? `+${totalExcessScore.toFixed(2)}` : '0.00'}
            </div>
          </div>
        </div>
      )}

      {area.description && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontSize: '14px', color: '#666' }}>
          <strong>Description:</strong> {area.description}
        </div>
      )}

      {area.area_id && (CRITERIA_DEFINITIONS[area.area_id] || CRITERIA_DEFINITIONS[1]) && (
        <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>Evaluation Criteria</div>
            {area?.area_id === 7 && (
              <button
                type="button"
                onClick={() => setAreaIVModalOpen(true)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #10b981',
                  background: '#ecfdf5',
                  color: '#047857',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#d1fae5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ecfdf5';
                }}
                title="Search imported employee names"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                  <circle cx="11" cy="11" r="7" />
                  <line x1="16.65" y1="16.65" x2="21" y2="21" />
                </svg>
                Search Imported Names
              </button>
            )}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #d1d5db', background: '#f3f4f6' }}>
                <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: '700', color: '#374151' }}>Criteria / Title</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', fontWeight: '700', color: '#374151', width: '80px' }}>Max Pts</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', fontWeight: '700', color: '#374151', width: '110px' }}>Score</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '700', color: '#374151', width: '80px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {draftCriteriaScores.map((criterion, i) => {
                const keyForThis = String(criterion.criterion_key || criterion.label || '').trim();
                const hasChildren = draftCriteriaScores.some((c) => {
                  const possibleParents = [c.parent_key, c.parentKey, c.parent];
                  return possibleParents.some((pk) => pk !== undefined && String(pk) === keyForThis);
                }) || (Array.isArray(criterion.children) && criterion.children.length > 0);

                const rowIsDisplayOnly = Boolean(criterion.displayOnly || criterion.parentOnly || hasChildren);
                const paddingLeft = rowIsDisplayOnly ? '8px' : (criterion.label && criterion.label.includes('.') ? '24px' : '8px');
                const hasMaxPoints = Number(criterion.maxPoints ?? 0) > 0;
                // Only allow scoring when there is a numeric per-criterion max defined.
                // Criteria rendered as '—' (no max / rubric-defined no-max) will not show inputs.
                const allowScoreInput = !rowIsDisplayOnly && hasMaxPoints;
                
                // Match the criterion label against raw or normalized submission part ids.
                const partLabel = criterion.label || '';
                const partLetter = partLabel.split('.')[0];
                const compactPartLabel = normalizePartLookupKey(partLabel);
                const compactPartLetter = normalizePartLookupKey(partLetter);
                const submissionPartLabel = String(submission?.part_id || submission?.part_name || '')
                  .trim()
                  .split(/[-_\s\/]+/)
                  .pop();
                const exactSubmissionPartKey = normalizePartLookupKey(submissionPartLabel);
                const exactCriterionPartKey = normalizePartLookupKey(partLabel);
                const isExactPartMatch = exactSubmissionPartKey && exactCriterionPartKey && exactSubmissionPartKey === exactCriterionPartKey;
                
                // Construct candidate keys from the area roman numeral and the exact criterion label.
                let partSubmissionFile = null;
                const candidateKeys = rowIsDisplayOnly ? [] : [
                  partLabel,
                  `Part ${partLabel}`,
                ];

                if (!rowIsDisplayOnly && area?.label) {
                  const areaRomanMatch = area.label.match(/AREA\s+([IVX]+)/i);
                  const areaRoman = areaRomanMatch ? areaRomanMatch[1] : '';
                  if (areaRoman) {
                    candidateKeys.unshift(
                      `${areaRoman}-${partLabel}`,
                      `${areaRoman}-${compactPartLabel}`,
                    );
                  }
                }

                if (rowIsDisplayOnly) {
                  partSubmissionFile = submission?.file_path ? getPublicFileUrl(submission.file_path) : null;
                } else {
                  const normalizedCandidates = candidateKeys
                    .flatMap((key) => [key, normalizePartLookupKey(key)])
                    .filter(Boolean);

                  partSubmissionFile = normalizedCandidates
                    .map((key) => partSubmissions[key])
                    .find(Boolean) || null;

                  if (!partSubmissionFile && compactPartLabel !== compactPartLetter) {
                    partSubmissionFile = Object.entries(partSubmissions).find(([key, filePath]) => {
                      const normalizedKey = normalizePartLookupKey(key);
                      return filePath && normalizedKey.includes(compactPartLabel);
                    })?.[1] || null;
                  }

                  if (!partSubmissionFile && isExactPartMatch && submission?.file_path) {
                    partSubmissionFile = getPublicFileUrl(submission.file_path);
                  }
                }

                partSubmissionFile = resolvePreviewFileUrl(partSubmissionFile);

                if (i === 0) {
                  console.log('[ScoringCriteriaPanel] File lookup for criterion 0:', {
                    partLabel,
                    partLetter,
                    compactPartLabel,
                    isExactPartMatch,
                    'area.label': area.label,
                    candidateKeys,
                    partSubmissions,
                    partSubmissionFile,
                  });
                }

                return (
                  <tr key={`item-${i}`} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: `8px ${paddingLeft}`, color: '#1f2937', fontSize: '11px' }}>
                      <span style={{ fontWeight: '600', color: '#059669', marginRight: '6px' }}>{criterion.label}</span>
                      {criterion.title}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 8px', color: '#059669', fontWeight: '600' }}>
                      {hasMaxPoints ? criterion.maxPoints.toFixed(2) : '—'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 8px' }}>
                      {rowIsDisplayOnly ? null : (
                        allowScoreInput ? (
                          <input
                            id={`score-input-${criterion.criterion_key || i}`}
                            name={`score-${criterion.criterion_key || i}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={criterion.score}
                            onFocus={(e) => {
                              if (Number(criterion.score) === 0) {
                                e.target.select();
                              }
                            }}
                            onChange={(e) => handleCriterionChange(criterion.criterion_key, e.target.value)}
                            aria-label={`Score for ${criterion.label}: ${criterion.title}`}
                            style={{ width: '100px', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', textAlign: 'right', background: 'white' }}
                          />
                        ) : (
                          <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>—</span>
                        )
                      )}
                    </td>
                    <td style={{ textAlign: 'center', padding: '8px 8px' }}>
                      {rowIsDisplayOnly ? (
                        partSubmissionFile ? (
                          <button
                            type="button"
                            onClick={() => {
                              setViewerModalFile(partSubmissionFile);
                              setViewerModalOpen(true);
                            }}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid #3b82f6',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = '#dbeafe';
                              e.target.style.borderColor = '#1d4ed8';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = '#eff6ff';
                            }}
                          >
                            View File
                          </button>
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: '11px' }}>—</span>
                        )
                      ) : area?.area_id === 7 ? (
                        <span style={{ color: '#9ca3af', fontSize: '11px' }}>—</span>
                      ) : partSubmissionFile ? (
                        <button
                          type="button"
                          onClick={() => {
                            setViewerModalFile(partSubmissionFile);
                            setViewerModalOpen(true);
                          }}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #3b82f6',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#dbeafe';
                            e.target.style.borderColor = '#1d4ed8';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = '#eff6ff';
                          }}
                        >
                          View File
                        </button>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '11px' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: '2px solid #d1d5db', background: '#f9fafb' }}>
                <td style={{ padding: '10px 8px', fontWeight: '700', color: '#1f2937' }}>TOTAL</td>
                <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '700', color: '#059669' }}>{maxCriteriaScore.toFixed(2)}</td>
                <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '700', color: '#111827' }}>{displayedCriteriaScore.toFixed(2)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* File Viewer Modal */}
      {viewerModalOpen && (
        <DocumentViewer
          fileUrl={resolvePreviewFileUrl(viewerModalFile)}
          fileName={viewerModalFile?.split('/').pop() || 'document'}
          onClose={() => setViewerModalOpen(false)}
        />
      )}

      {areaIVModalOpen && area?.area_id === 7 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }} onClick={() => setAreaIVModalOpen(false)}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>Imported Names</div>
              <button
                type="button"
                onClick={() => setAreaIVModalOpen(false)}
                style={{
                  fontSize: '24px',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  padding: '0',
                }}
              >
                ×
              </button>
            </div>

            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '16px 20px',
            }}>
              <div style={{ marginBottom: '12px' }}>
                <input
                  type="search"
                  value={areaIVSearch}
                  onChange={(e) => setAreaIVSearch(e.target.value)}
                  placeholder="Search employee name or rate"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>
              {areaIVLoadingRows ? (
                <Loader message="Loading imported rows..." center={false} />
              ) : areaIVFilteredRows.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>No imported rows available</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
                      <th style={{ textAlign: 'left', padding: '12px 0', fontWeight: '600', color: '#374151' }}>Employee Name</th>
                      <th style={{ textAlign: 'right', padding: '12px 0', fontWeight: '600', color: '#374151' }}>Total Average Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {areaIVFilteredRows.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '12px 0', color: '#1f2937' }}>{row.employee_name}</td>
                        <td style={{ textAlign: 'right', padding: '12px 0', color: '#059669', fontWeight: '600' }}>{row.total_average_rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AreaCard({ area, isExpanded, isSelected, draftScore, onToggle, onDraftChange, onSave, isSaving, onSelectArea }) {
  const [isHovered, setIsHovered] = useState(false);
  const [viewerModalOpen, setViewerModalOpen] = useState(false);
  const [viewerModalFile, setViewerModalFile] = useState(null);
  const areaId = area.area_id || 1;
  const areaCriteria = CRITERIA_DEFINITIONS[areaId] || CRITERIA_DEFINITIONS[1];
  const summedCriteriaMax = (areaCriteria || []).reduce((s, c) => s + Number(c.maxPoints || c.points || 0), 0);
  const maxPoints = Number(area.maxPoints ?? area.max ?? summedCriteriaMax ?? 0);

  return (
    <div 
      className="area-card"
      onClick={() => onSelectArea(area)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        cursor: 'pointer',
        backgroundColor: isSelected ? '#ffffff' : (isHovered ? '#f0f9ff' : 'transparent'),
        border: isSelected ? '2px solid #0ea5e9' : (isHovered ? '1px solid #0ea5e9' : '1px solid #e5e7eb'),
        transition: 'all 0.2s ease',
        boxShadow: isSelected ? '0 4px 16px rgba(14, 165, 233, 0.2)' : (isHovered ? '0 4px 12px rgba(14, 165, 233, 0.1)' : 'none'),
      }}
    >
      <div className="area-card-header">
        <div>
          <div className="area-card-title">{area.label}</div>
            <div className="area-card-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span>Max: {maxPoints} pts</span>
            {area.file_path ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  // Open the side details panel for this area instead of opening a file modal
                  onSelectArea && onSelectArea(area);
                }}
                style={{ padding: '2px 8px', borderRadius: '999px', border: '1px solid #93c5fd', background: '#eff6ff', color: '#1d4ed8', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
              >
                View file
              </button>
            ) : (
              <span style={{ color: '#94a3b8', fontSize: '11px' }}>No file</span>
            )}
          </div>
        </div>
        <div className="area-card-right">
          <div style={{ textAlign: 'right' }}>
            <div className="area-score">{area.cappedScore || area.score}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              / {area.max} pts
            </div>
            {Number(area.excessScore) > 0 && (
              <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px', fontWeight: '500' }}>
                +{area.excessScore}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File Viewer Modal */}
      {viewerModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            width: '90%',
            height: '90vh',
            maxWidth: '1200px',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                Document Viewer — {area.label}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    const publicUrl = getPublicFileUrl(viewerModalFile);
                    const link = document.createElement('a');
                    link.href = publicUrl;
                    link.download = viewerModalFile?.split('/').pop() || 'document';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                    background: '#f3f4f6',
                    color: '#374151',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#e5e7eb';
                    e.target.style.borderColor = '#9ca3af';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#f3f4f6';
                    e.target.style.borderColor = '#d1d5db';
                  }}
                >
                  ↓ Download
                </button>
                <button
                  type="button"
                  onClick={() => setViewerModalOpen(false)}
                  style={{
                    fontSize: '24px',
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    color: '#6b7280',
                    padding: '0',
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto', background: '#f9fafb' }}>
              {viewerModalFile && viewerModalFile.endsWith('.pdf') ? (
                <iframe
                  src={getPublicFileUrl(viewerModalFile)}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                  title="Document Viewer"
                />
              ) : viewerModalFile ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: '#666',
                }}>
                  <p>Preview not available for this file type.</p>
                  <a
                    href={getPublicFileUrl(viewerModalFile)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#0ea5e9',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                    }}
                  >
                    Click here to download the file
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QualificationDropdown({ label, selected, onToggle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const displayLabel = selected && selected.length > 0
    ? collapseRangesFromArray(selected, RANKS)
    : `Select ${label}...`;

  return (
    <div className="qual-select-wrap" ref={ref} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          minHeight: '32px',
          padding: '6px 10px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          background: 'white',
          textAlign: 'left',
          fontSize: '12px',
          color: selected && selected.length > 0 ? '#111827' : '#6b7280',
          cursor: 'pointer',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {displayLabel}
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 20,
            background: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            boxShadow: '0 12px 24px rgba(15, 23, 42, 0.12)',
            padding: '8px',
            maxHeight: '280px',
            overflowY: 'auto',
          }}
        >
          {RANKS.map((option) => (
            <label
              key={option}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 4px',
                fontSize: '12px',
                color: '#111827',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={(selected || []).includes(option)}
                onChange={() => onToggle(option)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function SummaryView({ onBack, areaScores, onCompleted, initialQuals = {} }) {
  const [experienceInDegree, setExperienceInDegree] = useState([]);
  const [degree, setDegree] = useState([]);
  const [teaching, setTeaching] = useState('Qualified');
  const [research, setResearch] = useState('Qualified');
  const [eligibility, setEligibility] = useState('Qualified');
  const [isSaving, setIsSaving] = useState(false);

  // Prefill from initial qualifications when provided
  useEffect(() => {
    if (!initialQuals) return;

    if (initialQuals.qual_experience) {
      try {
        setExperienceInDegree(expandCompressedRanges(initialQuals.qual_experience));
      } catch (e) {
        console.warn('Failed to expand qual_experience', e);
      }
    }

    if (initialQuals.qual_degree) {
      try {
        setDegree(expandCompressedRanges(initialQuals.qual_degree));
      } catch (e) {
        console.warn('Failed to expand qual_degree', e);
      }
    }

    if (initialQuals.qual_teaching) setTeaching(initialQuals.qual_teaching);
    if (initialQuals.qual_research) setResearch(initialQuals.qual_research);
    if (initialQuals.qual_eligibility) setEligibility(initialQuals.qual_eligibility);
  }, [initialQuals]);

  // Compute Teaching Performance rating from Area IV scores (auto)
  const computeTeachingRating = (areaScores = []) => {
    if (!Array.isArray(areaScores) || areaScores.length === 0) return null;
    // Find the Performance Evaluation area
    const perfArea = areaScores.find(a => /performance/i.test(String(a.label || '')) || /area\s*iv/i.test(String(a.label || '')));
    if (!perfArea) return null;

    const points = Number(perfArea.cappedScore || perfArea.cappedScore === 0 ? perfArea.cappedScore : perfArea.score || 0);
    if (!Number.isFinite(points)) return null;

    const rubricArea = RANKING_RUBRICS.find(r => Number(r.areaId) === 4 || String(r.areaCode).toUpperCase() === 'IV');
    if (!rubricArea) return null;

    const children = (rubricArea.subAreas || []).reduce((acc, s) => {
      if (Array.isArray(s.children)) acc.push(...s.children);
      return acc;
    }, []);

    if (children.length === 0) return null;

    // Match by nearest integer maxPoints (children use 1..10)
    const target = Math.round(Number(points));
    let match = children.find(c => Number(c.maxPoints) === target);
    if (!match) {
      // fallback to nearest by absolute difference
      match = children.slice().sort((a, b) => Math.abs(Number(a.maxPoints) - target) - Math.abs(Number(b.maxPoints) - target))[0];
    }
    if (!match) return null;

    // Extract rating text from label (e.g. '1.00-1.39 Poor' -> 'Poor')
    const label = String(match.label || match.title || '');
    const m = label.match(/(Poor|Fair|Satisfactory|Very Satisfactory|Outstanding)/i);
    return m ? m[0].replace(/\s+/g, ' ').trim() : label;
  };

  const computedTeaching = computeTeachingRating(areaScores);

  const toggleExperience = (option) => {
    setExperienceInDegree((prev) => (
      prev.includes(option)
        ? prev.filter((item) => item !== option)
        : [...prev, option]
    ));
  };

  const toggleDegree = (option) => {
    setDegree((prev) => (
      prev.includes(option)
        ? prev.filter((item) => item !== option)
        : [...prev, option]
    ));
  };

  const handleCompleted = async () => {
    try {
      setIsSaving(true);
      
      // Format the qualifications
      const qualifications = {
        qual_experience: collapseRangesFromArray(experienceInDegree, RANKS) || '',
        qual_degree: collapseRangesFromArray(degree, RANKS) || '',
        qual_teaching: computedTeaching || teaching || 'Qualified',
        qual_research: research || 'Qualified',
        qual_eligibility: eligibility || 'Qualified',
      };

      // Call the onCompleted callback with the qualifications data
      if (onCompleted) {
        await onCompleted(qualifications);
      }
    } catch (error) {
      console.error('❌ Error saving qualifications:', error);
      alert('Failed to save qualifications. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate total score including excess points
  const totalCappedScore = areaScores.reduce((sum, a) => sum + (a.cappedScore || 0), 0);
  const totalExcessScore = areaScores.reduce((sum, a) => sum + (a.excessScore || 0), 0);
  const totalScoreIncludingExcess = totalCappedScore + totalExcessScore;
  const totalPct = Math.min(100, Math.round((totalScoreIncludingExcess / 200) * 100));

  return (
    <div className="summary-layout">
      <div className="scores-panel">
        <div className="scores-panel-title">Area Scores</div>
        
        {/* Total Score Section */}
        <div className="total-score-section">
          <div className="total-score-header">
            <span style={{ fontWeight: '600' }}>TOTAL SCORE</span>
            <span className="total-score-value">{totalScoreIncludingExcess.toFixed(2)}/200</span>
          </div>
          <div className="score-bar-bg">
            <div className="score-bar-fill" style={{ width: `${totalPct}%` }} />
          </div>
        </div>

        {areaScores.length === 0 ? (
          <div style={{ padding: '8px 0', color: '#6b7280', fontSize: '0.8rem' }}>
            No scored area submissions yet.
          </div>
        ) : (
          areaScores.map((a, i) => (
            <div className="score-bar-item" key={i}>
              <div className="score-bar-header">
                <span>{a.label}</span>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {a.excessScore > 0 ? (
                    <>
                      <span className="score-bar-val" style={{ color: '#065f46' }}>{a.max.toFixed(2)}</span>
                      <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '600' }}>+{a.excessScore.toFixed(2)}</span>
                    </>
                  ) : (
                    <span className="score-bar-val">{a.cappedScore.toFixed(2)}</span>
                  )}
                </div>
              </div>
              <div className="score-bar-bg">
                <div className="score-bar-fill" style={{ width: `${a.pct}%` }} />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="qual-panel">
        <div className="qual-panel-title">Qualification Overview</div>

        <div className="qual-row" style={{ marginBottom: '6px' }}>
          <label>Experience</label>
          <QualificationDropdown
            label="Experience"
            selected={experienceInDegree}
            onToggle={toggleExperience}
          />
        </div>
        <div className="qual-row" style={{ marginBottom: '6px' }}>
          <label>Degree</label>
          <QualificationDropdown
            label="Degree"
            selected={degree}
            onToggle={toggleDegree}
          />
        </div>
        <div className="qual-row" style={{ marginBottom: '6px' }}>
          <label>Teaching performance</label>
            <div className="qual-select-wrap no-arrow">
              <select value={computedTeaching || ''} disabled>
                <option>{computedTeaching || 'N/A'}</option>
              </select>
            </div>
        </div>
        <div className="qual-row" style={{ marginBottom: '6px' }}>
          <label>Research Output</label>
          <div className="qual-select-wrap">
            <select value={research} onChange={(e) => setResearch(e.target.value)}>
              <option>Qualified</option>
              <option>Not Qualified</option>
            </select>
          </div>
        </div>
        <div className="qual-row" style={{ marginBottom: '6px' }}>
          <label>Elegibility</label>
          <div className="qual-select-wrap">
            <select value={eligibility} onChange={(e) => setEligibility(e.target.value)}>
              <option>Qualified</option>
              <option>Not Qualified</option>
            </select>
          </div>
        </div>

        <div className="qual-footer" style={{ marginTop: '12px' }}>
          <button className="btn-nav btn-nav-prev" onClick={onBack} disabled={isSaving}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Go Back
          </button>
          <button 
            className="btn-completed" 
            onClick={handleCompleted}
            disabled={isSaving}
            style={{ opacity: isSaving ? 0.6 : 1, cursor: isSaving ? 'not-allowed' : 'pointer' }}
          >
            {isSaving ? 'Saving...' : 'Completed'}
          </button>
        </div>
      </div>
    </div>
  );
}
