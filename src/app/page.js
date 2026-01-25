import Link from "next/link";

const BRAND_BLUE = "#0b3d91";

const benefits = [
  { title: "Stronger foundations", text: "Gaps closed fast with clear explanations, not confusion." },
  { title: "Confidence under pressure", text: "Students learn a method, then practise until it sticks." },
  { title: "Better grades (NCEA + NZ Curriculum)", text: "Structured support for tests, internals, and exams." },
  { title: "Parent-friendly communication", text: "Clear expectations, clear bookings, clear updates." },
];

const howItWorks = [
  { step: "1", title: "Create an account", text: "Add your child once and you’re ready to book anytime." },
  { step: "2", title: "Pick a time", text: "See availability instantly and book in seconds." },
  { step: "3", title: "Turn up and learn", text: "Focused tutoring, lots of practice, and calm progress." },
];

const topics = [
  "Years 4-10 maths foundations",
  "Algebra, fractions, ratios, geometry",
  "NCEA Level 1-3 exam preparation",
  "Problem-solving and word problems",
  "Confidence-building and learning routines",
];

const testimonials = [
  {
    name: "Parent (Year 11 NCEA Level 1)",
    text:
      "Darsha is a friendly approachable tutor that has helped my daughter through Year 11 maths.  She has been great at finding differing ways to explain maths to a kid that has never found it easy. My daughter's confidence has grown with her support. She is always reliable, great at communicating and tutors for a reasonable rate.  I would highly recommend her! ",
  },
  {
    name: "Parent (Year 9)",
    text:
      "Our child has really enjoyed maths sessions with Darsha and has learnt so much.  We have also noticed that our child has a far more positive and confident attitude to maths. Darsha has been very accommodating when we've needed an extra study session before a test, or when we've had to change times.  It's also fabulous having Darsha come to our house, saving us another drop off and pick up to do in our busy household.  We have used a tutoring company in the past, and prefer the one-on-one sessions with Darsha.",
  },
  {
    name: "Parent (Year 7)",
    text:
      "The booking system is super easy and the tutoring is even better. Clear explanations and no fluff.",
  },
];

const photos = [
  // Stock photos (safe to use as <img> without Next image config)
  // You can replace these later with your own photos in /public (recommended).
  "https://epe.brightspotcdn.com/ce/1b/4dbafb4c44e0921e72cd7c242b01/teacher-tutor-student-022023-187244393.jpg",
  "https://todaysparent.mblycdn.com/uploads/tp/2011/09/Tutoring.jpg",
  "https://cdn-blog.superprof.com/blog_nz/wp-content/uploads/2025/07/shutterstock_115176088-17522933221418-4175.jpg",
];

function SectionTitle({ kicker, title, subtitle }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {kicker ? (
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
          <span style={{ width: 8, height: 8, borderRadius: 999, background: BRAND_BLUE }} />
          {kicker}
        </div>
      ) : null}

      <h2 style={{ margin: "10px 0 6px", fontSize: 26, lineHeight: 1.2, letterSpacing: -0.2 }}>
        {title}
      </h2>

      {subtitle ? (
        <p style={{ margin: 0, color: "#555", lineHeight: 1.55, fontSize: 15 }}>{subtitle}</p>
      ) : null}
    </div>
  );
}

export default function Home() {
  return (
    <main
      style={{
        minHeight: "calc(100vh - 72px)",
        padding: "26px 14px 70px",
        background:
          "radial-gradient(1200px 600px at 20% 0%, #eef5ff 0%, transparent 60%), radial-gradient(900px 500px at 90% 10%, #f5f7ff 0%, transparent 55%), #ffffff",
      }}
    >
      <div style={{ maxWidth: 1040, margin: "0 auto", display: "grid", gap: 18 }}>
        {/* HERO */}
        <section
          style={{
            border: "1px solid #eee",
            borderRadius: 18,
            background: "#fff",
            boxShadow: "0 12px 34px rgba(15, 23, 42, 0.08)",
            padding: 18,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "1.2fr 0.8fr",
              alignItems: "center",
            }}
          >
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
                <span style={{ width: 8, height: 8, borderRadius: 999, background: BRAND_BLUE }} />
                Auckland tutoring - maths support
              </div>

              <h1 style={{ margin: "12px 0 10px", fontSize: 38, lineHeight: 1.08, letterSpacing: -0.4 }}>
                DarshaTutor
              </h1>

              <p style={{ margin: 0, color: "#555", fontSize: 16, lineHeight: 1.6, maxWidth: 560 }}>
                Private tutoring that focuses on results and confidence. Clear explanations, lots of practice,
                and a booking system that’s genuinely simple.
              </p>

              <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link
                  href="/auth/sign-up"
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: `1px solid ${BRAND_BLUE}`,
                    background: BRAND_BLUE,
                    color: "#fff",
                    textDecoration: "none",
                    fontWeight: 900,
                  }}
                >
                  Get started
                </Link>

                {/* <Link
                  href="/book"
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
                  View times / book
                </Link> */}

                <Link
                  href="/auth/sign-in"
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid transparent",
                    background: "transparent",
                    color: BRAND_BLUE,
                    textDecoration: "none",
                    fontWeight: 900,
                  }}
                >
                  Sign in
                </Link>
              </div>

              <div style={{ marginTop: 12, color: "#666", fontSize: 13, lineHeight: 1.45 }}>
                Supporting NZ Curriculum (Years 4-10) and NCEA Levels 1-3. Online and in-person options depending on availability.
              </div>
            </div>

            {/* Right card */}
            <div
              style={{
                border: "1px solid #eee",
                background: "linear-gradient(180deg, #ffffff 0%, #f7f9ff 100%)",
                borderRadius: 16,
                padding: 14,
              }}
            >
              <div style={{ fontWeight: 950, fontSize: 14, marginBottom: 10 }}>What parents usually want</div>

              <div style={{ display: "grid", gap: 10 }}>
                {benefits.slice(0, 3).map((b) => (
                  <div
                    key={b.title}
                    style={{
                      border: "1px solid #eaeaea",
                      borderRadius: 12,
                      padding: 10,
                      background: "#fff",
                    }}
                  >
                    <div style={{ fontWeight: 900, marginBottom: 4 }}>{b.title}</div>
                    <div style={{ color: "#555", fontSize: 13, lineHeight: 1.45 }}>{b.text}</div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: 12,
                  padding: 10,
                  borderRadius: 12,
                  border: "1px dashed #c9d7ff",
                  background: "#f4f7ff",
                  color: "#2b3a67",
                  fontSize: 13,
                  lineHeight: 1.45,
                  fontWeight: 700,
                }}
              >
                Book in seconds. See availability instantly. No back-and-forth messages.
              </div>
            </div>
          </div>

          {/* Responsive tweak */}
          <style>{`
            @media (max-width: 900px) {
              .heroGrid { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </section>

        {/* PHOTO STRIP */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
          }}
        >
          {photos.map((src, idx) => (
            <div
              key={idx}
              style={{
                borderRadius: 16,
                overflow: "hidden",
                border: "1px solid #eee",
                background: "#fff",
                boxShadow: "0 10px 26px rgba(15, 23, 42, 0.06)",
                aspectRatio: "16 / 10",
              }}
            >
              <img
                src={src}
                alt="Tutoring"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                loading="lazy"
              />
            </div>
          ))}
          <style>{`
            @media (max-width: 900px) {
              section[style*="repeat(3, 1fr)"] { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </section>

        {/* BENEFITS */}
        <section
          style={{
            border: "1px solid #eee",
            borderRadius: 18,
            background: "#fff",
            padding: 18,
            boxShadow: "0 12px 34px rgba(15, 23, 42, 0.06)",
          }}
        >
          <SectionTitle
            kicker="What your child gets"
            title="Tutoring that’s structured, calm, and effective"
            subtitle="We start by finding the weak points, then build a plan. You’ll see improvement because the student practises the right things, in the right order."
          />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {benefits.map((b) => (
              <div
                key={b.title}
                style={{
                  border: "1px solid #eaeaea",
                  borderRadius: 14,
                  padding: 12,
                  background: "#fff",
                }}
              >
                <div style={{ fontWeight: 950, marginBottom: 6 }}>{b.title}</div>
                <div style={{ color: "#555", fontSize: 14, lineHeight: 1.5 }}>{b.text}</div>
              </div>
            ))}
          </div>

          <style>{`
            @media (max-width: 900px) {
              section[style*="repeat(4, 1fr)"] > div { }
              section[style*="repeat(4, 1fr)"] { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </section>

        {/* HOW IT WORKS + TOPICS */}
        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div
            style={{
              border: "1px solid #eee",
              borderRadius: 18,
              background: "#fff",
              padding: 18,
              boxShadow: "0 12px 34px rgba(15, 23, 42, 0.06)",
            }}
          >
            <SectionTitle kicker="Simple process" title="How it works" subtitle="No admin chaos. No endless messaging." />

            <div style={{ display: "grid", gap: 10 }}>
              {howItWorks.map((h) => (
                <div
                  key={h.step}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "42px 1fr",
                    gap: 10,
                    alignItems: "start",
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid #eaeaea",
                    background: "#fff",
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#f4f7ff",
                      border: "1px solid #d9e3ff",
                      fontWeight: 950,
                      color: BRAND_BLUE,
                    }}
                  >
                    {h.step}
                  </div>
                  <div>
                    <div style={{ fontWeight: 950, marginBottom: 4 }}>{h.title}</div>
                    <div style={{ color: "#555", fontSize: 14, lineHeight: 1.5 }}>{h.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              border: "1px solid #eee",
              borderRadius: 18,
              background: "#fff",
              padding: 18,
              boxShadow: "0 12px 34px rgba(15, 23, 42, 0.06)",
            }}
          >
            <SectionTitle kicker="Coverage" title="What I tutor" subtitle="A practical focus, with plenty of practice." />

            <ul style={{ margin: 0, paddingLeft: 18, color: "#333", lineHeight: 1.65 }}>
              {topics.map((t) => (
                <li key={t} style={{ marginBottom: 6 }}>
                  <span style={{ color: "#555", fontWeight: 650 }}>{t}</span>
                </li>
              ))}
            </ul>

            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 14,
                border: "1px dashed #c9d7ff",
                background: "#f4f7ff",
                color: "#2b3a67",
                fontSize: 14,
                lineHeight: 1.5,
                fontWeight: 700,
              }}
            >
              Not sure what level your child is at? Book a first lesson and we’ll identify the gaps quickly.
            </div>
          </div>

          <style>{`
            @media (max-width: 900px) {
              section[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </section>

        {/* TESTIMONIALS */}
        <section
          style={{
            border: "1px solid #eee",
            borderRadius: 18,
            background: "#fff",
            padding: 18,
            boxShadow: "0 12px 34px rgba(15, 23, 42, 0.06)",
          }}
        >
          <SectionTitle
            kicker="Feedback"
            title="What parents say"
            subtitle="These are placeholders for now. Replace them with real reviews whenever you’re ready."
          />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {testimonials.map((t) => (
              <div
                key={t.name}
                style={{
                  border: "1px solid #eaeaea",
                  borderRadius: 16,
                  padding: 14,
                  background: "#fff",
                }}
              >
                <div style={{ fontWeight: 950, marginBottom: 8, color: "#111" }}>{t.name}</div>
                <div style={{ color: "#555", fontSize: 14, lineHeight: 1.6 }}>{t.text}</div>
              </div>
            ))}
          </div>

          <style>{`
            @media (max-width: 900px) {
              section[style*="repeat(3, 1fr)"] { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </section>

        {/* FINAL CTA */}
        <section
          style={{
            borderRadius: 18,
            border: `1px solid ${BRAND_BLUE}`,
            background: `linear-gradient(180deg, ${BRAND_BLUE} 0%, #082f72 100%)`,
            color: "#fff",
            padding: 18,
            boxShadow: "0 16px 44px rgba(11, 61, 145, 0.22)",
          }}
        >
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: -0.2 }}>
              Ready to book your first lesson?
            </div>
            <div style={{ opacity: 0.92, lineHeight: 1.55, maxWidth: 760 }}>
              Create an account in seconds, choose a time, and you’re done. You’ll get email confirmations for bookings and cancellations.
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
              <Link
                href="/auth/sign-up"
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.55)",
                  background: "#fff",
                  color: BRAND_BLUE,
                  textDecoration: "none",
                  fontWeight: 950,
                }}
              >
                Get started
              </Link>

              {/* <Link
                href="/book"
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.55)",
                  background: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  textDecoration: "none",
                  fontWeight: 950,
                }}
              >
                View times / book
              </Link> */}

              <Link
                href="/auth/sign-in"
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid transparent",
                  background: "transparent",
                  color: "#fff",
                  textDecoration: "none",
                  fontWeight: 950,
                }}
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
