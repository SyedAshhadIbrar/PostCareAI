import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [role, setRole] = useState("clinician"); // "patient" or "clinician"
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // TODO: Wire this up to the FastAPI JWT Auth later
    // For the MVP, we just aggressively route them based on the toggle
    if (role === "clinician") {
      navigate("/clinician");
    } else {
      navigate("/patient");
    }
  };

  return (
    <main className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#1e1e1e] border border-[#333333] rounded-xl shadow-2xl p-8 relative overflow-hidden">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#00ffcc]"></div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-100 tracking-tight">PostCare<span className="text-[#00ffcc]">AI</span></h1>
          <p className="text-sm text-gray-400 mt-2">Secure Access Portal</p>
        </div>

        {/* Role Toggle */}
        <div className="flex bg-[#121212] rounded-lg p-1 mb-8 border border-[#333333]">
          <button
            onClick={() => setRole("patient")}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
              role === "patient"
                ? "bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc]/50 shadow-sm"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Patient
          </button>
          <button
            onClick={() => setRole("clinician")}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
              role === "clinician"
                ? "bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc]/50 shadow-sm"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Clinician
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {role === "patient" ? "Patient ID" : "Clinician Email"}
            </label>
            <input
              type="text"
              required
              className="w-full bg-[#121212] border border-[#333333] text-gray-100 rounded-lg py-3 px-4 focus:ring-1 focus:ring-[#00ffcc] focus:border-[#00ffcc] transition-colors outline-none"
              placeholder={role === "patient" ? "e.g. PT-1029" : "dr.name@pkli.org.pk"}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Access PIN
            </label>
            <input
              type="password"
              required
              className="w-full bg-[#121212] border border-[#333333] text-gray-100 rounded-lg py-3 px-4 focus:ring-1 focus:ring-[#00ffcc] focus:border-[#00ffcc] transition-colors outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#00ffcc] text-black font-bold py-3 rounded-lg hover:bg-[#00ccaa] transition-colors flex items-center justify-center gap-2 mt-4"
          >
            Secure Login
          </button>
        </form>

        <p className="text-center text-[10px] text-gray-500 uppercase tracking-widest mt-8">
          HIPAA Compliant Connection
        </p>
      </div>
    </main>
  );
}