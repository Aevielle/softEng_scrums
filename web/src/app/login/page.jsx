'use client';
import { useState } from 'react';
import Link from 'next/link';
import styles from './login.module.css';

const TITLES = { EMPTY: 'Empty Field', INVALID: 'Sign in failed', BLOCKED: 'Account Blocked', PENDING: 'Account Pending' };

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [error, setError] = useState(null);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data); setLoading(false); return; }
    window.location.href = data.redirect;
  }

  const emptyEmail = error?.code === 'EMPTY' && !form.email.trim();
  const emptyPass = error?.code === 'EMPTY' && !form.password;

  return (
    <main className={styles.wrap}>
      {error && (
        <div className={styles.toast} role="alert">
          <div><strong>{TITLES[error.code]}</strong><p>{error.message}</p></div>
          <button onClick={() => setError(null)} aria-label="Close">×</button>
        </div>
      )}
      <form className={styles.card} onSubmit={onSubmit} noValidate>
        <h1>Sign in Here</h1>
        <p className={styles.sub}>Sign in to Hope, Inc. ERP</p>

        <label>Email</label>
        <input type="email" autoComplete="email" value={form.email}
          className={emptyEmail ? styles.bad : ''} placeholder="Enter your email"
          onChange={(e) => setForm({ ...form, email: e.target.value })} />

        <label>Password</label>
        <div className={styles.pw}>
          <input type={show ? 'text' : 'password'} autoComplete="current-password"
            value={form.password} className={emptyPass ? styles.bad : ''}
            placeholder="Enter your password"
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button type="button" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
        </div>

        <div className={styles.row}>
          <label className={styles.check}>
            <input type="checkbox" checked={form.remember}
              onChange={(e) => setForm({ ...form, remember: e.target.checked })} />
            Remember me
          </label>
          <Link href="/forgot-password">Forgot Password?</Link>
        </div>

        <button className={styles.submit} disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className={styles.foot}>No account? <Link href="/">Register</Link></p>
      </form>
    </main>
  );
}