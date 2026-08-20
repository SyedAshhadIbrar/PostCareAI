import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { API_BASE, clearChat, getChat, getLastCase, setChat } from "../lib/api";

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

  const handleClearChat = () => {
    if (!lastCase?.case_id || sending) return;
    if (!messages.length || window.confirm("Clear this chat history?")) {
      clearChat(lastCase.case_id);
      setMessages([]);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!enabled || !text || sending) return;

    const caseId = lastCase.case_id;
    const history = [...messages, { role: "user", content: text }];
    setMessages(history);
    setChat(caseId, history);
    setInput("");
    setSending(true);

    try {
      const res = await fetch(`${API_BASE}/patient/case/${caseId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: history.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : res.statusText);

      const updated = [
        ...history,
        {
          role: "assistant",
          content: data.reply,
          sources: data.sources || [],
          agent: data.agent,
        },
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
    <div>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center border-b border-[#333333] pb-6 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-100 tracking-tight">AI Care Assistant</h2>
            <p className="text-sm text-gray-400 mt-1">
              Interactive 24/7 post-op recovery guidance &amp; support
            </p>
          </div>
          <div className="flex items-center gap-2">
            {enabled && messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearChat}
                disabled={sending}
                className="bg-[#1e1e1e] border border-[#333333] px-3.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-red-400 hover:border-red-400/50 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                Clear chat
              </button>
            )}
            <div className="bg-[#1e1e1e] border border-[#333333] px-3.5 py-1.5 rounded-lg text-xs text-gray-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#00ffcc]">smart_toy</span>
              PostCareAI Assistant
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-400">
          {enabled
            ? `RAG chat — semantic search over care guides + your case ${lastCase.case_id}.`
            : "Complete a daily check-in first to personalize answers."}
        </p>

        <div
          ref={logRef}
          className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-4 min-h-[360px] max-h-[480px] overflow-y-auto space-y-3"
        >
          {messages.length === 0 ? (
            <p className="text-sm text-gray-500">
              Try: &quot;Is redness normal on day {lastCase?.patient?.post_op_day || 5}?&quot;
            </p>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-lg px-4 py-3 text-sm max-w-[85%] ${
                  m.role === "user"
                    ? "ml-auto bg-[#00ffcc]/20 text-gray-100 border border-[#00ffcc]/40"
                    : "bg-[#2a2a2a] text-gray-200 border border-[#333333]"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.sources?.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-[#333333]">
                    Sources:{" "}
                    {m.sources
                      .map(
                        (s) =>
                          `${s.source}${s.page ? ` p.${s.page}` : ""} (${Math.round((s.score || 0) * 100)}%)`
                      )
                      .join(" · ")}
                  </p>
                )}
                {m.agent && (
                  <p className="text-xs text-[#00ffcc] mt-1">{m.agent}</p>
                )}
              </div>
            ))
          )}
          {sending && (
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span>
              Thinking…
            </div>
          )}
        </div>

        <form onSubmit={sendMessage} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!enabled || sending}
            placeholder={enabled ? "Ask about recovery, wound care, medications…" : "Check in first"}
            className="flex-1 bg-[#1e1e1e] border border-[#333333] rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!enabled || sending || !input.trim()}
            className="bg-[#00ffcc] text-black font-bold px-6 py-3 rounded-xl hover:bg-[#00ccaa] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
