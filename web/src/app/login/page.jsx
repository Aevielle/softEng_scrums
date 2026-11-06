"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import styles from "./login.module.css";
import { loginLocal } from "../lib/localAuth";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

const CODE_LENGTH = 6;
const CODE_SECONDS = 180; // 03:00

// Demo only: a real app would generate + send this from the server.
function makeCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function formatTime(total) {
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

const TITLES = {
  EMPTY: "Empty Field",
  WRONG_EMAIL: "Wrong Email",
  NOT_FOUND: "Account not Found",
  INVALID: "Sign in failed",
  BLOCKED: "Account Blocked",
  PENDING: "Account Pending",
};

function toastTitle(error) {
  if (error.title) return error.title;
  if (TITLES[error.code]) return TITLES[error.code];
  if (/not found/i.test(error.message || "")) return TITLES.NOT_FOUND;
  return "Login Error";
}

function titleCase(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Name / role shown in the "Welcome back" popup.
// Uses whatever the API returns and falls back to the email for the demo accounts.
function describeUser(data, email) {
  const person = data?.user || data || {};
  const local = email.split("@")[0] || "";

  const name =
    person.firstName ||
    (person.name ? String(person.name).split(" ")[0] : "") ||
    titleCase(local.split(/[._-]/)[0]);

  const rawRole = String(person.role || "").toLowerCase().replace(/[\s_-]+/g, "");
  const role = rawRole === "superadmin"
    ? "Superadmin"
    : person.role
    ? titleCase(String(person.role).replace(/[_-]+/g, " "))
    : local.startsWith("superadmin")
      ? "Superadmin"
      : local.startsWith("admin")
        ? "Admin"
        : "User";

  return { name: name || "there", email: person.email || email, role };
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

export default function LoginPage({
  modal = false,
  onClose,
  onSwitchToRegister,
  onSwitchToForgot,
}) {
  const [form, setForm] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const [error, setError] = useState(null);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [welcome, setWelcome] = useState(null); // { name, email, role }

  // Verification step for admin / superadmin accounts
  const [pending, setPending] = useState(null); // { info, code }
  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(""));
  const [seconds, setSeconds] = useState(CODE_SECONDS);
  const [codeTried, setCodeTried] = useState(false);
  const boxRefs = useRef([]);

  const emptyEmail = submitted && !form.email.trim();
  const badEmail = submitted && !EMAIL_RE.test(form.email.trim());
  const emptyPass = submitted && !form.password;

  // Toast closes itself after a few seconds.
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(timer);
  }, [error]);

  // Countdown for the verification code
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [pending]);

  // Focus the first code box when the verification step opens
  useEffect(() => {
    if (pending) {
      const t = setTimeout(() => boxRefs.current[0]?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [pending]);

  function startVerification(info) {
    setPending({ info, code: makeCode() });
    setDigits(Array(CODE_LENGTH).fill(""));
    setSeconds(CODE_SECONDS);
    setCodeTried(false);
  }

  function resendCode() {
    if (!pending) return;
    setPending({ ...pending, code: makeCode() });
    setDigits(Array(CODE_LENGTH).fill(""));
    setSeconds(CODE_SECONDS);
    setCodeTried(false);
    setError(null);
    boxRefs.current[0]?.focus();
  }

  function onDigitChange(index, value) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => prev.map((d, i) => (i === index ? digit : d)));
    setError(null);
    if (digit && index < CODE_LENGTH - 1) boxRefs.current[index + 1]?.focus();
  }

  function onDigitKeyDown(index, e) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      boxRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      boxRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      boxRefs.current[index + 1]?.focus();
    }
  }

  function onDigitPaste(index, e) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    e.preventDefault();
    setDigits((prev) => {
      const next = [...prev];
      for (let i = 0; i < pasted.length && index + i < CODE_LENGTH; i++) {
        next[index + i] = pasted[i];
      }
      return next;
    });
    boxRefs.current[Math.min(index + pasted.length, CODE_LENGTH - 1)]?.focus();
  }

  function onVerify(e) {
    e.preventDefault();
    setCodeTried(true);

    const entered = digits.join("");

    if (entered.length < CODE_LENGTH) {
      setError({
        code: "EMPTY",
        title: "Enter the code",
        message: "Please enter the 6-digit verification code.",
      });
      return;
    }

    if (seconds <= 0) {
      setError({
        code: "INVALID",
        title: "Code Expired",
        message: "This code has expired. Press Resend to get a new one.",
      });
      return;
    }

    if (entered !== pending.code) {
      setError({
        code: "INVALID",
        title: "Wrong Code",
        message: "That code is incorrect. Please try again.",
      });
      setDigits(Array(CODE_LENGTH).fill(""));
      boxRefs.current[0]?.focus();
      return;
    }

    setWelcome(pending.info);
    setPending(null);
  }

  async function onSubmit(e) {
    e.preventDefault();

    setSubmitted(true);
    setError(null);

    // Required fields
    if (!form.email.trim() || !form.password) {
      setError({
        code: "EMPTY",
        message: "Please fill out the forms.",
      });
      return;
    }

    // Email format
    if (!EMAIL_RE.test(form.email.trim())) {
      setError({
        code: "WRONG_EMAIL",
        message: "Enter valid email address.",
      });
      return;
    }

    setLoading(true);

    try {
      const result = loginLocal(form.email.trim(), form.password);

      if (!result.ok) {
        setError(result);
        return;
      }

      const info = describeUser(result, form.email.trim());
      setForm((previous) => ({ ...previous, password: "" }));

      // Admin / Superadmin accounts must pass the verification code step.
      if (/admin/i.test(info.role)) {
        startVerification(info);
      } else {
        // No dashboard yet: confirm the sign in in the popup.
        setWelcome(info);
      }
    } catch {
      setError({
        code: "INVALID",
        message:
          "Unable to connect. Please check your internet connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleEmailChange(e) {
    setForm((previous) => ({
      ...previous,
      email: e.target.value,
    }));
    setError(null);
  }

  function handlePasswordChange(e) {
    setForm((previous) => ({
      ...previous,
      password: e.target.value,
    }));
    setError(null);
  }

  const wrapClass = `${styles.wrap} ${modal ? styles.modalWrap : ""}`;

  /* ---------- Sign in confirmed ---------- */
  if (welcome) {
    return (
      <main className={wrapClass}>
        <section className={`${styles.card} ${styles.welcome}`}>
          {modal ? (
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
          )}

          <span className={styles.avatar} aria-hidden="true">
            {welcome.name.charAt(0).toUpperCase()}
          </span>

          <span className={styles.welcomePill}>Sign in successful</span>

          <h1 className={styles.welcomeTitle}>Welcome back, {welcome.name}!</h1>
          <p className={styles.welcomeSub}>Your Sign in is confirmed.</p>

          <div className={styles.details}>
            <div className={styles.detailRow}>
              <span>Email</span>
              <strong>{welcome.email}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>Role</span>
              <strong>{welcome.role}</strong>
            </div>
          </div>

          <button type="button" className={styles.comingSoon} disabled>
            Dashboard coming soon
          </button>

          {modal ? (
            <button
              type="button"
              className={styles.backLink}
              onClick={onClose}
            >
              Back to home
            </button>
          ) : (
            <Link href="/" className={styles.backLink}>
              Back to home
            </Link>
          )}
        </section>
      </main>
    );
  }

  /* ---------- Verification code (admin accounts) ---------- */
  if (pending) {
    const expired = seconds <= 0;

    return (
      <main className={wrapClass}>
        {error && (
          <div className={styles.toast} role="alert">
            <span className={styles.toastIcon} aria-hidden="true">!</span>

            <div>
              <strong>{toastTitle(error)}</strong>
              <p>{error.message || "Something went wrong. Please try again."}</p>
            </div>

            <button
              type="button"
              onClick={() => setError(null)}
              aria-label="Close error"
            >
              ×
            </button>
          </div>
        )}

        <form className={styles.card} onSubmit={onVerify} noValidate>
          <header className={styles.header}>
            <div>
              <h1>Verify your identity</h1>
              <p>Enter the 6-digit code sent to {pending.info.email}</p>
            </div>

            {modal ? (
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
            )}
          </header>

          <span className={styles.channel}>
            <span className={styles.channelDot} aria-hidden="true" />
            Email
          </span>

          <div className={styles.otp} role="group" aria-label="6-digit verification code">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (boxRefs.current[i] = el)}
                className={`${styles.otpBox} ${codeTried && !d ? styles.bad : ""}`}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={1}
                value={d}
                aria-label={`Digit ${i + 1}`}
                onChange={(e) => onDigitChange(i, e.target.value)}
                onKeyDown={(e) => onDigitKeyDown(i, e)}
                onPaste={(e) => onDigitPaste(i, e)}
                onFocus={(e) => e.target.select()}
              />
            ))}
          </div>

          <p className={styles.codeMeta}>
            {expired ? (
              <span className={styles.expired}>Code expired</span>
            ) : (
              <>
                Code expires in <strong>{formatTime(seconds)}</strong>
              </>
            )}
            {" · "}
            <button type="button" className={styles.linkButton} onClick={resendCode}>
              Resend
            </button>
          </p>

          <button type="submit" className={styles.submit}>
            Verify code
          </button>

          <p className={styles.safety}>
            This verification step is used for your account&apos;s safety.
          </p>
          <p className={styles.safety}>
            Demo code: <strong>{pending.code}</strong>
          </p>
        </form>
      </main>
    );
  }

  return (
    <main className={wrapClass}>

      {/* Server / login error notification */}
      {error && (
        <div className={styles.toast} role="alert">
          <span className={styles.toastIcon} aria-hidden="true">!</span>

          <div>
            <strong>{toastTitle(error)}</strong>
            <p>{error.message || "Something went wrong. Please try again."}</p>
          </div>

          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Close error"
          >
            ×
          </button>
        </div>
      )}

      <form className={styles.card} onSubmit={onSubmit} noValidate>

        {/* Header */}
        <header className={styles.header}>
          <div>
            <h1>Sign in Here</h1>
            <p>Sign in to Hope, Inc. ERP</p>
          </div>

          {modal ? (
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close login"
            >
              ×
            </button>
          ) : (
            <Link
              href="/"
              className={styles.closeButton}
              aria-label="Close login"
            >
              ×
            </Link>
          )}
        </header>

        {/* Demo Account Notice */}
        <div className={styles.demoNotice}>
          <p>Demo accounts, any password works:</p>
          <p>
            superadmin@hope.com · admin@hope.com · user@hope.com
          </p>
          <p>Admin accounts get a verification code step.</p>
        </div>

        {/* Email */}
        <label htmlFor="loginEmail">Email</label>

        <input
          id="loginEmail"
          type="email"
          autoComplete="email"
          value={form.email}
          className={badEmail ? styles.bad : ""}
          placeholder={
            emptyEmail ? "Please fill out this form" : "Enter your email"
          }
          aria-invalid={badEmail}
          onChange={handleEmailChange}
        />

        {/* Password */}
        <label htmlFor="loginPassword">Password</label>

        <div className={styles.pw}>
          <input
            id="loginPassword"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            value={form.password}
            className={emptyPass ? styles.bad : ""}
            placeholder={
              emptyPass
                ? "Please fill out this form"
                : "Enter your password"
            }
            aria-invalid={emptyPass}
            onChange={handlePasswordChange}
          />

          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? "Hide password" : "Show password"}
          >
            <EyeIcon off={show} />
          </button>
        </div>

        {/* Remember Me / Forgot Password */}
        <div className={styles.row}>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={form.remember}
              onChange={(e) =>
                setForm((previous) => ({
                  ...previous,
                  remember: e.target.checked,
                }))
              }
            />
            Remember me
          </label>

          {modal ? (
            <button
              type="button"
              className={styles.linkButton}
              onClick={onSwitchToForgot}
            >
              Forgot Password?
            </button>
          ) : (
            <Link href="/forgot-password">
              Forgot Password?
            </Link>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          className={styles.submit}
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        {/* Register Link */}
        <p className={styles.signUpText}>
          No account?{" "}

          {modal ? (
            <button
              type="button"
              className={styles.modalLink}
              onClick={onSwitchToRegister}
            >
              Register
            </button>
          ) : (
            <Link href="/register">Register</Link>
          )}
        </p>

      </form>
    </main>
  );
}