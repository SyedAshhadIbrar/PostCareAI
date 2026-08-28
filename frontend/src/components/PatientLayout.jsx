import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { BottomTabBar } from "./ui/MobileUi";

export default function PatientLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [userName, setUserName] = useState("there");

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) return;
    try {
      const parsed = JSON.parse(savedUser);
      if (parsed.name) setUserName(parsed.name.split(" ")[0]);
    } catch {
      /* ignore */
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const tabs = [
    { path: "/patient", icon: "home", label: "Home" },
    { path: "/patient/log", icon: "add_a_photo", label: "Check-In" },
    { path: "/patient/recovery", icon: "monitoring", label: "Recovery" },
    { path: "/patient/assistant", icon: "smart_toy", label: "Coach" },
    { path: "/patient/settings", icon: "person", label: "You" },
  ];

  const isChat = location.pathname === "/patient/assistant";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col max-w-lg mx-auto w-full">
      {/* Status bar spacer */}
      <div className="pt-safe shrink-0" />

      {/* Top bar */}
      <header className="sticky top-0 z-40 px-5 py-3 flex items-center justify-between bg-black/80 backdrop-blur-xl">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#00D9B5]">PostCareAI</p>
          <p className="text-sm text-white/50">Hi, {userName}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px] text-white/60">notifications</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[20px] text-white/60">logout</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className={`flex-1 overflow-y-auto overflow-x-hidden px-5 ${isChat ? "pb-4" : "pb-safe"}`}>
        <Outlet />
      </main>

      {/* Bottom tab bar — hidden on chat page for full-screen feel */}
      {!isChat && <BottomTabBar items={tabs} activePath={location.pathname} />}
    </div>
  );
}
