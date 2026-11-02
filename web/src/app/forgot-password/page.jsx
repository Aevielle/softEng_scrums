'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../login/login.module.css';

const COOLDOWN_MS = 30_000;
const fmt = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(null); // { email, expiresAt, resendAt, again }
  const [now, setNow] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Tick once a second while the "sent" screen is showing
  useEffect(() => {
    if (!sent) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [sent]);

  async function send(e) {
    e?.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError({ title: 'Empty Field', message: 'Please fill out the forms.', empty: true });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError({ title: 'Invalid email', message: data.message });
        return;
      }
      const t = Date.now();
      setNow(t);
      setSent({
        email: email.trim(),
        expiresAt: t + data.expiresIn * 1000,
        resendAt: t + COOLDOWN_MS,
        again: !!sent,
      });
    } catch {
      setError({ title: 'Network error', message: 'Please check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  }

  const toast = error && (
    <div className={styles.toast} role="alert">
      <div><strong>{error.title}</strong><p>{error.message}</p></div>
      <button type="button" onClick={() => setError(null)} aria-label="Close">×</button>
    </div>
  );

  if (sent) {
    const cooldown = sent.resendAt - now;
    const expires = sent.expiresAt - now;
    return (
      <main className={styles.wrap}>
        {toast}
        <div className={`${styles.card} ${styles.center}`}>
          <div className={styles.icon}>✉</div>
          <span className={styles.pill}>Step 1 · Check your email</span>
          <h1>Reset link sent</h1>
          <p className={styles.sub}>
            We sent {sent.again ? 'another' : 'a'} secure reset password link to {sent.email}.
            {' '}{expires > 0 ? `Link expires in ${fmt(expires)}` : 'This link has expired. Please resend.'}
          </p>
          <button className={styles.submit} onClick={send} disabled={loading || cooldown > 0}>
            {cooldown > 0 ? `Resend in ${fmt(cooldown)}` : 'Resend Link'}
          </button>
          <p className={styles.foot}><Link href="/login">Return to sign in →</Link></p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.wrap}>
      {toast}
      <form className={styles.card} onSubmit={send} noValidate>
        <h1>Forgot password?</h1>
        <p className={styles.sub}>
          Enter the email linked to your account to receive a secure reset password link.
        </p>
        <label>Email</label>
        <input type="email" autoComplete="email" value={email}
          className={error?.empty ? styles.bad : ''}
          onChange={(e) => setEmail(e.target.value)} />
        <button className={styles.submit} disabled={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
        <p className={styles.foot}><Link href="/login">Return to sign in →</Link></p>
      </form>
    </main>
  );
}