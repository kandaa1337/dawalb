import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useI18n } from "../i18n/Provider";

export default function SearchPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = (searchParams.get("q") || searchParams.get("query") || "").trim();
  const category = (searchParams.get("category") || "").trim();
  const categoryTitle = (searchParams.get("label") || "").trim();
  const regionsParam = (searchParams.get("regions") || "").trim();
  const [data, setData] = useState({ medicines: [] });
  const [loading, setLoading] = useState(true);

  const regions = (() => {
    if (regionsParam) {
      return regionsParam.split(",").map((r) => r.trim()).filter(Boolean);
    }
    try {
      const stored = JSON.parse(localStorage.getItem("regionFilter") || "[]");
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  })();

  const isAllRegions = regions.length === 0 || regions.includes("ALL");
  const regionQuery = isAllRegions ? "" : `&regions=${encodeURIComponent(regions.join(","))}`;
  const categoryQuery = category ? `&category=${encodeURIComponent(category)}` : "";
  const hasQuery = Boolean(q || category);
  const categoryLabel = (slug, fallback) => {
    if (!slug) return fallback || "";
    const translated = t(`categoryNames.${slug}`);
    return translated === `categoryNames.${slug}` ? (fallback || slug) : translated;
  };

  useEffect(() => {
    if (!hasQuery) {
      setData({ medicines: [] });
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const query = q ? `q=${encodeURIComponent(q)}` : "q=";
        const res = await api(`/search?${query}${categoryQuery}${regionQuery}`);
        if (!cancelled) setData({ medicines: res.medicines || [] });
      } catch {
        if (!cancelled) setData({ medicines: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [q, categoryQuery, regionQuery, hasQuery]);

  if (!hasQuery) {
    return (
      <div style={{ maxWidth: 800, margin: "40px auto", padding: 24 }}>
        <h2>{t("search.title")}</h2>
        <p style={{ color: "#666" }}>{t("search.empty")}</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "28px auto 0", padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>
        {t("search.title")}: "{q || categoryTitle || category}"
      </h2>

      {loading ? (
        <p>{t("product.loading")}</p>
      ) : (
        <>
          <section style={{ marginBottom: 32 }}>
            <h3 style={{ marginBottom: 16, color: "#1a1a1a" }}>{t("search.medicines")}</h3>
            {data.medicines.length === 0 ? (
              <p style={{ color: "#666" }}>{t("search.noResults")}</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {data.medicines.map((m) => (
                  <li
                    key={m.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: "16px 0",
                      borderBottom: "1px solid #eee",
                      cursor: "pointer",
                    }}
                    onClick={() => navigate(`/product/${m.id}`)}
                    onKeyDown={(e) => e.key === "Enter" && navigate(`/product/${m.id}`)}
                    role="button"
                    tabIndex={0}
                  >
                    {m.imageUrl ? (
                      <img src={m.imageUrl} alt="" style={{ width: 88, height: 88, objectFit: "cover", borderRadius: 12 }} />
                    ) : (
                      <div style={{ width: 88, height: 88, background: "#eee", borderRadius: 12, display: "grid", placeItems: "center", fontSize: 22 }}>
                        P
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 36, lineHeight: 1.05, marginBottom: 6 }}>{m.name}</div>
                      {(m.categorySlug || m.subcategorySlug || m.categoryName || m.subcategoryName) && (
                        <div style={{ fontSize: 14, color: "#4c5560", marginBottom: 4 }}>
                          {[
                            categoryLabel(m.categorySlug, m.categoryName),
                            categoryLabel(m.subcategorySlug, m.subcategoryName),
                          ].filter(Boolean).join(" • ")}
                        </div>
                      )}
                      {(m.pharmacyName || m.pharmacyRegion) && (
                        <div style={{ fontSize: 13, color: "#666" }}>
                          {[m.pharmacyName, m.pharmacyRegion].filter(Boolean).join(" • ")}
                        </div>
                      )}
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 34, lineHeight: 1, color: "#2e7d32" }}>{m.price} {m.currency}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
