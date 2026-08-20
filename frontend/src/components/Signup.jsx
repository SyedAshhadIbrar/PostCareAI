import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE } from "../lib/api";

export default function Signup() {
  const [role, setRole] = useState("patient");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);
    formData.append("role", role);
    formData.append("name", name);

    try {
      const response = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Registration failed");
      }

      // Automatically log them in after signup based on role
      if (role === "clinician") {
        navigate("/clinician");
      } else {
        navigate("/patient");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#1e1e1e] border border-[#333333] rounded-xl shadow-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#00ffcc]"></div>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-100 tracking-tight">PostCare<span className="text-[#00ffcc]">AI</span></h1>
          <p className="text-sm text-gray-400 mt-2">Create your account</p>
        </div>
        <div className="flex bg-[#121212] rounded-lg p-1 mb-6 border border-[#333333]">
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

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-md mb-6 text-center font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#121212] border border-[#333333] text-gray-100 rounded-lg py-3 px-4 focus:ring-1 focus:ring-[#00ffcc] focus:border-[#00ffcc] transition-colors outline-none"
              placeholder="e.g. John Doe"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {role === "patient" ? "Patient ID or Email" : "Clinician Email"}
            </label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#121212] border border-[#333333] text-gray-100 rounded-lg py-3 px-4 focus:ring-1 focus:ring-[#00ffcc] focus:border-[#00ffcc] transition-colors outline-none"
              placeholder={role === "patient" ? "e.g. pt.john@example.com" : "dr.name@pkli.org.pk"}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Create PIN / Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#121212] border border-[#333333] text-gray-100 rounded-lg py-3 px-4 focus:ring-1 focus:ring-[#00ffcc] focus:border-[#00ffcc] transition-colors outline-none"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00ffcc] text-black font-bold py-3 rounded-lg hover:bg-[#00ccaa] transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Already have an account?{" "}
            <Link to="/" className="text-[#00ffcc] font-semibold hover:underline">
              Log in here
            </Link>
          </p>
        </div>

        <p className="text-center text-[10px] text-gray-500 uppercase tracking-widest mt-8">
          HIPAA Compliant Connection
        </p>
      </div>
    </main>
  );
}
