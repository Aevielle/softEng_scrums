'use client';
import { useState } from 'react';
import styles from '../login/login.module.css';

export default function SetPasswordPage() {
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState(null); // { title, message, field }
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);

    // Client-side checks (the API repeats them, never trust the browser alone)
    if (!form.password || !form.confirm) {
      setError({ title: 'Empty Field', message: 'Please fill out the forms.', field: 'both' });
      return;
    }
    if (form.password.length < 8) {
      setError({ title: 'Password too short', message: 'Password must be at least 8 characters.', field: 'password' });
      return;
    }
    if (form.password !== form.confirm) {
      setError({ title: 'Passwords do not match', message: 'Please make sure both passwords are the same.', field: 'confirm' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (res.status === 401) {          // session expired
        window.location.href = '/login';
        return;
      }
      if (!res.ok) {
        setError({ title: 'Could not set password', message: data.message });
        setLoading(false);
        return;
      }
      window.location.href = data.redirect; // -> /dashboard
    } catch {
      setError({ title: 'Network error', message: 'Please check your connection and try again.' });
      setLoading(false);
    }
  }

  async function logout() {
    const r = await (await fetch('/api/auth/logout', { method: 'POST' })).json();
    window.location.href = r.redirect;
  }

  const badPass = error?.field === 'both' || error?.field === 'password';
  const badConfirm = error?.field === 'both' || error?.field === 'confirm';

  return (
    <main className={styles.wrap}>
      {error && (
        <div className={styles.toast} role="alert">
          <div>
            <strong>{error.title}</strong>
            <p>{error.message}</p>
          </div>
          <button type="button" onClick={() => setError(null)} aria-label="Close">×</button>
        </div>
      )}

      <form className={styles.card} onSubmit={onSubmit} noValidate>
        <h1>Set a New Password</h1>
        <p className={styles.sub}>
          This is your first login. Please create your own password to continue.
        </p>

        <label>New password</label>
        <div className={styles.pw}>
          <input
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.password}
            className={badPass ? styles.bad : ''}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button type="button" onClick={() => setShow(!show)}>
            {show ? 'Hide' : 'Show'}
          </button>
        </div>

        <label>Confirm new password</label>
        <input
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={form.confirm}
          className={badConfirm ? styles.bad : ''}
          onChange={(e) => setForm({ ...form, confirm: e.target.value })}
        />

        <button className={styles.submit} disabled={loading}>
          {loading ? 'Saving…' : 'Set password'}
        </button>

        <p className={styles.foot}>
          Not you?{' '}
          <button type="button" onClick={logout}
            style={{ background: 'none', border: 0, padding: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}>
            Log out
          </button>
        </p>
      </form>
    </main>
  );
}