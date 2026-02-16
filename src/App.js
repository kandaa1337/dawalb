// App.js
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import Auth from "./pages/auth";
import Home from "./pages/Home";
import Pharmacies from "./pages/pharmacies";
import Profile from "./pages/profile";
import PartnerApply from "./pages/partnerApply";

import Header from "./components/header";
import Footer from "./components/footer";
import { api } from "./api";

import PartnerStatus from "./pages/partnerStatus";
import MyPharmacy from "./pages/MyPharmacy";
import PharmacyNew from "./pages/PharmacyNew";
import PharmacyPage from "./pages/PharmacyPage";
import PharmacyEdit from "./pages/PharmacyEdit";
import ProductNew from "./pages/ProductNew";
import ProductEdit from "./pages/ProductEdit";
import ProductPage from "./pages/ProductPage";
import ReservePage from "./pages/ReservePage";
import SearchPage from "./pages/SearchPage";

import RequireAdmin from "./RequireAdmin";

import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPartnerApplications from "./pages/admin/adminPartnerApplications";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPaymentMethods from "./pages/admin/AdminPaymentMethods";
import AdminBanners from "./pages/admin/AdminBanners";

import { AuthProvider } from "./AuthContext";
import ReqAuth from "./reqAuth";

function BannerSlot({ banners, className }) {
  if (!banners?.length) return null;
  return (
    <div className={className}>
      {banners.map((b) => (
        <a
          key={b.id}
          href={b.link || "#"}
          target={b.link ? "_blank" : undefined}
          rel={b.link ? "noopener noreferrer" : undefined}
          className="banner-slot__link"
          style={b.link ? {} : { pointerEvents: "none" }}
        >
          <img src={b.imageUrl} alt="" className="banner-slot__img" />
        </a>
      ))}
    </div>
  );
}

function Layout() {
  const loc = useLocation();
  const hideChrome = loc.pathname === "/login";
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    if (hideChrome) return;
    api("/banners").then((r) => setBanners(r.banners || [])).catch(() => setBanners([]));
  }, [hideChrome]);

  const mobileBanners = banners.filter((b) => b.slot === "mobile_bottom");
  const leftBanners = banners.filter((b) => b.slot === "side_left");
  const rightBanners = banners.filter((b) => b.slot === "side_right");

  return (
    <>
      {!hideChrome && <Header />}
      {!hideChrome ? (
        <>
          {loc.pathname === "/" && mobileBanners.length > 0 && (
            <div className="mobile-banner-slot" aria-hidden="true">
              <BannerSlot banners={mobileBanners} className="banner-slot banner-slot--mobile" />
            </div>
          )}
          <div className="layout-main">
          <aside className="banners-aside banners-aside--left" aria-hidden="true">
            <BannerSlot banners={leftBanners} className="banner-slot" />
          </aside>
          <main className="layout-content">
            <Outlet />
          </main>
          <aside className="banners-aside banners-aside--right" aria-hidden="true">
            <BannerSlot banners={rightBanners} className="banner-slot" />
          </aside>
          </div>
        </>
      ) : (
        <Outlet />
      )}
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
              path="/account"
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

            <Route path="/my-pharmacy" element={<ReqAuth><MyPharmacy /></ReqAuth>} />
            <Route path="/pharmacy/new" element={<ReqAuth><PharmacyNew /></ReqAuth>} />
            <Route path="/pharmacy/:id" element={<ReqAuth><PharmacyPage /></ReqAuth>} />
            <Route path="/pharmacy/:id/edit" element={<ReqAuth><PharmacyEdit /></ReqAuth>} />
            <Route path="/pharmacy/:id/product/new" element={<ReqAuth><ProductNew /></ReqAuth>} />
            <Route path="/product/:id" element={<ProductPage />} />
            <Route path="/product/:id/edit" element={<ReqAuth><ProductEdit /></ReqAuth>} />
            <Route path="/offer/:offerId/reserve" element={<ReqAuth><ReservePage /></ReqAuth>} />
            <Route path="/search" element={<SearchPage />} />

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
              <Route path="banners" element={<AdminBanners />} />
              <Route path="payment-methods" element={<AdminPaymentMethods />} />
              <Route path="users" element={<AdminUsers />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
