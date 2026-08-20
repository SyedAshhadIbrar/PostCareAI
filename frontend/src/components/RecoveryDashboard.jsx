import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { API_BASE, getLastCase } from "../lib/api";

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
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        }
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
  const painLevel = c?.patient?.pain_score != null ? `${c.patient.pain_score}/10` : "—";
  const postOpDay = c?.patient?.post_op_day ?? status.post_op_day;
  const infectionSignal = c?.wound?.infection_risk?.score != null
    ? `${Math.round(c.wound.infection_risk.score * 100)}%`
    : "—";
  const healingScore = c?.wound?.healing_status?.score != null
    ? `${Math.round(c.wound.healing_status.score * 100)}%`
    : "—";
  const caseId = c?.case_id || "—";
  const priority = c?.clinician_priority || (hasCriticalFlags ? "high" : "routine");
  const guidance = c?.patient_guidance;
  const agent = guidance?.agent || c?.triage?.agent || "PostCare-rules";

  return (
    <div>
      <div className="max-w-5xl mx-auto space-y-6">
        {c ? (
          <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-6">
            <h3 className="text-xl font-bold text-gray-100 mb-2">AI recovery guidance</h3>
            <p className="text-xs font-bold text-[#00ffcc] mb-4">{agent}</p>
            <p className="text-sm text-gray-300 mb-6">
              {guidance?.message ||
                (hasCriticalFlags
                  ? "We noticed signals that may need clinical attention. A care team member will review your case."
                  : "Your recovery appears to be on track. A care team member will review your case.")}{" "}
              <span className="text-amber-400 font-semibold">
                If pain worsens or you feel unwell, seek urgent care.
              </span>
            </p>
            <Link
              to="/patient/assistant"
              className="w-full bg-[#00ffcc] text-black font-bold py-3 rounded-lg hover:bg-[#00ccaa] transition-colors flex items-center justify-center text-sm"
            >
              Ask recovery questions
            </Link>
          </div>
        ) : (
          <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-6 text-center">
            <p className="text-sm text-gray-400 mb-4">No check-in yet. Submit your first daily log to see recovery metrics.</p>
            <Link
              to="/patient/log"
              className="inline-flex bg-[#00ffcc] text-black font-bold py-3 px-6 rounded-lg hover:bg-[#00ccaa] transition-colors text-sm"
            >
              Start daily check-in
            </Link>
          </div>
        )}

        <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-6">
          <h2 className="text-xl font-bold text-gray-100 tracking-tight">Recovery dashboard</h2>
          <p className="text-sm text-gray-400 mt-2">
            Case {caseId} &middot;{" "}
            <span className={hasCriticalFlags ? "text-amber-400 font-semibold" : "text-gray-400"}>
              {priority} priority
            </span>
          </p>
        </div>

        <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-6">
          <h3 className="text-lg font-bold text-gray-100 mb-4">Your care path</h3>
          <div className="text-sm text-gray-400 space-y-2">
            <div className="flex items-center gap-2">
              <span className={`material-symbols-outlined text-[16px] ${c ? "text-[#00ffcc]" : "text-gray-500"}`}>
                {c ? "check_circle" : "radio_button_unchecked"}
              </span>
              1. Photo &amp; details submitted
            </div>
            <div className="flex items-center gap-2">
              <span className={`material-symbols-outlined text-[16px] ${c?.wound ? "text-[#00ffcc]" : "text-gray-500"}`}>
                {c?.wound ? "check_circle" : "radio_button_unchecked"}
              </span>
              2. MedSigLIP wound assessment
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-gray-500 text-[16px]">radio_button_unchecked</span>
              3. PostCare-RAG recovery chat
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-gray-500 text-[16px]">radio_button_unchecked</span>
              4. Clinician review if needed
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-6 text-center flex flex-col justify-center">
            <div className="text-2xl font-bold text-gray-100">{painLevel}</div>
            <div className="text-sm text-gray-400 mt-1">Pain</div>
          </div>
          <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-6 text-center flex flex-col justify-center">
            <div className="text-2xl font-bold text-gray-100">
              {loading && !c ? "..." : `Day ${postOpDay}`}
            </div>
            <div className="text-sm text-gray-400 mt-1">Post-op</div>
          </div>
          <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-6 text-center flex flex-col justify-center">
            <div className="text-2xl font-bold text-gray-100">{infectionSignal}</div>
            <div className="text-sm text-gray-400 mt-1">Infection signal</div>
          </div>
          <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-6 text-center flex flex-col justify-center">
            <div className="text-2xl font-bold text-gray-100">{healingScore}</div>
            <div className="text-sm text-gray-400 mt-1">Healing score</div>
          </div>
        </div>
      </div>
    </div>
  );
}
