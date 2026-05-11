import { useState, useEffect } from 'react';
import { CheckCircle2, Search, Filter, ArrowRight, Calendar, Download, Loader2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
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

const HistoryPage = () => {
  const [cycles, setCycles] = useState<CycleHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({
    totalCycles: 0,
    avgParticipation: '0',
    highestAvg: '0'
  });

  useEffect(() => {
    const fetchHistoryData = async () => {
      try {
        setLoading(true);

        const [
          { data: cyclesData, error: cyclesError },
          { data: appsData, error: appsError }
        ] = await Promise.all([
          supabase.from('ranking_cycles').select('*'),
          supabase.from('applications').select('cycle_id, hr_score')
        ]);

        if (cyclesError) throw cyclesError;
        if (appsError) throw appsError;

        const safeCyclesData = cyclesData || [];
        const safeAppsData = appsData || [];
        
        const fetchedCycles: CycleHistory[] = [];
        let highestAverage = 0;

        safeCyclesData.forEach(data => {
          const cycleApps = safeAppsData.filter(app => String(app.cycle_id) === String(data.cycle_id));
          const totalFaculty = cycleApps.length;
          
          const totalPoints = cycleApps.reduce((sum, app) => {
            const score = Number(app.hr_score) || 0;
            return sum + score;
          }, 0);
          
          const avgPoints = totalFaculty > 0 ? (totalPoints / totalFaculty).toFixed(1) : '0';

          if (Number(avgPoints) > highestAverage) {
            highestAverage = Number(avgPoints);
          }

          // Updated logic to match active period statuses
          const isActive = ['open', 'submissions_closed', 'finished'].includes(data.status);

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
            rawStartDate: data.start_date || new Date().toISOString()
          });
        });

        fetchedCycles.sort((a, b) => new Date(b.rawStartDate).getTime() - new Date(a.rawStartDate).getTime());

        setCycles(fetchedCycles);
        setStats({
          totalCycles: fetchedCycles.length,
          avgParticipation: fetchedCycles.length > 0 ? (safeAppsData.length / fetchedCycles.length).toFixed(1) : '0',
          highestAvg: highestAverage.toFixed(1)
        });
        
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistoryData();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleExport = async (cycleId: string, cycleTitle: string) => {
    try {
      setExportingId(cycleId);

      // 1. Fetch all applications for the selected cycle
      const { data: apps, error: appsError } = await supabase
        .from('applications')
        .select('*')
        .eq('cycle_id', cycleId);

      if (appsError) throw appsError;

      if (!apps || apps.length === 0) {
        alert("No applications found for this cycle to export.");
        setExportingId(null);
        return;
      }

      // 2. Fetch relational data (Users, Departments, Positions) for mapping
      const userIds = [...new Set(apps.map(a => a.faculty_id).filter(Boolean))];
      
      const [
        { data: users },
        { data: depts },
        { data: positions }
      ] = await Promise.all([
        supabase.from('users').select('*').in('user_id', userIds),
        supabase.from('departments').select('*'),
        supabase.from('positions').select('*')
      ]);

      // Create lookup maps
      const userMap = new Map(users?.map(u => [u.user_id, u]));
      const deptMap = new Map(depts?.map(d => [String(d.department_id), d.department_name]));
      const posMap = new Map(positions?.map(p => [String(p.position_id), p.position_name]));

      // 3. Format the data for the CSV
      const formattedData = apps.map(app => {
        const user = userMap.get(app.faculty_id);
        const facultyName = user ? `${user.name_last || ''}, ${user.name_first || ''}`.replace(/^, | ,$/g, '') : 'Unknown';
        const deptName = user?.department_id ? deptMap.get(String(user.department_id)) || 'N/A' : 'N/A';
        const targetPos = app.target_position_id ? posMap.get(String(app.target_position_id)) || 'N/A' : 'N/A';
        const currentPos = app.current_rank_at_time || user?.current_rank || 'N/A';
        const score = Number(app.final_score) || 0;

        return {
          facultyName,
          department: deptName,
          currentPosition: currentPos,
          appliedPosition: targetPos,
          totalPoints: score,
          status: app.status || 'N/A'
        };
      });

      // 4. Sort by points descending (Rank 1 to N)
      formattedData.sort((a, b) => b.totalPoints - a.totalPoints);

      // 5. Generate CSV Content
      const headers = ['Ranking', 'Faculty Name', 'Department', 'Current Position', 'Applied Position', 'Total Points', 'Status'];
      const csvRows = [headers.join(',')];

      formattedData.forEach((row, index) => {
        const csvRow = [
          index + 1,
          `"${row.facultyName}"`, // Enclosed in quotes to handle names with commas
          `"${row.department}"`,
          `"${row.currentPosition}"`,
          `"${row.appliedPosition}"`,
          row.totalPoints.toFixed(2),
          row.status
        ];
        csvRows.push(csvRow.join(','));
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // 6. Trigger Download
      const link = document.createElement('a');
      const safeTitle = cycleTitle.replace(/[^a-zA-Z0-9]/g, '_');
      link.setAttribute('href', url);
      link.setAttribute('download', `Rankings_${safeTitle}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error("Export Error:", error);
      alert("An error occurred while exporting the data. Please try again.");
    } finally {
      setExportingId(null);
    }
  };

  const filteredCycles = cycles.filter(cycle => 
    cycle.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cycle.semester.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cycle.year.includes(searchTerm)
  );

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
      {/* Header with Search/Filter */}
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

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Periods', value: stats.totalCycles, color: 'bg-primary' },
          { label: 'Avg. Participation', value: stats.avgParticipation, color: 'bg-amber-500' },
          { label: 'Highest Avg. Points', value: stats.highestAvg, color: 'bg-emerald-500' },
          { label: 'System Status', value: 'Live', color: 'bg-sidebar' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{stat.label}</p>
            <div className="flex items-center gap-3">
              <div className={`w-2 h-6 rounded-full ${stat.color}`} />
              <p className="text-2xl font-black text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cycle List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredCycles.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-500 font-bold">No ranking periods found.</p>
            <p className="text-sm text-slate-400">Try adjusting your search terms.</p>
          </div>
        ) : (
          filteredCycles.map((cycle) => (
            <div 
              key={cycle.cycle_id}
              className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-primary/40 hover:shadow-md transition-all duration-300"
            >
              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
                
                {/* Left Side: Cycle Identifier */}
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
                      <span className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        cycle.status === 'Current' ? 'text-primary bg-primary/10 border border-primary/20' : 'text-slate-500 bg-slate-100 border border-slate-200'
                      }`}>
                        <CheckCircle2 size={12} />
                        {cycle.status}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        Started: {cycle.started}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Middle: Cycle Stats */}
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

                {/* Right Side: Actions */}
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
                  <Link to={`/history/${cycle.cycle_id}`} className="flex-1 lg:flex-none px-5 py-2.5 bg-sidebar text-white rounded-xl text-xs font-bold hover:bg-sidebar-dark shadow-sm transition-all group/btn flex items-center justify-center gap-2">
                    View Period Rankings
                    <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
                
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryPage;