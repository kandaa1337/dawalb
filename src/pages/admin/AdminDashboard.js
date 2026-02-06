import React, { useEffect, useState } from "react";

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
  if (!data) return <div>Loading…</div>;

  return (
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
  );
}
