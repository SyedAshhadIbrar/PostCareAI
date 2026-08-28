import { useEffect, useState } from "react";
import { PriorityTag } from "./ClinicianUi";
import { API_BASE } from "../../lib/api";

export default function CaseReviewModal({
  selectedCase,
  caseDetail,
  detailLoading,
  onClose,
  onApprove,
}) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!selectedCase) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedCase, onClose]);

  useEffect(() => {
    setImageError(false);
  }, [selectedCase?.case_id, caseDetail?.has_wound_image]);

  if (!selectedCase) return null;

  const clinicianSummary = caseDetail?.clinician_summary;
  const symptoms = caseDetail?.patient?.symptoms?.length
    ? caseDetail.patient.symptoms
    : selectedCase?.symptoms?.length
      ? selectedCase.symptoms
      : [];
  const safetyFlags = caseDetail?.safety_flags?.length
    ? caseDetail.safety_flags
    : selectedCase?.safety_flags || [];
  const visualFindings = clinicianSummary?.visual_findings;
  const hasImage = caseDetail?.has_wound_image === true;
  const imageUrl = hasImage
    ? `${API_BASE}${caseDetail.wound_image_url}`
    : null;
  const showImage = hasImage && !detailLoading && !imageError && imageUrl;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-[#161616] border border-[#2a2a2a] rounded-xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
      >
        <div className="border-b border-[#2a2a2a] p-6 shrink-0">
          <div className="flex justify-between items-start gap-4">
            <div className="min-w-0">
              <h3 id="review-modal-title" className="text-xl font-semibold text-white">
                {selectedCase.patient_name}
              </h3>
              <p className="text-sm text-gray-400 mt-1">{selectedCase.procedure}</p>
            </div>
            <div className="flex items-start gap-3 shrink-0">
              <PriorityTag priority={selectedCase.priority} status={selectedCase.status} />
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#2a2a2a] transition-colors"
                aria-label="Close review"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
            <span>
              Case: <span className="text-gray-300 font-medium">{selectedCase.case_id}</span>
            </span>
            <span>
              Discharge:{" "}
              <span className="text-gray-300 font-medium">{selectedCase.discharge_date}</span>
            </span>
          </div>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg overflow-hidden">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 pt-4 pb-2">
                Wound Photo
              </p>
              {detailLoading ? (
                <div className="aspect-[4/3] flex items-center justify-center text-sm text-gray-500">
                  Loading…
                </div>
              ) : showImage ? (
                <img
                  src={imageUrl}
                  alt={`Wound photo — ${selectedCase.patient_name}`}
                  className="w-full aspect-[4/3] object-cover bg-black"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="aspect-[4/3] flex flex-col items-center justify-center gap-2 text-gray-500 px-4">
                  <span className="material-symbols-outlined text-4xl text-gray-600">image_not_supported</span>
                  <p className="text-sm text-center">
                    {imageError ? "Could not load wound photo." : "No wound photo for this case."}
                  </p>
                  <p className="text-xs text-gray-600 text-center">New check-ins include saved images.</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Pain Level</p>
                  <p className="text-2xl font-bold text-white">
                    {selectedCase.pain_score ?? "—"}
                    <span className="text-sm text-gray-500 font-normal">/10</span>
                  </p>
                </div>
                <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Post-Op Day</p>
                  <p className="text-2xl font-bold text-white">{selectedCase.post_op_day ?? "—"}</p>
                </div>
              </div>

              {visualFindings && (
                <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    MedSigLIP Visual Signals
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(visualFindings).map(([key, score]) => (
                      <div key={key} className="flex justify-between gap-2 text-gray-300">
                        <span className="capitalize text-gray-500">{key.replace(/_/g, " ")}</span>
                        <span className="font-semibold text-white">{Math.round(score * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Clinician Agent — Handoff Notes
              </p>
              {clinicianSummary?.agent && (
                <span className="text-[10px] text-gray-500">{clinicianSummary.agent}</span>
              )}
            </div>
            {detailLoading ? (
              <p className="text-sm text-gray-500">Loading AI handoff…</p>
            ) : clinicianSummary?.summary ? (
              <p className="text-sm text-gray-200 leading-relaxed">{clinicianSummary.summary}</p>
            ) : (
              <p className="text-sm text-gray-500">No clinician summary for this case yet.</p>
            )}
          </div>

          {(clinicianSummary?.patient_note_raw || clinicianSummary?.review_note) && (
            <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg p-4 space-y-4">
              {clinicianSummary.patient_note_raw && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Patient&apos;s Own Words
                  </p>
                  <p className="text-sm text-gray-300 italic leading-relaxed">
                    &ldquo;{clinicianSummary.patient_note_raw}&rdquo;
                  </p>
                </div>
              )}
              {clinicianSummary.review_note && (
                <div className="border-t border-[#2a2a2a] pt-4">
                  <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                    Medical Review Note (AI-optimized)
                  </p>
                  <p className="text-sm text-gray-100 leading-relaxed">
                    {clinicianSummary.review_note}
                  </p>
                </div>
              )}
            </div>
          )}

          {safetyFlags.length > 0 && (
            <div className="bg-[#0f0f0f] border border-red-500/20 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Safety Flags</p>
              <div className="flex flex-wrap gap-2">
                {safetyFlags.map((flag) => (
                  <span
                    key={flag}
                    className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] uppercase font-semibold tracking-wider px-2.5 py-1 rounded-full"
                  >
                    {flag.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Reported Symptoms</p>
            <div className="flex flex-wrap gap-2">
              {symptoms.length > 0 ? (
                symptoms.map((s) => (
                  <span
                    key={s}
                    className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] uppercase font-semibold tracking-wider px-2.5 py-1 rounded-full"
                  >
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-500">None reported</span>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-[#2a2a2a] p-6 flex justify-end gap-3 shrink-0 bg-[#161616]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-300 bg-[#2a2a2a] hover:bg-[#333333] transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => onApprove(selectedCase.case_id)}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-black bg-white hover:bg-gray-100 transition-colors"
          >
            Finalize Review
          </button>
        </div>
      </div>
    </div>
  );
}
