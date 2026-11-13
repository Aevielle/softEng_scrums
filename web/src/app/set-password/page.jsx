'use client';

import { useEffect, useState } from 'react';
import styles from '../forgot-password/forgot-password.module.css';
import shell from './set-password.module.css';

// uppercase + lowercase + number + special character (same rule as the server)
const strongMix = (pw) =>
  /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw) && /[^A-Za-z0-9\s]/.test(pw);

const TITLES = {
  WEAK: 'Weak password',
  MISMATCH: "Passwords don't match",
  SERVER: 'Server Error',
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

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function Rule({ ok, children }) {
  return (
    <li className={ok ? styles.ruleOk : ''}>
      <span className={styles.ruleDot} aria-hidden="true">
        {ok ? <CheckIcon /> : null}
      </span>
      {children}
    </li>
  );
}

export default function SetPasswordPage() {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [tried, setTried] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // { title, message }

  const rules = {
    length: pw.length >= 8,
    mix: strongMix(pw),
    match: pw.length > 0 && pw === pw2,
  };

  // Toast closes itself after a few seconds
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(t);
  }, [error]);

  async function onSubmit(e) {
    e.preventDefault();
    setTried(true);
    setError(null);

    // Client-side checks (the API repeats them, never trust the browser alone)
    if (!pw || !pw2) {
      return setError({ title: 'Empty Field', message: 'Please fill out the forms.' });
    }
    if (!rules.length) {
      return setError({ title: 'Password too short', message: 'Use at least 8 characters.' });
    }
    if (!rules.mix) {
      return setError({
        title: 'Weak password',
        message: 'Use uppercase, lowercase, a number, and a special character.',
      });
    }
    if (!rules.match) {
      return setError({
        title: "Passwords don't match",
        message: 'Re-type the same password in both fields.',
      });
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw, confirm: pw2 }),
      });
      const data = await res.json().catch(() => ({}));

      // Session expired or missing
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }

      if (!res.ok) {
        setError({
          title: TITLES[data.code] || 'Could not set password',
          message: data.message || 'Could not update password. Please try again.',
        });
        setLoading(false);
        return;
      }

      // The route renewed the session, so go straight to the dashboard
      window.location.href = data.redirect || '/dashboard';
    } catch {
      setError({ title: 'Network error', message: 'Please check your connection and try again.' });
      setLoading(false);
    }
  }

  async function logout() {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      window.location.href = data.redirect || '/';
    } catch {
      window.location.href = '/';
    }
  }

  return (
    <div className={shell.backdrop}>
      {error && (
        <div className={styles.toast} role="alert">
          <span className={styles.toastIcon} aria-hidden="true">!</span>
          <div>
            <strong>{error.title}</strong>
            <p>{error.message}</p>
          </div>
          <button type="button" className={styles.toastClose} onClick={() => setError(null)} aria-label="Close">
            ×
          </button>
        </div>
      )}

      <div className={shell.dialog}>
        <main className={`${styles.wrap} ${styles.modalWrap}`}>
          <form className={styles.card} onSubmit={onSubmit} noValidate>
            <header className={styles.header}>
              <h1>Set a new password</h1>
            </header>

            <span className={`${styles.pill} ${styles.pillLeft}`}>Set password</span>

            <p className={styles.stepText}>
              Choose a new password to continue. You&apos;ll go to your dashboard once it&apos;s saved.
            </p>

            <label className={styles.label} htmlFor="newPassword">
              New password
            </label>
            <div className={styles.pwField}>
              <input
                id="newPassword"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                autoFocus
                className={`${styles.input} ${tried && !pw ? styles.bad : ''}`}
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
                aria-label={showPw ? 'Hide password' : 'Show password'}
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
                type={showPw2 ? 'text' : 'password'}
                autoComplete="new-password"
                className={`${styles.input} ${tried && !pw2 ? styles.bad : ''}`}
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
                aria-label={showPw2 ? 'Hide password' : 'Show password'}
              >
                <EyeIcon off={showPw2} />
              </button>
            </div>

            <ul className={styles.rules}>
              <Rule ok={rules.length}>At least 8 characters</Rule>
              <Rule ok={rules.mix}>Includes letters, numbers, and special characters</Rule>
              <Rule ok={rules.match}>Passwords match</Rule>
            </ul>

            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? 'Saving…' : 'Save new password'}
            </button>

            <p className={styles.foot}>
              Not you?{' '}
              <button type="button" className={styles.linkButton} onClick={logout}>
                Log out
              </button>
            </p>
          </form>
        </main>
      </div>
    </div>
  );
}