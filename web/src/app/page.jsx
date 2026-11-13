"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import ThemeToggle from "./ThemeToggle";

import LoginPage from "./login/page";
import RegisterPage from "./register/page";
import ForgotPasswordPage from "./forgot-password/page";

const MODULES = [
  {
    num: "01",
    tone: "blue",
    title: "Customer Management",
    text: "Keep customer records, payment terms, accounts, and interaction history in one reliable place.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16" />
        <path d="M15 10h3a2 2 0 0 1 2 2v9M2 21h20M8 7h3M8 11h3M8 15h3" />
      </svg>
    ),
  },
  {
    num: "02",
    tone: "violet",
    title: "Products & Sales",
    text: "Connect product pricing and inventory to sales, line items, invoices, and revenue reporting.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 20V11M12 20V4M19 20v-6M3 20h18" />
      </svg>
    ),
  },
  {
    num: "03",
    tone: "teal",
    title: "People & Access",
    text: "Manage employees, job histories, departments, roles, and module-level user rights.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

const BARS = [28, 40, 34, 52, 44, 62, 72];

/* One thin bundle of strands passing behind the dashboard:
   tight on the left, fanning out to the right (viewBox is 1920 x 400). */
const STRANDS = Array.from({ length: 11 }, (_, i) => {
  const k = i - 5;
  return `M-40,${300 + k * 0.5} C200,${265 + k * 0.5} 420,${215 + k * 0.4} 590,${178 + k * 0.4} S900,${205 + k * 0.6} 1340,${205 + k * 0.8} S1700,${120 + k * 2} 1960,${60 + k * 3.5}`;
});

/* shaded floor tiles: [column, row, width, height] in grid cells.
   Placed to match the mockup (one near the buttons, one under the dashboard's
   right edge, one wide tile at the lower right). */
const TILES = [
  [5, 2, 1, 1],
  [12, 4, 1, 1],
  [15, 7, 2, 1],
];

/* soft out-of-focus light dots, positions in % of the hero */
const BOKEH = [
  [27, 14, 12, 0.22], [16, 27, 9, 0.2], [79, 24, 12, 0.2], [90, 46, 9, 0.18], [61, 12, 8, 0.18],
];

const AUTH_LABELS = {
  login: "Sign in to Hope ERP",
  register: "Create your account",
  forgot: "Reset your password",
};

const INFO = {
  privacy: {
    title: "Privacy",
    text: "This is a classroom prototype. Everything you enter is saved only in this browser and is never sent to a server.",
  },
  support: {
    title: "Support",
    text: "Need help? Ask your course instructor, or an Admin on your Hope, Inc. ERP team.",
  },
};

export default function Home() {
  const [authModal, setAuthModal] = useState(null);
  const [infoModal, setInfoModal] = useState(null); // "privacy" | "support" | null
  const [scrolled, setScrolled] = useState(false);
  const tiltRef = useRef(null);
  const heroRef = useRef(null);
  const pageRef = useRef(null);

  /* NEW: open a popup from the address bar: /?auth=login | register | forgot.
     The standalone /login page sends people here. Other parts of the query
     (for example ?oauth=...) are left for the popup to read. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wanted = params.get("auth");
    if (!wanted || !AUTH_LABELS[wanted]) return;

    setAuthModal(wanted);

    params.delete("auth");
    const rest = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (rest ? `?${rest}` : "")
    );
  }, []);

  /* Lock scroll + close on Escape while any modal is open */
  useEffect(() => {
    if (!authModal && !infoModal) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event) {
      if (event.key === "Escape") {
        setAuthModal(null);
        setInfoModal(null);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [authModal, infoModal]);

  /* Header gets a stronger look once the page scrolls */
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Dashboard preview tilts toward the cursor from ANYWHERE on screen
     (far left / far right still rotates it in 3D) */
  useEffect(() => {
    const el = tiltRef.current;
    const page = pageRef.current;
    if (!el || !page) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const clamp = (v) => Math.max(-1, Math.min(1, v));
    let frame = 0;

    function setTilt(rx, ry) {
      el.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
      el.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
    }

    function onMove(e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const dx = clamp((e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2));
        const dy = clamp((e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2));
        setTilt(-dy * 7, dx * 10);
        page.style.setProperty("--mx", ((e.clientX / window.innerWidth - 0.5) * 2).toFixed(3));
        page.style.setProperty("--my", ((e.clientY / window.innerHeight - 0.5) * 2).toFixed(3));
      });
    }
    function onLeave() {
      cancelAnimationFrame(frame);
      setTilt(0, 0);
      page.style.setProperty("--mx", "0");
      page.style.setProperty("--my", "0");
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  /* Scroll-reveal for anything marked with data-reveal */
  useEffect(() => {
    const items = document.querySelectorAll("[data-reveal]");

    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => (el.dataset.in = "true"));
      return;
    }

    /* Toggle on enter AND leave so the reveal replays every time it scrolls into view */
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.dataset.in = "true";
          } else {
            delete entry.target.dataset.in;
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.page} ref={pageRef}>
      <div className={styles.ambient} aria-hidden="true">
        <div className={styles.stars} />
        <div className={`${styles.orb} ${styles.orbA}`} />
        <div className={`${styles.orb} ${styles.orbB}`} />
        <div className={`${styles.orb} ${styles.orbC}`} />
        {BOKEH.map(([x, y, size, o], i) => (
          <span
            key={i}
            className={styles.bokeh}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: size,
              height: size,
              opacity: o,
              "--t": `${3 + (i % 5)}s`,
              "--td": `${-(i * 0.7)}s`,
            }}
          />
        ))}
      </div>
      <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ""}`}>
        <Link href="/" className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">H</span>
          <span
            className={`${styles.brandText} ${scrolled ? styles.brandTextHidden : ""}`}
          >
            Hope, Inc.
          </span>
        </Link>
        <nav className={styles.actions} aria-label="Account">
          <button
            type="button"
            className={styles.navLink}
            onClick={() => setAuthModal("login")}
          >
            Sign in
          </button>

          <button
            type="button"
            className={`${styles.btn} ${styles.primary} ${styles.small}`}
            onClick={() => setAuthModal("register")}
          >
            Register
          </button>

          <ThemeToggle />
        </nav>
      </header>

      <main>
        {/* ================= HERO ================= */}
        <section className={styles.hero} ref={heroRef}>

          {/* curved strands behind the dashboard */}
          <svg
            className={styles.waves}
            viewBox="0 0 1920 400"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" className={styles.waveStopA} />
                <stop offset="30%" className={styles.waveStopB} />
                <stop offset="100%" className={styles.waveStopA} />
              </linearGradient>
            </defs>
            <g className={styles.bundle}>
              {STRANDS.map((d, i) => (
                <path key={i} className={styles.strand} d={d} />
              ))}
            </g>
          </svg>

          <div className={styles.ceiling} aria-hidden="true">
            <div className={styles.gridPlane} />
          </div>
          <div className={styles.floor} aria-hidden="true">
            <div className={styles.gridPlane}>
              {TILES.map(([c, r, w, h], i) => (
                <span
                  key={i}
                  className={styles.tileShade}
                  style={{ "--c": c, "--r": r, "--w": w, "--h": h }}
                />
              ))}
            </div>
          </div>

          {/* content */}
          <h1 className={`${styles.heroTitle} ${styles.rise}`} style={{ "--d": "0.05s" }}>
            Run your business with{" "}
            <span className={styles.accent}>clarity.</span>
          </h1>

          <p className={`${styles.heroText} ${styles.rise}`} style={{ "--d": "0.25s" }}>
            Hope, Inc. ERP brings customers, products, employees, sales, and
            role-based access together in one dependable business system.
          </p>

          <div className={`${styles.heroButtons} ${styles.rise}`} style={{ "--d": "0.45s" }}>
            <button
              type="button"
              className={`${styles.btn} ${styles.primary}`}
              onClick={() => setAuthModal("login")}
            >
              Sign in to Hope ERP →
            </button>

            <a href="#modules" className={`${styles.btn} ${styles.secondary}`}>
              Explore the modules
            </a>
          </div>

          <div className={`${styles.previewWrap} ${styles.rise}`} style={{ "--d": "0.7s" }}>
            <div className={styles.previewTilt} ref={tiltRef}>
              <div
              className={styles.preview}
              role="button"
              tabIndex={0}
              onClick={() => setAuthModal("login")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setAuthModal("login");
                }
              }}
              >
              <div className={styles.previewTop}>
                <strong>Dashboard preview</strong>
                <button
                  type="button"
                  className={styles.previewBtn}
                  onClick={() => setAuthModal("login")}
                >
                  Sign in to open
                </button>
              </div>
              <div className={styles.tiles}>
                <div className={styles.tile}><strong>Customers</strong><span>Accounts and terms</span></div>
                <div className={styles.tile}><strong>Products</strong><span>Catalog and prices</span></div>
                <div className={styles.tile}><strong>Sales</strong><span>Orders and revenue</span></div>
              </div>
              <div className={styles.bars} aria-hidden="true">
                {BARS.map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${h}px`, "--d": `${0.9 + i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
            </div>
          </div>
        </section>

        {/* ================= MODULES ================= */}
        <section id="modules" className={styles.modulesWrap}>
          <div className={styles.modules}>
            <p className={`${styles.eyebrow} ${styles.reveal}`} data-reveal>
              One platform. Every workflow.
            </p>
            <h2
              className={`${styles.sectionTitle} ${styles.reveal}`}
              data-reveal
              style={{ "--rd": "0.08s" }}
            >
              Everything your team needs to work from one source.
            </h2>
            <p
              className={`${styles.sectionText} ${styles.reveal}`}
              data-reveal
              style={{ "--rd": "0.16s" }}
            >
              Replace disconnected spreadsheets with an ERP that keeps every
              record linked, every role clear, and every report ready.
            </p>

            <div className={styles.grid}>
              {MODULES.map((m, i) => (
                <article
                  key={m.title}
                  className={`${styles.card} ${styles.reveal}`}
                  data-reveal
                  style={{ "--rd": `${0.12 + i * 0.12}s` }}
                  role="button"
                  tabIndex={0}
                  onClick={() => setAuthModal("login")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setAuthModal("login");
                    }
                  }}
                >
                  <span className={styles.cardNum}>{m.num}</span>
                  <span className={`${styles.mark} ${styles[m.tone]}`} aria-hidden="true">
                    {m.icon}
                  </span>
                  <h3>{m.title}</h3>
                  <p>{m.text}</p>
                  <button
                    type="button"
                    className={styles.learn}
                    onClick={() => setAuthModal("login")}
                  >
                    Learn more <span aria-hidden="true">→</span>
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <span className={styles.footerLine} data-reveal aria-hidden="true" />
        <span
          className={`${styles.brand} ${styles.slideLeft}`}
          data-reveal
          style={{ "--rd": "0.15s" }}
        >
          <span className={styles.logo} aria-hidden="true">H</span>
          Hope, Inc.
        </span>
        <span
          className={`${styles.footerLinks} ${styles.slideRight}`}
          data-reveal
          style={{ "--rd": "0.3s" }}
        >
          <span className={styles.note}>© 2026 Hope, Inc. ERP</span>
          <button type="button" className={styles.footLink} onClick={() => setInfoModal("privacy")}>
            Privacy
          </button>
          <button type="button" className={styles.footLink} onClick={() => setInfoModal("support")}>
            Support
          </button>
        </span>
      </footer>

      {/* Authentication Modal */}
      {authModal && (
        <div className={styles.authOverlay} onClick={() => setAuthModal(null)}>
          <div
            className={styles.authModal}
            role="dialog"
            aria-modal="true"
            aria-label={AUTH_LABELS[authModal]}
            onClick={(event) => event.stopPropagation()}
          >
            {authModal === "login" && (
              <LoginPage
                modal={true}
                onClose={() => setAuthModal(null)}
                onSwitchToRegister={() => setAuthModal("register")}
                onSwitchToForgot={() => setAuthModal("forgot")}
              />
            )}

            {authModal === "register" && (
              <RegisterPage
                modal={true}
                onClose={() => setAuthModal(null)}
                onSwitchToLogin={() => setAuthModal("login")}
              />
            )}

            {authModal === "forgot" && (
              <ForgotPasswordPage
                modal={true}
                onClose={() => setAuthModal(null)}
                onSwitchToLogin={() => setAuthModal("login")}
              />
            )}
          </div>
        </div>
      )}

      {/* Privacy / Support Modal */}
      {infoModal && (
        <div className={styles.infoOverlay} onClick={() => setInfoModal(null)}>
          <div
            className={styles.infoModal}
            role="dialog"
            aria-modal="true"
            aria-label={INFO[infoModal].title}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className={styles.infoTitle}>{INFO[infoModal].title}</h2>
            <p className={styles.infoText}>{INFO[infoModal].text}</p>
            <button
              type="button"
              className={styles.infoClose}
              onClick={() => setInfoModal(null)}
              autoFocus
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
