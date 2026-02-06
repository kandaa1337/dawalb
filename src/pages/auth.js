import React, { useState } from "react";
import { useAuth } from "../AuthContext";
import { useLocation, useNavigate } from "react-router-dom";

export default function Auth() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const to = loc.state?.from || "/";

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      if (mode === "login") {
        await login({ email: email || undefined, phone: phone || undefined, password });
      } else {
        await register({
          email: email || undefined,
          phone: phone || undefined,
          password,
          name: name || undefined,
        });
      }
      nav(to, { replace: true });
    } catch (e2) {
      setErr(e2?.message || "Error");
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h2>{mode === "login" ? "Sign in" : "Sign up"}</h2>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (or leave empty)"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone (or leave empty)"
        />

        {mode === "register" && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
          />
        )}

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
        />

        {err && <div style={{ color: "crimson" }}>{err}</div>}

        <button type="submit">{mode === "login" ? "Sign in" : "Create account"}</button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setErr("");
          }}
          style={{
            background: "transparent",
            border: "none",
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          {mode === "login" ? "No account? Sign up" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
