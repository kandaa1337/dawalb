import { useState } from "react";

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  return { ok: res.ok, status: res.status, data };
}

export default function AuthTest() {
  const [email, setEmail] = useState("test@test.com");
  const [password, setPassword] = useState("123456");
  const [name, setName] = useState("Test User");
  const [out, setOut] = useState(null);

  return (
    <div style={{ padding: 20, maxWidth: 520 }}>
      <h2>Auth test</h2>

      <div style={{ display: "grid", gap: 8 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="name" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button
          onClick={async () => setOut(await api("/api/auth/register", { method: "POST", body: { email, password, name } }))}
        >
          Register
        </button>

        <button
          onClick={async () => setOut(await api("/api/auth/login", { method: "POST", body: { email, password } }))}
        >
          Login
        </button>

        <button
          onClick={async () => setOut(await api("/api/auth/me"))}
        >
          Me
        </button>

        <button
          onClick={async () => setOut(await api("/api/auth/logout", { method: "POST" }))}
        >
          Logout
        </button>
      </div>

      <pre style={{ marginTop: 16, background: "#111", color: "#0f0", padding: 12, borderRadius: 8 }}>
        {out ? JSON.stringify(out, null, 2) : "No output yet"}
      </pre>
    </div>
  );
}
