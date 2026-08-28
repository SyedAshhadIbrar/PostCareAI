export const API_BASE =
  import.meta.env.VITE_API_BASE ??
  (import.meta.env.DEV ? "http://127.0.0.1:8000" : "");

export function getLastCase() {
  try {
    return JSON.parse(localStorage.getItem("postcare_last_case") || "null");
  } catch {
    return null;
  }
}

export function setLastCase(caseData) {
  localStorage.setItem("postcare_last_case", JSON.stringify(caseData));
}

export function getChat(caseId) {
  try {
    return JSON.parse(localStorage.getItem(`postcare_chat_${caseId}`) || "[]");
  } catch {
    return [];
  }
}

export function setChat(caseId, messages) {
  localStorage.setItem(`postcare_chat_${caseId}`, JSON.stringify(messages));
}

export function clearChat(caseId) {
  if (caseId) localStorage.removeItem(`postcare_chat_${caseId}`);
}

export function caseImageUrl(caseId) {
  if (!caseId) return null;
  return `${API_BASE}/clinician/cases/${caseId}/image`;
}
