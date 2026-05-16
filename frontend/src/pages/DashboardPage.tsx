import { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2, Clock, Activity as ActivityIcon, BellRing, AlertTriangle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient'; 

interface Cycle {
  id: string;
  title: string;
  status: string;
  isCurrent: boolean;
  started: string;
  deadline?: string;
  published?: string;
  badge: string | null;
  rawStartDate: string;
}

interface ActivityLog {
  id: string;
  user: string;
  action: string;
  time: string;
  isRead: boolean;
}

const DashboardPage = () => {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<Cycle | null>(null);
  const [activePeriods, setActivePeriods] = useState<Cycle[]>([]);
  const [donePeriods, setDonePeriods] = useState<Cycle[]>([]);
  const [donePeriodsPage, setDonePeriodsPage] = useState(1);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // New states for the submission process
  const [cycleToSubmit, setCycleToSubmit] = useState<Cycle | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const donePeriodsPageSize = 4;

  useEffect(() => {
    void fetchDashboardData();

    const periodSubscription = supabase
      .channel('dashboard-period-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ranking_cycles' },
        () => {
          void fetchDashboardData(true);
        }
      )
      .subscribe();

    // --- NEW: Real-time listener for new notifications ---
    const notificationSubscription = supabase
      .channel('custom-insert-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newData = payload.new;
          const logDate = newData.created_at ? new Date(newData.created_at) : new Date();
          const timeString = logDate.toLocaleDateString('en-US', { 
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
          });

          const newActivity: ActivityLog = {
            id: String(newData.id),
            user: 'System Notification',
            action: newData.message || 'New system update',
            time: timeString,
            isRead: newData.is_read || false
          };

          // Add new notification to the top of the list and keep only the latest 5
          setActivities((prevActivities) => {
            return [newActivity, ...prevActivities].slice(0, 5);
          });
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(periodSubscription);
      supabase.removeChannel(notificationSubscription);
    };
  }, []);

  const totalDonePages = Math.max(1, Math.ceil(donePeriods.length / donePeriodsPageSize));
  const safeDonePage = Math.min(donePeriodsPage, totalDonePages);
  const doneStartIndex = (safeDonePage - 1) * donePeriodsPageSize;
  const visibleDonePeriods = donePeriods.slice(doneStartIndex, doneStartIndex + donePeriodsPageSize);

  useEffect(() => {
    if (donePeriodsPage > totalDonePages) {
      setDonePeriodsPage(totalDonePages);
    }
  }, [donePeriodsPage, totalDonePages]);

  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      // 1. Fetch Cycles from Supabase
      const { data: cyclesData, error: cyclesError } = await supabase
        .from('ranking_cycles')
        .select('*');

      if (cyclesError) throw cyclesError;

      const fetchedCycles: Cycle[] = (cyclesData || []).map((data) => {
        const startDate = data.start_date 
          ? new Date(data.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
          : 'TBA';
          
        const deadlineDate = data.deadline 
          ? new Date(data.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
          : 'TBA';
          
        const publishedDate = data.published_date 
          ? new Date(data.published_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
          : undefined;

        // Active period: status is NOT 'finished' and NOT 'closed'
        const isActive = data.status !== 'finished' && data.status !== 'closed';

        return {
          id: String(data.cycle_id || data.id), 
          title: data.title || `${data.semester} AY ${data.year}`,
          status: isActive ? 'Current' : 'Finished',
          isCurrent: isActive,
          started: startDate,
          deadline: deadlineDate,
          published: publishedDate,
          badge: !isActive ? 'FINISHED' : null,
          rawStartDate: data.start_date || data.created_at || data.deadline || ''
        };
      });

      // Sort by newest period first
      fetchedCycles.sort((a, b) => new Date(b.rawStartDate).getTime() - new Date(a.rawStartDate).getTime());
      
      // Categorize cycles
      const current = fetchedCycles.find((cycle) => cycle.isCurrent) || null;
      const active = fetchedCycles.filter((cycle) => cycle.isCurrent && cycle.id !== current?.id);
      const done = fetchedCycles.filter((cycle) => !cycle.isCurrent);
      
      setCurrentPeriod(current);
      setActivePeriods(active);
      setDonePeriods(done);
      setCycles(fetchedCycles);

      // 2. Fetch Notifications
      const { data: notifData, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (notifError) {
        console.warn("Could not fetch notifications.", notifError);
        setActivities([]);
      } else {
        const fetchedLogs: ActivityLog[] = (notifData || []).map((data) => {
          const logDate = data.created_at ? new Date(data.created_at) : null;
          const timeString = logDate 
            ? logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
            : 'Unknown time';

          return {
            id: String(data.id),
            user: 'System Notification', 
            action: data.message || 'New system update',
            time: timeString,
            isRead: data.is_read || false
          };
        });
        setActivities(fetchedLogs);
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // --- NEW: Function to handle cycle submission ---
  const handleConfirmSubmit = async () => {
    if (!cycleToSubmit) return;
    setIsSubmitting(true);

    try {
      const today = new Date().toISOString();

      // ✅ Changed to 'deadline' to perfectly match your schema diagram
      const { error } = await supabase
        .from('ranking_cycles')
        .update({ 
          status: 'closed', 
          deadline: today   
        })
        .eq('cycle_id', cycleToSubmit.id);

      if (error) throw error;

      // Update the local state instantly so the UI reflects the change
      setCycles(prevCycles => {
        const updated = prevCycles.map(c => 
          c.id === cycleToSubmit.id 
            ? { 
                ...c, 
                status: 'Finished', 
                isCurrent: false, 
                badge: 'FINISHED',
                deadline: new Date(today).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              } 
            : c
        );
        return updated.sort((a, b) => new Date(b.rawStartDate).getTime() - new Date(a.rawStartDate).getTime());
      });

      // Recategorize periods
      setCycles(prev => {
        const current = prev.find((cycle) => cycle.isCurrent) || null;
        const active = prev.filter((cycle) => cycle.isCurrent && cycle.id !== current?.id);
        const done = prev.filter((cycle) => !cycle.isCurrent);
        
        setCurrentPeriod(current);
        setActivePeriods(active);
        setDonePeriods(done);
        return prev;
      });

      // Optional: Add a system notification that the cycle was published
      await supabase.from('notifications').insert([
        { message: `${cycleToSubmit.title} has been finalized and published.`, is_read: false }
      ]);

      setCycleToSubmit(null);
    } catch (error) {
      console.error("Error submitting final results:", error);
      alert("There was an error finalizing the cycle. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold animate-pulse">Loading dashboard data...</div>;
  }

  return (
    <div className="space-y-6 md:space-y-10 relative px-4 sm:px-6 md:px-0">
      {/* Ranking Period History Section */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 md:p-8">
        
        {/* Responsive Header: Stacks on mobile, inline on tablet+ */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
          <div>
            <h3 className="text-base font-bold text-sidebar">Ranking Period History</h3>
            <p className="text-xs text-slate-500">Current period shown separately, active periods listed below, completed periods at the bottom</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <span className="bg-primary/5 text-primary text-[10px] font-bold px-3 py-1 rounded-full border border-primary/10">
              {cycles.length} Total Periods
            </span>
          </div>
        </div>

        {/* CURRENT PERIOD SECTION */}
        {currentPeriod && (
          <div className="mb-8">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Currently Active</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              <div 
                key={currentPeriod.id}
                className="relative h-full p-5 sm:p-6 rounded-2xl border transition-all flex flex-col bg-primary/[0.03] border-primary shadow-lg shadow-primary/5"
              >
                <div className="flex flex-col h-full">
                  <div className="mb-4 sm:mb-6 flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider mb-1.5 sm:mb-2 block text-primary">
                        Current Period
                      </span>
                      <h5 className="text-base sm:text-[1.05rem] font-bold text-slate-800 leading-snug">{currentPeriod.title}</h5>
                    </div>
                  </div>

                  {/* Responsive Dates */}
                  <div className="flex flex-wrap gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Started</p>
                      <p className="text-xs font-semibold text-slate-700">{currentPeriod.started}</p>
                    </div>
                    {currentPeriod.deadline && (
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Deadline</p>
                        <p className="text-xs font-semibold text-slate-700">{currentPeriod.deadline}</p>
                      </div>
                    )}
                    {currentPeriod.published && (
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Published</p>
                        <p className="text-xs font-semibold text-slate-700">{currentPeriod.published}</p>
                      </div>
                    )}
                  </div>

                  {/* Footer with Actions */}
                  <div className="mt-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold w-fit bg-primary/10 text-primary">
                      <Clock size={12} />
                      {currentPeriod.status}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                      <Link to={`/FacultyReviewPage/${currentPeriod.id}`} className="text-primary text-[10px] font-bold hover:underline flex items-center gap-1">
                        Review Period
                      </Link>
                      <button 
                        onClick={() => setCycleToSubmit(currentPeriod)}
                        className="bg-primary text-white px-3 sm:px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 cursor-pointer flex-1 sm:flex-none"
                      >
                        Finalize Period 
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE PERIODS SECTION */}
        {activePeriods.length > 0 && (
          <div className="mb-8">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Active Periods</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
              {activePeriods.map((cycle) => (
                <div 
                  key={cycle.id}
                  className="relative h-full p-5 sm:p-6 rounded-2xl border transition-all flex flex-col bg-white border-slate-200 hover:border-primary/30 hover:shadow-md"
                >
                  <div className="flex flex-col h-full">
                    <div className="mb-4 sm:mb-6 flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider mb-1.5 sm:mb-2 block text-slate-400">
                          Active Period
                        </span>
                        <h5 className="text-base sm:text-[1.05rem] font-bold text-slate-800 leading-snug">{cycle.title}</h5>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Started</p>
                        <p className="text-xs font-semibold text-slate-700">{cycle.started}</p>
                      </div>
                      {cycle.deadline && (
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Deadline</p>
                          <p className="text-xs font-semibold text-slate-700">{cycle.deadline}</p>
                        </div>
                      )}
                      {cycle.published && (
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Published</p>
                          <p className="text-xs font-semibold text-slate-700">{cycle.published}</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold w-fit bg-primary/10 text-primary">
                        <Clock size={12} />
                        {cycle.status}
                      </div>
                      
                      <Link to={`/FacultyReviewPage/${cycle.id}`} className="text-primary text-[10px] font-bold hover:underline flex items-center gap-1 group mt-2 sm:mt-0">
                        Review Period
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* COMPLETED PERIODS SECTION */}
        {donePeriods.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Completed Periods</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
              {visibleDonePeriods.map((cycle) => (
                <div 
                  key={cycle.id}
                  className="relative h-full p-5 sm:p-6 rounded-2xl border transition-all flex flex-col bg-slate-50 border-slate-200 hover:border-slate-300 hover:shadow-md"
                >
                  {cycle.badge && (
                    <span className="absolute top-4 right-4 bg-slate-400 text-white text-[9px] font-black px-2 py-0.5 rounded tracking-tighter">
                      {cycle.badge}
                    </span>
                  )}

                  <div className="flex flex-col h-full">
                    <div className="mb-4 sm:mb-6 flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider mb-1.5 sm:mb-2 block text-slate-500">
                          Finished Period
                        </span>
                        <h5 className="text-base sm:text-[1.05rem] font-bold text-slate-700 leading-snug">{cycle.title}</h5>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8">
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Started</p>
                        <p className="text-xs font-semibold text-slate-600">{cycle.started}</p>
                      </div>
                      {cycle.deadline && (
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Deadline</p>
                          <p className="text-xs font-semibold text-slate-600">{cycle.deadline}</p>
                        </div>
                      )}
                      {cycle.published && (
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Published</p>
                          <p className="text-xs font-semibold text-slate-600">{cycle.published}</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold w-fit bg-slate-200 text-slate-700">
                        <CheckCircle2 size={12} />
                        {cycle.status}
                      </div>
                      
                      <Link to={`/HistoryPage/${cycle.id}`} className="text-primary text-[10px] font-bold hover:underline flex items-center gap-1 group mt-2 sm:mt-0">
                        View Period
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {donePeriods.length > donePeriodsPageSize && (
              <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium text-slate-500">
                  Showing {doneStartIndex + 1}-{Math.min(doneStartIndex + donePeriodsPageSize, donePeriods.length)} of {donePeriods.length} completed periods
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setDonePeriodsPage((page) => Math.max(1, page - 1))}
                    disabled={safeDonePage === 1}
                  >
                    Previous
                  </button>
                  <span className="text-xs font-semibold text-slate-500">
                    Page {safeDonePage} of {totalDonePages}
                  </span>
                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setDonePeriodsPage((page) => Math.min(totalDonePages, page + 1))}
                    disabled={safeDonePage === totalDonePages}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {cycles.length === 0 && !loading && (
           <div className="p-8 text-center text-slate-500 text-sm border-2 border-dashed border-slate-200 rounded-2xl">
             No ranking periods found. Create one to get started.
           </div>
        )}
      </section>

    

      {/* Confirmation Modal */}
      {cycleToSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal content remains the same */}
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 text-amber-500 mb-4 mx-auto">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 text-center mb-2">Publish Final Results?</h3>
              <p className="text-sm text-slate-500 text-center mb-6">
                Are you sure you want to finalize the results for <strong>{cycleToSubmit.title}</strong>? Once published, this ranking period will be closed and results will be recorded in history.
              </p>
              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <button 
                  onClick={() => setCycleToSubmit(null)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 sm:py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 sm:py-3 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/30 transition-colors cursor-pointer disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isSubmitting ? (
                    <><Loader2 size={16} className="animate-spin" /> Submitting...</>
                  ) : (
                    'Confirm Publish'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;