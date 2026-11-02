'use client';
import { useState } from 'react';
import Link from 'next/link';
import styles from '../login/login.module.css';

export default function ResetForm({ token }) {
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState(null);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!form.password || !form.confirm) {
      setError({ title: 'Empty Field', message: 'Please fill out the forms.', both: true });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError({
          title: data.code === 'INVALID_LINK' ? 'Link not valid' : 'Could not reset password',
          message: data.message,
        });
        return;
      }
      setDone(true);
    } catch {
      setError({ title: 'Network error', message: 'Please check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <main className={styles.wrap}>
        <div className={`${styles.card} ${styles.center}`}>
          <h1>Password updated</h1>
          <p className={styles.sub}>You can now sign in with your new password.</p>
          <Link href="/login" className={styles.submit}
            style={{ textDecoration: 'none' }}>Go to Sign in</Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.wrap}>
      {error && (
        <div className={styles.toast} role="alert">
          <div><strong>{error.title}</strong><p>{error.message}</p></div>
          <button type="button" onClick={() => setError(null)} aria-label="Close">×</button>
        </div>
      )}
      <form className={styles.card} onSubmit={onSubmit} noValidate>
        <h1>Set new password</h1>
        <p className={styles.sub}>Choose a new password for your Hope, Inc. ERP account.</p>

        <label>New password</label>
        <div className={styles.pw}>
          <input type={show ? 'text' : 'password'} autoComplete="new-password"
            value={form.password} className={error?.both ? styles.bad : ''}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button type="button" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
        </div>

        <label>Confirm new password</label>
        <input type={show ? 'text' : 'password'} autoComplete="new-password"
          value={form.confirm} className={error?.both ? styles.bad : ''}
          onChange={(e) => setForm({ ...form, confirm: e.target.value })} />

        <button className={styles.submit} disabled={loading}>
          {loading ? 'Saving…' : 'Reset password'}
        </button>
        <p className={styles.foot}><Link href="/login">Return to sign in →</Link></p>
      </form>
    </main>
  );
}