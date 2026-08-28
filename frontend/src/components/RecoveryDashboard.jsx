import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { API_BASE, getLastCase } from "../lib/api";
import { ProgressRing, GlassCard, MetricTile, PageHeader } from "./ui/MobileUi";

export default function RecoveryDashboard() {
  const [lastCase, setLastCase] = useState(() => getLastCase());
  const [status, setStatus] = useState({
    post_op_day: lastCase?.patient?.post_op_day || 1,
    surgeon: "Dr. Chen",
    flags: lastCase?.safety_flags || [],
    has_case: Boolean(lastCase),
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getLastCase();
    if (stored) setLastCase(stored);

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
        console.error("RecoveryDashboard: fetch failed —", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const c = lastCase;
  const hasCriticalFlags = (c?.safety_flags?.length || status.flags.length) > 0;
  const painLevel = c?.patient?.pain_score ?? null;
  const postOpDay = c?.patient?.post_op_day ?? status.post_op_day;
  const infectionPct = c?.wound?.infection_risk?.score != null ? Math.round(c.wound.infection_risk.score * 100) : null;
  const healingPct = c?.wound?.healing_status?.score != null ? Math.round(c.wound.healing_status.score * 100) : null;
  const priority = c?.clinician_priority || (hasCriticalFlags ? "high" : "routine");
  const guidance = c?.patient_guidance;
  const agent = guidance?.agent || c?.triage?.agent || "PostCare-rules";

  const steps = [
    { label: "Photo submitted", done: Boolean(c) },
    { label: "AI wound scan", done: Boolean(c?.wound) },
    { label: "Recovery chat", done: false },
    { label: "Clinician review", done: false },
  ];

  if (!c) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <ProgressRing value={0} size={140} stroke={8} color="#333" label="—" sublabel="No data" />
        <p className="text-white/50 text-sm mt-6 mb-6">Complete your first check-in to see recovery metrics.</p>
        <Link
          to="/patient/log"
          className="bg-[#00D9B5] text-black font-bold py-3.5 px-8 rounded-2xl text-sm"
        >
          Start Check-In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-4">
      <PageHeader title="Recovery" subtitle={`Case ${c.case_id}`} />

      {/* AI guidance */}
      <GlassCard className={`!p-5 ${hasCriticalFlags ? "ring-1 ring-amber-500/30" : "ring-1 ring-[#00D9B5]/20"}`}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#00D9B5] mb-2">{agent}</p>
        <p className="text-sm text-white/80 leading-relaxed">
          {guidance?.message ||
            (hasCriticalFlags
              ? "Signals detected that may need clinical attention."
              : "Your recovery appears on track.")}
        </p>
        <p className="text-xs text-amber-400/80 mt-2">Seek urgent care if pain worsens.</p>
        <Link
          to="/patient/assistant"
          className="mt-4 block text-center bg-white/8 text-white font-semibold py-3 rounded-xl text-sm"
        >
          Ask AI Coach
        </Link>
      </GlassCard>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetricTile label="Pain" value={painLevel ?? "—"} unit="/10" accent={painLevel >= 7} />
        <MetricTile label="Post-Op" value={`Day ${loading ? "…" : postOpDay}`} />
        <MetricTile label="Infection" value={infectionPct ?? "—"} unit={infectionPct != null ? "%" : ""} accent={infectionPct > 50} />
        <MetricTile label="Healing" value={healingPct ?? "—"} unit={healingPct != null ? "%" : ""} accent />
      </div>

      {/* Care path */}
      <GlassCard>
        <p className="text-[13px] font-semibold text-white/50 uppercase tracking-wider mb-3">Care Path</p>
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-3">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  step.done ? "bg-[#00D9B5]/20 text-[#00D9B5]" : "bg-white/5 text-white/25"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {step.done ? "check" : `${i + 1}`}
                </span>
              </div>
              <span className={`text-sm ${step.done ? "text-white" : "text-white/40"}`}>{step.label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-white/30 mt-4 capitalize">{priority} priority</p>
      </GlassCard>
    </div>
  );
}
