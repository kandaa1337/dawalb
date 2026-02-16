import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

async function api(path) {
  const res = await fetch(`/api${path}`, { credentials: "include" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || data?.message || "API_ERROR");
  return data;
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/admin/dashboard")
      .then(setData)
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <div style={{ color: "crimson" }}>{err}</div>;
  if (!data) return <div>Loading...</div>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {data.cards?.map((c) => (
          <div
            key={c.key}
            style={{
              border: "1px solid #eee",
              borderRadius: 14,
              padding: 14,
              background: "#fff",
            }}
          >
            <div style={{ opacity: 0.7, fontWeight: 700 }}>{c.title}</div>
            <div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ border: "1px solid #eee", borderRadius: 14, background: "#fff", padding: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Blocked pharmacies</div>
          {(data.blockedPharmacies || []).length === 0 ? (
            <div style={{ color: "#666" }}>No blocked pharmacies</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {data.blockedPharmacies.map((p) => (
                <div key={p.id} style={{ border: "1px solid #f0f0f0", borderRadius: 10, padding: 10 }}>
                  <Link to={`/pharmacy/${p.id}`} style={{ fontWeight: 700, color: "#166534", textDecoration: "none" }}>
                    {p.name}
                  </Link>
                  <div style={{ fontSize: 12, color: "#777" }}>{new Date(p.updatedAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ border: "1px solid #eee", borderRadius: 14, background: "#fff", padding: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Blocked products</div>
          {(data.blockedOffers || []).length === 0 ? (
            <div style={{ color: "#666" }}>No blocked products</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {data.blockedOffers.map((o) => (
                <div key={o.id} style={{ border: "1px solid #f0f0f0", borderRadius: 10, padding: 10 }}>
                  <Link to={`/product/${o.id}`} style={{ fontWeight: 700, color: "#166534", textDecoration: "none" }}>
                    {o.name}
                  </Link>
                  <div style={{ fontSize: 13, color: "#444" }}>
                    <Link to={`/pharmacy/${o.pharmacyId}`} style={{ color: "#444", textDecoration: "underline" }}>
                      {o.pharmacyName}
                    </Link>
                  </div>
                  <div style={{ fontSize: 12, color: o.status === "DELETED" ? "#b91c1c" : "#d97706", fontWeight: 700 }}>{o.status}</div>
                  {o.reason && <div style={{ fontSize: 12, color: "#555" }}>{o.reason}</div>}
                  <div style={{ fontSize: 12, color: "#777" }}>{new Date(o.updatedAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
