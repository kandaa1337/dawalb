import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useI18n } from "../i18n/Provider";

const REVIEWS_PER_PAGE = 20;

export default function MyPharmacy() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [pharmacies, setPharmacies] = useState([]);
  const [partner, setPartner] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    const [meRes, pharmaciesRes] = await Promise.all([
      api("/partner/me").catch(() => ({ ok: false, partner: null })),
      api("/partner/pharmacies").catch((e) => {
        if (e?.status === 403 && e?.data?.error === "PARTNER_REQUIRED") return { ok: false, pharmacies: [], partnerRequired: true };
        throw e;
      }),
    ]);
    setPartner(meRes.partner ?? null);
    if (pharmaciesRes.pharmacies) setPharmacies(pharmaciesRes.pharmacies);
    else if (pharmaciesRes.partnerRequired) setPharmacies([]);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        await loadData();
      } catch (e) {
        if (!cancelled) setError(e?.message || t("common.loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!partner) return;
    let cancelled = false;
    setReviewsLoading(true);
    api(`/partner/reviews?limit=${REVIEWS_PER_PAGE}&page=${reviewsPage}`)
      .then((res) => {
        if (!cancelled) {
          setReviews(res.reviews ?? []);
          setReviewsTotal(res.total ?? 0);
        }
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });
    return () => { cancelled = true; };
  }, [partner, reviewsPage]);

  const isPartner = !!partner;
  const hasPharmacies = pharmacies.length > 0;

  if (loading) {
    return (
      <div style={{ maxWidth: 600, margin: "40px auto", padding: 24, textAlign: "center" }}>
        {t("product.loading")}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "40px auto", padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>{t("myPharmacy.title")}</h2>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", borderRadius: 8, color: "#c00" }}>
          {error}
        </div>
      )}

      {!isPartner ? (
        <div style={{ padding: 24, background: "#f5f5f5", borderRadius: 12, marginBottom: 24 }}>
          <p style={{ margin: "0 0 16px 0" }}>
            {t("myPharmacy.becomePartner")}
          </p>
          <button
            type="button"
            onClick={() => navigate("/partner/apply")}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: "#2EB872",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("myPharmacy.apply")}
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 24 }}>
            <button
              type="button"
              onClick={() => navigate("/pharmacy/new")}
              style={{
                padding: "12px 24px",
                borderRadius: 10,
                border: "2px solid #2EB872",
                background: "#fff",
                color: "#2EB872",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + {t("myPharmacy.addPharmacy")}
            </button>
          </div>

          {hasPharmacies ? (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {pharmacies.map((p) => (
                <li
                  key={p.id}
                  style={{
                    padding: 16,
                    marginBottom: 12,
                    border: "1px solid #ddd",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    cursor: "pointer",
                    background: "#fff",
                  }}
                  onClick={() => navigate(`/pharmacy/${p.id}`)}
                  onKeyDown={(e) => e.key === "Enter" && navigate(`/pharmacy/${p.id}`)}
                  role="button"
                  tabIndex={0}
                >
                  {p.logoUrl ? (
                    <img src={p.logoUrl} alt="" style={{ width: 48, height: 48, objectFit: "contain", borderRadius: 8 }} />
                  ) : (
                    <div style={{ width: 48, height: 48, background: "#eee", borderRadius: 8, display: "grid", placeItems: "center", fontSize: 20 }}>🏥</div>
                  )}
                  <div style={{ flex: 1 }}>
                    <strong>{p.name}</strong>
                    <div style={{ fontSize: 14, color: "#666" }}>{p.address?.raw || p.address?.street || "—"}</div>
                    {(p.reviewCount != null && p.reviewCount > 0) && (
                      <div style={{ fontSize: 13, color: "#2e7d32", marginTop: 4 }}>
                        ★ {p.averageRating != null ? p.averageRating.toFixed(1) : "—"} ({p.reviewCount} {t("myPharmacy.reviewsCount")})
                      </div>
                    )}
                  </div>
                  <span style={{ color: "#888" }}>→</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "#666" }}>{t("myPharmacy.noPharmacies")}</p>
          )}

          {isPartner && (
            <section style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #ddd" }}>
              <h3 style={{ marginBottom: 16 }}>{t("myPharmacy.reviewsOnYourPharmacies")}</h3>
              {reviewsLoading && reviews.length === 0 ? (
                <p style={{ color: "#666" }}>{t("product.loading")}</p>
              ) : reviews.length === 0 ? (
                <p style={{ color: "#666" }}>{t("product.noReviews")}</p>
              ) : (
                <>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {reviews.map((r) => (
                      <li
                        key={r.id}
                        style={{
                          padding: 16,
                          marginBottom: 12,
                          border: "1px solid #eee",
                          borderRadius: 12,
                          background: "#fafafa",
                        }}
                      >
                        <div style={{ fontSize: 13, color: "#2e7d32", marginBottom: 8, fontWeight: 600 }}>
                          {t("product.pharmacy")}: {r.pharmacyName}
                          {r.pharmacyAddress && <span style={{ fontWeight: 400, color: "#666" }}> — {r.pharmacyAddress}</span>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ color: "#ffc107" }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                          <strong>{r.userName}</strong>
                          <span style={{ fontSize: 12, color: "#999" }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                        </div>
                        {r.title && <div style={{ fontWeight: 600, marginBottom: 4 }}>{r.title}</div>}
                        {r.body && <div style={{ color: "#444" }}>{r.body}</div>}
                      </li>
                    ))}
                  </ul>
                  {reviewsTotal > REVIEWS_PER_PAGE && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => setReviewsPage((p) => Math.max(1, p - 1))}
                        disabled={reviewsPage <= 1 || reviewsLoading}
                        style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #ccc", background: "#fff", cursor: reviewsPage <= 1 || reviewsLoading ? "not-allowed" : "pointer" }}
                      >
                        {t("myPharmacy.prev")}
                      </button>
                      <span style={{ fontSize: 14, color: "#666" }}>
                        {t("myPharmacy.pageLabel")} {reviewsPage} / {Math.ceil(reviewsTotal / REVIEWS_PER_PAGE)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setReviewsPage((p) => p + 1)}
                        disabled={reviewsPage >= Math.ceil(reviewsTotal / REVIEWS_PER_PAGE) || reviewsLoading}
                        style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #ccc", background: "#fff", cursor: reviewsPage >= Math.ceil(reviewsTotal / REVIEWS_PER_PAGE) || reviewsLoading ? "not-allowed" : "pointer" }}
                      >
                        {t("myPharmacy.next")}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
