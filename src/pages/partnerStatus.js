import { useEffect, useState } from "react";

async function api(path) {
  const r = await fetch(`/api${path}`, { credentials: "include" });
  const t = await r.text();
  const d = t ? JSON.parse(t) : null;
  if (!r.ok) throw new Error(d?.error || `HTTP_${r.status}`);
  return d;
}

export default function PartnerStatus() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/partners/status").then(setData).catch((e) => setErr(e.message));
  }, []);

  if (err) return <div style={{ padding: 24, color: "crimson" }}>{err}</div>;
  if (!data) return <div style={{ padding: 24 }}>Loading…</div>;

  const app = data.application;
  if (!app) return <div style={{ padding: 24 }}>No application</div>;

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Partner application</h2>
      <div style={{ opacity: 0.75 }}>Status: <b>{app.status}</b></div>

      <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
        <div><b>Org:</b> {app.orgName}</div>
        <div><b>Chain:</b> {app.chainName}</div>
        <div><b>Phone:</b> {app.phone || "—"}</div>
        <div><b>Website:</b> {app.website || "—"}</div>
        <div><b>Created:</b> {new Date(app.createdAt).toLocaleString()}</div>
        {app.decidedAt && <div><b>Decided:</b> {new Date(app.decidedAt).toLocaleString()}</div>}
        {app.rejectReason && <div style={{ color: "crimson" }}><b>Reason:</b> {app.rejectReason}</div>}
      </div>
    </div>
  );
}
