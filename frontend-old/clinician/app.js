const api = () => localStorage.getItem("postcare_api") || window.location.origin;

let allCases = [];

function fmtTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", month: "short", day: "2-digit", year: "numeric" });
}

function priorityTag(p) {
  const key = (p || "routine").replace(" ", "_");
  return `<span class="tag ${key}">${(p || "routine").replace("_", " ")}</span>`;
}

async function load() {
  const [cases, stats] = await Promise.all([
    fetch(`${api()}/clinician/cases`).then((r) => r.json()),
    fetch(`${api()}/clinician/stats`).then((r) => r.json()),
  ]);
  allCases = cases;
  document.getElementById("stat-discharge").textContent = stats.discharge_patients ?? 0;
  document.getElementById("stat-track").textContent = stats.on_track ?? 0;
  document.getElementById("stat-done").textContent = stats.completed ?? 0;
  renderTable(allCases);
}

function renderTable(rows) {
  const q = document.getElementById("search").value.toLowerCase();
  const filtered = rows.filter((r) =>
    !q || [r.patient_name, r.procedure, r.consultant_surgeon, r.case_id].join(" ").toLowerCase().includes(q)
  );
  document.getElementById("cases-body").innerHTML = filtered.map((r) => `
    <tr>
      <td>${fmtTime(r.created_at)}</td>
      <td>${r.patient_name}</td>
      <td>${r.procedure}</td>
      <td>${r.consultant_surgeon}</td>
      <td>${r.discharge_date}</td>
      <td>${priorityTag(r.priority)}</td>
      <td>
        <button class="btn" data-view="${r.case_id}">View</button>
        ${r.status !== "reviewed" ? `<button class="btn primary" data-review="${r.case_id}">Review</button>` : ""}
      </td>
    </tr>`).join("") || `<tr><td colspan="7">No cases yet</td></tr>`;

  document.querySelectorAll("[data-view]").forEach((btn) => {
    btn.onclick = async () => {
      const data = await fetch(`${api()}/clinician/cases/${btn.dataset.view}`).then((r) => r.json());
      document.getElementById("detail-content").textContent = JSON.stringify(data, null, 2);
      document.getElementById("detail-modal").showModal();
    };
  });
  document.querySelectorAll("[data-review]").forEach((btn) => {
    btn.onclick = async () => {
      await fetch(`${api()}/clinician/cases/${btn.dataset.review}/review`, { method: "POST" });
      load();
    };
  });
}

document.querySelectorAll(".nav-item").forEach((link) => {
  link.onclick = (e) => {
    e.preventDefault();
    document.querySelectorAll(".nav-item").forEach((l) => l.classList.remove("active"));
    link.classList.add("active");
    ["patients", "dashboard", "referral", "settings"].forEach((v) => {
      document.getElementById(`view-${v}`).classList.toggle("hidden", link.dataset.view !== v);
    });
    document.getElementById("page-title").textContent = link.textContent;
  };
});

document.getElementById("search").oninput = () => renderTable(allCases);
document.getElementById("refresh-btn").onclick = load;
document.getElementById("close-modal").onclick = () => document.getElementById("detail-modal").close();
document.getElementById("api-url").value = api();
document.getElementById("save-api").onclick = () => {
  localStorage.setItem("postcare_api", document.getElementById("api-url").value.replace(/\/$/, ""));
  load();
};

load();
