import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE, clearChat, setLastCase } from "../lib/api";
import { GlassCard, PageHeader } from "./ui/MobileUi";

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
        } catch {
          /* ignore */
        }
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
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
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (file.name.toLowerCase().endsWith(".heic")) {
        alert("HEIC not supported. Use JPEG or PNG.");
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

    let userId = null;
    let patientName = "Patient";
    try {
      const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
      userId = savedUser.id || null;
      patientName = savedUser.name || "Patient";
    } catch {
      /* ignore */
    }

    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append(
      "payload",
      JSON.stringify({
        post_op_day: day,
        pain_level: pain,
        symptoms,
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
    <div className="pb-24">
      <PageHeader title="Check-In" subtitle={`Post-op Day ${day}`} />

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Photo */}
        <GlassCard className="!p-0 overflow-hidden">
          <div className="relative">
            <input
              type="file"
              accept="image/jpeg,image/png"
              capture="environment"
              onChange={handleImageChange}
              className={`absolute inset-0 w-full opacity-0 cursor-pointer z-10 ${imagePreview ? "h-12 bottom-0 top-auto" : "h-full"}`}
            />
            {imagePreview ? (
              <div>
                <img src={imagePreview} alt="Wound preview" className="w-full max-h-56 object-cover" />
                <p className="text-center text-xs text-[#00D9B5] py-3">Tap to change photo</p>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-[#00D9B5]/15 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#00D9B5] text-3xl">photo_camera</span>
                </div>
                <p className="text-sm font-semibold text-white">Take wound photo</p>
                <p className="text-xs text-white/40">JPEG or PNG</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Pain */}
        <GlassCard>
          <div className="flex justify-between items-center mb-4">
            <span className="text-[13px] font-semibold text-white/50 uppercase tracking-wider">Pain Level</span>
            <span className="text-4xl font-bold text-[#00D9B5] tabular-nums">{pain}</span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            value={pain}
            onChange={(e) => setPain(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-[11px] text-white/30 mt-2 font-medium">
            <span>None</span>
            <span>Severe</span>
          </div>
        </GlassCard>

        {/* Symptoms */}
        <GlassCard>
          <p className="text-[13px] font-semibold text-white/50 uppercase tracking-wider mb-3">Symptoms</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(symptoms).map((symp) => (
              <button
                key={symp}
                type="button"
                onClick={() => toggleSymptom(symp)}
                className={`px-4 py-2.5 rounded-full text-sm font-medium capitalize transition-all ${
                  symptoms[symp]
                    ? "bg-[#00D9B5] text-black"
                    : "bg-white/8 text-white/60"
                }`}
              >
                {symp}
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Note */}
        <GlassCard>
          <label htmlFor="patient-note" className="text-[13px] font-semibold text-white/50 uppercase tracking-wider">
            How are you feeling?
          </label>
          <textarea
            id="patient-note"
            rows={3}
            maxLength={1000}
            value={patientNote}
            onChange={(e) => setPatientNote(e.target.value)}
            placeholder="Any changes in pain, wound, or medications…"
            className="w-full mt-2 bg-[#1c1c1e] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none resize-none"
          />
        </GlassCard>

        {status === "error" && (
          <p className="text-red-400 text-sm text-center font-medium">Connection failed. Try again.</p>
        )}
      </form>

      {/* Sticky submit */}
      <div className="fixed bottom-0 left-0 right-0 p-5 pb-safe bg-black/90 backdrop-blur-xl border-t border-white/8 max-w-lg mx-auto">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={status === "submitting"}
          className="w-full bg-[#00D9B5] text-black font-bold py-4 rounded-2xl text-base disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          {status === "submitting" ? (
            <>
              <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
              Analyzing…
            </>
          ) : (
            "Submit Check-In"
          )}
        </button>
      </div>
    </div>
  );
}
