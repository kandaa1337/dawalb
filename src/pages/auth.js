import React, { useState } from "react";
import { useAuth } from "../AuthContext";
import { useLocation, useNavigate } from "react-router-dom";

const colors = {
  primary: "#2EB872",
  primaryHover: "#269F62",
  secondaryBg: "#E8F5EE",
  pageBg: "#F9FAFB",
  cardBg: "#FFFFFF",
  text: "#1E1E1E",
  textSecondary: "#6B7280",
  placeholder: "#9CA3AF",
  border: "#E5E7EB",
  error: "#DC2626",
};

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

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    fontSize: 15,
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    backgroundColor: colors.cardBg,
    color: colors.text,
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      className="auth-page"
      style={{
        minHeight: "100vh",
        backgroundColor: colors.pageBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <style>{`
        .auth-page input::placeholder { color: ${colors.placeholder}; }
      `}</style>
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          backgroundColor: colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          padding: 32,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <h2
          style={{
            margin: "0 0 8px 0",
            fontSize: 24,
            fontWeight: 700,
            color: colors.text,
          }}
        >
          {mode === "login" ? "Sign in" : "Create account"}
        </h2>
        <p style={{ margin: "0 0 24px 0", fontSize: 14, color: colors.textSecondary }}>
          {mode === "login" ? "Enter your email or phone and password." : "Fill in your details to get started."}
        </p>

        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (optional)"
            style={inputStyle}
            onFocus={(e) => {
              e.target.style.borderColor = colors.primary;
              e.target.style.boxShadow = `0 0 0 2px ${colors.secondaryBg}`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = colors.border;
              e.target.style.boxShadow = "none";
            }}
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (optional)"
            style={inputStyle}
            onFocus={(e) => {
              e.target.style.borderColor = colors.primary;
              e.target.style.boxShadow = `0 0 0 2px ${colors.secondaryBg}`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = colors.border;
              e.target.style.boxShadow = "none";
            }}
          />

          {mode === "register" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional)"
              style={inputStyle}
              onFocus={(e) => {
                e.target.style.borderColor = colors.primary;
                e.target.style.boxShadow = `0 0 0 2px ${colors.secondaryBg}`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = colors.border;
                e.target.style.boxShadow = "none";
              }}
            />
          )}

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            style={inputStyle}
            onFocus={(e) => {
              e.target.style.borderColor = colors.primary;
              e.target.style.boxShadow = `0 0 0 2px ${colors.secondaryBg}`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = colors.border;
              e.target.style.boxShadow = "none";
            }}
          />

          {err && (
            <div
              style={{
                padding: "10px 14px",
                fontSize: 14,
                color: colors.error,
                backgroundColor: "#FEF2F2",
                borderRadius: 8,
                border: `1px solid #FECACA`,
              }}
            >
              {err}
            </div>
          )}

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "14px 20px",
              fontSize: 16,
              fontWeight: 600,
              color: "#FFFFFF",
              backgroundColor: colors.primary,
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              marginTop: 4,
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = colors.primaryHover;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = colors.primary;
            }}
          >
            {mode === "login" ? "Sign in" : "Create account"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setErr("");
            }}
            style={{
              background: "none",
              border: "none",
              padding: 12,
              fontSize: 14,
              color: colors.textSecondary,
              cursor: "pointer",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              e.target.style.color = colors.primary;
            }}
            onMouseLeave={(e) => {
              e.target.style.color = colors.textSecondary;
            }}
          >
            {mode === "login" ? "No account? Sign up" : "Already have an account? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
