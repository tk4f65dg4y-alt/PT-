import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import ClientTabBar from "../../components/ClientTabBar";

interface MessageRow {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string; role: string };
}

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<MessageRow[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  function load() {
    api
      .get("/client/messages")
      .then(setMessages)
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    setError("");
    try {
      const msg = await api.post("/client/messages", { body: text.trim() });
      setMessages((m) => [...(m || []), msg]);
      setText("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="app-shell with-tabbar">
      <div className="topbar">
        <div>
          <button className="btn ghost" onClick={() => navigate("/")} style={{ padding: 0, marginBottom: 4 }}>
            ← Back
          </button>
          <h1>Message your trainer</h1>
        </div>
      </div>
      <div className="content" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        {error && <div className="error-box">{error}</div>}
        <div className="chat-scroll" style={{ flex: 1 }}>
          {messages === null ? (
            <div className="empty">Loading…</div>
          ) : messages.length === 0 ? (
            <div className="empty">Say hi 👋 — your trainer will see it here.</div>
          ) : (
            messages.map((m) => {
              const mine = m.sender.id === user?.id;
              return (
                <div key={m.id} className={`bubble ${mine ? "me" : "them"}`}>
                  {!mine && <div className="who">{m.sender.name}</div>}
                  <div>{m.body}</div>
                  <div className="when">{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
        <div className="chat-input-bar">
          <input
            placeholder="Type a message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button className="btn" onClick={send} disabled={sending || !text.trim()}>
            Send
          </button>
        </div>
      </div>
      <ClientTabBar />
    </div>
  );
}
