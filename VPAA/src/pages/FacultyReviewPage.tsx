import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Users, 
  FileText, 
  Eye,
  Loader2
} from 'lucide-react';
import { supabase } from '../supabaseClient'; 
import FacultyDetailModal from '../components/FacultyDetailModal';

export interface Faculty {
  id: string; 
  application_id: string;
  ranking: number;
  name: string;
  department: string;
  currentPosition: string; 
  appliedPosition: string; 
  points: string;
  rawPoints: number;
  status: string;
  originalData?: any; 
}

// Compress rank ranges (e.g., "Instructor I, Instructor II, Instructor III" -> "Instructor I-III")
const compressRankRange = (rankStr: string) => {
  if (!rankStr) return rankStr;
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
};

// Helper function to determine the color of the status badge
const getStatusStyle = (status: string) => {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus.includes('published') || normalizedStatus === 'reviewed') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (normalizedStatus.includes('for_publishing')) {
    return 'bg-teal-50 text-teal-700 border-teal-200';
  }
  if (normalizedStatus.includes('vpaa') || normalizedStatus === 'under review') {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  if (normalizedStatus.includes('hr')) {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  if (normalizedStatus.includes('submitted')) {
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  }
  if (normalizedStatus.includes('draft')) {
    return 'bg-slate-100 text-slate-600 border-slate-300';
  }
  if (normalizedStatus.includes('rejected')) {
    return 'bg-red-50 text-red-700 border-red-200';
  }

  // Fallback styling
  return 'bg-gray-50 text-gray-600 border-gray-200';
};

const normalizeApplyingForField = (value: any) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(', ');
  }
  if (value || value === 0) {
    return String(value).trim();
  }
  return '';
};

const getApplicationScore = (appData: any, computedFallback: number = 0) => {
  // Use final_score only if it's > 0; otherwise fall back to hr_score or other sources
  const finalScore = Number(appData.final_score || 0);
  if (finalScore > 0) return finalScore;
  
  return Number(appData.hr_score ?? appData.display_score ?? appData.vpaa_points ?? appData.total_score ?? appData.total_points ?? computedFallback ?? 0);
};

const FacultyReviewPage = () => {
  const [facultyData, setFacultyData] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  
  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All");

  useEffect(() => {
    let mounted = true;

    const fetchFacultyForActivePeriod = async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        
        // 1. Fetch the active period. Prefer open/submissions_closed/finished; fallback to most recent.
        let activeCycleId = null;
        const { data: cycleSnap, error: cycleError } = await supabase
          .from('ranking_cycles')
          .select('cycle_id, status, created_at')
          .in('status', ['open', 'submissions_closed', 'finished'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (cycleError) throw cycleError;

        if (cycleSnap && cycleSnap.length > 0) {
          activeCycleId = cycleSnap[0].cycle_id;
        } else {
          // fallback: pick the most recently created cycle
          const { data: recent, error: recentError } = await supabase
            .from('ranking_cycles')
            .select('cycle_id, status, created_at')
            .order('created_at', { ascending: false })
            .limit(1);
          if (recentError) throw recentError;
          if (recent && recent.length > 0) {
            activeCycleId = recent[0].cycle_id;
          }
        }

        if (!activeCycleId) {
          console.warn('No ranking period available to load applications');
          if (mounted) setFacultyData([]);
          if (!silent) setLoading(false);
          return;
        }

        // 2. Fetch applications for the active period
        let { data: appsSnap, error: appsError } = await supabase
          .from('applications')
          .select('*')
          .eq('cycle_id', activeCycleId);

        if (appsError) throw appsError;

        // If no applications were found for the selected cycle, try a fallback:
        // find the most recent cycle that contains HR_Completed applications
        if ((!appsSnap || appsSnap.length === 0)) {
          console.log('VPAA DEBUG: no applications found for activeCycleId=', activeCycleId, '- searching for recent period with HR_Completed apps');
          const { data: hrCycle, error: hrCycleError } = await supabase
            .from('applications')
            .select('cycle_id, hr_completed_at')
            .ilike('status', '%hr_completed%')
            .order('hr_completed_at', { ascending: false })
            .limit(1);

          if (!hrCycleError && hrCycle && hrCycle.length > 0) {
            const fallbackCycleId = hrCycle[0].cycle_id;
            console.log('VPAA DEBUG: falling back to cycle_id=', fallbackCycleId, 'based on HR_Completed rows');
            const { data: fallbackApps, error: fallbackError } = await supabase
              .from('applications')
              .select('*')
              .eq('cycle_id', fallbackCycleId);
            if (!fallbackError) {
              appsSnap = fallbackApps || [];
              activeCycleId = fallbackCycleId;
            } else {
              console.warn('VPAA DEBUG: fallback query error', fallbackError);
            }
          } else if (hrCycleError) {
            console.warn('VPAA DEBUG: error querying for HR_Completed cycles', hrCycleError);
          } else {
            console.log('VPAA DEBUG: no HR_Completed applications found in any cycle');
          }
        }
        
        // 3. Process applications and fetch relational details
        let appsData = appsSnap || [];

        // Preload all submission-based scores for the full app list so list totals can match the modal
        const appIds = appsData.map((app) => String(app.application_id)).filter(Boolean);
        let submissionScoreMap: Record<string, number> = {};
        if (appIds.length > 0) {
          const { data: submissionScores, error: submissionError } = await supabase
            .from('area_submissions')
            .select('application_id, hr_points, vpaa_points, csv_total_average_rate')
            .in('application_id', appIds);

          if (!submissionError && submissionScores) {
            submissionScores.forEach((sub: any) => {
              const appId = String(sub.application_id);
              const score = Number(sub.vpaa_points ?? sub.hr_points ?? sub.csv_total_average_rate ?? 0) || 0;
              submissionScoreMap[appId] = (submissionScoreMap[appId] || 0) + score;
            });
          } else if (submissionError) {
            console.warn('VPAA DEBUG: failed to load area submission scores for applications', submissionError);
          }
        }

        // DEBUG: print raw applications with key fields
        console.log('VPAA DEBUG: activeCycleId=', activeCycleId);
        console.log('VPAA DEBUG: raw applications count=', appsSnap?.length || 0);
        (appsSnap || []).forEach((a, idx) => {
          console.log(`VPAA DEBUG: app[${idx}] id=${a.application_id} cycle_id=${a.cycle_id} status=${a.status} hr_completed_at=${a.hr_completed_at}`);
        });

        // Show applications that HR has completed (ready for VPAA) or are already under VPAA review.
        // Use case-insensitive matching and include a few common variants to be robust.
        const allowedStatuses = new Set(['hr_completed', 'under_vpaa_review', 'pending_vpaa', 'submitted', 'under_hr_review']);
        const filtered = [];
        const excluded = [];
        for (const a of appsData) {
          const s = String(a.status || '').trim().toLowerCase();
          const sameCycle = Number(a.cycle_id) === Number(activeCycleId);
          const passes = sameCycle && (allowedStatuses.has(s) || s === 'hr_completed');
          if (passes) filtered.push(a); else excluded.push({ application_id: a.application_id, status: a.status, cycle_id: a.cycle_id, sameCycle, normalizedStatus: s });
        }
        console.log('VPAA DEBUG: filtered count=', filtered.length, 'excluded count=', excluded.length);
        if (excluded.length > 0) console.log('VPAA DEBUG: excluded samples=', excluded.slice(0,10));
        appsData = filtered;
        const facultyPromises = appsData.map(async (appData) => {
          let facultyName = "UNKNOWN FACULTY";
          let department = "Not specified";
          let currentPos = appData.current_rank_at_time || "Not specified";
          let appliedPos = "Not specified";
          
          const userId = appData.faculty_id;

          // Fetch Applied Position Name from 'positions' table
          if (appData.target_position_id) {
            const { data: posData } = await supabase
              .from('positions')
              .select('position_name')
              .eq('position_id', appData.target_position_id)
              .single();
            
            if (posData) appliedPos = posData.position_name;
          }

          let userApplyingFor = '';
          if (userId) {
            // Fetch specific user data
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('*')
              .eq('user_id', userId) 
              .single();
            
            if (!userError && userData) {
              // Format Name
              facultyName = `${userData.name_last || ''}, ${userData.name_first || ''}`.replace(/^, | ,$/g, '');
              
              // Fallback for current rank if it wasn't captured in the application snapshot
              if (currentPos === "Not specified" && userData.current_rank) {
                currentPos = userData.current_rank;
              }

              // Capture applying_for from the user record if available
              userApplyingFor = normalizeApplyingForField(userData.applying_for || userData.applyingFor);

              // Fetch Department Name from 'departments' table
              if (userData.department_id) {
                const { data: deptData } = await supabase
                  .from('departments')
                  .select('department_name')
                  .eq('department_id', userData.department_id)
                  .single();
                
                if (deptData) department = deptData.department_name;
              }
            }
          }

          const fallbackSubmissionScore = submissionScoreMap[String(appData.application_id)] || 0;
          const rawPts = getApplicationScore(appData, fallbackSubmissionScore);
          const applyingForRaw = normalizeApplyingForField(userApplyingFor || appData.applying_for || appliedPos);
          const compressedApplyingFor = applyingForRaw ? compressRankRange(applyingForRaw) : 'Not specified';

          let displayStatus = appData.status || 'Draft';
          // Preserving your custom status overrides
          if (['Approved_Unpublished', 'Published', 'For_Publishing'].includes(appData.status)) {
            displayStatus = 'Reviewed';
          } else if (appData.status === 'Pending_VPAA' || appData.status === 'Under_VPAA_Review') {
            displayStatus = 'Under Review';
          }

          return {
            id: String(userId || appData.application_id),
            application_id: String(appData.application_id),
            ranking: 0, 
            name: facultyName.toUpperCase(),
            department: department, 
            currentPosition: currentPos,
            appliedPosition: compressedApplyingFor,
            points: rawPts.toFixed(2),
            rawPoints: rawPts,
            status: displayStatus,
            originalData: { ...appData } 
          };
        });

        let fetchedFaculty = await Promise.all(facultyPromises);

        // Sort by raw points descending, then by name for consistent ranking when tied
        fetchedFaculty.sort((a, b) => {
          const scoreDiff = b.rawPoints - a.rawPoints;
          if (scoreDiff !== 0) return scoreDiff;
          return a.name.localeCompare(b.name);
        });
        
        // Assign rankings based on sorted array
        fetchedFaculty = fetchedFaculty.map((faculty, index) => ({
          ...faculty,
          ranking: index + 1
        }));

        if (mounted) setFacultyData(fetchedFaculty);
      } catch (error) {
        console.error("Error fetching faculty applications:", error);
      } finally {
        if (!silent) setLoading(false);
      }
    };

    void fetchFacultyForActivePeriod();

    const liveChannel = supabase
      .channel('vpaa-faculty-period-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications' },
        () => {
          void fetchFacultyForActivePeriod(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ranking_cycles' },
        () => {
          void fetchFacultyForActivePeriod(true);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(liveChannel);
    };
  }, []);

  const stats = [
    { 
      label: 'Under Review', 
      value: facultyData.filter(f => f.status.toLowerCase().includes('review') && f.status !== 'Reviewed').length, 
      sub: 'Pending VPAA Evaluation', 
      icon: <Users className="text-emerald-600" />, 
      color: 'emerald' 
    },
    { 
      label: 'Reviewed', 
      value: facultyData.filter(f => f.status === 'Reviewed').length, 
      sub: 'Approved Applications', 
      icon: <Users className="text-emerald-600" />, 
      color: 'emerald' 
    },
    { 
      label: 'Total Faculty', 
      value: facultyData.length, 
      sub: 'Current Period Applicants', 
      icon: <FileText className="text-emerald-600" />, 
      color: 'emerald' 
    },
  ];

  const openModal = (faculty: Faculty) => {
    setSelectedFaculty(faculty);
    setIsModalOpen(true);
  };

  // Generate unique departments for the filter dropdown
  const uniqueDepartments = ["All", ...Array.from(new Set(facultyData.map(f => f.department)))];

  // Apply Search AND Filter
  const filteredFaculty = facultyData.filter(faculty => {
    const matchesSearch = faculty.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          faculty.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDepartment === "All" || faculty.department === selectedDepartment;
    
    return matchesSearch && matchesDept;
  });

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading active period and faculty data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h4 className="text-3xl font-black text-slate-800 mb-1">{stat.value}</h4>
              <p className="text-[10px] text-slate-500 font-medium">{stat.sub}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl">
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Faculty List Section */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-8 pb-4">
          <h3 className="text-2xl font-black text-slate-800 mb-1">Faculty List</h3>
          <p className="text-sm text-slate-500 font-medium mb-8">View and manage faculty information and submissions for the current period</p>

          <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search faculty by name or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
              />
            </div>

            {/* Department Filter Dropdown */}
            <div className="relative">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                title="Filter by department"
                aria-label="Filter by department"
                className="appearance-none flex items-center gap-3 pl-6 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              >
                {uniqueDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept === "All" ? "All Departments" : dept}
                  </option>
                ))}
              </select>
              <Filter size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="border-y border-slate-100 bg-slate-50/50">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ranking</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Faculty</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Positions (Current → Applied)</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Points</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFaculty.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-12 text-center text-sm font-medium text-slate-500">
                    No faculty applications found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredFaculty.map((faculty) => (
                  <tr key={faculty.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-8 py-5 text-sm font-bold text-slate-400">#{faculty.ranking}</td>
                    <td className="px-8 py-5 text-[11px] font-black text-slate-700 tracking-tight">{faculty.name}</td>
                    
                    {/* Position Information Column */}
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-medium text-slate-400">
                          <span className="font-semibold text-slate-500">Current:</span> {faculty.currentPosition}
                        </span>
                        <span className="text-[11px] font-medium text-emerald-600">
                          <span className="font-semibold text-emerald-700">Applying:</span> {faculty.appliedPosition}
                        </span>
                      </div>
                    </td>

                    <td className="px-8 py-5 text-[11px] font-bold text-slate-500">{faculty.department}</td>
                    <td className="px-8 py-5 text-[11px] font-bold text-slate-500">{faculty.points}</td>
                    <td className="px-8 py-5">
                      {/* Dynamic Color Applied Here */}
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border ${getStatusStyle(faculty.status)}`}>
                        {faculty.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex justify-center">
                        <button 
                          onClick={() => openModal(faculty)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="View Details"
                        >
                          <Eye size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && selectedFaculty && (
        <FacultyDetailModal 
          faculty={selectedFaculty} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
};

export default FacultyReviewPage;