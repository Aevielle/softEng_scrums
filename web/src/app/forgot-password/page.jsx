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

function EyeIcon({ off }) {
  return off ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

// Classroom prototype: demo accounts accept any password, so only registered
// accounts (kept in this browser's localStorage) need their password updated.
function savePassword(email, password) {
  try {
    const list = JSON.parse(localStorage.getItem("hope_users"));
    if (!Array.isArray(list)) return;
    const key = String(email).trim().toLowerCase();
    const next = list.map((u) => (u.email === key ? { ...u, password } : u));
    localStorage.setItem("hope_users", JSON.stringify(next));
  } catch {
    /* ignore */
  }
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

  // Step 2 / Step 3 (reset link opened -> new password -> done)
  const [stage, setStage] = useState("request"); // "request" | "reset" | "done"
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [signOutOthers, setSignOutOthers] = useState(true);
  const [resetTried, setResetTried] = useState(false);
  const [doneInfo, setDoneInfo] = useState(null); // { email, signedOut }

  const rules = {
    length: pw.length >= 8,
    mix: /[A-Za-z]/.test(pw) && /\d/.test(pw),
    match: pw.length > 0 && pw === pw2,
  };

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

  function openResetLink() {
    setPw("");
    setPw2("");
    setShowPw(false);
    setShowPw2(false);
    setSignOutOthers(true);
    setResetTried(false);
    setError(null);
    setStage("reset");
  }

  function saveNewPassword(e) {
    e.preventDefault();
    setResetTried(true);
    setError(null);

    if (!pw || !pw2) {
      setError({ title: "Empty Field", message: "Please fill out the forms." });
      return;
    }
    if (!rules.length) {
      setError({ title: "Password too short", message: "Use at least 8 characters." });
      return;
    }
    if (!rules.mix) {
      setError({ title: "Weak password", message: "Include both letters and numbers." });
      return;
    }
    if (!rules.match) {
      setError({ title: "Passwords don't match", message: "Re-type the same password in both fields." });
      return;
    }

    savePassword(sent.email, pw);
    setDoneInfo({ email: sent.email, signedOut: signOutOthers });
    setPw("");
    setPw2("");
    setStage("done");
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

  /* ---------- Step 3: password updated ---------- */
  if (stage === "done" && doneInfo) {
    return (
      <main className={wrapClass}>
        {toast}

        <section className={`${styles.card} ${styles.center}`}>
          {closeButton}

          <span className={`${styles.mailIcon} ${styles.successIcon}`} aria-hidden="true">
            <CheckIcon />
          </span>

          <span className={styles.pill}>Step 3 · Return to Sign in</span>

          <h1 className={styles.sentTitle}>Password updated</h1>

          <p className={styles.sentText}>
            Your new password has been saved. You can now return to sign in
            securely.
          </p>

          <div className={styles.details}>
            <div className={styles.detailRow}>
              <span>Account</span>
              <strong>{doneInfo.email}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>Other devices</span>
              <strong>{doneInfo.signedOut ? "Signed out" : "Still signed in"}</strong>
            </div>
          </div>

          {modal ? (
            <button type="button" className={styles.submit} onClick={onSwitchToLogin}>
              Return to sign in
            </button>
          ) : (
            <Link href="/login" className={`${styles.submit} ${styles.submitLink}`}>
              Return to sign in
            </Link>
          )}
        </section>
      </main>
    );
  }

  /* ---------- Step 2: set a new password ---------- */
  if (stage === "reset" && sent) {
    const Rule = ({ ok, children }) => (
      <li className={ok ? styles.ruleOk : ""}>
        <span className={styles.ruleDot} aria-hidden="true">
          {ok ? <CheckIcon /> : null}
        </span>
        {children}
      </li>
    );

    return (
      <main className={wrapClass}>
        {toast}

        <form className={styles.card} onSubmit={saveNewPassword} noValidate>
          {closeButton}

          <header className={styles.header}>
            <h1>Set a new password</h1>
          </header>

          <span className={`${styles.pill} ${styles.pillLeft}`}>Step 2 · Reset password</span>

          <p className={styles.stepText}>
            Identity verified. Choose a password you haven&apos;t used before.
          </p>

          <label className={styles.label} htmlFor="newPassword">
            New password
          </label>
          <div className={styles.pwField}>
            <input
              id="newPassword"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              autoFocus
              className={`${styles.input} ${resetTried && !pw ? styles.bad : ""}`}
              value={pw}
              onChange={(e) => {
                setPw(e.target.value);
                setError(null);
              }}
            />
            <button
              type="button"
              className={styles.eye}
              onClick={() => setShowPw(!showPw)}
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              <EyeIcon off={showPw} />
            </button>
          </div>

          <label className={styles.label} htmlFor="confirmPassword">
            Confirm new password
          </label>
          <div className={styles.pwField}>
            <input
              id="confirmPassword"
              type={showPw2 ? "text" : "password"}
              autoComplete="new-password"
              className={`${styles.input} ${resetTried && !pw2 ? styles.bad : ""}`}
              value={pw2}
              onChange={(e) => {
                setPw2(e.target.value);
                setError(null);
              }}
            />
            <button
              type="button"
              className={styles.eye}
              onClick={() => setShowPw2(!showPw2)}
              aria-label={showPw2 ? "Hide password" : "Show password"}
            >
              <EyeIcon off={showPw2} />
            </button>
          </div>

          <ul className={styles.rules}>
            <Rule ok={rules.length}>At least 8 characters</Rule>
            <Rule ok={rules.mix}>Includes letters and numbers</Rule>
            <Rule ok={rules.match}>Passwords match</Rule>
          </ul>

          <label className={styles.check}>
            <input
              type="checkbox"
              checked={signOutOthers}
              onChange={(e) => setSignOutOthers(e.target.checked)}
            />
            Sign out of all other devices
          </label>

          <button type="submit" className={styles.submit}>
            Save new password
          </button>

          <p className={styles.foot}>{signInLink}</p>
        </form>
      </main>
    );
  }

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
            <span className={styles.dot} aria-hidden="true">·</span>
            {sent.link ? (
              <a href={sent.link} className={styles.linkButton}>
                Open reset link (demo)
              </a>
            ) : (
              <button type="button" className={styles.linkButton} onClick={openResetLink}>
                Open reset link (demo)
              </button>
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

        <div className={styles.demoNotice}>
          <p>Demo accounts:</p>
          <p>superadmin@hope.com · admin@hope.com · user@hope.com</p>
        </div>

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