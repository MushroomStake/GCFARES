import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Search, Filter, CheckCircle2, User, Loader2, X } from 'lucide-react';
import { supabase } from '../supabaseClient'; 
import FacultyDetailModal from '../components/FacultyDetailModal'; 

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

  const [cycle, setCycle] = useState<CycleState>({
    title: '',
    semester: '',
    year: '',
    status: '',
    stats: { totalFaculty: 0, completed: 0, underReview: 0, pending: 0, avgPoints: 0, totalPoints: 0 }
  });
  const [facultyRankings, setFacultyRankings] = useState<RankingEntry[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchCycleDetails = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // 1. Fetch Cycle Details
        const { data: cycleData, error: cycleError } = await supabase
          .from('ranking_cycles')
          .select('*')
          .eq('cycle_id', id)
          .single();
        
        if (cycleError || !cycleData) {
          console.error("Cycle not found or error fetching:", cycleError);
          if (isMounted) setLoading(false);
          return;
        }
        
       // 2. Fetch Applications with Joined User and Department Data
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
          .eq('cycle_id', id);
        
        if (appsError) throw appsError;

        let totalScore = 0;
        let completedCount = 0;
        let underReviewCount = 0;
        let pendingCount = 0;

        const resolvedRankings: RankingEntry[] = (appsData || []).map((appData: any) => {
          const score = Number(appData.hr_score) || 0;
          totalScore += score;
          
          const statusLower = (appData.status || '').toLowerCase();
          
          if (['approved_unpublished', 'published', 'approved'].includes(statusLower)) {
            completedCount++;
          } else if (['pending_vpaa', 'under_review'].includes(statusLower)) {
            underReviewCount++;
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
        const totalFaculty = appsData ? appsData.length : 0;

        // Expanded logic to match what constitutes an active cycle
        const isCycleActive = ['open', 'submissions_closed', 'finished'].includes(cycleData.status);

        if (isMounted) {
          setCycle({
            title: cycleData.title || 'Ranking Cycle',
            semester: cycleData.semester || 'N/A',
            year: cycleData.year ? String(cycleData.year) : 'N/A',
            status: isCycleActive ? 'Active' : 'Closed',
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
        if (isMounted) setLoading(false);
      }
    };

    fetchCycleDetails();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const getStatusDisplay = (dbStatus: string) => {
    const status = dbStatus || 'Pending';
    const normalizedStatus = status.toLowerCase();
    const formattedLabel = status.replace(/_/g, ' ');

    if (['approved_unpublished', 'published', 'approved', 'finished'].includes(normalizedStatus)) {
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

  const handleExportCSV = () => {
    if (filteredRankings.length === 0) return;
    const headers = ['Rank', 'Faculty Name', 'Department', 'Total Points', 'Status'];
    const rows = filteredRankings.map((faculty, index) => [
      index + 1,
      `"${faculty.name}"`, 
      `"${faculty.department}"`,
      faculty.points,
      faculty.dbStatus
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${cycle.title.replace(/\s+/g, '_')}_Rankings.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
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
        <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading cycle data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 relative">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-primary hover:border-primary transition-all shadow-sm cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-sidebar">{cycle.title}</h2>
          <p className="text-[11px] font-bold text-primary uppercase tracking-wider mt-0.5 mb-1">
            {cycle.semester} • AY {cycle.year}
          </p>
          <p className="text-xs text-slate-500">Comprehensive cycle report and faculty rankings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className={`${statusCardBg} border p-6 rounded-2xl transition-colors`}>
          <p className={`text-[10px] font-bold ${statusLabelColor} uppercase tracking-wider mb-2`}>Cycle Status</p>
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
          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
             <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${completionPercentage}%` }} />
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Total & Avg Points</p>
          <div className="flex items-end gap-2">
            <h4 className="text-2xl font-bold text-sidebar">{cycle.stats.totalPoints}</h4>
            <p className="text-xs text-slate-400 mb-1">Total</p>
          </div>
          <p className="text-[11px] font-semibold text-primary mt-1">Avg: {cycle.stats.avgPoints} pts/faculty</p>
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
              onClick={handleExportCSV}
              disabled={filteredRankings.length === 0}
              className="flex items-center gap-2 px-4 py-1.5 bg-sidebar text-white rounded-lg text-xs font-bold hover:bg-sidebar-dark transition-all disabled:opacity-50 cursor-pointer"
            >
              <Download size={14} />
              Export
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
                     {searchTerm || activeFilterCount > 0 ? 'No faculty found matching your filters.' : 'No faculty applications found for this cycle.'}
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
                      <td className="px-6 py-4 text-xs font-semibold text-slate-500">{faculty.department}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            {/* Bar scales dynamically against the highest earner in the cycle */}
                            <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${(faculty.points / safeMaxPoints) * 100}%` }} />
                          </div>
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
              <button onClick={() => setIsFilterModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Department</label>
                <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                  {uniqueDepartments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Application Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                  {uniqueStatuses.map(status => <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>)}
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
        />
      )}
    </div>
  );
};

export default CycleDetailsPage;