import React, { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '../../../supabase';
import { RANKING_RUBRICS } from '../../../data/rankingRubrics';

const IMPORT_TABLE = 'area_iv_student_evaluation_imports';
const PAGE_SIZE = 10;

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function nameKey(value) {
  return normalizeKey(value)
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}

function nameMatches(a, b) {
  const left = nameKey(a);
  const right = nameKey(b);

  if (!left || !right) {
    return false;
  }

  if (left === right) {
    return true;
  }

  const leftTokens = new Set(left.split(/\s+/));
  const rightTokens = new Set(right.split(/\s+/));
  let matches = 0;

  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) {
      matches += 1;
    }
  });

  const coverage = matches / Math.max(leftTokens.size, rightTokens.size, 1);
  return coverage >= 0.75;
}

function parseRate(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = Number(String(value).replace(/,/g, '').replace(/%/g, '').trim());
  return Number.isFinite(numeric) ? numeric : null;
}

function firstValue(row, keys) {
  for (const key of keys) {
    const normalizedTarget = normalizeKey(key);

    for (const [rowKey, rowValue] of Object.entries(row || {})) {
      const nk = normalizeKey(rowKey);
      if ((nk === normalizedTarget || nk.includes(normalizedTarget) || normalizedTarget.includes(nk)) && rowValue !== '' && rowValue !== null && rowValue !== undefined) {
        return rowValue;
      }
    }
  }

  return null;
}

function facultyFullName(faculty) {
  if (!faculty) {
    return '';
  }

  return [faculty.name_last, faculty.name_first, faculty.name_middle]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ')
    .trim();
}

async function parseSpreadsheet(file) {
  const lowerName = String(file.name || '').toLowerCase();

  if (lowerName.endsWith('.csv')) {
    const text = await file.text();
    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: 'greedy',
    });

    if (parsed.errors?.length) {
      throw new Error(parsed.errors[0].message || 'Unable to parse CSV');
    }

    return parsed.data || [];
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('The workbook does not contain any worksheets.');
  }

  const sheet = workbook.Sheets[sheetName];
  // Always inspect raw rows to locate a header row (header may not be the first row)
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  let headerRowIndex = -1;
  for (let ri = 0; ri < Math.min(15, raw.length); ri++) {
    const row = raw[ri] || [];
    const norm = row.map((c) => normalizeKey(String(c || '')));
    
    // Look for a row that contains BOTH Employee Name and Total Average Rate
    const hasEmployeeName = norm.some((cell) => {
      const n = normalizeKey(cell);
      return (n.includes('employee') && n.includes('name')) || n === 'employee name' || n === 'name';
    });
    
    const hasAverageRate = norm.some((cell) => {
      const n = normalizeKey(cell);
      return (n.includes('total') && n.includes('average') && n.includes('rate')) 
        || n === 'total average rate' 
        || (n.includes('average') && n.includes('rate'));
    });
    
    if (hasEmployeeName && hasAverageRate) {
      headerRowIndex = ri;
      break;
    }
  }

  if (headerRowIndex >= 0) {
    const header = (raw[headerRowIndex] || []).map((h) => String(h || '').trim());
    const dataRows = raw.slice(headerRowIndex + 1);
    const rows = dataRows.map((r) => {
      const obj = {};
      for (let ci = 0; ci < header.length; ci++) {
        const key = header[ci] || `col${ci}`;
        obj[key] = r[ci] ?? '';
      }
      return obj;
    });
    return rows || [];
  }

  // Fallback: convert using first-row-as-header
  return XLSX.utils.sheet_to_json(sheet, { defval: '' }) || [];
}

function mapImportedRows(rawRows, applications, cycleId, fileName) {
  return (rawRows || [])
    .map((row, index) => {
      // Extract Employee Name and Total Average Rate (flexible column matching)
      let employeeName = null;
      let averageRate = null;

      for (const [key, value] of Object.entries(row || {})) {
        const nk = normalizeKey(String(key || ''));
        const nv = String(value || '').trim();

        if (nv) {
          // Find Employee Name column (matches any header variation)
          if (!employeeName) {
            if ((nk.includes('employee') && nk.includes('name')) || nk === 'employee name' || nk === 'name') {
              employeeName = nv;
            }
          }

          // Find Total Average Rate column (matches any header variation)
          if (!averageRate) {
            if ((nk.includes('total') && nk.includes('average') && nk.includes('rate')) 
              || nk === 'total average rate' 
              || (nk.includes('average') && nk.includes('rate'))) {
              averageRate = parseRate(nv);
            }
          }
        }
      }

      if (!employeeName || averageRate === null) {
        return null;
      }

      const importedName = String(employeeName).trim();
      
      // Skip footer rows and empty rows
      if (!importedName || importedName.length === 0 || importedName.includes('Report') || importedName.includes('generated')) {
        return null;
      }

      const importedKey = nameKey(importedName);
      const matchedApplication = (applications || []).find((application) => {
        const facultyName = facultyFullName(application.faculty);
        return nameMatches(importedKey, facultyName);
      }) || null;

      return {
        cycle_id: cycleId,
        employee_name: importedName,
        normalized_name: importedKey,
        total_average_rate: averageRate,
        matched_application_id: matchedApplication?.id ?? null,
        matched_faculty_id: matchedApplication?.faculty?.user_id ?? null,
        source_file_name: fileName,
        source_row_number: index + 2,
      };
    })
    .filter(Boolean);
}

export default function AreaIVImportPanel({
  currentCycle,
  applications,
  selectedApplication,
  selectedFaculty,
  selectedArea,
  draftScore,
  onDraftScoreChange,
  initialModalOpen = false,
  showUploader = true,
  showUseButton = true,
  forceModalOpen = false,
  onModalClose = null,
  onAutoScoreComplete = null,
}) {
  const [importRows, setImportRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [savingImport, setSavingImport] = useState(false);
  const [importError, setImportError] = useState('');
  const [debugParsedRows, setDebugParsedRows] = useState([]);
  const [debugRawRows, setDebugRawRows] = useState([]);
  const [debugHeaderRow, setDebugHeaderRow] = useState(null);
  const [notice, setNotice] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  const cycleId = currentCycle?.cycle_id ?? null;
  const selectedName = facultyFullName(selectedFaculty || selectedApplication?.faculty);

  useEffect(() => {
    if (forceModalOpen) {
      setModalOpen(true);
    }
  }, [forceModalOpen]);

  useEffect(() => {
    let shouldOpen = initialModalOpen;

    try {
      shouldOpen = shouldOpen || localStorage.getItem('review_area_iv_import_open') === 'true';
    } catch (error) {
      // ignore storage errors
    }

    if (shouldOpen) {
      setModalOpen(true);
      try {
        localStorage.removeItem('review_area_iv_import_open');
      } catch (error) {
        // ignore storage errors
      }
    }
  }, [initialModalOpen]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchValue.trim().toLowerCase());
    }, 300);

    return () => window.clearTimeout(handle);
  }, [searchValue]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, cycleId]);

  useEffect(() => {
    let active = true;

    const loadRows = async () => {
      if (!cycleId) {
        setImportRows([]);
        return;
      }

      setLoadingRows(true);
      setImportError('');

      const { data, error } = await supabase
        .from(IMPORT_TABLE)
        .select('*')
        .eq('cycle_id', cycleId)
        .order('created_at', { ascending: true });

      if (!active) {
        return;
      }

      if (error) {
        setImportError(error.message || 'Failed to load imported rows.');
        setImportRows([]);
      } else {
        setImportRows(data || []);
      }

      setLoadingRows(false);
    };

    void loadRows();

    return () => {
      active = false;
    };
  }, [cycleId]);

  useEffect(() => {
    const handler = (e) => {
      try {
        const txt = e?.detail?.notice || '';
        if (txt) setNotice(txt);
      } catch (err) {
        // ignore
      }
    };

    window.addEventListener('areaiv:autoscored', handler);
    return () => window.removeEventListener('areaiv:autoscored', handler);
  }, []);

  const decoratedRows = useMemo(() => {
    return (importRows || []).map((row) => {
      const matchedApplication = (applications || []).find((application) => application.id === row.matched_application_id)
        || (applications || []).find((application) => nameMatches(row.employee_name, facultyFullName(application.faculty)))
        || null;

      return {
        ...row,
        matchedApplication,
        isSelectedMatch: Boolean(selectedApplication?.id && (row.matched_application_id === selectedApplication.id || nameMatches(row.employee_name, selectedName))),
      };
    });
  }, [applications, importRows, selectedApplication?.id, selectedName]);

  const selectedMatch = useMemo(() => {
    if (!selectedApplication?.id) {
      return null;
    }

    return decoratedRows.find((row) => row.matched_application_id === selectedApplication.id || row.isSelectedMatch) || null;
  }, [decoratedRows, selectedApplication?.id]);

  const autoMatchedCount = useMemo(() => {
    return (importRows || []).filter((row) => row.matched_application_id || row.matched_faculty_id).length;
  }, [importRows]);

  const filteredRows = useMemo(() => {
    if (!debouncedSearch) {
      return decoratedRows;
    }

    return decoratedRows.filter((row) => {
      const searchTarget = `${row.employee_name} ${row.total_average_rate}`.toLowerCase();
      return searchTarget.includes(debouncedSearch);
    });
  }, [debouncedSearch, decoratedRows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const paginatedRows = filteredRows.slice(pageStart, pageStart + PAGE_SIZE);

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !cycleId) {
      return;
    }

    setSavingImport(true);
    setImportError('');
    setNotice('');

    try {
      const rawRows = await parseSpreadsheet(file);
      setDebugParsedRows((rawRows || []).slice(0, 10));
      const mappedRows = mapImportedRows(rawRows, applications, cycleId, file.name);

      if (mappedRows.length === 0) {
        // Attempt to get the raw sheet arrays for debugging
        try {
          const rawArrays = await (async () => {
            const lowerName = String(file.name || '').toLowerCase();
            if (lowerName.endsWith('.csv')) {
              const text = await file.text();
              return Papa.parse(text, { skipEmptyLines: false, header: false }).data || [];
            }
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) || [];
          })();

          setDebugRawRows((rawArrays || []).slice(0, 10));
          // if a header row was detected earlier in parseSpreadsheet, try to find it here
          const hdr = (rawArrays || []).find((r, i) => {
            if (!Array.isArray(r)) return false;
            const norm = r.map((c) => normalizeKey(String(c || '')));
            return norm.some((cell) => ['employee name','total average rate','average rate','employee','name','rate'].some(e => cell.includes(normalizeKey(e))));
          });
          setDebugHeaderRow(hdr || null);
        } catch (dbgErr) {
          // ignore
        }

        throw new Error('No valid rows were found. Make sure the file has Employee Name and Total Average Rate columns. Scroll down for detected headers and sample rows.');
      }

      const { error: deleteError } = await supabase
        .from(IMPORT_TABLE)
        .delete()
        .eq('cycle_id', cycleId);

      if (deleteError) {
        throw deleteError;
      }

      const { error: insertError } = await supabase
        .from(IMPORT_TABLE)
        .insert(mappedRows);

      if (insertError) {
        throw insertError;
      }

      // After successfully inserting import rows, attempt to auto-apply scores
      try {
        // run async but do not block UI; log errors
        void (async () => {
          try {
            await autoApplyScores(mappedRows, onAutoScoreComplete);
          } catch (autoErr) {
            // eslint-disable-next-line no-console
            console.warn('Auto-apply Area IV scores failed:', autoErr);
          }
        })();
      } catch (e) {
        // ignore
      }

      setImportRows(mappedRows);
      setNotice(`Imported ${mappedRows.length} row${mappedRows.length === 1 ? '' : 's'} from ${file.name}.`);
    } catch (error) {
      setImportError(error?.message || 'Failed to import the spreadsheet.');
    } finally {
      setSavingImport(false);
    }
  };

  const handleUseScore = (rate) => {
    if (!selectedArea?.id) {
      return;
    }

    onDraftScoreChange(selectedArea.id, String(rate));
  };

  if (!cycleId) {
    return (
      <div className="area-iv-card">
        <div className="area-iv-title">Area IV Student Evaluation Import</div>
        <div className="area-iv-empty">Select an active period before importing student evaluation data.</div>
      </div>
    );
  }

  return (
    <div className="area-iv-card">
      {showUploader && (
        <div className="area-iv-header">
          <div>
            <div className="area-iv-title">Area IV Student Evaluation Import</div>
            <div className="area-iv-subtitle">Import CSV or XLSX files, match faculty names, and reuse the imported average rate while scoring.</div>
          </div>
        </div>
      )}
      {!showUploader && (
        <div style={{ marginBottom: '12px' }}>
          <button type="button" className="area-iv-icon-button" onClick={() => setModalOpen(true)} aria-label="Search imported names" title="Search imported names" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', padding: 0, border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#374151' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '18px', height: '18px' }}>
              <circle cx="11" cy="11" r="7" />
              <line x1="16.65" y1="16.65" x2="21" y2="21" />
            </svg>
          </button>
        </div>
      )}

      {showUploader && (
        <div className="area-iv-upload">
          <label className="area-iv-upload-label" aria-label="Upload Area IV file">
            <span className="area-iv-upload-button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 3v12" />
                <path d="m7 8 5-5 5 5" />
                <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
              </svg>
              {savingImport ? 'Importing...' : 'Upload CSV or XLSX'}
            </span>
            <input
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={handleImportFile}
              disabled={savingImport}
            />
          </label>
          <div className="area-iv-cycle">Current period: {currentCycle?.semester || 'Period'} {currentCycle?.year || ''}</div>
        </div>
      )}

      {notice && <div className="area-iv-notice">{notice}</div>}
      {importError && <div className="area-iv-error">{importError}</div>}
      {importError && (debugParsedRows.length > 0 || debugRawRows.length > 0) && (
        <div className="area-iv-debug">
          <div style={{ marginTop: '10px', fontWeight: 700 }}>Debug: parsed rows (first 10)</div>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', background: '#f8fafc', padding: '8px', borderRadius: '6px' }}>{JSON.stringify(debugParsedRows, null, 2)}</pre>
          {debugHeaderRow && (
            <>
              <div style={{ marginTop: '8px', fontWeight: 700 }}>Detected header row (approx)</div>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', background: '#f8fafc', padding: '8px', borderRadius: '6px' }}>{JSON.stringify(debugHeaderRow)}</pre>
            </>
          )}
          {debugRawRows.length > 0 && (
            <>
              <div style={{ marginTop: '8px', fontWeight: 700 }}>Raw sheet rows (first 10)</div>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', background: '#f8fafc', padding: '8px', borderRadius: '6px' }}>{JSON.stringify(debugRawRows, null, 2)}</pre>
            </>
          )}
        </div>
      )}

      <div className="area-iv-summary">
        <div>
          <div className="area-iv-summary-label">Faculty Evaluations</div>
          <div className="area-iv-summary-value">{loadingRows ? 'Loading...' : importRows.length}</div>
        </div>
        <div>
          <div className="area-iv-summary-label">Auto-Matched Faculty</div>
          <div className="area-iv-summary-value">{loadingRows ? 'Loading...' : autoMatchedCount}</div>
        </div>
      </div>

      {selectedMatch && (
        <div className="area-iv-match-card">
          <div className="area-iv-match-title">Matched to current faculty</div>
          <div className="area-iv-match-line">{selectedMatch.employee_name}</div>
          <div className="area-iv-match-line">Total Average Rate: {selectedMatch.total_average_rate}</div>
          {showUseButton && (
            <button type="button" className="area-iv-use-button" onClick={() => handleUseScore(selectedMatch.total_average_rate)}>
              Use imported rate as score input
            </button>
          )}
        </div>
      )}

      {showUploader && importRows.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>
            All Imported Rows
          </div>
          <input
            type="search"
            placeholder="Search employee name or rate..."
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '8px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '0.85rem',
            }}
          />
          <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Employee Name</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Total Average Rate</th>
                </tr>
              </thead>
              <tbody>
                {(debouncedSearch
                  ? importRows.filter(
                      (row) =>
                        row.employee_name.toLowerCase().includes(debouncedSearch) ||
                        String(row.total_average_rate).includes(debouncedSearch)
                    )
                  : importRows
                ).map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '8px' }}>{row.employee_name}</td>
                    <td style={{ padding: '8px' }}>{row.total_average_rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!showUploader && modalOpen && (
        <div className="area-iv-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="area-iv-modal" onClick={(event) => event.stopPropagation()}>
            <div className="area-iv-modal-search">
              <input
                type="search"
                placeholder="Search employee name or rate"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />
            </div>

            <div className="area-iv-modal-body">
              {loadingRows ? (
                <div className="area-iv-empty">Loading imported rows...</div>
              ) : paginatedRows.length === 0 ? (
                <div className="area-iv-empty">No matching rows found.</div>
              ) : (
                <table className="area-iv-table">
                  <thead>
                    <tr>
                      <th>Employee Name</th>
                      <th>Total Average Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row) => (
                      <tr key={`${row.cycle_id}-${row.normalized_name}-${row.source_row_number}`}>
                        <td>
                          <div className="area-iv-name">{row.employee_name}</div>
                          <div className="area-iv-meta">{row.matchedApplication ? 'Matched to current period' : 'No application match yet'}</div>
                        </td>
                        <td className="area-iv-rate">{row.total_average_rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="area-iv-modal-footer">
              <div className="area-iv-footer-copy">
                Showing {filteredRows.length === 0 ? 0 : pageStart + 1}-{Math.min(pageStart + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}
              </div>
              <div className="area-iv-pagination">
                <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={safePage <= 1}>
                  Previous
                </button>
                <span>Page {safePage} of {totalPages}</span>
                <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={safePage >= totalPages}>
                  Next
                </button>
              </div>
              <button type="button" className="area-iv-close-button" onClick={() => setModalOpen(false)} style={{ position: 'absolute', top: '8px', right: '8px' }}>×</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Find Area IV rubric child criterion that best matches a numeric average
function findIvCriterionByAverage(avg) {
  const area = (RANKING_RUBRICS || []).find((r) => Number(r.areaId) === 4);
  if (!area) return null;

  // Flatten children under subAreas
  const children = [];
  area.subAreas.forEach((sa) => {
    if (sa.children && sa.children.length) {
      sa.children.forEach((c) => children.push(c));
    } else {
      children.push(sa);
    }
  });

  // Try to parse numeric ranges from label (for Area IV, label is like "1.00-1.39 Poor")
  for (const child of children) {
    const labelStr = String(child.label || '');
    const m = labelStr.match(/(\d+\.\d+)[^\d]+(\d+\.\d+)/);
    if (m) {
      const low = Number(m[1]);
      const high = Number(m[2]);
      if (Number(avg) >= low && Number(avg) <= high) {
        return child;
      }
    }
  }

  // Fallback: pick the child with maxPoints closest to the rounded nearest integer of avg mapped to 10-scale
  const roundedPoints = Math.round(((Number(avg) || 0) / 5) * 10);
  let best = null;
  let bestDiff = Infinity;
  for (const child of children) {
    const pts = Number(child.maxPoints ?? 0);
    const diff = Math.abs(pts - roundedPoints);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = child;
    }
  }

  return best || null;
}

async function autoApplyScores(mappedRows, onAutoScoreComplete = null) {
  if (!Array.isArray(mappedRows) || mappedRows.length === 0) return;
  // Fetch data without nested selects to avoid REST API 400 errors
  const cycleId = mappedRows[0]?.cycle_id ?? null;

  const { data: allAreas } = await supabase
    .from('areas')
    .select('area_id, area_name');
  const areaIvAreaId = (allAreas || []).find((a) => /area\s*iv/i.test(String(a.area_name || '')))?.area_id ?? 7;
  
  // Fetch applications for this cycle (no nested select to avoid 400 errors)
  const { data: cycleApps } = await supabase.from('applications').select('*').eq('cycle_id', cycleId);
  
  // Fetch all users for matching
  const { data: allUsers } = await supabase.from('users').select('*');
  
  // Build a map for quick lookups
  const userMap = new Map((allUsers || []).map((u) => [u.user_id, u]));
  const userList = Array.from(userMap.values());

  let applied = 0;
  let matchedButNotScored = 0;
  let unmatched = 0;

  for (const row of mappedRows) {
    try {
      const avg = Number(row.total_average_rate || row.total_average_rate === 0 ? row.total_average_rate : null);
      if (!Number.isFinite(avg)) continue;

      // Resolve matched application if not present
      let appId = row.matched_application_id;
      let facultyId = row.matched_faculty_id;
      
      // Try same-cycle application first
      if (!appId && Array.isArray(cycleApps)) {
        const found = (cycleApps || []).find((a) => {
          const user = userMap.get(a.faculty_id);
          if (!user) return false;
          const fname = [user.name_last, user.name_first, user.name_middle].filter(Boolean).join(' ');
          return nameMatches(row.normalized_name || row.employee_name, fname);
        });
        if (found) {
          appId = found.application_id || found.id || null;
          facultyId = found.faculty_id || null;
        }
      }

      // Fallback: try matching against users table when application not found
      if (!appId && Array.isArray(userList)) {
        const foundUser = userList.find((u) => {
          const uname = [u.name_last, u.name_first, u.name_middle].filter(Boolean).join(' ');
          return nameMatches(row.normalized_name || row.employee_name, uname);
        });
        if (foundUser) {
          facultyId = foundUser.user_id ?? foundUser.id ?? null;
          // Try to find an application for this faculty in the cycle
          const foundApp = (cycleApps || []).find((a) => a.faculty_id === facultyId);
          if (foundApp) appId = foundApp.application_id || foundApp.id || null;
        }
      }

      // If still no appId, but we resolved a facultyId, try to find the latest application across cycles for that faculty
      if (!appId && facultyId) {
        try {
          const { data: latestApp } = await supabase
            .from('applications')
            .select('*')
            .eq('faculty_id', facultyId)
            .order('cycle_id', { ascending: false })
            .limit(1);

          if (latestApp && latestApp[0]) {
            const a = latestApp[0];
            appId = a.application_id ?? a.id ?? null;
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('Fetch latest app failed:', e);
        }
      }

      if (!appId) {
        // nothing to score for this row
        unmatched += 1;
        // continue to next row
        continue;
      }

      // Persist matched ids back to import table to keep UI in sync
      try {
        await supabase.from(IMPORT_TABLE).update({ matched_application_id: appId, matched_faculty_id: facultyId ?? null }).eq('cycle_id', row.cycle_id).eq('normalized_name', row.normalized_name);
      } catch (u) {
        // ignore update failure
      }

      // Find or create area_submission for Area IV (area_id = 4)
      const { data: existingSubmission, error: existingErr } = await supabase
        .from('area_submissions')
        .select('*')
        .eq('application_id', appId)
        .eq('area_id', areaIvAreaId)
        .eq('cycle_id', row.cycle_id)
        .maybeSingle();

      if (existingErr) {
        // eslint-disable-next-line no-console
        console.warn('Error lookup submission for auto-score', existingErr);
      }

      let submissionId = existingSubmission?.submission_id ?? existingSubmission?.id ?? null;

      if (!submissionId) {
        const { data: inserted, error: insertSubErr } = await supabase
          .from('area_submissions')
          .insert({
            application_id: appId,
            area_id: areaIvAreaId,
            cycle_id: row.cycle_id,
            file_path: null,
            hr_points: 0,
            csv_total_average_rate: row.total_average_rate,
            uploaded_at: new Date().toISOString(),
          })
          .select()
          .maybeSingle();

        if (insertSubErr) {
          // eslint-disable-next-line no-console
          console.warn('Failed to create placeholder submission for auto-score', insertSubErr);
          continue;
        }

        submissionId = inserted?.submission_id ?? inserted?.id ?? null;
      }

      if (!submissionId) continue;

      // Build Area IV criteria payload directly from RANKING_RUBRICS (don't trust GET endpoint)
      const area = (RANKING_RUBRICS || []).find((r) => Number(r.areaId) === 4);
      if (!area) {
        // eslint-disable-next-line no-console
        console.warn('Area IV rubric not found in RANKING_RUBRICS');
        continue;
      }

      // Flatten all Area IV children into criterion list
      const ivChildren = [];
      area.subAreas.forEach((sa) => {
        if (sa.children && sa.children.length) {
          sa.children.forEach((c) => ivChildren.push(c));
        } else {
          ivChildren.push(sa);
        }
      });

      // Find the matching criterion based on average
      const child = findIvCriterionByAverage(avg);
      if (!child) {
        // eslint-disable-next-line no-console
        console.warn('No matching IV criterion found for avg', avg);
        continue;
      }

      const targetId = child.id || child.label || String(child.title || '').slice(0, 16);
      const points = Number(child.maxPoints ?? child.max_points ?? child.max ?? Math.round(((avg / 5) * 10)));

      // eslint-disable-next-line no-console
      console.log(`[AutoScore] Row: ${row.employee_name}, Avg: ${avg}, TargetId: ${targetId}, Points: ${points}, SubmissionId: ${submissionId}`);

      // Build full payload with all IV criteria; set matching one to points, others to 0
      // Note: use criterion.label (e.g., "1.00-1.39 Poor") as criterion_key, not criterion.id
      const payloadCriteria = ivChildren.map((criterion) => ({
        criterion_key: criterion.label,
        score: (criterion.id === targetId || criterion.label === targetId) ? points : 0,
      }));

      // eslint-disable-next-line no-console
      console.log(`[AutoScore] Payload criteria count: ${payloadCriteria.length}, matching criterion: ${payloadCriteria.find((c) => Number(c.score) > 0)?.criterion_key} = ${payloadCriteria.find((c) => Number(c.score) > 0)?.score}`);

      // Send PATCH to backend to upsert criteria (backend computes hr_points and updates area_submissions)
      const backendUrl = `http://localhost:5000/review/submission-scoring/${submissionId}`;
      // eslint-disable-next-line no-console
      console.log(`[AutoScore] Sending PATCH to ${backendUrl}`);
      
      const patchRes = await fetch(backendUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criteria: payloadCriteria }),
      });

      // eslint-disable-next-line no-console
      console.log(`[AutoScore] PATCH response status: ${patchRes.status}`);

      if (!patchRes.ok) {
        const errBody = await patchRes.text().catch(() => '');
        // eslint-disable-next-line no-console
        console.warn(`[AutoScore] PATCH failed for submission ${submissionId}: ${errBody}`);
      } else {
        const patchJson = await patchRes.json().catch(() => ({}));
        // eslint-disable-next-line no-console
        console.log(`[AutoScore] PATCH success:`, patchJson);
        applied += 1;
      }

      // tiny delay to avoid overwhelming backend
      await new Promise((r) => setTimeout(r, 80));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Auto apply row failed', err);
      continue;
    }
  }

  // Refresh import rows in UI and show notice
  try {
    const { data: refreshed } = await supabase.from(IMPORT_TABLE).select('*').eq('cycle_id', cycleId).order('created_at', { ascending: true });
    if (refreshed) {
      // update state by fetching via direct set - caller will refresh when appropriate
      // setImportRows is not in scope; rely on caller to re-read or UI will reflect DB on next load
    }
  } catch (e) {
    // ignore
  }

  // eslint-disable-next-line no-console
  console.log(`Auto-apply Area IV: applied=${applied}, matchedButNotScored=${matchedButNotScored}, unmatched=${unmatched}`);
  try {
    // set a lightweight notice for the user
    if (typeof window !== 'undefined' && window?.document) {
      try {
        const noticeText = `Auto-applied ${applied} of ${mappedRows.length} imported rows (unmatched: ${unmatched}).`;
        // Attempt to set a global notice by dispatching a custom event the UI can listen to
        window.dispatchEvent(new CustomEvent('areaiv:autoscored', { detail: { notice: noticeText } }));
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {}

  // Notify parent component to refetch data
  if (typeof onAutoScoreComplete === 'function') {
    try {
      onAutoScoreComplete({ applied, matchedButNotScored, unmatched });
    } catch (e) {
      console.warn('Error calling onAutoScoreComplete:', e);
    }
  }
}