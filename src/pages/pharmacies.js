import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import "../styles/Pharmacies.css";

export default function Pharmacies() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const highlightId = (searchParams.get("highlight") || "").trim();

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (query.trim()) p.set("query", query.trim());
    if (city.trim()) p.set("city", city.trim());
    return p.toString();
  }, [query, city]);

  const navigate = useNavigate();

  const selectPharmacy = (p) => {
    localStorage.setItem("selectedPharmacy", JSON.stringify({ id: p.id, name: p.name }));
    localStorage.setItem("selectedPharmacyId", p.id);
    window.dispatchEvent(new Event("storage"));
    navigate(`/pharmacy/${p.id}`);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const data = await api(`/pharmacies?${qs}`);
        if (!data?.ok) throw new Error(data?.error || "Failed to load pharmacies");
        if (!cancelled) setItems(data.items || []);
      } catch (e) {
        if (!cancelled) setErr(e.message || "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [qs]);

  return (
    <div className="pharmacies-page">
      <div className="pharmacies-hero">
        <h1 className="pharmacies-title">Choose Pharmacy</h1>
        <p className="pharmacies-subtitle">Find the right pharmacy and open its products.</p>
        <div className="pharmacies-search">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, address, chain"
          />
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City or region"
          />
        </div>
      </div>

      {loading && <div className="pharmacies-state">Loading...</div>}
      {err && <div className="pharmacies-state pharmacies-state--error">{err}</div>}

      {!loading && !err && (
        <div className="pharmacies-grid">
          {items.length === 0 ? (
            <div className="pharmacies-state">No pharmacies found</div>
          ) : (
            items.map((p) => {
              const address =
                p.address?.raw ||
                [p.address?.street, p.address?.building, p.address?.city?.name, p.address?.region?.name]
                  .filter(Boolean)
                  .join(", ");
              const highlighted = highlightId && p.id === highlightId;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`pharmacy-card ${highlighted ? "highlight" : ""}`}
                  onClick={() => selectPharmacy(p)}
                >
                  <div className="pharmacy-card__head">
                    <div>
                      <div className="pharmacy-card__title">{p.name}</div>
                      {p.chain?.name ? <div className="pharmacy-card__chain">{p.chain.name}</div> : null}
                    </div>
                    <span className="pharmacy-card__cta">Open</span>
                  </div>
                  <div className="pharmacy-card__address">{address || "No address"}</div>
                  {p.phone ? <div className="pharmacy-card__phone">{p.phone}</div> : null}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
