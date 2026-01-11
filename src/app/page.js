import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "calc(100vh - 72px)",
        padding: "24px 14px 60px",
        background:
          "radial-gradient(1200px 600px at 20% 0%, #eef5ff 0%, transparent 60%), radial-gradient(900px 500px at 90% 10%, #f5f7ff 0%, transparent 55%), #ffffff",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        {/* Hero */}
        <section
          style={{
            border: "1px solid #eee",
            borderRadius: 18,
            background: "#fff",
            boxShadow: "0 12px 34px rgba(15, 23, 42, 0.08)",
            padding: 18,
          }}
        >
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #e6e6e6",
                  background: "#fafafa",
                  fontWeight: 900,
                  fontSize: 12,
                  color: "#333",
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 999, background: "#0b3d91" }} />
                Private tutoring in Auckland
              </div>

              <h1 style={{ margin: "12px 0 8px", fontSize: 34, lineHeight: 1.12, letterSpacing: -0.3 }}>
                DarshaTutor
              </h1>

              <p style={{ margin: 0, color: "#555", fontSize: 16, lineHeight: 1.5 }}>
                Book lessons in seconds, see availability instantly, and keep everything organised.
                Built to be easy on mobile.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link
                href="/auth/sign-up"
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid #0b3d91",
                  background: "#0b3d91",
                  color: "#fff",
                  textDecoration: "none",
                  fontWeight: 900,
                }}
              >
                Get started
              </Link>

              <Link
                href="/auth/sign-in"
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid #e6e6e6",
                  background: "#fff",
                  color: "#222",
                  textDecoration: "none",
                  fontWeight: 900,
                }}
              >
                Sign in
              </Link>

              <Link
                href="/book"
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid #e6e6e6",
                  background: "#fafafa",
                  color: "#222",
                  textDecoration: "none",
                  fontWeight: 900,
                }}
              >
                Book a lesson
              </Link>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
                marginTop: 6,
              }}
            >
              {[
                { title: "See availability", text: "No back-and-forth messages." },
                { title: "Pay clearly", text: "Unpaid vs paid is shown on bookings." },
                { title: "Recurring lessons", text: "Weekly bookings for a term." },
              ].map((c) => (
                <div
                  key={c.title}
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 14,
                    padding: 14,
                    background: "#fff",
                  }}
                >
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>{c.title}</div>
                  <div style={{ color: "#555", fontSize: 13, lineHeight: 1.4 }}>{c.text}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section style={{ marginTop: 16 }}>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <div
              style={{
                border: "1px solid #eee",
                borderRadius: 18,
                background: "#fff",
                padding: 18,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 16 }}>How it works</div>
              <ol style={{ margin: "10px 0 0", paddingLeft: 18, color: "#444", lineHeight: 1.6 }}>
                <li>Create an account (Google sign-in supported).</li>
                <li>Add your student(s).</li>
                <li>Choose a time slot and request a booking.</li>
                <li>Pay by bank transfer (shown after booking) and the tutor marks it as paid.</li>
              </ol>
            </div>

            <div
              style={{
                border: "1px solid #eee",
                borderRadius: 18,
                background: "#fff",
                padding: 18,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 16 }}>Built for phones</div>
              <div style={{ marginTop: 10, color: "#444", lineHeight: 1.6 }}>
                Most parents book from their phone, so the booking flow is designed to be:
                <ul style={{ margin: "10px 0 0", paddingLeft: 18 }}>
                  <li>tap-friendly</li>
                  <li>clear about paid/unpaid</li>
                  <li>obvious about what is available vs busy</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Mobile responsiveness */}
        <style>{`
          @media (max-width: 720px) {
            h1 { font-size: 30px !important; }
            .twoCol { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </main>
  );
}
