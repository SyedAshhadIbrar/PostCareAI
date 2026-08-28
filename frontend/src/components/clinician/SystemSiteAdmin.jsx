import { useEffect, useState } from "react";
import { API_BASE } from "../../lib/api";
import { WARDS } from "../../lib/site";

export default function SystemSiteAdmin() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHealth() {
      try {
        const res = await fetch(`${API_BASE}/health`);
        if (res.ok) setHealth(await res.json());
      } catch (err) {
        console.error("SystemSiteAdmin: health check failed —", err);
      } finally {
        setLoading(false);
      }
    }
    loadHealth();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white tracking-tight">System Site Admin</h1>
        <p className="text-sm text-gray-400 mt-2">
          Organization-wide controls for PostCareAI deployment, agents, and recovery sites.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Recovery Sites", value: WARDS.length },
          { label: "API Status", value: health?.status === "ok" ? "Online" : "—" },
          { label: "Gemini Agents", value: health?.postcare_gemini?.configured ? "Enabled" : "Fallback" },
        ].map((card) => (
          <div key={card.label} className="bg-[#161616] border border-[#2a2a2a] rounded-xl px-6 py-5">
            <p className="text-sm text-gray-400">{card.label}</p>
            <p className="text-3xl font-semibold text-white mt-2">{loading ? "…" : card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#2a2a2a]">
          <h2 className="text-lg font-semibold text-white">System Settings</h2>
        </div>
        <div className="divide-y divide-[#2a2a2a]">
          {[
            {
              title: "Organization",
              detail: "PostCareAI — Multi-site post-operative wound monitoring",
            },
            {
              title: "Registered Wards",
              detail: WARDS.join(", "),
            },
            {
              title: "MedSigLIP Model",
              detail: health?.model_version || "Not loaded",
            },
            {
              title: "RAG Index",
              detail: health ? `${health.rag?.chunks_indexed ?? 0} chunks indexed` : "—",
            },
            {
              title: "LLM Provider",
              detail: health?.postcare_gemini?.agent_name
                ? `${health.postcare_gemini.agent_name} (${health.postcare_gemini.model})`
                : "PostCare-rules fallback",
            },
          ].map((row) => (
            <div key={row.title} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm font-medium text-gray-300">{row.title}</span>
              <span className="text-sm text-gray-500">{row.detail}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">Admin Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-gray-100 transition-colors"
          >
            Sync All Sites
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-lg border border-[#2a2a2a] text-sm font-medium text-gray-200 hover:bg-[#1a1a1a] transition-colors"
          >
            Export Audit Log
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-lg border border-[#2a2a2a] text-sm font-medium text-gray-200 hover:bg-[#1a1a1a] transition-colors"
          >
            Rebuild RAG Index
          </button>
        </div>
      </div>
    </div>
  );
}
