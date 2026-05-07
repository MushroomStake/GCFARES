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
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // New states for the submission process
  const [cycleToSubmit, setCycleToSubmit] = useState<Cycle | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchDashboardData();

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
      supabase.removeChannel(notificationSubscription);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

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

        // Any status other than 'closed' means the cycle is still active/current
        const isCycleOpen = data.status !== 'closed';

        // Optionally, format the exact database status to look nicer, or stick to 'In Progress'
        // For example: if status is 'submissions_closed', it becomes 'Submissions Closed'
        const displayStatus = isCycleOpen 
          ? data.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
          : 'Completed';

        return {
          id: String(data.cycle_id || data.id), 
          title: data.title || `${data.semester} AY ${data.year}`,
          status: displayStatus, // Uses the formatted DB string if not closed
          isCurrent: isCycleOpen,
          started: startDate,
          deadline: deadlineDate,
          published: publishedDate,
          badge: !isCycleOpen ? 'CLOSED' : null
        };
      });

      // Sort cycles: current ones first
      fetchedCycles.sort((a, b) => (b.isCurrent === a.isCurrent) ? 0 : b.isCurrent ? 1 : -1);
      
      // Limit to showing only 4 cycles maximum
      setCycles(fetchedCycles.slice(0, 4));

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
      setLoading(false);
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
                status: 'Completed', 
                isCurrent: false, 
                badge: 'CLOSED',
                deadline: new Date(today).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              } 
            : c
        );
        // Re-sort so closed ones drop to the bottom
        return updated.sort((a, b) => (b.isCurrent === a.isCurrent) ? 0 : b.isCurrent ? 1 : -1);
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
      {/* Ranking Cycle History Section */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 md:p-8">
        
        {/* Responsive Header: Stacks on mobile, inline on tablet+ */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
          <div>
            <h3 className="text-base font-bold text-sidebar">Ranking Period History</h3>
            <p className="text-xs text-slate-500">All periods you have participated in or that are currently open</p>
          </div>
          <div className="bg-primary/5 text-primary text-[10px] font-bold px-3 py-1 rounded-full border border-primary/10 self-start sm:self-auto">
            {cycles.length} Periods
          </div>
        </div>

        {/* Grid layout is already perfect for 4 items (1 full row + 3 bottom row on desktop) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Added .slice(0, 4) here to enforce the 4-cycle limit visually */}
          {cycles.slice(0, 4).map((cycle) => (
            <div 
              key={cycle.id}
              className={`
                relative p-5 sm:p-6 rounded-2xl border transition-all
                ${cycle.isCurrent 
                  ? 'bg-primary/[0.03] border-primary shadow-lg shadow-primary/5 col-span-full' 
                  : 'bg-white border-slate-200 hover:border-primary/30 hover:shadow-md'}
              `}
            >
              {cycle.badge && (
                <span className="absolute top-4 right-4 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded tracking-tighter">
                  {cycle.badge}
                </span>
              )}

              <div className="flex flex-col h-full">
                <div className="mb-4 sm:mb-6 flex justify-between items-start">
                  <div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 sm:mb-2 block ${cycle.isCurrent ? 'text-primary' : 'text-slate-400'}`}>
                      {cycle.isCurrent ? 'Active Period' : 'Completed'}
                    </span>
                    <h4 className="text-base sm:text-lg font-bold text-slate-800">{cycle.title}</h4>
                  </div>
                </div>

                {/* Responsive Dates: Wrapped flexbox to prevent mobile overflow */}
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

                {/* Responsive Footer: Stacks actions on very small screens */}
                <div className="mt-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold w-fit ${
                    cycle.isCurrent ? 'bg-primary/10 text-primary' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {cycle.isCurrent ? <Clock size={12} /> : <CheckCircle2 size={12} />}
                    {cycle.status}
                  </div>
                  
                  {cycle.isCurrent ? (
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                      <Link to={`/FacultyReviewPage/${cycle.id}`} className="text-primary text-[10px] font-bold hover:underline flex items-center gap-1">
                        Review Details
                      </Link>
                      <button 
                        onClick={() => setCycleToSubmit(cycle)}
                        className="bg-primary text-white px-3 sm:px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 cursor-pointer flex-1 sm:flex-none"
                      >
                        Submit Final 
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  ) : (
                    <Link to={`/HistoryPage/${cycle.id}`} className="text-primary text-[10px] font-bold hover:underline flex items-center gap-1 group mt-2 sm:mt-0">
                      See more
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}

          {cycles.length === 0 && !loading && (
             <div className="col-span-full p-8 text-center text-slate-500 text-sm border-2 border-dashed border-slate-200 rounded-2xl">
               No ranking period found. Create one to get started.
             </div>
          )}
        </div>
      </section>

      {/* System Notifications Section (Already highly responsive) */}
      <section className="px-4 sm:px-0">
        <div className="mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-bold text-sidebar">System Notifications</h3>
          <p className="text-xs text-slate-500">Latest alerts and updates from the portal</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100">
            {activities.length > 0 ? activities.map((activity) => (
              <div key={activity.id} className={`p-4 hover:bg-slate-50 transition-colors flex justify-between items-center gap-4 ${!activity.isRead ? 'bg-primary/5' : ''}`}>
                <div className="flex-1">
                  <h5 className="text-sm font-bold text-slate-800">{activity.user}</h5>
                  <p className={`text-xs sm:text-[13px] font-medium mt-1 leading-snug ${!activity.isRead ? 'text-primary' : 'text-slate-600'}`}>
                    {activity.action}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1">{activity.time}</p>
                </div>
                {!activity.isRead && (
                  <div className="bg-primary/10 text-primary p-2 rounded-full shrink-0">
                    <BellRing size={16} />
                  </div>
                )}
              </div>
            )) : (
              <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <ActivityIcon size={24} className="opacity-20" />
                No recent notifications recorded.
              </div>
            )}
          </div>
        </div>
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