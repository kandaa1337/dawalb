import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

  if (!res.ok) {
    const err = new Error(data?.error || data?.message || "API_ERROR");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export default function PartnerApply() {
  const nav = useNavigate();
  const [orgName, setOrgName] = useState("");
  const [chainName, setChainName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");
    try {
      await api("/partner/apply", {
        method: "POST",
        body: { orgName, chainName, phone: phone || null, website: website || null },
      });
      setOk("Request sent ✅");
      setTimeout(() => nav("/profile", { replace: true }), 250);
    } catch (e2) {
      setErr(e2.message);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "24px auto", padding: 16 }}>
      <h2>Become a partner</h2>
      <p style={{ opacity: 0.75 }}>Register your pharmacy chain and get partner access.</p>

      {err && <div style={{ color: "crimson", marginBottom: 12 }}>{err}</div>}
      {ok && <div style={{ color: "green", marginBottom: 12 }}>{ok}</div>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, maxWidth: 520 }}>
        <input placeholder="Organization name" value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
        <input placeholder="Pharmacy chain name" value={chainName} onChange={(e) => setChainName(e.target.value)} required />
        <input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input placeholder="Website (optional)" value={website} onChange={(e) => setWebsite(e.target.value)} />

        <button type="submit" disabled={!orgName.trim() || !chainName.trim()}>
          Submit
        </button>
        <button type="button" onClick={() => nav("/profile")}>
          Back
        </button>
      </form>
    </div>
  );
}
