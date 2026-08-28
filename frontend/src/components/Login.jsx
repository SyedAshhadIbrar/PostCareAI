import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../lib/api";

export default function Login() {
  const [role, setRole] = useState("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);
    formData.append("role", role);

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Login failed");
      }
      const user = await response.json();
      localStorage.setItem("user", JSON.stringify(user));
      navigate(user.role === "clinician" ? "/clinician" : "/patient");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col px-2 pt-safe pb-8">
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-3xl bg-[#00D9B5]/15 flex items-center justify-center mx-auto mb-5 glow-accent">
            <span className="material-symbols-outlined text-[#00D9B5] text-4xl">monitor_heart</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">PostCareAI</h1>
          <p className="text-sm text-white/40 mt-2">Post-operative wound care</p>
        </div>

        {/* Role toggle — iOS segmented control */}
        <div className="ios-segment flex mb-8">
          {["patient", "clinician"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`flex-1 py-2.5 text-sm font-semibold capitalize ${role === r ? "active text-white" : "text-white/40"}`}
            >
              {r}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-2xl mb-5 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-2 block">
              {role === "patient" ? "Patient ID" : "Email"}
            </label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#1c1c1e] border border-white/10 text-white rounded-2xl py-3.5 px-4 text-sm outline-none focus:border-[#00D9B5]/50 transition-colors placeholder:text-white/40"
              placeholder={role === "patient" ? "patient@postcare.test" : "clinician@postcare.test"}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-2 block">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#1c1c1e] border border-white/10 text-white rounded-2xl py-3.5 px-4 text-sm outline-none focus:border-[#00D9B5]/50 transition-colors placeholder:text-white/40"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00D9B5] text-black font-bold py-4 rounded-2xl text-base mt-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {loading ? "Signing in…" : "Continue"}
          </button>
        </form>

        <p className="text-center text-[10px] text-white/25 uppercase tracking-widest mt-8">
          PostCareAI · Secure Connection
        </p>
      </div>
    </main>
  );
}
