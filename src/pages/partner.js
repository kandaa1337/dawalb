import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Partner() {
  const nav = useNavigate();
  const [chainName, setChainName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");

  async function submit(e) {
    e.preventDefault();

    // TODO: backend endpoint /api/partners/apply
    // Сейчас просто симулируем
    alert("Partner request sent (TODO: connect backend)");
    nav("/account", { replace: true });
  }

  return (
    <div style={{ maxWidth: 720, margin: "30px auto", padding: 16 }}>
      <h2>Become a partner</h2>
      <p style={{ opacity: 0.75 }}>
        Register your pharmacy chain. We’ll review and contact you.
      </p>

      <form onSubmit={submit} style={{ display: "grid", gap: 10, maxWidth: 520 }}>
        <label>
          Chain name
          <input value={chainName} onChange={(e) => setChainName(e.target.value)} required />
        </label>
        <label>
          Legal name (optional)
          <input value={legalName} onChange={(e) => setLegalName(e.target.value)} />
        </label>
        <label>
          Website (optional)
          <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
        </label>
        <label>
          Phone (optional)
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+961..." />
        </label>

        <button type="submit" disabled={!chainName.trim()}>
          Send request
        </button>

        <button type="button" onClick={() => nav(-1)} style={{ background: "transparent" }}>
          Back
        </button>
      </form>
    </div>
  );
}
