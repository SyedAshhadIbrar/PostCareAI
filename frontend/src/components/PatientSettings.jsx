import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GlassCard, PageHeader } from "./ui/MobileUi";

export default function PatientSettings() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ name: "Patient", email: "" });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("user") || "{}");
      if (saved.name) setUser(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const rows = [
    { icon: "notifications", label: "Daily Reminders", value: "6:00 PM" },
    { icon: "language", label: "Language", value: "English" },
    { icon: "shield", label: "Privacy", value: "" },
    { icon: "info", label: "About PostCareAI", value: "v1.0" },
  ];

  return (
    <div className="space-y-5 pb-4">
      <PageHeader title="You" subtitle="Account & preferences" />

      {/* Profile card */}
      <GlassCard className="!p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00D9B5]/30 to-[#00D9B5]/5 flex items-center justify-center">
          <span className="material-symbols-outlined text-[#00D9B5] text-3xl">person</span>
        </div>
        <div>
          <p className="text-lg font-bold text-white">{user.name}</p>
          <p className="text-sm text-white/40">{user.email || "patient@postcare.test"}</p>
          <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#00D9B5]/15 text-[#00D9B5]">
            Active Care Plan
          </span>
        </div>
      </GlassCard>

      {/* Settings list */}
      <GlassCard className="!p-0 overflow-hidden divide-y divide-white/8">
        {rows.map((row) => (
          <button
            key={row.label}
            type="button"
            className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-white/5 transition-colors"
          >
            <span className="material-symbols-outlined text-white/40 text-[22px]">{row.icon}</span>
            <span className="flex-1 text-sm text-white">{row.label}</span>
            {row.value && <span className="text-sm text-white/30">{row.value}</span>}
            <span className="material-symbols-outlined text-white/20 text-[18px]">chevron_right</span>
          </button>
        ))}
      </GlassCard>

      <button
        type="button"
        onClick={() => {
          localStorage.removeItem("user");
          navigate("/");
        }}
        className="w-full py-4 rounded-2xl bg-red-500/10 text-red-400 font-semibold text-sm border border-red-500/20"
      >
        Sign Out
      </button>

      <p className="text-[11px] text-white/25 text-center px-4 leading-relaxed">
        PostCareAI is a prototype. Not a substitute for medical advice. Contact your care team for emergencies.
      </p>
    </div>
  );
}
