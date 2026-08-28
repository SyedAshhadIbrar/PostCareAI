import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { API_BASE, clearChat, getChat, getLastCase, setChat } from "../lib/api";

const SUGGESTIONS = [
  "Is redness normal on day 5?",
  "When can I shower?",
  "What pain meds can I take?",
];

export default function PatientAssistant() {
  const location = useLocation();
  const [lastCase, setLastCaseState] = useState(() => getLastCase());
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    const c = getLastCase();
    setLastCaseState(c);
    setMessages(c?.case_id ? getChat(c.case_id) : []);
  }, [location.pathname]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, sending]);

  const enabled = Boolean(lastCase?.case_id);

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!enabled || !trimmed || sending) return;

    const caseId = lastCase.case_id;
    const history = [...messages, { role: "user", content: trimmed }];
    setMessages(history);
    setChat(caseId, history);
    setInput("");
    setSending(true);

    try {
      const res = await fetch(`${API_BASE}/patient/case/${caseId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: history.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : res.statusText);

      const updated = [
        ...history,
        { role: "assistant", content: data.reply, sources: data.sources || [], agent: data.agent },
      ];
      setMessages(updated);
      setChat(caseId, updated);
    } catch (err) {
      const updated = [...history, { role: "assistant", content: `Error: ${err.message}` }];
      setMessages(updated);
      setChat(caseId, updated);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-56px)] -mx-5">
      {/* Chat header */}
      <div className="px-5 py-3 border-b border-white/8 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white">AI Coach</h2>
          <p className="text-[11px] text-white/40">
            {enabled ? `Case ${lastCase.case_id}` : "Check in first"}
          </p>
        </div>
        {enabled && messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Clear chat?")) {
                clearChat(lastCase.case_id);
                setMessages([]);
              }
            }}
            className="text-xs text-white/40 px-3 py-1.5 rounded-full bg-white/8"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={logRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {!enabled ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <span className="material-symbols-outlined text-5xl text-white/15 mb-4">smart_toy</span>
            <p className="text-white/50 text-sm">Complete a daily check-in to unlock personalized coaching.</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="space-y-3 pt-4">
            <p className="text-xs text-white/30 text-center mb-4">Suggested questions</p>
            {SUGGESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendMessage(q)}
                className="w-full text-left ios-card rounded-2xl px-4 py-3 text-sm text-white/70 active:scale-[0.98] transition-transform"
              >
                {q}
              </button>
            ))}
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-[#00D9B5] text-black rounded-br-md"
                    : "ios-card text-white/85 rounded-bl-md"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.sources?.length > 0 && (
                  <p className="text-[10px] text-white/30 mt-2 pt-2 border-t border-white/10">
                    {m.sources.map((s) => s.source).join(" · ")}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
        {sending && (
          <div className="flex justify-start">
            <div className="ios-card rounded-2xl rounded-bl-md px-4 py-3 text-sm text-white/40 flex items-center gap-2">
              <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
              Thinking…
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="shrink-0 px-4 py-3 pb-safe border-t border-white/8 bg-black/90 backdrop-blur-xl flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!enabled || sending}
          placeholder={enabled ? "Ask anything…" : "Check in first"}
          className="flex-1 bg-[#1c1c1e] border border-white/10 rounded-full px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={!enabled || sending || !input.trim()}
          className="w-11 h-11 rounded-full bg-[#00D9B5] text-black flex items-center justify-center disabled:opacity-30 shrink-0"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
        </button>
      </form>
    </div>
  );
}
