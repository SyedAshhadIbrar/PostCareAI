const store = {
  get api() { return localStorage.getItem("postcare_api") || window.location.origin; },
  set api(v) { localStorage.setItem("postcare_api", v); },
  get lastCase() { return JSON.parse(localStorage.getItem("postcare_last_case") || "null"); },
  set lastCase(v) { localStorage.setItem("postcare_last_case", JSON.stringify(v)); },
  get reminders() { return JSON.parse(localStorage.getItem("postcare_reminders") || "[]"); },
  set reminders(v) { localStorage.setItem("postcare_reminders", JSON.stringify(v)); },
  chatKey(caseId) { return `postcare_chat_${caseId}`; },
  getChat(caseId) { return JSON.parse(localStorage.getItem(this.chatKey(caseId)) || "[]"); },
  setChat(caseId, messages) { localStorage.setItem(this.chatKey(caseId), JSON.stringify(messages)); },
};

function switchTab(name) {
  document.querySelectorAll(".bottom-nav button").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === name);
  });
  document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
  document.getElementById(`tab-${name}`).classList.add("active");
}

document.querySelectorAll(".bottom-nav button").forEach((btn) => {
  btn.onclick = () => switchTab(btn.dataset.tab);
});

document.getElementById("start-checkin").onclick = () => switchTab("log");

document.querySelector('[name="pain_score"]').oninput = (e) => {
  document.getElementById("pain-val").textContent = e.target.value;
};

document.querySelector('[name="image"]').onchange = (e) => {
  const file = e.target.files?.[0];
  const preview = document.getElementById("photo-preview");
  if (!file) {
    preview.classList.add("hidden");
    return;
  }
  preview.src = URL.createObjectURL(file);
  preview.classList.remove("hidden");
  document.querySelectorAll(".step")[0].classList.add("active");
};

document.querySelector('[name="patient_name"]').oninput = () => {
  document.querySelectorAll(".step")[1].classList.add("active");
};

document.getElementById("api-url").value = store.api;
document.getElementById("save-settings").onclick = () => {
  store.api = document.getElementById("api-url").value.replace(/\/$/, "");
  alert("Saved");
};

function renderReminders() {
  const ul = document.getElementById("reminder-list");
  ul.innerHTML = store.reminders.map((r, i) =>
    `<li><span>${r.med} — ${r.time}</span><button data-i="${i}" class="btn">✕</button></li>`
  ).join("");
  ul.querySelectorAll("button").forEach((b) => {
    b.onclick = () => {
      const list = store.reminders;
      list.splice(+b.dataset.i, 1);
      store.reminders = list;
      renderReminders();
    };
  });
}

document.getElementById("reminder-form").onsubmit = (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  store.reminders = [...store.reminders, { med: fd.get("med"), time: fd.get("time") }];
  e.target.reset();
  renderReminders();
};

function renderRecovery() {
  const c = store.lastCase;
  const status = document.getElementById("recovery-status");
  const metrics = document.getElementById("recovery-metrics");
  const guidance = document.getElementById("recovery-guidance");
  const flow = document.getElementById("recovery-flow");
  const startBtn = document.getElementById("start-checkin");

  if (!c) {
    startBtn.classList.remove("hidden");
    flow.classList.add("hidden");
    metrics.classList.add("hidden");
    guidance.classList.add("hidden");
    renderChat();
    return;
  }

  startBtn.classList.add("hidden");
  flow.classList.remove("hidden");
  status.textContent = `Case ${c.case_id} · ${c.clinician_priority || "routine"} priority`;
  metrics.classList.remove("hidden");
  metrics.innerHTML = `
    <div class="metric"><strong>${c.patient.pain_score}/10</strong>Pain</div>
    <div class="metric"><strong>Day ${c.patient.post_op_day}</strong>Post-op</div>
    <div class="metric"><strong>${Math.round(c.wound.infection_risk.score * 100)}%</strong>Infection signal</div>
    <div class="metric"><strong>${Math.round(c.wound.healing_status.score * 100)}%</strong>Healing score</div>`;

  if (c.patient_guidance?.message) {
    guidance.classList.remove("hidden");
    const agent = c.patient_guidance.agent || c.triage?.agent || "PostCare";
    guidance.innerHTML = `
      <h3>AI recovery guidance</h3>
      <p class="agent-tag">${agent}</p>
      <p>${c.patient_guidance.message}</p>
      <button id="open-chat" class="btn primary" type="button">Ask recovery questions</button>`;
    document.getElementById("open-chat").onclick = () => switchTab("chat");
  }
  renderChat();
}

function renderChat() {
  const c = store.lastCase;
  const status = document.getElementById("chat-status");
  const log = document.getElementById("chat-log");
  const input = document.getElementById("chat-input");
  const sendBtn = document.querySelector("#chat-form button");
  const enabled = Boolean(c?.case_id);

  input.disabled = !enabled;
  sendBtn.disabled = !enabled;
  status.textContent = enabled
    ? `RAG chat — semantic search over care PDFs + your case ${c.case_id}.`
    : "Complete a check-in first to personalize answers.";

  const messages = enabled ? store.getChat(c.case_id) : [];
  log.innerHTML = messages.map((m) => {
    const sources = m.sources?.length
      ? `<div class="chat-sources">Sources: ${m.sources.map((s) => `${s.source}${s.page ? ` p.${s.page}` : ""} (${Math.round((s.score || 0) * 100)}%)`).join(" · ")}</div>`
      : "";
    return `<div class="chat-bubble ${m.role}">${m.content}${sources}</div>`;
  }).join("") || `<p class="muted">Try: "Is redness normal on day ${c?.patient?.post_op_day || 5}?"</p>`;
  log.scrollTop = log.scrollHeight;
}

document.getElementById("chat-form").onsubmit = async (e) => {
  e.preventDefault();
  const c = store.lastCase;
  if (!c?.case_id) return;

  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;

  const history = store.getChat(c.case_id);
  history.push({ role: "user", content: text });
  store.setChat(c.case_id, history);
  input.value = "";
  renderChat();

  try {
    const res = await fetch(`${store.api}/patient/case/${c.case_id}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        history: history.map(({ role, content }) => ({ role, content })),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : res.statusText);

    const updated = store.getChat(c.case_id);
    updated.push({
      role: "assistant",
      content: data.reply,
      sources: data.sources || [],
      agent: data.agent,
    });
    store.setChat(c.case_id, updated);
    renderChat();
  } catch (err) {
    const updated = store.getChat(c.case_id);
    updated.push({ role: "assistant", content: `Error: ${err.message}` });
    store.setChat(c.case_id, updated);
    renderChat();
  }
};

document.getElementById("log-form").onsubmit = async (e) => {
  e.preventDefault();
  document.querySelectorAll(".step")[2].classList.add("active");
  const msg = document.getElementById("log-msg");
  msg.textContent = "Uploading photo → MedSigLIP → PostCare-Gemini…";
  msg.className = "msg";
  const fd = new FormData(e.target);
  try {
    const res = await fetch(`${store.api}/patient/case`, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : res.statusText);
    store.lastCase = data;
    msg.textContent = `Done — ${data.case_id}. View recovery dashboard.`;
    msg.className = "msg ok";
    renderRecovery();
    renderChat();
    switchTab("recovery");
  } catch (err) {
    msg.textContent = err.message;
    msg.className = "msg err";
  }
};

renderReminders();
renderRecovery();
renderChat();
if (store.lastCase) switchTab("recovery");
