"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./login.module.css";

const TITLES = {
  EMPTY: "Empty Field",
  INVALID: "Sign in failed",
  BLOCKED: "Account Blocked",
  PENDING: "Account Pending",
};

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

  const emptyEmail = submitted && !form.email.trim();
  const emptyPass = submitted && !form.password;

  // Toast closes itself after a few seconds.
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(timer);
  }, [error]);

  async function onSubmit(e) {
    e.preventDefault();

    setSubmitted(true);
    setError(null);

    // Validate each field separately.
    if (!form.email.trim() || !form.password) {
      setError({
        code: "EMPTY",
        message: "Please fill out the forms.",
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data);
        return;
      }

      window.location.href = data.redirect;
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

  return (
    <main className={`${styles.wrap} ${modal ? styles.modalWrap : ""}`}>

      {/* Server / login error notification */}
      {error && (
        <div className={styles.toast} role="alert">
          <span className={styles.toastIcon} aria-hidden="true">!</span>

          <div>
            <strong>{TITLES[error.code] || "Login Error"}</strong>
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
          className={emptyEmail ? styles.bad : ""}
          placeholder={
            emptyEmail ? "Please fill out this form" : "Enter your email"
          }
          aria-invalid={emptyEmail}
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

          <Link href="/forgot-password">
            Forgot Password?
          </Link>
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