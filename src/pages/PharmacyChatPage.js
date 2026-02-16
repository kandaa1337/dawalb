import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { useI18n } from "../i18n/Provider";

export default function PharmacyChatPage() {
  const { pharmacyId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState(null);
  const [pharmacyName, setPharmacyName] = useState(location.state?.pharmacyName ?? "");
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!pharmacyId || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const convRes = await api(`/pharmacies/${pharmacyId}/conversations`, { method: "POST" });
        if (cancelled) return;
        setConversationId(convRes.conversationId);
        const msgRes = await api(`/conversations/${convRes.conversationId}/messages`);
        if (!cancelled) setMessages(Array.isArray(msgRes?.messages) ? msgRes.messages : []);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Could not load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pharmacyId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!user) {
    return (
      <div style={{ maxWidth: 560, margin: "40px auto", padding: 24, textAlign: "center" }}>
        <p style={{ color: "#666" }}>Please sign in to chat.</p>
        <button type="button" onClick={() => navigate("/login")} style={{ padding: "10px 20px", borderRadius: 8, cursor: "pointer" }}>Sign in</button>
      </div>
    );
  }

  if (loading) {
    return <div style={{ maxWidth: 560, margin: "40px auto", padding: 24, textAlign: "center" }}>{t("product.loading")}</div>;
  }

  if (error && !conversationId) {
    return (
      <div style={{ maxWidth: 560, margin: "40px auto", padding: 24 }}>
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", borderRadius: 8, color: "#c00" }}>{error}</div>
        <button type="button" onClick={() => navigate(-1)} style={{ padding: "10px 20px", borderRadius: 8, cursor: "pointer" }}>{t("product.back")}</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: 24 }}>
      <button type="button" onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", padding: 0, marginBottom: 16 }}>← {t("product.back")}</button>
      <h2 style={{ margin: "0 0 16px 0" }}>{pharmacyName || t("product.pharmacy")}</h2>
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 12, padding: 16, minHeight: 300, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflow: "auto", marginBottom: 12 }}>
          {messages.map((m) => (
            <div key={m.id} style={{ marginBottom: 8, textAlign: m.isMe ? "right" : "left" }}>
              <span style={{ display: "inline-block", padding: "8px 12px", borderRadius: 10, background: m.isMe ? "#e8f5e9" : "#f0f0f0", maxWidth: "80%" }}>{m.body}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const body = replyText.trim();
            if (!body || !conversationId) return;
            try {
              await api(`/conversations/${conversationId}/messages`, { method: "POST", body: { body } });
              setReplyText("");
              const res = await api(`/conversations/${conversationId}/messages`);
              setMessages(Array.isArray(res?.messages) ? res.messages : []);
            } catch {}
          }}
          style={{ display: "flex", gap: 8 }}
        >
          <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder={t("pharmacyPage.writeMessage")} style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc" }} />
          <button type="submit" style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#2EB872", color: "#fff", fontWeight: 600, cursor: "pointer" }}>{t("pharmacyPage.send")}</button>
        </form>
      </div>
    </div>
  );
}
