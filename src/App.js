// App.js
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import Auth from "./pages/auth";
import Home from "./pages/Home";
import Pharmacies from "./pages/pharmacies";
import Profile from "./pages/profile";
import PartnerApply from "./pages/partnerApply";

import Header from "./components/header";
import Footer from "./components/footer";

import PartnerStatus from "./pages/partnerStatus";

import RequireAdmin from "./RequireAdmin";

import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPartnerApplications from "./pages/admin/adminPartnerApplications";

import { AuthProvider } from "./AuthContext";
import ReqAuth from "./reqAuth";

function Layout() {
  const loc = useLocation();
  const hideChrome = loc.pathname === "/login";

  return (
    <>
      {!hideChrome && <Header />}
      <Outlet />
      {!hideChrome && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/login" element={<Auth />} />

            <Route
              path="/"
              element={
                <ReqAuth>
                  <Home />
                </ReqAuth>
              }
            />

            <Route
              path="/pharmacies"
              element={
                <ReqAuth>
                  <Pharmacies />
                </ReqAuth>
              }
            />

            <Route
              path="/profile"
              element={
                <ReqAuth>
                  <Profile />
                </ReqAuth>
              }
            />

            <Route
              path="/partner/apply"
              element={
                <ReqAuth>
                  <PartnerApply />
                </ReqAuth>
              }
            />
            
            <Route path="/partner/status" element={<ReqAuth><PartnerStatus /></ReqAuth>} />

            <Route
              path="/admin"
              element={
                <ReqAuth>
                  <RequireAdmin>
                    <AdminLayout />
                  </RequireAdmin>
                </ReqAuth>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="partner-applications" element={<AdminPartnerApplications />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
