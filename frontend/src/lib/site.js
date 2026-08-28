export const WARDS = ["Ward A", "Ward B"];

export const ACTIVE_SITE_KEY = "postcare_active_site";

export function getActiveSite() {
  try {
    return localStorage.getItem(ACTIVE_SITE_KEY) || WARDS[0];
  } catch {
    return WARDS[0];
  }
}

export function setActiveSite(site) {
  localStorage.setItem(ACTIVE_SITE_KEY, site);
  window.dispatchEvent(new CustomEvent("postcare-site-change", { detail: site }));
}

export function caseWard(caseId) {
  if (!caseId) return WARDS[0];
  let hash = 0;
  for (let i = 0; i < caseId.length; i += 1) {
    hash += caseId.charCodeAt(i);
  }
  return WARDS[hash % WARDS.length];
}
