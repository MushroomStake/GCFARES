import { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Briefcase, 
  GraduationCap, 
  Award, 
  CheckCircle2, 
  XCircle, 
  Download, 
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient'; 
import { RANKING_RUBRICS } from '../../rankingRubrics';
import jsPDF from 'jspdf';

interface FacultyDetailModalProps {
  faculty: any; 
  onClose: () => void;
  onStatusUpdate?: () => void; 
}

interface FileItem {
  url: string;
  fileName: string;
  points: number;
}

interface GroupedSubmissions {
  partName: string;
  displayName: string;
  files: FileItem[];
  totalPointsForPart: number;
}

interface CriteriaRow {
  criterionKey: string;
  label: string;
  title: string;
  maxPoints: number | null;
  score: number;
  fileUrl: string | null;
  fileName: string;
}

interface Area {
  id: string;
  title: string;
  max: number;
  current: number; 
  groupedSubmissions: GroupedSubmissions[]; 
  criteriaRows: CriteriaRow[];
  color: string;
}

const FacultyDetailModal = ({ faculty, onClose, onStatusUpdate }: FacultyDetailModalProps) => {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [downloading, setDownloading] = useState(false); 
  const [isCompleted, setIsCompleted] = useState(false);
  const [openAreaAccordions, setOpenAreaAccordions] = useState<Record<number, boolean>>({}); 
  const [fileModalOpen, setFileModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ url: string; fileName: string } | null>(null); 
  
  const [fullUserData, setFullUserData] = useState<any>(null); 
  const [appData, setAppData] = useState<any>(null);
  const [areas, setAreas] = useState<Area[]>([]);

  const DB_AREA_ID_TO_RUBRIC_AREA_ID: Record<number, number> = {
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

  // Helpers copied/ adapted from HR admin ReviewHelpers
  function normalizePartLookupKey(value: any) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  // Compress rank ranges (e.g., "Instructor I, Instructor II, Instructor III" -> "Instructor I-III")
  function compressRankRange(rankStr: string): string {
    if (!rankStr) return rankStr;
    
    // First try: Handle "Instructor I, Instructor II, Instructor III" format
    const parts = rankStr.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      const romanValues: Record<string, number> = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5 };
      const extracted = parts.map((part) => {
        const match = part.match(/^(.+?)\s+([IVX]+)$/);
        return match ? { prefix: match[1].trim(), numeral: match[2].trim() } : null;
      }).filter(Boolean);
      
      if (extracted.length === parts.length && extracted.length > 1) {
        const firstPrefix = extracted[0]?.prefix;
        const allSamePrefix = extracted.every((e) => e?.prefix === firstPrefix);
        
        if (allSamePrefix) {
          const numerals = extracted.map((e) => e?.numeral || '').filter(Boolean);
          const nums = numerals.map((n) => romanValues[n] ?? 0).sort((a, b) => a - b).filter(Boolean);
          const isConsecutive = nums.every((n, i, arr) => i === 0 || n === arr[i - 1] + 1);
          
          if (isConsecutive && nums.length > 1) {
            const reverseValues: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V' };
            return `${firstPrefix} ${reverseValues[nums[0]]}-${reverseValues[nums[nums.length - 1]]}`;
          }
        }
      }
    }
    
    // Second try: Handle "Instructor I, II, III" format
    const match = rankStr.match(/^(.+?)\s+([IVX]+(?:\s*,\s*[IVX]+)*)$/);
    if (match) {
      const prefix = match[1].trim();
      const numerals = match[2].split(',').map((s) => s.trim()).filter(Boolean);
      if (numerals.length > 1) {
        const romanValues: Record<string, number> = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5 };
        const nums = numerals.map((n) => romanValues[n] ?? 0).sort((a, b) => a - b).filter(Boolean);
        const isConsecutive = nums.every((n, i, arr) => i === 0 || n === arr[i - 1] + 1);
        if (isConsecutive && nums.length > 1) {
          const reverseValues: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V' };
          return `${prefix} ${reverseValues[nums[0]]}-${reverseValues[nums[nums.length - 1]]}`;
        }
      }
    }
    
    return rankStr;
  }

  function getPublicFileUrl(storagePath: string | null) {
    if (!storagePath) return null;
    if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) return storagePath;
    const supabaseUrl = (supabase as any).supabaseUrl || '';
    const bucket = 'documents';
    const encodedPath = storagePath
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`;
  }

  function getFileExtension(url: string) {
    const cleanUrl = url.split('?')[0].split('#')[0];
    return cleanUrl.slice(cleanUrl.lastIndexOf('.') + 1).toLowerCase();
  }

  function isPdfUrl(url: string) {
    return getFileExtension(url) === 'pdf';
  }

  function isPreviewImageUrl(url: string) {
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(getFileExtension(url));
  }

  function flattenAreaCriteria(areaDefinition: any) {
    const rows: Array<{ criterionKey: string; label: string; title: string; maxPoints: number | null; }> = [];

    const walk = (items: any[]) => {
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

  // Qualification States
  const [qualExperience, setQualExperience] = useState("QUALIFIED FOR PROFESSOR I - V");
  const [qualDegree, setQualDegree] = useState("QUALIFIED FOR PROFESSOR I - V");
  const [qualTeaching, setQualTeaching] = useState("QUALIFIED");
  const [qualResearch, setQualResearch] = useState("NOT QUALIFIED");
  const [qualEligibility, setQualEligibility] = useState("NOT QUALIFIED");

  useEffect(() => {
    const fetchAllData = async () => {
      const appId = faculty?.application_id || faculty?.id;
      if (!appId) {
        console.warn("No application ID found in faculty prop");
        return;
      }
      
      try {
        setLoading(true);
        
        const { data: applicationData, error: appError } = await supabase
          .from('applications')
          .select('*')
          .eq('application_id', appId)
          .single();

        if (appError) throw appError;
        setAppData(applicationData);

        // Load existing qualifications from the database if they exist
        if (applicationData) {
          if (applicationData.qual_experience) setQualExperience(applicationData.qual_experience);
          if (applicationData.qual_degree) setQualDegree(applicationData.qual_degree);
          if (applicationData.qual_teaching) setQualTeaching(applicationData.qual_teaching);
          if (applicationData.qual_research) setQualResearch(applicationData.qual_research);
          if (applicationData.qual_eligibility) setQualEligibility(applicationData.qual_eligibility);
        }

        if (applicationData?.faculty_id) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select(`
              *,
              departments(department_name)
            `)
            .eq('user_id', applicationData.faculty_id)
            .single();

          if (userError) {
            console.error("Error fetching user data:", userError);
          } else if (userData) {
            setFullUserData(userData);
          }
        }

        const { data: areasData, error: areasError } = await supabase
          .from('areas')
          .select('*')
          .order('area_id');
          
        if (areasError) throw areasError;

        const { data: submissionsData, error: subError } = await supabase
          .from('area_submissions')
          .select('*')
          .eq('application_id', appId);
        
        if (subError) throw subError;

        // Build score map from submissions by matching part_id to criteria labels
        // Submissions contain hr_points (HR scored) or csv_total_average_rate (auto-scored from CSV)
        const scoreMap: Record<string, any> = {};
        if (submissionsData) {
          submissionsData.forEach(sub => {
            const score = Number(sub.hr_points || sub.csv_total_average_rate || 0);
            if (score > 0 && sub.part_id) {
              // Index by part_id (e.g., "I-A", "I-B")
              scoreMap[normalizePartLookupKey(sub.part_id)] = { score, submission_id: sub.submission_id };
              scoreMap[String(sub.part_id)] = { score, submission_id: sub.submission_id };
              console.log(`[VPAA Modal] Found score from submission: part_id="${sub.part_id}", score=${score}`);
            }
          });
        }
        console.log('[VPAA Modal] Built scoreMap from area_submissions:', Object.keys(scoreMap).length, 'entries');

        // Group submissions into arrays per area_id and map to part keys (normalize part_id/file part)
        const fetchedSubmissions: Record<string, any[]> = {};
        const titleMap: Record<number, string> = {};
        if (submissionsData) {
          submissionsData.forEach(docData => {
             const areaId = String(docData.area_id);
             if (!fetchedSubmissions[areaId]) fetchedSubmissions[areaId] = [];
             fetchedSubmissions[areaId].push(docData);
             // Build title map from part_id
             if (docData.submission_id && docData.part_id) {
               titleMap[docData.submission_id] = docData.part_id;
             }
          });
        }

        if (areasData) {
          const mergedAreas = areasData.map(area => {
            const rubricAreaId = DB_AREA_ID_TO_RUBRIC_AREA_ID[Number(area.area_id)] || Number(area.area_id);
            const rubricArea = RANKING_RUBRICS.find((item) => item.areaId === rubricAreaId);
            const criteriaDefinitions = flattenAreaCriteria(rubricArea);
            const submissions = fetchedSubmissions[String(area.area_id)] || [];
            const partSubmissionsMap: Record<string, FileItem[]> = {};
            const partDisplayNameMap: Record<string, string> = {};
            const submissionLookup: Record<string, { url: string; fileName: string }> = {};
            let areaCurrentPoints = 0;

            // Build a map keyed by normalized part key (part_id or part name from file)
            submissions.forEach(sub => {
              if (!sub.file_path) {
                return;
              }

              // Determine a part key: prefer explicit part_id, then criterion title, then part_name, then file path part
              let rawKey = sub.part_id || null;
              if (!rawKey) rawKey = titleMap[sub.submission_id] || null;
              if (!rawKey && sub.part_name) rawKey = sub.part_name;
              if (!rawKey && sub.file_path) {
                const match = sub.file_path.split('/').find((p: string) => /part\s*\d+/i.test(p) || /^part\s*/i.test(p));
                rawKey = match || sub.file_path.split('/').pop() || 'other';
              }

              const partKey = normalizePartLookupKey(rawKey || 'other');
              if (!partDisplayNameMap[partKey]) {
                partDisplayNameMap[partKey] = String(rawKey || 'OTHER');
              }

              // build public URL
              const fullFileUrl = getPublicFileUrl(sub.file_path) || '';
              const fileName = String(sub.file_path).split('/').pop() || 'Untitled File';
              const submissionPoints = Number(sub.vpaa_points ?? sub.hr_points ?? 0) || 0;
              areaCurrentPoints += submissionPoints;

              const fileItem: FileItem = { url: fullFileUrl, fileName, points: submissionPoints };
              if (!partSubmissionsMap[partKey]) partSubmissionsMap[partKey] = [];
              partSubmissionsMap[partKey].push(fileItem);

              [rawKey, partKey, titleMap[sub.submission_id], sub.part_name].filter(Boolean).forEach((candidateKey) => {
                const normalizedCandidateKey = normalizePartLookupKey(candidateKey);
                if (normalizedCandidateKey && !submissionLookup[normalizedCandidateKey]) {
                  submissionLookup[normalizedCandidateKey] = { url: fullFileUrl, fileName };
                }
                if (candidateKey && !submissionLookup[String(candidateKey)]) {
                  submissionLookup[String(candidateKey)] = { url: fullFileUrl, fileName };
                }
              });
            });

            const groupedSubmissions = Object.entries(partSubmissionsMap)
              .map(([partKey, files]) => {
                const displayName = partDisplayNameMap[partKey] || partKey.toUpperCase();
                return {
                  partName: partKey,
                  displayName,
                  files,
                  totalPointsForPart: files.reduce((sum, file) => sum + (file.points || 0), 0)
                };
              })
              .sort((a, b) => a.partName.localeCompare(b.partName));

            const criteriaRows: CriteriaRow[] = criteriaDefinitions.map((criterion) => {
              const partLabel = criterion.label || '';
              const partLetter = partLabel.split('.')[0];
              const compactPartLabel = normalizePartLookupKey(partLabel);
              const compactPartLetter = normalizePartLookupKey(partLetter);

              // Build candidate keys based on criterion label and rubric area code
              // E.g., for Area I criterion "A", look for "I-A" in part_id
              const candidateKeys = [
                partLabel,
                partLetter,
                `Part ${partLabel}`,
                `Part ${partLetter}`,
              ];

              if (rubricArea?.areaCode) {
                candidateKeys.unshift(
                  `${rubricArea.areaCode}-${partLabel}`,
                  `${rubricArea.areaCode}-${partLetter}`,
                  `${rubricArea.areaCode}-${compactPartLabel}`,
                );
              }

              const normalizedCandidates = candidateKeys
                .flatMap((key) => [key, normalizePartLookupKey(key)])
                .filter(Boolean);

              const fileMatch = normalizedCandidates
                .map((key) => submissionLookup[key])
                .find(Boolean) || null;

              if (!fileMatch && compactPartLabel !== compactPartLetter) {
                const fuzzyMatch = Object.entries(submissionLookup).find(([key, filePath]) => {
                  const normalizedKey = normalizePartLookupKey(key);
                  return Boolean(filePath?.url) && normalizedKey.includes(compactPartLabel);
                })?.[1] || null;

                if (fuzzyMatch) {
                  const scoreKey = normalizedCandidates.find((key) => scoreMap[key]) || normalizedCandidates[0];
                  const scoreRow = scoreMap[scoreKey];
                  return {
                    criterionKey: criterion.criterionKey,
                    label: criterion.label,
                    title: criterion.title,
                    maxPoints: criterion.maxPoints,
                    score: scoreRow ? Number(scoreRow.score || 0) : 0,
                    fileUrl: fuzzyMatch.url,
                    fileName: fuzzyMatch.fileName,
                  };
                }
              }

              // Primary lookup: match by part_id suffix (e.g., "A" matches "I-A")
              let scoreRow = null;
              for (const key of normalizedCandidates) {
                if (scoreMap[key]) {
                  scoreRow = scoreMap[key];
                  break;
                }
              }
              
              const score = scoreRow ? Number(scoreRow.score || 0) : 0;
              if (criterion.label === 'A') {
                console.log(`[VPAA Modal] Area ${rubricAreaId} Criterion ${criterion.label}: tried keys=${normalizedCandidates.slice(0, 3)}, scoreRow=${scoreRow ? 'FOUND (score=' + scoreRow.score + ')' : 'NOT FOUND'}`);
              }
              
              return {
                criterionKey: criterion.criterionKey,
                label: criterion.label,
                title: criterion.title,
                maxPoints: criterion.maxPoints,
                score: score,
                fileUrl: fileMatch?.url || null,
                fileName: fileMatch?.fileName || 'Untitled File',
              };
            });

            return {
              id: String(area.area_id),
              title: area.area_name || `Area ${area.area_id}`,
              max: Number(area.max_possible_points) || 0,
              current: areaCurrentPoints,
              groupedSubmissions,
              criteriaRows,
              color: 'bg-[#0a5e2f]'
            };
          });

          setAreas(mergedAreas);
        }

      } catch (err) {
        console.error("Error in fetchAllData pipeline:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllData();
  }, [faculty]);

  const toggleAreaAccordion = (idx: number) => {
    setOpenAreaAccordions(prev => ({...prev, [idx]: !prev[idx]}));
  };

  // VPAA action: mark this application as reviewed by VPAA.
  const handleMarkVPAACompleted = async () => {
    const appId = faculty?.application_id || faculty?.id;
    if (!appId) return;

    try {
      setUpdating(true);

      const payload = {
        status: 'VPAA_Completed',
        vpaa_completed_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('applications')
        .update(payload)
        .eq('application_id', appId);

      if (error) throw error;

      setIsCompleted(true);
      if (onStatusUpdate) onStatusUpdate();

      setTimeout(() => onClose(), 700);
    } catch (error) {
      console.error("Failed to mark VPAA completed", error);
      alert("Failed to mark as completed. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const totalPoints = areas.reduce((sum, area) => sum + area.current, 0);
  const firstName = fullUserData?.name_first || '';
  const middleInitial = fullUserData?.name_middle ? `${fullUserData.name_middle.charAt(0)}.` : '';
  const lastName = fullUserData?.name_last || '';
  const fullName = `${firstName} ${middleInitial} ${lastName}`.trim() || 'N/A';
  
  const deptData = fullUserData?.departments;
  const departmentName = deptData 
    ? (Array.isArray(deptData) ? deptData[0]?.department_name : deptData.department_name) 
    : 'Not specified';

  const handleDownloadResult = async () => {
    setDownloading(true);
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 35;
      const contentWidth = pageWidth - 2 * margin;
      let y = 25;

      // Fetch cycle/period info if available
      let periodLabel = '';
      try {
        if (appData?.cycle_id) {
          const { data: cycleData } = await supabase
            .from('ranking_cycles')
            .select('title, semester, year')
            .eq('cycle_id', appData.cycle_id)
            .single();
          if (cycleData) {
            const year = cycleData.year ? String(cycleData.year) : '';
            const semester = cycleData.semester ? String(cycleData.semester) : '';
            periodLabel = `${semester} • AY ${year}`.toUpperCase();
          }
        }
      } catch (e) {
        console.warn('Failed to fetch cycle info for PDF header', e);
      }

      // Load GC logo from public assets
      const logoUrl = '/assets/gc-logo.png';
      let logoDataUrl: string | null = null;
      try {
        const resp = await fetch(logoUrl);
        if (resp.ok) {
          const blob = await resp.blob();
          logoDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result));
            reader.readAsDataURL(blob);
          });
        }
      } catch (e) {
        console.warn('Failed to load logo for PDF', e);
      }

      // === HEADER SECTION ===
      if (logoDataUrl) {
        const imgProps = { width: 55, height: 55 };
        const imgX = (pageWidth - imgProps.width) / 2;
        doc.addImage(logoDataUrl, 'PNG', imgX, y, imgProps.width, imgProps.height);
        y += imgProps.height + 20;
      }

      // College name (main title)
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text('GORDON COLLEGE', pageWidth / 2, y, { align: 'center' });
      y += 24;

      // Period label
      if (periodLabel) {
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(periodLabel, pageWidth / 2, y, { align: 'center' });
        y += 14;
      }

      // Document title (centered, formal)
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('FACULTY EVALUATION REPORT', pageWidth / 2, y, { align: 'center' });
      y += 22;

      // Decorative line separator
      doc.setDrawColor(80);
      doc.line(margin, y, pageWidth - margin, y);
      y += 18;

      // === APPLICANT INFORMATION SECTION ===
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('APPLICANT INFORMATION', margin, y);
      y += 16;

      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      // Fix name casing: capitalize first letter of last name, keep first name as-is
      const lastNameProper = lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase();
      const applicantLabel = `${lastNameProper}, ${firstName}${fullUserData?.name_middle ? ' ' + fullUserData.name_middle : ''}`.trim();
      doc.text(`Name: ${applicantLabel}`, margin + 12, y);
      y += 12;
      doc.text(`Position: ${fullUserData?.current_rank || appData?.current_rank_at_time || 'N/A'}`, margin + 12, y);
      y += 12;
      doc.text(`Nature of Appointment: ${fullUserData?.nature_of_appointment || 'Permanent'}`, margin + 12, y);
      y += 22;

      // === SCORING SECTION ===
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text('EVALUATION SCORES BY AREA', margin, y);
      y += 18;

      // Table setup
      const tableLeft = margin;
      const tableTop = y;
      const tableWidth = contentWidth;
      const colAreaWidth = tableWidth * 0.55;
      const colScoreWidth = tableWidth * 0.15;
      const colMaxWidth = tableWidth * 0.15;
      const colExcessWidth = tableWidth * 0.15;

      const cellPadding = 5;
      const rowHeight = 20;

      // Draw table header
      doc.setDrawColor(80);
      doc.setLineWidth(1);
      doc.rect(tableLeft, y, tableWidth, rowHeight);

      doc.setFont(undefined, 'bold');
      doc.setFontSize(10);
      const headerVerticalCenter = y + rowHeight / 2 + 1.5;
      doc.text('Area', tableLeft + cellPadding, headerVerticalCenter, { align: 'left' });
      doc.text('Score', tableLeft + colAreaWidth + colScoreWidth / 2, headerVerticalCenter, { align: 'center' });
      doc.text('Max', tableLeft + colAreaWidth + colScoreWidth + colMaxWidth / 2, headerVerticalCenter, { align: 'center' });
      doc.text('Excess', tableLeft + colAreaWidth + colScoreWidth + colMaxWidth + colExcessWidth / 2, headerVerticalCenter, { align: 'center' });

      // Draw column separators in header
      doc.setLineWidth(0.5);
      doc.line(tableLeft + colAreaWidth, y, tableLeft + colAreaWidth, y + rowHeight);
      doc.line(tableLeft + colAreaWidth + colScoreWidth, y, tableLeft + colAreaWidth + colScoreWidth, y + rowHeight);
      doc.line(tableLeft + colAreaWidth + colScoreWidth + colMaxWidth, y, tableLeft + colAreaWidth + colScoreWidth + colMaxWidth, y + rowHeight);

      y += rowHeight;

      // Draw area rows with proper table structure
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9.5);

      areas.forEach((area) => {
        const areaTitle = area.title || 'Area';
        const score = Number(area.current || 0);
        const max = Number(area.max || 0);
        const excess = Math.max(0, score - max);

        // Split area title
        const titleLines = doc.splitTextToSize(areaTitle, colAreaWidth - 2 * cellPadding);
        const actualRowHeight = Math.max(rowHeight, titleLines.length * 10 + 6);

        // Draw row borders
        doc.setDrawColor(150);
        doc.setLineWidth(0.5);
        doc.rect(tableLeft, y, tableWidth, actualRowHeight);
        doc.line(tableLeft + colAreaWidth, y, tableLeft + colAreaWidth, y + actualRowHeight);
        doc.line(tableLeft + colAreaWidth + colScoreWidth, y, tableLeft + colAreaWidth + colScoreWidth, y + actualRowHeight);
        doc.line(tableLeft + colAreaWidth + colScoreWidth + colMaxWidth, y, tableLeft + colAreaWidth + colScoreWidth + colMaxWidth, y + actualRowHeight);

        // Calculate vertical center - adjusted for better centering
        const cellVerticalCenter = y + actualRowHeight / 2 + 1.5;

        // Draw content - vertically centered
        doc.text(titleLines, tableLeft + cellPadding, cellVerticalCenter - (titleLines.length - 1) * 4.5, { align: 'left' });
        doc.text(score.toFixed(2), tableLeft + colAreaWidth + colScoreWidth / 2, cellVerticalCenter, { align: 'center' });
        doc.text(max.toFixed(2), tableLeft + colAreaWidth + colScoreWidth + colMaxWidth / 2, cellVerticalCenter, { align: 'center' });
        doc.text(excess > 0 ? `+${excess.toFixed(2)}` : '—', tableLeft + colAreaWidth + colScoreWidth + colMaxWidth + colExcessWidth / 2, cellVerticalCenter, { align: 'center' });

        y += actualRowHeight;
      });

      // Total row
      doc.setDrawColor(80);
      doc.setLineWidth(1.5);
      doc.rect(tableLeft, y, tableWidth, rowHeight);

      doc.setFont(undefined, 'bold');
      doc.setFontSize(10.5);
      const totalScore = areas.reduce((s, a) => s + Number(a.current || 0), 0);
      const totalVerticalCenter = y + rowHeight / 2 + 1.5;
      doc.text('TOTAL POINTS', tableLeft + cellPadding, totalVerticalCenter, { align: 'left' });
      doc.text(totalScore.toFixed(2), tableLeft + colAreaWidth + colScoreWidth / 2, totalVerticalCenter, { align: 'center' });

      y += rowHeight + 20;

      // === QUALIFICATIONS SECTION ===
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text('QUALIFICATION SUMMARY', margin, y);
      y += 18;

      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      const quals = [
        { label: 'Experience', value: qualExperience },
        { label: 'Degree', value: qualDegree },
        { label: 'Teaching Performance', value: qualTeaching },
        { label: 'Research Output', value: qualResearch },
        { label: 'Eligibility', value: qualEligibility },
      ];

      quals.forEach(q => {
        const labelWidth = 130;
        doc.setFont(undefined, 'bold');
        doc.text(`${q.label}:`, margin + 12, y);
        doc.setFont(undefined, 'normal');
        const valueLines = doc.splitTextToSize(q.value, contentWidth - labelWidth - 30);
        doc.text(valueLines, margin + 12 + labelWidth, y);
        y += Math.max(13, valueLines.length * 13) + 8;
      });

      // === FOOTER ===
      y += 12;
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(100);
      doc.text('This report is officially issued and contains the evaluation scores for the faculty applicant.', pageWidth / 2, pageHeight - 14, { align: 'center' });
      doc.setTextColor(0);

      // Save PDF
      doc.save(`${lastNameProper}_${firstName}_Evaluation.pdf`);
    } catch (error) {
      console.error('Error generating PDF', error);
      alert('Failed to download file.');
    } finally {
      setDownloading(false);
    }
  };

  const isAlreadyCompleted = isCompleted || appData?.status === 'VPAA_Completed' || appData?.status === 'For_Publishing';

  if (!faculty) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />

      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative bg-[#f8fafc] w-full max-w-5xl h-[95vh] md:h-[90vh] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10"
      >
        <button onClick={onClose} title="Close modal" aria-label="Close modal" className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 hover:bg-slate-200 rounded-full transition-colors z-20 bg-white/80 backdrop-blur shadow-sm">
          <X size={20} className="text-slate-500 sm:w-6 sm:h-6" />
        </button>

        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden">
          
          {/* Left Side: Profile Info */}
          <div className="w-full md:w-5/12 p-5 sm:p-8 md:p-10 md:overflow-y-auto border-b md:border-b-0 md:border-r border-slate-200 bg-white shrink-0">
            <div className="flex items-center gap-3 mb-6 sm:mb-8 mt-2 sm:mt-0">
              <div className="p-2 text-[#0a5e2f]">
                <User size={24} />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-800 pr-8">Faculty Information</h3>
            </div>

            <div className="space-y-6 sm:space-y-8">
              {/* Personal Details */}
              <section>
                <h4 className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-4 border-b border-slate-100 pb-2">
                  <User size={16} className="text-slate-400" /> Personal Details
                </h4>
                <div className="grid grid-cols-1 gap-y-4">
                  <div>
                    <p className="text-[11px] text-slate-400 font-semibold mb-1">Name</p>
                    <p className="text-sm font-semibold text-slate-800 break-words">{loading ? 'Loading...' : fullName}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-semibold mb-1">Department</p>
                    <p className="text-sm font-semibold text-slate-800 break-words">{loading ? 'Loading...' : departmentName}</p>
                  </div>
                </div>
              </section>

              {/* Employment Status */}
              <section>
                <h4 className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-4 border-b border-slate-100 pb-2">
                  <Briefcase size={16} className="text-slate-400" /> Employment Status
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-4">
                  <div>
                    <p className="text-[11px] text-slate-400 font-semibold mb-1">Present Rank</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {fullUserData?.current_rank || appData?.current_rank_at_time || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-semibold mb-1">Nature of Appointment</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {fullUserData?.nature_of_appointment || 'Permanent'}
                    </p>
                  </div>                
                </div>
              </section>

              {/* Educational Attainment */}
              <section>
                <h4 className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-4 border-b border-slate-100 pb-2">
                  <GraduationCap size={16} className="text-slate-400" /> Educational Attainment
                </h4>
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-sm font-semibold text-slate-800 break-words">
                      {fullUserData?.educational_attainment || 'No data provided'}
                    </p>
                  </div>
                </div>
              </section>

              {/* Eligibility & Exams */}
              <section>
                <h4 className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-4 border-b border-slate-100 pb-2">
                  <Award size={16} className="text-slate-400" /> Eligibility & Exams
                </h4>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-sm font-semibold text-slate-800 break-words">
                    {fullUserData?.eligibility_exams || 'No data provided'}
                  </p>
                </div>
              </section>

              {/* Experience */}
              <section>
                <h4 className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-4 border-b border-slate-100 pb-2">
                  <Award size={16} className="text-slate-400" /> Experience
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-4">
                  <div>
                    <p className="text-[11px] text-slate-400 font-semibold mb-1">Teaching Exp.</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {fullUserData?.teaching_experience_years || 0} years
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-semibold mb-1">Industry Exp.</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {fullUserData?.industry_experience_years || 0} years
                    </p>
                  </div>
                </div>
              </section>

              {/* Application Details */}
              <section>
                <h4 className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-4 border-b border-slate-100 pb-2">
                  <Briefcase size={16} className="text-slate-400" /> Application Details
                </h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] text-slate-400 font-semibold mb-1">Applying For</p>
                    <p className="text-sm font-semibold text-slate-800 break-words">
                      {compressRankRange(fullUserData?.applying_for || appData?.applying_for || 'Not specified')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-semibold mb-1">Last Promotion</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {fullUserData?.date_of_last_promotion ? new Date(fullUserData.date_of_last_promotion).toLocaleDateString() : 'Not specified'}
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>

          {/* Right Side: Submitted Areas & Qualification */}
          <div className="w-full md:flex-1 p-5 sm:p-8 md:p-10 md:overflow-y-auto bg-white flex flex-col relative min-h-[500px] md:min-h-0">
            
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10 backdrop-blur-sm rounded-b-2xl md:rounded-r-2xl md:rounded-bl-none">
                <Loader2 className="animate-spin text-[#0a5e2f] mb-4" size={32} />
                <p className="text-sm font-bold text-slate-500">Loading data...</p>
              </div>
            )}

            <div className="mb-8 md:mb-10">
              <h3 className="text-sm md:text-base font-bold text-slate-800 uppercase tracking-wide mb-4 md:mb-6">Submitted Areas</h3>
              <div className="space-y-4 md:space-y-6">
                {areas.length > 0 ? areas.map((area, idx) => (
                  <div key={idx} className="group overflow-hidden rounded-lg border border-slate-100 bg-white">
                    <div className="flex justify-between items-center cursor-pointer p-4 transition hover:bg-slate-50" onClick={() => toggleAreaAccordion(idx)}>
                      <div className="flex-1 pr-4 md:pr-6">
                        <p className="text-xs font-bold text-slate-700 leading-tight mb-1">{area.title}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Max: {area.max.toFixed(2)} pts <span className="text-yellow-500 ml-1">+0 excess</span></p>
                      </div>
                      <div className="text-right flex items-center gap-3 shrink-0">
                        <span className="text-sm font-bold text-[#0a5e2f]">{area.current.toFixed(2)} pts</span>
                        <ChevronDown className={`w-5 h-5 text-slate-400 transform transition-transform ${openAreaAccordions[idx] ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    {/* Collapsible Panel with criteria rows and file links */}
                    {openAreaAccordions[idx] && (
                        <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50/50 overflow-x-auto">
                            {area.criteriaRows && area.criteriaRows.length > 0 ? (
                              <table className="w-full text-left whitespace-nowrap">
                                <thead>
                                  <tr className="border-b border-slate-200 bg-slate-100/80">
                                    <th className="px-3 py-2 text-[11px] font-bold text-slate-600">Criteria / Title</th>
                                    <th className="px-3 py-2 text-[11px] font-bold text-slate-600 text-right">Max Pts</th>
                                    <th className="px-3 py-2 text-[11px] font-bold text-slate-600 text-right">Score</th>
                                    <th className="px-3 py-2 text-[11px] font-bold text-slate-600 text-center">Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {area.criteriaRows.map((criterion, criterionIdx) => {
                                    const hasMaxPoints = Number(criterion.maxPoints || 0) > 0;
                                    return (
                                      <tr key={`${criterion.criterionKey}-${criterionIdx}`} className="border-b border-slate-100 last:border-b-0">
                                        <td className="px-3 py-3 text-[11px] text-slate-800 whitespace-normal">
                                          <span className="font-bold text-[#0a5e2f] mr-1.5">{criterion.label}</span>
                                          {criterion.title}
                                        </td>
                                        <td className="px-3 py-3 text-right text-[11px] font-bold text-[#0a5e2f]">
                                          {hasMaxPoints ? Number(criterion.maxPoints).toFixed(2) : '—'}
                                        </td>
                                        <td className="px-3 py-3 text-right text-[11px] font-semibold text-slate-900">
                                          {Number(criterion.score || 0).toFixed(2)}
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                          {criterion.fileUrl ? (
                                            <button
                                              onClick={() => { setSelectedFile({ url: criterion.fileUrl || '', fileName: criterion.fileName }); setFileModalOpen(true); }}
                                              className="inline-flex items-center justify-center text-[11px] font-semibold text-[#0a5e2f] hover:bg-[#c8ead8] bg-[#d7f4e7] px-3 py-1.5 rounded-full transition-colors"
                                              title={criterion.fileName}
                                            >
                                              View File
                                            </button>
                                          ) : (
                                            <span className="text-[11px] text-slate-400">—</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            ) : (
                                <p className="text-sm text-slate-500 italic py-2">No criteria available for this area.</p>
                            )}
                        </div>
                    )}
                    
                    <div className="h-1.5 bg-slate-100 rounded-b-lg overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((area.current / area.max) * 100, 100)}%` }}
                        className={`h-full ${area.color} rounded-full`}
                      />
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-slate-500 italic">No areas available.</p>
                )}
              </div>
            </div>

            {/* Bottom Actions Section */}
            <div className="mt-auto border-t border-slate-200 pt-6">
              <div className="flex justify-between items-center mb-6 md:mb-8">
                <span className="text-sm font-bold text-slate-800">TOTAL POINTS:</span>
                <div className="text-right flex flex-col sm:block">
                  <span className="text-[10px] text-slate-400 sm:mr-4 mb-1 sm:mb-0">Max: 200.00 pts</span>
                  <span className="text-base font-bold text-[#0a5e2f]">{totalPoints.toFixed(2)} pts</span>
                </div>
              </div>

              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">Qualification</h3>
              <div className="space-y-3 mb-6 md:mb-8 bg-slate-50 p-4 md:p-5 rounded-2xl border border-slate-100">
                {[
                  ['Experience', qualExperience],
                  ['Degree', qualDegree],
                  ['Teaching Experience', qualTeaching],
                  ['Research Output', qualResearch],
                  ['Eligibility', qualEligibility]
                ].map(([label, value]) => {
                  const text = String(value || 'N/A');
                  const isQualified = !/not qualified/i.test(text);
                  return (
                    <div key={label} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 border-b border-slate-200/70 pb-3 last:border-b-0 last:pb-0">
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</span>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-sm font-semibold text-slate-800 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                          {text}
                        </span>
                        {isQualified ? <CheckCircle2 className="text-[#0a5e2f] shrink-0" size={16} /> : <XCircle className="text-red-500 shrink-0" size={16} />}
                      </div>
                    </div>
                  );
                })}

              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
                <button 
                  onClick={handleDownloadResult}
                  disabled={downloading || loading}
                  className="w-full sm:flex-1 py-3.5 bg-[#3b82f6] text-white text-xs font-bold uppercase tracking-wide rounded-xl hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  Download Result
                </button>
                <button 
                  onClick={handleMarkVPAACompleted}
                  disabled={updating || loading || isAlreadyCompleted}
                  className="w-full sm:flex-1 py-3.5 bg-[#0a5e2f] text-white text-xs font-bold uppercase tracking-wide rounded-xl hover:bg-[#084b25] transition-colors shadow-lg shadow-[#0a5e2f]/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : isAlreadyCompleted ? (
                    'Review Already Completed'
                  ) : (
                    'Mark VPAA Completed'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* File Viewer Modal */}
      {fileModalOpen && selectedFile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setFileModalOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative bg-white w-full max-w-4xl h-[85vh] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10"
          >
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-200 bg-white shrink-0">
              <h3 className="text-lg sm:text-xl font-bold text-slate-800 truncate flex-1">{selectedFile.fileName}</h3>
              <div className="flex items-center gap-2">
                <a
                  href={selectedFile.url}
                  download
                  className="inline-flex items-center justify-center text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition-colors gap-2"
                  title="Download file"
                >
                  <Download size={16} /> Download
                </a>
                <button 
                  onClick={() => setFileModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Close"
                  aria-label="Close file viewer"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-slate-50 flex items-center justify-center p-4">
              {isPdfUrl(selectedFile.url) ? (
                <iframe
                  src={selectedFile.url}
                  className="w-full h-full border-0 rounded-lg"
                  title="PDF viewer"
                />
              ) : isPreviewImageUrl(selectedFile.url) ? (
                <img src={selectedFile.url} alt={selectedFile.fileName} className="max-w-full max-h-full object-contain rounded-lg" />
              ) : (
                <div className="text-center text-slate-500">
                  <p className="font-semibold mb-2">Preview not available</p>
                  <p className="text-sm mb-4">This file type cannot be previewed in the browser</p>
                  <a
                    href={selectedFile.url}
                    download
                    className="inline-flex items-center justify-center text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition-colors gap-2"
                  >
                    <Download size={16} /> Download File
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default FacultyDetailModal;