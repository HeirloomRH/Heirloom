import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n";
import {
  askConcierge,
  fetchConciergeStatus,
  type ConciergeMessage,
  type ConciergeStatus,
} from "@/lib/api";

export function ConciergeWidget() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ConciergeStatus | null>(null);
  const [messages, setMessages] = useState<ConciergeMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || status) return;
    fetchConciergeStatus()
      .then(setStatus)
      .catch(() => setStatus({ gatewayUrl: "", studioAddress: null, isLive: false }));
  }, [open, status]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const send = async () => {
    const content = input.trim();
    if (!content || sending) return;

    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setError("");
    setSending(true);

    try {
      const reply = await askConcierge(next);
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(t.concierge.errorPrefix + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        className="concierge-launcher"
        onClick={() => setOpen(!open)}
        aria-label={open ? t.concierge.closeLabel : t.concierge.launcherLabel}
        aria-expanded={open}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div className="concierge-panel" role="dialog" aria-label={t.concierge.title}>
          <div className="concierge-panel-head">
            <div>
              <h3>{t.concierge.title}</h3>
              <p>{t.concierge.subtitle}</p>
            </div>
            <button
              className="icon-button"
              onClick={() => setOpen(false)}
              aria-label={t.concierge.closeLabel}
            >
              <X size={16} />
            </button>
          </div>

          {status && !status.isLive ? (
            <div className="concierge-offline">
              <strong>{t.concierge.offlineTitle}</strong>
              <p>{t.concierge.offlineBody}</p>
            </div>
          ) : (
            <>
              <div className="concierge-messages">
                {messages.length === 0 && (
                  <p className="concierge-empty">{t.concierge.emptyState}</p>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`concierge-message ${m.role}`}>
                    {m.content}
                  </div>
                ))}
                {sending && (
                  <div className="concierge-message assistant concierge-typing">
                    <Loader2 size={14} className="animate-spin" />
                  </div>
                )}
                {error && <p className="concierge-error">{error}</p>}
                <div ref={messagesEndRef} />
              </div>

              <div className="concierge-input-row">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder={t.concierge.inputPlaceholder}
                  disabled={sending || !status}
                  aria-label={t.concierge.inputPlaceholder}
                />
                <button
                  className="button primary"
                  onClick={send}
                  disabled={sending || !input.trim() || !status}
                >
                  <Send size={14} />
                </button>
              </div>
              <p className="concierge-powered-by">{t.concierge.poweredBy}</p>
            </>
          )}
        </div>
      )}
    </>
  );
}
