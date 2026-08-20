import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "../lib/api";

export default function PatientDashboard() {
  const [status, setStatus] = useState({
    post_op_day: 1,
    surgeon: "Dr. Chen",
    flags: [],
    has_case: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        let url = `${API_BASE}/patient/status`;
        try {
          const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
          if (savedUser.id) url += `?user_id=${savedUser.id}`;
        } catch (err) { /* ignore */ }
        const response = await fetch(url);
        if (response.ok) {
          setStatus(await response.json());
        }
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
  
  // Basic recovery score calculation
  const hasCriticalFlags = status.flags.length > 0;
  const recoveryScore = hasCriticalFlags ? 75 : 94;

  const medications = [
    {
      name: "Tacrolimus (Prograf)",
      dosage: "1mg",
      frequency: "Twice daily (8:00 AM / 8:00 PM)",
      instructions: "Take on an empty stomach with water.",
      type: "Immunosuppressant",
    },
    {
      name: "Amoxicillin / Clavulanate",
      dosage: "625mg",
      frequency: "Every 12 hours after meals",
      instructions: "Complete full 7-day course.",
      type: "Antibiotic",
    },
    {
      name: "Paracetamol",
      dosage: "500mg",
      frequency: "As needed for pain (Max 3g/day)",
      instructions: "Do not exceed recommended dose.",
      type: "Pain Relief",
    },
  ];

  return (
    <div>
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-[#333333] pb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-100 tracking-tight">
              Patient Recovery Dashboard
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Pakistan Kidney &amp; Liver Institute (PKLI Lahore)
            </p>
            <p className="text-xs font-bold text-[#00ffcc] uppercase tracking-widest mt-1">
              Dept: Liver Transplant Surgery
            </p>
          </div>
          <div className="bg-[#1e1e1e] border border-[#00ffcc]/40 px-3.5 py-1.5 rounded-lg text-xs font-bold text-[#00ffcc] flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            Active Recovery Phase
          </div>
        </div>

        {/* 1. Top Info Cards (KPI Grid - 4 Columns on desktop) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-5 hover:border-[#00ffcc]/50 transition-colors">
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Post-Op Timeline</span>
              <span className="material-symbols-outlined text-[18px] text-[#00ffcc]">calendar_today</span>
            </div>
            <div className="text-2xl font-bold text-gray-100 mt-2">
              {loading ? "..." : `Day ${status.post_op_day}`} <span className="text-xs text-gray-400 font-normal">of {totalDays}</span>
            </div>
            <div className="w-full bg-[#121212] h-1.5 rounded-full mt-3 overflow-hidden border border-[#333333]">
              <div className="bg-[#00ffcc] h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>

          <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-5 hover:border-[#00ffcc]/50 transition-colors">
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Recovery Score</span>
              <span className="material-symbols-outlined text-[18px] text-[#00ffcc]">monitoring</span>
            </div>
            <div className={`text-2xl font-bold mt-2 ${hasCriticalFlags ? 'text-amber-400' : 'text-[#00ffcc]'}`}>
              {loading ? "..." : `${recoveryScore}%`} <span className="text-xs text-gray-400 font-normal">{hasCriticalFlags ? 'Needs Review' : 'On Track'}</span>
            </div>
            <p className={`text-[11px] mt-2 ${hasCriticalFlags ? 'text-amber-400' : 'text-gray-400'}`}>
              {loading ? "..." : (hasCriticalFlags ? status.flags.join(", ") : "No critical flags reported")}
            </p>
          </div>

          <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-5 hover:border-[#00ffcc]/50 transition-colors">
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Next Check-In</span>
              <span className="material-symbols-outlined text-[18px] text-amber-400">schedule</span>
            </div>
            <div className="text-xl font-bold text-gray-100 mt-2">Today, 6:00 PM</div>
            <p className="text-[11px] text-amber-400 font-semibold mt-2">Log Pending</p>
          </div>

          <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-5 hover:border-[#00ffcc]/50 transition-colors">
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Lead Surgeon</span>
              <span className="material-symbols-outlined text-[18px] text-[#00ffcc]">badge</span>
            </div>
            <div className="text-lg font-bold text-gray-100 mt-2 truncate">{loading ? "..." : status.surgeon}</div>
            <p className="text-[11px] text-gray-400 truncate mt-1">Transplant Surgery</p>
          </div>
        </div>

        {/* 2. Daily Log Option Card */}
        <div className="bg-[#1e1e1e] border border-[#00ffcc]/40 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00ffcc] text-2xl">edit_note</span>
                <h3 className="text-lg font-bold text-gray-100">Daily Recovery Check-In</h3>
                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                  Due Today
                </span>
              </div>
              <p className="text-sm text-gray-400">
                Upload today's wound photo and record your pain level and observed symptoms for Dr. Chen.
              </p>
            </div>
            <Link
              to="/patient/log"
              className="w-full sm:w-auto bg-[#00ffcc] text-black font-bold py-3 px-6 rounded-lg hover:bg-[#00ccaa] transition-colors flex items-center justify-center gap-2 shrink-0 text-sm"
            >
              <span>Start Daily Check-In</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>

        {/* 3. Medical Prescription from Doctor */}
        <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-6">
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-[#333333]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00ffcc] text-2xl">prescriptions</span>
              <div>
                <h3 className="text-lg font-bold text-gray-100">Doctor's Prescriptions</h3>
                <p className="text-xs text-gray-400">Issued by Dr. Chen — PKLI Lahore</p>
              </div>
            </div>
            <button
              onClick={() => alert("Downloading digital prescription PDF...")}
              className="text-xs text-[#00ffcc] hover:underline font-semibold flex items-center gap-1 bg-[#121212] border border-[#333333] px-3 py-1.5 rounded-md"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Download PDF
            </button>
          </div>

          <div className="space-y-3">
            {medications.map((med, idx) => (
              <div
                key={idx}
                className="bg-[#121212] border border-[#333333] rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-gray-600 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-100 text-sm">{med.name}</h4>
                    <span className="bg-[#2a2a2a] text-[#00ffcc] text-[10px] font-bold px-2 py-0.5 rounded border border-[#333333]">
                      {med.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    <span className="text-gray-300 font-medium">Instruction:</span> {med.instructions}
                  </p>
                </div>
                <div className="sm:text-right shrink-0">
                  <div className="text-xs font-bold text-[#00ffcc]">{med.dosage}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{med.frequency}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. AI Chatbot Option */}
        <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-6 hover:border-[#00ffcc]/40 transition-colors">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00ffcc] text-2xl">smart_toy</span>
                <h3 className="text-lg font-bold text-gray-100">PostCare AI Assistant</h3>
                <span className="bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc]/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                  24/7 Available
                </span>
              </div>
              <p className="text-sm text-gray-400">
                Have questions about wound symptoms, pain medication schedules, or recovery guidelines? Ask AI Care Assistant anytime.
              </p>
            </div>
            <Link
              to="/patient/assistant"
              className="w-full sm:w-auto bg-[#2a2a2a] text-gray-200 hover:text-white hover:bg-[#333333] border border-[#333333] font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shrink-0 text-sm"
            >
              <span>Open AI Chatbot</span>
              <span className="material-symbols-outlined text-[18px] text-[#00ffcc]">chat</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
