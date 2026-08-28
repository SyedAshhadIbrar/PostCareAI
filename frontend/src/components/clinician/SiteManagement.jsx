import { useEffect, useState } from "react";
import { WARDS, getActiveSite, setActiveSite } from "../../lib/site";

const SITE_META = {
  "Ward A": {
    beds: 24,
    lead: "Dr. Chen",
    unit: "Transplant Recovery",
    status: "Active",
  },
  "Ward B": {
    beds: 18,
    lead: "Dr. Ali",
    unit: "General Surgery",
    status: "Active",
  },
};

export default function SiteManagement() {
  const [activeSite, setActiveSiteState] = useState(getActiveSite);
  const [saved, setSaved] = useState("");

  useEffect(() => {
    const onSiteChange = (e) => setActiveSiteState(e.detail || getActiveSite());
    window.addEventListener("postcare-site-change", onSiteChange);
    return () => window.removeEventListener("postcare-site-change", onSiteChange);
  }, []);

  const selectSite = (site) => {
    setActiveSite(site);
    setActiveSiteState(site);
    setSaved(`Active care site set to ${site}.`);
    window.setTimeout(() => setSaved(""), 2500);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white tracking-tight">Site Management</h1>
        <p className="text-sm text-gray-400 mt-2">
          Configure recovery wards and switch the active care site for this clinician session.
        </p>
      </div>

      {saved && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm px-4 py-3 rounded-lg">
          {saved}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {WARDS.map((ward) => {
          const meta = SITE_META[ward];
          const isActive = activeSite === ward;
          return (
            <div
              key={ward}
              className={`bg-[#161616] border rounded-xl p-6 ${
                isActive ? "border-white/30" : "border-[#2a2a2a]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-white">{ward}</h2>
                  <p className="text-sm text-gray-400 mt-1">{meta.unit}</p>
                </div>
                {isActive && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-white text-black">
                    Active Site
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Beds</p>
                  <p className="text-2xl font-semibold text-white mt-1">{meta.beds}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Lead Clinician</p>
                  <p className="text-sm font-medium text-gray-200 mt-2">{meta.lead}</p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-xs text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  {meta.status}
                </span>
                <button
                  type="button"
                  onClick={() => selectSite(ward)}
                  disabled={isActive}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-white text-black hover:bg-gray-100 transition-colors disabled:opacity-40"
                >
                  {isActive ? "Current Site" : "Set Active Site"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Site Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Site Name</span>
            <input
              type="text"
              defaultValue="PostCare Recovery Unit"
              className="mt-2 w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg py-2.5 px-3 text-sm text-gray-200 outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Timezone</span>
            <select className="mt-2 w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg py-2.5 px-3 text-sm text-gray-200 outline-none">
              <option>Asia/Karachi (PKT)</option>
              <option>UTC</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
