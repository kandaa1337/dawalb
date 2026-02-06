import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Pharmacies() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (query.trim()) p.set("query", query.trim());
    if (city.trim()) p.set("city", city.trim());
    return p.toString();
  }, [query, city]);

  const navigate = useNavigate();

    function selectPharmacy(p) {
    localStorage.setItem(
        "selectedPharmacy",
        JSON.stringify({ id: p.id, name: p.name })
    );
    localStorage.setItem("selectedPharmacyId", p.id);

    // куда вести дальше — на главную или на товары
    navigate("/", { replace: true });
    }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(`/api/pharmacies?${qs}`, { credentials: "include" });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data?.error || "Failed to load pharmacies");
        if (!cancelled) setItems(data.items || []);
      } catch (e) {
        if (!cancelled) setErr(e.message || "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [qs]);

  return (
    <div style={{ maxWidth: 900, margin: "30px auto", padding: 16 }}>
      <h2>Choose a pharmacy</h2>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name/address"
          style={{ flex: "1 1 280px", padding: 10 }}
        />
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
          style={{ flex: "1 1 180px", padding: 10 }}
        />
      </div>

      {loading && <div>Loading…</div>}
      {err && <div style={{ color: "crimson" }}>{err}</div>}

      <div style={{ display: "grid", gap: 10 }}>
        {items.map((p) => (
          <div key={p.id} style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
            <div style={{ fontWeight: 800 }}>{p.name}</div>
            <div style={{ opacity: 0.8 }}>
                {p.address?.raw ||
                    [p.address?.street, p.address?.building, p.address?.city?.name]
                    .filter(Boolean)
                    .join(", ")}
            </div>
            {p.phone && <div style={{ marginTop: 6 }}>{p.phone}</div>}
            <button
                style={{ marginTop: 10 }}
                type="button"
                onClick={() => {
                    localStorage.setItem("selectedPharmacy", JSON.stringify({ id: p.id, name: p.name }));
                    localStorage.setItem("selectedPharmacyId", p.id);
                    window.dispatchEvent(new Event("storage"));
                    navigate("/", { replace: true });
                }}
                >
                Select this pharmacy
            </button>

          </div>
        ))}
      </div>
    </div>
  );
}
