import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../AuthContext";

export default function AdminLayout() {
  const { isSuperAdmin } = useAuth();

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0 }}>Admin</h2>
          <div style={{ opacity: 0.7, marginTop: 6 }}>Dashboard, Partner applications, Users & roles</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <NavLink
            to="/admin"
            end
            style={({ isActive }) => ({
              padding: "8px 12px",
              borderRadius: 10,
              textDecoration: "none",
              border: "1px solid #ddd",
              background: isActive ? "#111" : "#fff",
              color: isActive ? "#fff" : "#111",
              fontWeight: 700,
            })}
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/admin/partner-applications"
            style={({ isActive }) => ({
              padding: "8px 12px",
              borderRadius: 10,
              textDecoration: "none",
              border: "1px solid #ddd",
              background: isActive ? "#111" : "#fff",
              color: isActive ? "#fff" : "#111",
              fontWeight: 700,
            })}
          >
            Partner applications
          </NavLink>

          <NavLink
            to="/admin/banners"
            style={({ isActive }) => ({
              padding: "8px 12px",
              borderRadius: 10,
              textDecoration: "none",
              border: "1px solid #ddd",
              background: isActive ? "#111" : "#fff",
              color: isActive ? "#fff" : "#111",
              fontWeight: 700,
            })}
          >
            Banners
          </NavLink>
          {isSuperAdmin && (
            <NavLink
              to="/admin/payment-methods"
              style={({ isActive }) => ({
                padding: "8px 12px",
                borderRadius: 10,
                textDecoration: "none",
                border: "1px solid #ddd",
                background: isActive ? "#111" : "#fff",
                color: isActive ? "#fff" : "#111",
                fontWeight: 700,
              })}
            >
              Payment methods
            </NavLink>
          )}
          {isSuperAdmin && (
            <NavLink
              to="/admin/users"
              style={({ isActive }) => ({
                padding: "8px 12px",
                borderRadius: 10,
                textDecoration: "none",
                border: "1px solid #ddd",
                background: isActive ? "#111" : "#fff",
                color: isActive ? "#fff" : "#111",
                fontWeight: 700,
              })}
            >
              Users & roles
            </NavLink>
          )}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <Outlet />
      </div>
    </div>
  );
}
