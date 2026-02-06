import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RequireAdmin({ children }) {
  const { user, isAdmin } = useAuth();
  const loc = useLocation();

  // если ещё не подгрузился user — можно показать лоадер
  if (!user) return <div style={{ padding: 24 }}>Loading…</div>;

  if (!isAdmin) {
    // можешь вести на /profile или /
    return <Navigate to="/" replace state={{ from: loc.pathname, error: "ADMIN_ONLY" }} />;
  }

  return children;
}
