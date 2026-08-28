import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "../lib/api";
import { ProgressRing, GlassCard, MetricTile, SectionHeader, PageHeader } from "./ui/MobileUi";

export default function PatientDashboard() {
  const [status, setStatus] = useState({
    post_op_day: 1,
    surgeon: "Dr. Chen",
    flags: [],
    has_case: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        let url = `${API_BASE}/patient/status`;
        try {
          const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
          if (savedUser.id) url += `?user_id=${savedUser.id}`;
        } catch {
          /* ignore */
        }
        const response = await fetch(url);
        if (response.ok) setStatus(await response.json());
      } catch (err) {
        console.error("PatientDashboard: fetch failed —", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalDays = 14;
  const progressPercent = Math.min((status.post_op_day / totalDays) * 100, 100);
  const hasCriticalFlags = status.flags.length > 0;
  const recoveryScore = hasCriticalFlags ? 75 : 94;

  const medications = [
    { name: "Tacrolimus", dose: "1mg", freq: "Twice daily", type: "Immunosuppressant" },
    { name: "Amoxicillin", dose: "625mg", freq: "Every 12h", type: "Antibiotic" },
    { name: "Paracetamol", dose: "500mg", freq: "As needed", type: "Pain Relief" },
  ];

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        title="Recovery"
        subtitle="Liver Transplant · Recovery"
        badge={
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#00D9B5]/15 text-[#00D9B5] border border-[#00D9B5]/25">
            Active
          </span>
        }
      />

      {/* Hero ring — Whoop style */}
      <div className="flex flex-col items-center py-4 glow-accent rounded-3xl ios-card">
        <ProgressRing
          value={recoveryScore}
          size={180}
          stroke={12}
          color={hasCriticalFlags ? "#FFB020" : "#00D9B5"}
          label={loading ? "…" : `${recoveryScore}%`}
          sublabel={hasCriticalFlags ? "Needs Review" : "On Track"}
        />
        <p className="text-sm text-white/50 mt-4">
          Day {loading ? "…" : status.post_op_day} of {totalDays} post-op
        </p>
        <div className="w-48 h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-[#00D9B5] rounded-full transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Metric tiles */}
      <div className="grid grid-cols-2 gap-3">
        <MetricTile label="Check-In" value="Due" unit="today" accent icon="schedule" />
        <MetricTile label="Surgeon" value={loading ? "…" : status.surgeon.split(" ")[1] || "Chen"} icon="badge" />
        <MetricTile
          label="Flags"
          value={hasCriticalFlags ? status.flags.length : 0}
          unit={hasCriticalFlags ? "active" : "clear"}
          accent={hasCriticalFlags}
          icon="warning"
        />
        <MetricTile label="Phase" value={`D${status.post_op_day}`} unit="recovery" icon="calendar_today" />
      </div>

      {/* Primary CTA */}
      <Link to="/patient/log" className="block">
        <GlassCard className="!p-5 flex items-center gap-4 ring-1 ring-[#00D9B5]/30">
          <div className="w-12 h-12 rounded-2xl bg-[#00D9B5]/15 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[#00D9B5] text-2xl">add_a_photo</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white">Daily Check-In</p>
            <p className="text-xs text-white/45 mt-0.5">Photo + pain + symptoms</p>
          </div>
          <span className="material-symbols-outlined text-white/30">chevron_right</span>
        </GlassCard>
      </Link>

      {/* Medications */}
      <div>
        <SectionHeader title="Medications" />
        <div className="space-y-2">
          {medications.map((med) => (
            <GlassCard key={med.name} className="!p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white/40 text-[20px]">medication</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{med.name}</p>
                <p className="text-xs text-white/40">{med.freq}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-[#00D9B5]">{med.dose}</p>
                <p className="text-[10px] text-white/30">{med.type}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* AI Coach */}
      <Link to="/patient/assistant" className="block">
        <GlassCard className="!p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[#00D9B5] text-2xl">smart_toy</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white">AI Recovery Coach</p>
            <p className="text-xs text-white/45 mt-0.5">24/7 guidance from care guides</p>
          </div>
          <span className="material-symbols-outlined text-white/30">chevron_right</span>
        </GlassCard>
      </Link>
    </div>
  );
}
