'use client';

import { useEffect, useState } from 'react';
import { assignableRoles, canManage, ROLE_LABEL, sortUsers } from '@/lib/users/rules';
import { validateUserInput } from '@/lib/users/validation';
import styles from './users.module.css';

const fullName = (u) => `${u.firstName} ${u.lastName}`.trim();

export default function UsersClient({ initial, actor, intro }) {
  const [rows, setRows] = useState(initial);
  const [form, setForm] = useState(null); // { mode: 'add' } | { mode: 'edit', row }
  const [toast, setToast] = useState(null); // { title, message, err }
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const notify = (title, message, err = false) => setToast({ title, message, err });
  const upsert = (row) => setRows((l) => sortUsers([...l.filter((x) => x.id !== row.id), row]));

  async function toggleBlock(row) {
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/users/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked: !row.blocked }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return notify(data.title || 'Not allowed', data.message || 'Could not change the status.', true);
      upsert(data.user);
      notify(data.user.blocked ? 'User blocked' : 'User unblocked', data.user.email);
    } catch {
      notify('No connection', 'Check your network and try again.', true);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className={styles.bar}>
        <p>{intro}</p>
        <button type="button" className={`${styles.btn} ${styles.pri}`} onClick={() => setForm({ mode: 'add' })}>
          + Add User
        </button>
      </div>

      <div className={styles.tw}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const mine = canManage(actor, u);
              return (
                <tr key={u.id}>
                  <td><b>{fullName(u)}</b></td>
                  <td>{u.email}</td>
                  <td><span className={`${styles.rb} ${styles[u.role]}`}>{ROLE_LABEL[u.role].toUpperCase()}</span></td>
                  <td><span className={`${styles.pill} ${u.blocked ? styles.x : ''}`}>{u.status}</span></td>
                  <td className={styles.ac}>
                    {mine ? (
                      <>
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.sm}`}
                          disabled={busyId === u.id}
                          onClick={() => toggleBlock(u)}
                        >
                          {u.blocked ? 'Unblock' : 'Block'}
                        </button>
                        <button type="button" className={`${styles.btn} ${styles.sm}`} onClick={() => setForm({ mode: 'edit', row: u })}>
                          Edit
                        </button>
                        {u.role === 'user' && (
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.sm}`}
                            disabled
                            title="The Rights editor is a separate ticket"
                          >
                            Rights
                          </button>
                        )}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className={styles.empty}>No users yet.</p>}
      </div>

      {form && (
        <UserForm
          key={form.row?.id ?? 'new'}
          mode={form.mode}
          row={form.row}
          actor={actor}
          onClose={() => setForm(null)}
          onSaved={(row) => upsert(row)}
          notify={notify}
        />
      )}

      {toast && (
        <div className={`${styles.toast} ${toast.err ? styles.err : ''}`} role="status">
          <b>{toast.title}</b>
          <span>{toast.message}</span>
        </div>
      )}
    </>
  );
}

function UserForm({ mode, row, actor, onClose, onSaved, notify }) {
  const editing = mode === 'edit';
  const roles = assignableRoles(actor);
  const [f, setF] = useState({
    firstName: row?.firstName ?? '',
    lastName: row?.lastName ?? '',
    email: row?.email ?? '',
    role: row?.role ?? 'user',
  });
  const [bad, setBad] = useState([]);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null); // { email, tempPassword } after Add User

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const set = (k) => (e) => {
    setF((s) => ({ ...s, [k]: e.target.value }));
    setBad((b) => b.filter((x) => x !== k));
  };

  async function save() {
    // Same checks as Register, before we even call the server
    const v = validateUserInput(f);
    if (!v.ok) {
      setBad(v.error.fields);
      return notify(v.error.title, v.error.message, true);
    }

    setBusy(true);
    try {
      const res = await fetch(editing ? `/api/users/${row.id}` : '/api/users', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...v.value, role: f.role }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.fields) setBad(data.fields);
        notify(data.title || 'Could not save', data.message || 'Please try again.', true);
        return;
      }

      onSaved(data.user);
      if (editing) {
        notify('Saved', 'User updated.');
        onClose();
      } else {
        notify('Saved', 'User added.');
        setCreated({ email: data.user.email, tempPassword: data.tempPassword });
      }
    } catch {
      notify('No connection', 'Check your network and try again.', true);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(created.tempPassword);
      notify('Copied', 'Temporary password copied.');
    } catch {
      notify('Could not copy', 'Select the password and copy it by hand.', true);
    }
  }

  return (
    <div className={styles.overlay} onClick={() => !busy && onClose()}>
      <div className={styles.md} role="dialog" aria-modal="true" aria-labelledby="uf-title" onClick={(e) => e.stopPropagation()}>
        {created ? (
          <>
            <h3 id="uf-title">User added</h3>
            <p className={styles.sub}>
              Give {created.email} this temporary password. They must set their own at first sign-in. It is shown only once.
            </p>
            <code className={styles.temp}>{created.tempPassword}</code>
            <div className={styles.row}>
              <button type="button" className={styles.btn} onClick={copy}>Copy</button>
              <button type="button" className={`${styles.btn} ${styles.pri}`} onClick={onClose}>Done</button>
            </div>
          </>
        ) : (
          <>
            <h3 id="uf-title">{editing ? 'Edit' : 'Add'} user</h3>

            <label htmlFor="uf-first">First name</label>
            <input id="uf-first" className={bad.includes('firstName') ? styles.bad : ''} value={f.firstName} onChange={set('firstName')} autoFocus />

            <label htmlFor="uf-last">Last name</label>
            <input id="uf-last" className={bad.includes('lastName') ? styles.bad : ''} value={f.lastName} onChange={set('lastName')} />

            <label htmlFor="uf-email">Email</label>
            <input id="uf-email" type="email" className={bad.includes('email') ? styles.bad : ''} value={f.email} onChange={set('email')} />

            <label htmlFor="uf-role">Role</label>
            <select id="uf-role" value={f.role} onChange={set('role')} disabled={roles.length < 2}>
              {(roles.includes(f.role) ? roles : [f.role, ...roles]).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            {!editing && (
              <p className={styles.sub}>A temporary password is generated for the new user and shown once after saving.</p>
            )}

            <div className={styles.row}>
              <button type="button" className={styles.btn} onClick={onClose} disabled={busy}>Cancel</button>
              <button type="button" className={`${styles.btn} ${styles.pri}`} onClick={save} disabled={busy}>
                {busy ? 'Saving...' : 'Save user'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}