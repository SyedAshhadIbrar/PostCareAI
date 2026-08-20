import { useState } from "react";
import { API_BASE } from "../lib/api";

export default function AddUser() {
  const [role, setRole] = useState("patient");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
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

      const user = await response.json();
      setSuccess(`${role === "clinician" ? "Clinician" : "Patient"} "${user.name}" registered successfully!`);
      setName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-[#333333] pb-6">
          <h2 className="text-2xl font-bold text-gray-100 tracking-tight flex items-center gap-3">
            <span className="material-symbols-outlined text-[#00ffcc] text-3xl">person_add</span>
            Add New User
          </h2>
          <p className="text-sm text-gray-400 mt-1">Register a new clinician or patient to the PostCare system.</p>
        </div>

        {/* Role Toggle */}
        <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-6">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            User Role
          </label>
          <div className="flex bg-[#121212] rounded-lg p-1 border border-[#333333]">
            <button
              type="button"
              onClick={() => setRole("patient")}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-2 ${
                role === "patient"
                  ? "bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc]/50 shadow-sm"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">person</span>
              Patient
            </button>
            <button
              type="button"
              onClick={() => setRole("clinician")}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-2 ${
                role === "clinician"
                  ? "bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc]/50 shadow-sm"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">medical_services</span>
              Clinician
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-4 rounded-xl text-center font-semibold flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </div>
        )}
        {success && (
          <div className="bg-[#00ffcc]/10 border border-[#00ffcc]/50 text-[#00ffcc] text-sm p-4 rounded-xl text-center font-semibold flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-6 space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#121212] border border-[#333333] text-gray-100 rounded-lg py-3 px-4 focus:ring-1 focus:ring-[#00ffcc] focus:border-[#00ffcc] transition-colors outline-none"
                placeholder={role === "patient" ? "e.g. John Doe" : "e.g. Dr. Sarah Khan"}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                {role === "patient" ? "Patient Email / ID" : "Clinician Email"}
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
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Set Password / PIN
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00ffcc] text-black font-bold py-4 rounded-xl hover:bg-[#00ccaa] transition-colors flex items-center justify-center gap-2 text-lg disabled:opacity-50"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin">refresh</span>
            ) : (
              <span className="material-symbols-outlined">person_add</span>
            )}
            {loading ? "Registering..." : `Register ${role === "clinician" ? "Clinician" : "Patient"}`}
          </button>
        </form>
      </div>
    </div>
  );
}
