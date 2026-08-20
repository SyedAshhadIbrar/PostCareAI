import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "../lib/api";

export default function Dashboard() {
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState({
    active_patients: 0,
    pending_reviews: 0,
    urgent_escalations: 0,
    compliance_rate: 94.2,
    triage_distribution: { routine: 0, review: 0, urgent: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [casesRes, statsRes] = await Promise.all([
          fetch(`${API_BASE}/clinician/cases`),
          fetch(`${API_BASE}/clinician/stats`),
        ]);
        if (casesRes.ok) setCases(await casesRes.json());
        if (statsRes.ok) setStats(await statsRes.json());
      } catch (err) {
        console.error("Dashboard: fetch failed —", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <>
      {/* Row 1: KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-5 relative overflow-hidden group hover:border-[#00ffcc]/50 transition-colors">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#00ffcc]/5 rounded-full blur-2xl group-hover:bg-[#00ffcc]/10 transition-colors"></div>
          <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-[#00ffcc]">monitor_heart</span>
            Active Patients
          </div>
          <div className="text-3xl font-bold text-gray-100 leading-none mt-4">{stats.active_patients}</div>
        </div>

        <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-5 relative overflow-hidden group hover:border-amber-500/50 transition-colors">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors"></div>
          <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-amber-400">pending_actions</span>
            Pending AI Reviews
          </div>
          <div className="text-3xl font-bold text-amber-400 leading-none mt-4">{stats.pending_reviews}</div>
        </div>

        <div className="bg-[#1e1e1e] border border-red-500/30 rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/10 rounded-full blur-2xl"></div>
          <div className="text-red-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">warning</span>
            Urgent Escalations
            <div className="w-2 h-2 rounded-full bg-red-500 ml-auto animate-pulse"></div>
          </div>
          <div className="text-3xl font-bold text-red-400 leading-none mt-4">{stats.urgent_escalations}</div>
        </div>

        <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-5 relative overflow-hidden group hover:border-[#00ffcc]/50 transition-colors">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#00ffcc]/5 rounded-full blur-2xl group-hover:bg-[#00ffcc]/10 transition-colors"></div>
          <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-[#00ffcc]">verified_user</span>
            Compliance Rate
          </div>
          <div className="text-3xl font-bold text-[#00ffcc] leading-none mt-4">
            {stats.compliance_rate}<span className="text-xl">%</span>
          </div>
        </div>
      </section>

      {/* Row 2: Analytics */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Left Card: Chart Mockup */}
        <div className="md:col-span-2 bg-[#1e1e1e] border border-[#333333] rounded-xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-100">Patient Check-ins vs Flags (7-Day)</h3>
            <button className="text-gray-400 hover:text-[#00ffcc] text-sm flex items-center gap-1 transition-colors">
              <span className="material-symbols-outlined text-[18px]">download</span> Export
            </button>
          </div>
          <div className="flex-1 flex gap-3 mt-4 items-end h-48 pt-2 relative">
            {/* Y Axis Labels */}
            <div className="flex flex-col justify-between text-gray-500 items-end text-[10px] font-bold h-full pb-6 select-none">
              <span>50</span>
              <span>25</span>
              <span>0</span>
            </div>
            {/* Empty Bars Container */}
            <div className="flex-1 flex items-end gap-2 h-full border-b border-l border-[#333333] pb-2 pl-2 relative">
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm font-bold opacity-50">
                Awaiting Data
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Distribution */}
        <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-6 flex flex-col">
          <h3 className="text-lg font-bold text-gray-100 mb-6">Triage Distribution</h3>
          <div className="space-y-6 flex-1 flex flex-col justify-center">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#00ffcc] font-bold">Routine</span>
                <span className="text-gray-100 font-bold text-sm">{stats.triage_distribution?.routine || 0}%</span>
              </div>
              <div className="h-1.5 w-full bg-[#121212] rounded-full overflow-hidden border border-[#333333]">
                <div className="h-full bg-[#00ffcc] rounded-full transition-all duration-500" style={{ width: `${stats.triage_distribution?.routine || 0}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-amber-400 font-bold">Review</span>
                <span className="text-gray-100 font-bold text-sm">{stats.triage_distribution?.review || 0}%</span>
              </div>
              <div className="h-1.5 w-full bg-[#121212] rounded-full overflow-hidden border border-[#333333]">
                <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${stats.triage_distribution?.review || 0}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-red-400 font-bold flex items-center gap-1">
                  Urgent <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                </span>
                <span className="text-gray-100 font-bold text-sm">{stats.triage_distribution?.urgent || 0}%</span>
              </div>
              <div className="h-1.5 w-full bg-[#121212] rounded-full overflow-hidden border border-[#333333]">
                <div className="h-full bg-red-500 rounded-full transition-all duration-500" style={{ width: `${stats.triage_distribution?.urgent || 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Row 3: Priority Queue */}
      <section className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-400">priority_high</span>
            Priority Triage Queue
          </h3>
          <Link
            to="/clinician/queue"
            className="text-[#00ffcc] hover:text-[#00ccaa] text-sm font-bold flex items-center gap-1 transition-colors"
          >
            View Full Queue <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#333333] text-gray-400 text-xs font-bold uppercase tracking-wider bg-[#121212]">
                <th className="py-3 px-4 font-bold">Patient</th>
                <th className="py-3 px-4 font-bold">Timeline</th>
                <th className="py-3 px-4 font-bold">Flagged Symptoms</th>
                <th className="py-3 px-4 font-bold">Priority</th>
                <th className="py-3 px-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-[#333333]">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-gray-500">
                    Loading cases...
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-gray-500">
                    No active cases in queue.
                  </td>
                </tr>
              ) : (
                [...cases]
                  .sort((a, b) => (a.priority === "high" ? -1 : 1) - (b.priority === "high" ? -1 : 1))
                  .map((row) => (
                    <tr key={row.case_id} className="hover:bg-[#2a2a2a]/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="text-gray-100 font-bold">{row.patient_name}</div>
                        <div className="text-gray-500 text-xs mt-0.5">{row.case_id}</div>
                      </td>
                      <td className="py-4 px-4 text-gray-400">Post-Op Day {row.post_op_day}</td>
                      <td className="py-4 px-4 text-gray-200 font-medium">
                        {row.safety_flags?.length > 0 
                          ? row.safety_flags.join(", ") 
                          : row.symptoms?.length > 0 
                            ? row.symptoms.join(", ") 
                            : "None reported"}
                      </td>
                      <td className="py-4 px-4">
                        {row.priority === "high" ? (
                          <span className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-500 px-2.5 py-1 rounded text-xs font-bold tracking-wide uppercase">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                            Critical
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-[#00ffcc]/10 border border-[#00ffcc]/20 text-[#00ffcc] px-2.5 py-1 rounded text-xs font-bold tracking-wide uppercase">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#00ffcc]"></div>
                            Routine
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Link
                          to="/clinician/queue"
                          className={`inline-block px-4 py-1.5 rounded-md text-xs font-bold border transition-colors ${
                            row.priority === "high"
                              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/30"
                              : "bg-[#2a2a2a] text-gray-300 hover:bg-[#333333] hover:text-white border-[#333333]"
                          }`}
                        >
                          {row.priority === "high" ? "Open Case" : "Review"}
                        </Link>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
