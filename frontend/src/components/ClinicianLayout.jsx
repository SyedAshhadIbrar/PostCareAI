import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { WARDS, getActiveSite, setActiveSite } from "../lib/site";

function NavItem({ to, icon, label, badge, active }) {
  return (
    <Link
      to={to}
      className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${
        active
          ? "bg-[#2a2a2a] text-white font-medium"
          : "text-gray-400 hover:bg-[#1f1f1f] hover:text-gray-200"
      }`}
    >
      <span className="flex items-center gap-3 min-w-0">
        <span className="material-symbols-outlined text-[20px] shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      {badge != null && (
        <span className="text-xs font-semibold text-gray-300 bg-[#333333] px-2 py-0.5 rounded-full shrink-0">
          {badge}
        </span>
      )}
    </Link>
  );
}

function NavSection({ title, children }) {
  return (
    <div className="space-y-1">
      {title && (
        <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

export default function ClinicianLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [userName, setUserName] = useState("Dr. Chen");
  const [userEmail, setUserEmail] = useState("clinician@postcare.test");
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeSite, setActiveSiteState] = useState(getActiveSite);

  useEffect(() => {
    const onSiteChange = (e) => setActiveSiteState(e.detail || getActiveSite());
    window.addEventListener("postcare-site-change", onSiteChange);
    return () => window.removeEventListener("postcare-site-change", onSiteChange);
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) return;
    try {
      const parsed = JSON.parse(savedUser);
      if (parsed.name) {
        const nameParts = parsed.name.trim().split(/\s+/);
        setUserName(
          nameParts[0].toLowerCase().startsWith("dr")
            ? nameParts.slice(0, 2).join(" ")
            : nameParts[0]
        );
      }
      if (parsed.email) setUserEmail(parsed.email);
    } catch (err) {
      console.error("Failed to parse user from localStorage:", err);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const isDashboard = location.pathname === "/clinician";
  const isQueue = location.pathname === "/clinician/queue";
  const isAddUser = location.pathname === "/clinician/add-user";
  const isSites = location.pathname === "/clinician/sites";
  const isSystemAdmin = location.pathname === "/clinician/system-admin";
  const sidebarWidth = collapsed ? "w-[72px]" : "w-[280px]";

  return (
    <div className="min-h-screen w-full flex bg-[#0a0a0a] text-gray-100 font-sans">
      <aside
        className={`${sidebarWidth} shrink-0 fixed left-0 top-0 h-screen bg-[#111111] border-r border-[#222222] flex flex-col z-50 transition-all duration-200`}
      >
        <div className="px-4 py-5 border-b border-[#222222] flex items-center justify-between gap-2">
          {!collapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-white text-[22px]">grid_view</span>
                <h1 className="text-base font-semibold text-white truncate">PostCareAI</h1>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">Clinician Portal</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-[#222222] transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="material-symbols-outlined text-[20px]">
              {collapsed ? "chevron_right" : "chevron_left"}
            </span>
          </button>
        </div>

        {!collapsed && (
          <div className="px-4 py-4 border-b border-[#222222]">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 block mb-2">
              Care Site
            </label>
            <select
              value={activeSite}
              onChange={(e) => {
                setActiveSite(e.target.value);
                setActiveSiteState(e.target.value);
              }}
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg py-2.5 px-3 text-sm text-gray-200 outline-none"
            >
              {WARDS.map((ward) => (
                <option key={ward} value={ward}>
                  {ward}
                </option>
              ))}
            </select>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <NavSection>
            <NavItem to="/clinician" icon="dashboard" label="Dashboard" active={isDashboard} />
          </NavSection>

          <NavSection title={collapsed ? "" : "Patients"}>
            <NavItem
              to="/clinician/queue"
              icon="groups"
              label="Patient Queue"
              badge={8}
              active={isQueue}
            />
            <NavItem to="/clinician/queue" icon="biotech" label="Wound Assessments" active={isQueue} />
          </NavSection>

          <NavSection title={collapsed ? "" : "Administration"}>
            <NavItem
              to="/clinician/system-admin"
              icon="admin_panel_settings"
              label="System Admin"
              active={isSystemAdmin}
            />
            <NavItem to="/clinician/sites" icon="domain" label="Site Management" active={isSites} />
            <NavItem to="/clinician/add-user" icon="manage_accounts" label="User Management" active={isAddUser} />
          </NavSection>
        </nav>

        <div className="px-3 py-4 border-t border-[#222222] relative">
          {profileOpen && !collapsed && (
            <div className="absolute bottom-[calc(100%+8px)] left-3 right-3 bg-[#161616] border border-[#2a2a2a] rounded-lg shadow-xl py-1 z-50">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#222222] flex items-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Logout
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full bg-[#2a2a2a] flex items-center justify-center border border-[#333333] shrink-0">
              <span className="material-symbols-outlined text-gray-300">person</span>
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-white truncate">{userName}</div>
                  <div className="text-xs text-gray-500 truncate">{userEmail}</div>
                </div>
                <span className="material-symbols-outlined text-gray-500 text-[18px]">expand_more</span>
              </>
            )}
          </button>
        </div>
      </aside>

      <main
        className={`flex-1 min-h-screen flex flex-col transition-all duration-200 ${
          collapsed ? "ml-[72px]" : "ml-[280px]"
        }`}
      >
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 lg:px-10 py-8 max-w-[1600px]">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
