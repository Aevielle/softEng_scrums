"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./forgot-password.module.css";
import { forgotLocal } from "../lib/localAuth";

const COOLDOWN_MS = 30_000;
const DEFAULT_EXPIRY_SECONDS = 180; // 3:00
const EMAIL_RE = /^\S+@\S+\.\S+$/;

const fmt = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

// Unknown email: "Wrong Email" (local part matches) / "Account not Found" (otherwise).
// The server decides which one applies; we only choose the toast title.
function serverErrorTitle(data) {
  if (data?.title) return data.title;
  if (data?.code === "NOT_FOUND" || /not found/i.test(data?.message || "")) {
    return "Account not Found";
  }
  return "Wrong Email";
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m3.5 7 8.5 6.5L20.5 7" />
    </svg>
  );
}

export default function ForgotPasswordPage({
  modal = false,
  onClose,
  onSwitchToLogin,
}) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(null); // { email, expiresAt, resendAt, again, link }
  const [now, setNow] = useState(0);
  const [error, setError] = useState(null); // { title, message, empty? }
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const badEmail = submitted && !EMAIL_RE.test(email.trim());

  // Tick once a second while the "sent" view is showing
  useEffect(() => {
    if (!sent) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [sent]);

  // Toast closes itself after a few seconds
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(t);
  }, [error]);

  async function send(e) {
    e?.preventDefault?.();

    const target = (sent ? sent.email : email).trim();

    setSubmitted(true);
    setError(null);

    // Required field
    if (!target) {
      setError({ title: "Empty Field", message: "Please fill out the forms." });
      return;
    }

    // Email format
    if (!EMAIL_RE.test(target)) {
      setError({ title: "Wrong Email", message: "Enter valid email address." });
      return;
    }

    setLoading(true);

    try {
      const data = forgotLocal(target);

      if (!data.ok) {
        setError({
          title: serverErrorTitle(data),
          message: data.message || "We couldn't find an account with that email.",
        });
        return;
      }

      const t = Date.now();
      setNow(t);
      setSent({
        email: target,
        expiresAt: t + (data.expiresIn ?? DEFAULT_EXPIRY_SECONDS) * 1000,
        resendAt: t + COOLDOWN_MS,
        again: !!sent,
        // Demo only: if the API hands back the reset link, offer it.
        link:
          data.resetUrl ||
          data.resetLink ||
          data.link ||
          data.url ||
          (data.token
            ? `/reset-password?token=${encodeURIComponent(data.token)}`
            : null),
      });
    } catch {
      setError({
        title: "Network error",
        message: "Please check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  const toast = error && (
    <div className={styles.toast} role="alert">
      <span className={styles.toastIcon} aria-hidden="true">!</span>
      <div>
        <strong>{error.title}</strong>
        <p>{error.message}</p>
      </div>
      <button
        type="button"
        className={styles.toastClose}
        onClick={() => setError(null)}
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );

  const closeButton = modal ? (
    <button
      type="button"
      className={styles.closeButton}
      onClick={onClose}
      aria-label="Close"
    >
      ×
    </button>
  ) : (
    <Link href="/" className={styles.closeButton} aria-label="Close">
      ×
    </Link>
  );

  const signInLink = modal ? (
    <button type="button" className={styles.linkButton} onClick={onSwitchToLogin}>
      Return to sign in →
    </button>
  ) : (
    <Link href="/login" className={styles.linkButton}>
      Return to sign in →
    </Link>
  );

  const wrapClass = `${styles.wrap} ${modal ? styles.modalWrap : ""}`;

  /* ---------- Step 1: link sent ---------- */
  if (sent) {
    const cooldown = sent.resendAt - now;
    const expires = sent.expiresAt - now;

    return (
      <main className={wrapClass}>
        {toast}

        <section className={`${styles.card} ${styles.center}`}>
          {closeButton}

          <span className={styles.mailIcon} aria-hidden="true">
            <MailIcon />
          </span>

          <span className={styles.pill}>Step 1 · Check your email</span>

          <h1 className={styles.sentTitle}>Reset link sent</h1>

          <p className={styles.sentText}>
            We sent {sent.again ? "another" : "a"} secure reset password link to{" "}
            <span className={styles.emailText}>{sent.email}</span>.
            <span className={styles.expiry}>
              {expires > 0 ? (
                <>
                  Link expires in <strong>{fmt(expires)}</strong>
                </>
              ) : (
                "This link has expired. Please resend."
              )}
            </span>
          </p>

          <button
            type="button"
            className={styles.submit}
            onClick={send}
            disabled={loading || cooldown > 0}
          >
            {loading
              ? "Sending…"
              : cooldown > 0
                ? `Resend in ${fmt(cooldown)}`
                : "Resend Link"}
          </button>

          <p className={styles.links}>
            {signInLink}
            {sent.link && (
              <>
                <span className={styles.dot} aria-hidden="true">·</span>
                <a href={sent.link} className={styles.linkButton}>
                  Open reset link (demo)
                </a>
              </>
            )}
          </p>
        </section>
      </main>
    );
  }

  /* ---------- Enter your email ---------- */
  return (
    <main className={wrapClass}>
      {toast}

      <form className={styles.card} onSubmit={send} noValidate>
        {closeButton}

        <header className={styles.header}>
          <h1>Forgot password?</h1>
          <p>
            Enter the email linked to your account to receive a secure reset
            password link.
          </p>
        </header>

        <label className={styles.label} htmlFor="forgotEmail">
          Email
        </label>

        <input
          id="forgotEmail"
          type="email"
          autoComplete="email"
          autoFocus
          className={`${styles.input} ${badEmail ? styles.bad : ""}`}
          placeholder={
            submitted && !email.trim()
              ? "Please fill out this form"
              : "Enter your email"
          }
          value={email}
          aria-invalid={badEmail}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
        />

        <button type="submit" className={styles.submit} disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </button>

        <p className={styles.foot}>{signInLink}</p>
      </form>
    </main>
  );
}