import { useEffect, useState } from "react";
import { api } from "../../api";

export default function AdminPaymentMethods() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState(null); // code

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await api("/admin/payment-methods");
      setItems(data.items || []);
    } catch (e) {
      setError((e.message || "Error") + (e.status ? ` (${e.status})` : ""));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(code, currentActive) {
    const nextActive = !currentActive;
    setToggling(code);
    setError("");
    try {
      await api(`/admin/payment-methods/${code}`, { method: "PATCH", body: { isActive: nextActive } });
      setItems((prev) => prev.map((m) => (m.code === code ? { ...m, isActive: nextActive } : m)));
    } catch (e) {
      setError(e.message || "Failed to update");
    } finally {
      setToggling(null);
    }
  }

  if (loading) {
    return <p style={{ color: "#666" }}>Loading payment methods…</p>;
  }

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Payment methods</h3>
      <p style={{ color: "#666", marginBottom: 16 }}>
        Enable or disable payment methods globally. When disabled, the method will not appear when partners add or edit pharmacies.
      </p>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", borderRadius: 8, color: "#c00" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 400 }}>
        {items.map((m) => (
          <div
            key={m.code}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 12,
              border: "1px solid #e0e0e0",
              borderRadius: 8,
              background: "#fff",
            }}
          >
            <span style={{ fontWeight: 600 }}>{m.name}</span>
            <button
              type="button"
              disabled={toggling === m.code}
              onClick={() => toggle(m.code, m.isActive)}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "none",
                background: m.isActive ? "#2EB872" : "#999",
                color: "#fff",
                fontWeight: 600,
                cursor: toggling === m.code ? "wait" : "pointer",
              }}
            >
              {toggling === m.code ? "…" : m.isActive ? "On" : "Off"}
            </button>
          </div>
        ))}
      </div>

      {items.length === 0 && !loading && (
        <p style={{ color: "#666" }}>No payment methods in database. Run seed to create WHISH, OMT, Credit Card.</p>
      )}
    </div>
  );
}
