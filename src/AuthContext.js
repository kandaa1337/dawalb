import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

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

function computeIsAdmin(user) {
  if (!user) return false;

  // поддержим разные варианты, чтобы не ломалось
  if (user.isAdmin === true) return true;

  const role = (user.role || user.userRole || "").toString().toLowerCase();
  if (role === "admin") return true;

  const roles = Array.isArray(user.roles) ? user.roles.map((r) => String(r).toLowerCase()) : [];
  if (roles.includes("admin")) return true;

  // иногда админ определяется по email (если бэк так делает)
  // но это лучше НЕ делать на фронте, пусть решает backend
  return false;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = async () => {
    try {
      const r = await api("/auth/me");
      setUser(r.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMe(); }, []);

  const value = useMemo(() => {
    const isAdmin = computeIsAdmin(user);

    return {
      user,
      loading,
      isAuthed: !!user,
      isAdmin,

      reloadMe: loadMe,

      login: async ({ email, phone, password }) => {
        await api("/auth/login", { method: "POST", body: { email, phone, password } });
        await loadMe();
      },

      register: async ({ email, phone, password, name }) => {
        await api("/auth/register", { method: "POST", body: { email, phone, password, name } });
        await loadMe();
      },

      logout: async () => {
        await api("/auth/logout", { method: "POST" });
        setUser(null);
      },
    };
  }, [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
