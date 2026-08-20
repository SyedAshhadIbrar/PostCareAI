import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

export default function PatientLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [userName, setUserName] = useState("Patient Portal");
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.name) {
          // Extract first name
          const firstName = parsed.name.split(" ")[0];
          setUserName(firstName);
        }
      } catch (err) {
        console.error("Failed to parse user from localStorage:", err);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const navItems = [
    { name: "Dashboard", path: "/patient", icon: "dashboard" },
    { name: "Daily Log", path: "/patient/log", icon: "fact_check" },
    { name: "Recovery", path: "/patient/recovery", icon: "monitor_heart" },
    { name: "AI Assistant", path: "/patient/assistant", icon: "smart_toy" },
    { name: "Settings", path: "/patient/settings", icon: "settings" },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#121212] text-gray-100 font-sans">
      {/* Sidebar — horizontal on mobile, fixed column on desktop */}
      <nav className="shrink-0 lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-[240px] w-full bg-[#1e1e1e] border-b lg:border-b-0 lg:border-r border-[#333333] flex flex-col lg:pt-6 lg:pb-4 z-50">
        <div className="px-4 lg:px-5 py-4 lg:py-0 lg:mb-6 shrink-0">
          <h1 className="text-lg lg:text-xl font-bold text-gray-100 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00ffcc] text-[24px] lg:text-[26px]">monitor_heart</span>
            PostCare<span className="text-[#00ffcc]">AI</span>
          </h1>
          <span className="text-[10px] lg:text-[11px] font-bold text-[#00ffcc] mt-1 block tracking-wider uppercase">
            Patient Portal
          </span>
        </div>

        <ul className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto px-3 pb-3 lg:pb-0 lg:flex-1 gap-1.5 lg:space-y-1.5 shrink-0 lg:shrink">
          {navItems.map((item) => {
            const isActive =
              item.path === "/patient"
                ? location.pathname === "/patient"
                : location.pathname.startsWith(item.path);

            return (
              <li key={item.name} className="shrink-0 lg:shrink">
                <Link
                  to={item.path}
                  className={`flex items-center whitespace-nowrap px-3.5 py-2.5 rounded-lg text-sm transition-all duration-150 ease-in-out ${
                    isActive
                      ? "bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc]/50 font-bold"
                      : "text-gray-400 hover:bg-[#2a2a2a] hover:text-gray-200 border border-transparent"
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[20px] mr-2 lg:mr-3"
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="hidden lg:block px-4 mt-auto relative shrink-0">
          {profileOpen && (
            <div className="absolute bottom-[calc(100%+8px)] left-4 right-4 bg-[#1e1e1e] border border-[#333333] rounded-lg shadow-xl py-1 z-50">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#2a2a2a] flex items-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  logout
                </span>
                Logout
              </button>
            </div>
          )}
          <div
            onClick={() => setProfileOpen(!profileOpen)}
            className="pt-3 border-t border-[#333333] cursor-pointer hover:bg-[#2a2a2a]/30 rounded-lg p-1.5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#2a2a2a] flex items-center justify-center border border-[#333333] shrink-0">
                <span className="material-symbols-outlined text-[#00ffcc] text-[20px]">
                  person
                </span>
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm text-gray-100 truncate">
                  {userName}
                </div>
                <div className="text-xs text-[#00ffcc] truncate">
                  Active Care Plan
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main — scrollable content area */}
      <main className="flex-1 w-full lg:ml-[240px] min-h-0 flex flex-col min-h-screen bg-[#121212]">
        <header className="sticky top-0 w-full min-h-[4.5rem] lg:h-20 bg-[#1e1e1e]/90 backdrop-blur-md border-b border-[#333333] flex flex-wrap justify-between items-center gap-3 px-4 sm:px-8 py-3 lg:py-0 z-40 shrink-0">
          <h2 className="text-base sm:text-xl font-bold text-gray-100">
            PKLI Lahore <span className="text-[#00ffcc]">Recovery Guide</span>
          </h2>
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="text-[10px] sm:text-xs font-semibold text-[#00ffcc] flex items-center gap-2 bg-[#121212] border border-[#333333] px-2.5 sm:px-3.5 py-1.5 rounded-lg">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              <span className="hidden xs:inline">Recovery Status: </span>Active
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button type="button" className="text-gray-400 hover:text-[#00ffcc] transition-colors p-1">
                <span className="material-symbols-outlined text-2xl">notifications</span>
              </button>
              <button type="button" className="text-gray-400 hover:text-[#00ffcc] transition-colors p-1">
                <span className="material-symbols-outlined text-2xl">account_circle</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-[1440px] mx-auto w-full min-h-full">
            <Outlet />
          </div>

          <footer className="border-t border-[#333333] py-4 px-4 sm:px-8 bg-[#1e1e1e]/50 text-xs text-gray-400 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div>
            PostCare<span className="text-[#00ffcc]">AI</span> &copy; 2026 Pakistan Kidney &amp; Liver Institute (PKLI Lahore)
          </div>
          <div className="flex items-center gap-4 text-[11px] text-gray-400">
            <span>HIPAA Compliant</span>
            <span>&bull;</span>
            <span>24/7 Clinical Care</span>
          </div>
        </footer>
        </div>
      </main>
    </div>
  );
}
