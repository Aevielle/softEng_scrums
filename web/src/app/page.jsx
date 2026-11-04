"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import ThemeToggle from "./ThemeToggle";

import LoginPage from "./login/page";
import RegisterPage from "./register/page";

const MODULES = [
  {
    mark: 'C',
    title: 'Customers',
    text: 'Keep customer records, accounts, payment terms and interaction history in one reliable place.',
  },
  {
    mark: 'P',
    title: 'Products',
    text: 'Manage the product catalog, prices and inventory so every sale uses the right details.',
  },
  {
    mark: 'HR',
    title: 'Human Resources',
    text: 'Track employees, departments, job histories and payroll with clear, role-based access.',
  },
  {
    mark: 'S',
    title: 'Sales',
    text: 'Connect orders, line items and invoices to customers and products, with revenue reporting.',
  },
];

const BARS = [28, 40, 34, 52, 44, 62, 72];

export default function Home() {
  const [authModal, setAuthModal] = useState(null);

  useEffect(() => {
    if (!authModal) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event) {
      if (event.key === "Escape") {
        setAuthModal(null);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [authModal]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">H</span>
          <span>Hope, Inc. ERP</span>
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
            className={`${styles.btn} ${styles.secondary} ${styles.small}`}
            onClick={() => setAuthModal("register")}
          >
            Register →
          </button>

          <ThemeToggle />
        </nav>
      </header>

      <main>
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>
            Run your business with <span className={styles.accent}>clarity.</span>
          </h1>
          <p className={styles.heroText}>
            Hope, Inc. ERP unifies Customer Management, Product Catalog, Human
            Resources, and Sales into one powerful platform. Built for teams of
            every size.
          </p>
          <div className={styles.heroButtons}>
            <button
              type="button"
              className={`${styles.btn} ${styles.primary}`}
              onClick={() => setAuthModal("login")}
            >
              Sign in to Hope ERP →
            </button>

            <button
              type="button"
              className={`${styles.btn} ${styles.secondary}`}
              onClick={() => setAuthModal("register")}
            >
              Register
            </button>
          </div>
          <a href="#modules" className={styles.explore}>Explore the modules ↓</a>

          <div className={styles.preview}>
            <div className={styles.previewTop}>
              <strong>Dashboard preview</strong>
              <Link href="/login" className={styles.previewBtn}>Sign in to open</Link>
            </div>
            <div className={styles.tiles}>
              <div className={styles.tile}><strong>Customers</strong><span>Accounts and terms</span></div>
              <div className={styles.tile}><strong>Products</strong><span>Catalog and prices</span></div>
              <div className={styles.tile}><strong>Sales</strong><span>Orders and revenue</span></div>
            </div>
            <div className={styles.bars} aria-hidden="true">
              {BARS.map((h, i) => (
                <span key={i} style={{ height: `${h}px` }} />
              ))}
            </div>
          </div>
        </section>

        <section id="modules" className={styles.modules}>
          <p className={styles.eyebrow}>One platform. Every workflow.</p>
          <h2 className={styles.sectionTitle}>Everything your team needs to work from one source.</h2>
          <p className={styles.sectionText}>
            Four core modules. Three user roles. One unified system.
          </p>

          <div className={styles.grid}>
            {MODULES.map((m) => (
              <article key={m.title} className={styles.card}>
                <span className={styles.mark} aria-hidden="true">{m.mark}</span>
                <h3>{m.title}</h3>
                <p>{m.text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <span className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">H</span>
          Hope, Inc.
        </span>
        <span className={styles.note}>© 2026 Hope, Inc. ERP</span>
      </footer>

      {/* Authentication Modal */}
      {authModal && (
        <div
          className={styles.authOverlay}
          onClick={() => setAuthModal(null)}
        >
          <div
            className={styles.authModal}
            role="dialog"
            aria-modal="true"
            aria-label={
              authModal === "login"
                ? "Sign in to Hope ERP"
                : "Create your account"
            }
            onClick={(event) => event.stopPropagation()}
          >
            {authModal === "login" ? (
              <LoginPage
                modal={true}
                onClose={() => setAuthModal(null)}
                onSwitchToRegister={() => setAuthModal("register")}
              />
            ) : (
              <RegisterPage
                modal={true}
                onClose={() => setAuthModal(null)}
                onSwitchToLogin={() => setAuthModal("login")}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}