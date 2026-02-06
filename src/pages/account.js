import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { useNavigate } from "react-router-dom";

export default function Account() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const [tab, setTab] = useState("profile");

  // формы
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");

  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");

  // истории (пока localStorage)
  const [searchHistory, setSearchHistory] = useState([]);
  const [reservationHistory, setReservationHistory] = useState([]);
  const [reviewHistory, setReviewHistory] = useState([]);

  useEffect(() => {
    setSearchHistory(JSON.parse(localStorage.getItem("searchHistory") || "[]"));
    setReservationHistory(JSON.parse(localStorage.getItem("reservationHistory") || "[]"));
    setReviewHistory(JSON.parse(localStorage.getItem("reviewHistory") || "[]"));
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    // TODO: сделать API /api/users/me PATCH
    alert("Profile saved (TODO: connect backend)");
  }

  async function changePassword(e) {
    e.preventDefault();
    // TODO: API /api/users/me/password
    alert("Password changed (TODO: connect backend)");
    setOldPass("");
    setNewPass("");
  }

  return (
    <div style={{ maxWidth: 980, margin: "30px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0 }}>Profile</h2>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            {user?.email || user?.phone || "Signed in"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={() => nav("/partner")}>
            Become a partner
          </button>
          <button type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      {/* tabs */}
      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        {["profile", "security", "activity", "reservations", "reviews"].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: tab === k ? "#f3f4f6" : "white",
              fontWeight: 700,
            }}
          >
            {k}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        {tab === "profile" && (
          <form onSubmit={saveProfile} style={{ display: "grid", gap: 10, maxWidth: 520 }}>
            <label>
              Avatar URL
              <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
            </label>
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </label>
            <label>
              Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            </label>
            <label>
              Phone
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
            </label>

            <button type="submit">Save</button>
          </form>
        )}

        {tab === "security" && (
          <form onSubmit={changePassword} style={{ display: "grid", gap: 10, maxWidth: 520 }}>
            <label>
              Old password
              <input value={oldPass} onChange={(e) => setOldPass(e.target.value)} type="password" />
            </label>
            <label>
              New password
              <input value={newPass} onChange={(e) => setNewPass(e.target.value)} type="password" />
            </label>
            <button type="submit" disabled={!oldPass || !newPass}>Change password</button>
          </form>
        )}

        {tab === "activity" && (
          <div style={{ display: "grid", gap: 10 }}>
            <h3 style={{ margin: "10px 0 0" }}>Search history</h3>
            {searchHistory.length === 0 ? (
              <div style={{ opacity: 0.7 }}>No searches yet</div>
            ) : (
              searchHistory.slice().reverse().map((x, i) => (
                <div key={i} style={{ padding: 10, border: "1px solid #e5e7eb", borderRadius: 12 }}>
                  <div style={{ fontWeight: 700 }}>{x.query}</div>
                  <div style={{ opacity: 0.7 }}>{new Date(x.at).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "reservations" && (
          <div style={{ display: "grid", gap: 10 }}>
            <h3 style={{ margin: "10px 0 0" }}>Reservation history</h3>
            {reservationHistory.length === 0 ? (
              <div style={{ opacity: 0.7 }}>No reservations yet</div>
            ) : (
              reservationHistory.slice().reverse().map((r, i) => (
                <div key={i} style={{ padding: 10, border: "1px solid #e5e7eb", borderRadius: 12 }}>
                  <div style={{ fontWeight: 800 }}>{r.pharmacyName}</div>
                  <div>{r.code ? `Code: ${r.code}` : null}</div>
                  <div style={{ opacity: 0.7 }}>{new Date(r.at).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "reviews" && (
          <div style={{ display: "grid", gap: 10 }}>
            <h3 style={{ margin: "10px 0 0" }}>My reviews</h3>
            {reviewHistory.length === 0 ? (
              <div style={{ opacity: 0.7 }}>No reviews yet</div>
            ) : (
              reviewHistory.slice().reverse().map((r, i) => (
                <div key={i} style={{ padding: 10, border: "1px solid #e5e7eb", borderRadius: 12 }}>
                  <div style={{ fontWeight: 800 }}>{r.pharmacyName}</div>
                  <div>Rating: {r.rating}/5</div>
                  <div>{r.text}</div>
                  <div style={{ opacity: 0.7 }}>{new Date(r.at).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
