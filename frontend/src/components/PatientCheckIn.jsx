import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE, clearChat, setLastCase } from "../lib/api";

export default function PatientCheckIn() {
  const navigate = useNavigate();
  const [day, setDay] = useState(1);
  const [pain, setPain] = useState(0);
  const [symptoms, setSymptoms] = useState({
    fever: false,
    redness: false,
    swelling: false,
    bleeding: false,
    discharge: false,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [patientNote, setPatientNote] = useState("");
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  useEffect(() => {
    async function fetchLatestDay() {
      try {
        let url = `${API_BASE}/patient/status`;
        try {
          const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
          if (savedUser.id) url += `?user_id=${savedUser.id}`;
        } catch (err) { /* ignore */ }
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          // Set to the next day if a case exists, otherwise day 1
          setDay(data.has_case ? data.post_op_day + 1 : 1);
        }
      } catch (err) {
        console.error("PatientCheckIn: fetch failed —", err);
      }
    }
    fetchLatestDay();
  }, []);

  const toggleSymptom = (key) => {
    setSymptoms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.toLowerCase().endsWith(".heic")) {
        alert("HEIC files are not supported yet. Please upload a JPEG or PNG.");
        return;
      }
      setImageFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile) {
      alert("Please upload today's wound photo.");
      return;
    }

    setStatus("submitting");

    // Get logged-in user info
    let userId = null;
    let patientName = "PKLI Patient";
    try {
      const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
      userId = savedUser.id || null;
      patientName = savedUser.name || "PKLI Patient";
    } catch (err) { /* ignore */ }

    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append(
      "payload",
      JSON.stringify({
        post_op_day: day,
        pain_level: pain,
        symptoms: symptoms,
        user_id: userId,
        patient_name: patientName,
        patient_note: patientNote.trim() || null,
      })
    );

    try {
      const response = await fetch(`${API_BASE}/api/patients/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Server rejected submission");
      const caseData = await response.json();
      if (caseData?.case_id) clearChat(caseData.case_id);
      setLastCase(caseData);
      navigate("/patient/recovery");
    } catch (error) {
      console.error("Submission failed:", error);
      setStatus("error");
    }
  };


  return (
    <div>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center border-b border-[#333333] pb-6 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-100 tracking-tight">
              Daily Recovery Check-In
            </h2>
            <p className="text-sm text-gray-400 mt-1">Submit your daily wound photo &amp; symptom log</p>
          </div>
          <div className="bg-[#1e1e1e] border border-[#333333] px-3.5 py-1.5 rounded-lg text-xs text-gray-300 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">language</span>
            English
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Days Post-Surgery (Auto-Assigned)
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <div
                    key={num}
                    className={`min-w-[3.5rem] flex-1 py-2.5 rounded text-sm font-bold text-center transition-colors cursor-default ${
                      day === num
                        ? "bg-[#00ffcc] text-black shadow-[0_0_15px_rgba(0,255,204,0.3)]"
                        : "bg-[#2a2a2a] text-gray-500 opacity-60"
                    }`}
                  >
                    Day {num}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-6">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Today's Wound Photo (Required)
            </label>
            <div className="relative border-2 border-dashed border-gray-600 rounded-xl overflow-hidden hover:border-[#00ffcc] transition-colors bg-[#121212]">
              <input
                type="file"
                accept="image/jpeg, image/png"
                onChange={handleImageChange}
                className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 ${imagePreview ? "h-12 bottom-0 top-auto" : ""}`}
              />
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Wound photo preview"
                    className="w-full max-h-72 object-contain bg-black"
                  />
                  <div className="p-4 border-t border-[#333333] text-center">
                    <p className="text-sm text-gray-300 font-semibold">{imageFile.name}</p>
                    <p className="text-xs text-[#00ffcc] mt-1">Tap image area to change photo</p>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center pointer-events-none">
                  <span className="material-symbols-outlined text-4xl text-gray-500 mb-2 block">
                    add_a_photo
                  </span>
                  <p className="text-sm text-gray-300 font-semibold">Tap to upload or drag image here</p>
                  <p className="text-xs text-gray-500 mt-1">JPEG or PNG only</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                Pain Level
              </label>
              <span className="text-2xl font-bold text-[#00ffcc]">{pain}</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              value={pain}
              onChange={(e) => setPain(parseInt(e.target.value))}
              className="w-full accent-[#00ffcc] h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2 font-bold">
              <span>0 - No Pain</span>
              <span>10 - Unbearable</span>
            </div>
          </div>

          <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-6">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              Observed Symptoms
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {Object.keys(symptoms).map((symp) => (
                <button
                  key={symp}
                  type="button"
                  onClick={() => toggleSymptom(symp)}
                  className={`py-3.5 rounded-lg border text-sm font-bold capitalize transition-all ${
                    symptoms[symp]
                      ? "bg-[#00ffcc]/20 border-[#00ffcc] text-[#00ffcc]"
                      : "bg-[#2a2a2a] border-transparent text-gray-300 hover:bg-[#333333]"
                  }`}
                >
                  {symp}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-6">
            <label
              htmlFor="patient-note"
              className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
            >
              How are you feeling today? (Optional note)
            </label>
            <textarea
              id="patient-note"
              rows={4}
              maxLength={1000}
              value={patientNote}
              onChange={(e) => setPatientNote(e.target.value)}
              placeholder="Describe anything unusual — pain changes, wound appearance, medications, concerns…"
              className="w-full bg-[#121212] border border-[#333333] text-gray-100 rounded-lg py-3 px-4 text-sm focus:ring-1 focus:ring-[#00ffcc] focus:border-[#00ffcc] transition-colors placeholder:text-gray-500 outline-none resize-y min-h-[100px]"
            />
            <p className="text-xs text-gray-500 mt-2">
              Your note is rewritten into medical language for your care team&apos;s review.
            </p>
          </div>

          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full bg-[#00ffcc] text-black font-bold py-4 rounded-xl hover:bg-[#00ccaa] transition-colors flex items-center justify-center gap-2 text-lg disabled:opacity-50"
          >
            {status === "submitting" ? (
              <span className="material-symbols-outlined animate-spin">refresh</span>
            ) : (
              <span className="material-symbols-outlined">send</span>
            )}
            {status === "submitting" ? "Processing AI Analysis..." : "Submit Daily Check-In"}
          </button>

          {status === "error" && (
            <p className="text-red-500 text-sm text-center font-bold">
              Failed to connect to the server. Check your connection.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
