'use client';

import { useEffect, useState } from 'react';
import { assignableRoles, canManage, ROLE_LABEL, sortUsers } from '@/lib/users/rules';
import { validateUserInput } from '@/lib/users/validation';
import styles from './users.module.css';
import RightsDialog from './RightsDialog';
import { requestDetails, requestTitle } from '@/lib/requests/rules';

const when = (iso) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('sv-SE')} ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
};

const fullName = (u) => `${u.firstName} ${u.lastName}`.trim();

export default function UsersClient({ initial, requests = [], actor, intro }) {
  const [rows, setRows] = useState(initial);
  const [reqs, setReqs] = useState(requests); // role / access / profile requests waiting for a Superadmin
  const [reqBusy, setReqBusy] = useState(null);
  const [declineReq, setDeclineReq] = useState(null); // the request waiting for "Decline this request?" confirmation
  const [form, setForm] = useState(null); // { mode: 'add' } | { mode: 'edit', row }
  const [toast, setToast] = useState(null); // { title, message, err }
  const [busyId, setBusyId] = useState(null);
  const [rightsFor, setRightsFor] = useState(null); // the User row whose Rights dialog is open
  const [declineFor, setDeclineFor] = useState(null); // the pending row waiting for "Decline this request?" confirmation

  useEffect(() => {
    if (!declineFor) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && busyId !== declineFor.id) setDeclineFor(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [declineFor, busyId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const notify = (title, message, err = false) => setToast({ title, message, err });
  const upsert = (row) => setRows((l) => sortUsers([...l.filter((x) => x.id !== row.id), row]));

  const isSuper = actor.role === 'superadmin';
  const pending = rows.filter((u) => u.status === 'Pending');

  // One helper for every one-click action. `title` builds the success toast from the updated row.
  async function act(row, body, title) {
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/users/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      // The "last Superadmin" explanation arrives here as data.title / data.message
      if (!res.ok) return notify(data.title || 'Not allowed', data.message || 'Could not save the change.', true);
      upsert(data.user);
      notify(title(data.user), data.user.email);
    } catch {
      notify('No connection', 'Check your network and try again.', true);
    } finally {
      setBusyId(null);
    }
  }

  const toggleBlock = (row) => act(row, { blocked: !row.blocked }, (u) => (u.blocked ? 'User blocked' : 'User unblocked'));
  const approve = (row) => act(row, { approve: true }, () => 'User approved');
  const makeAdmin = (row) => act(row, { setRole: 'admin' }, () => 'Now an Admin');

  // Decline a pending request: the account is marked Declined and can never sign in.
  async function decline(row) {
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/users/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decline: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return notify(data.title || 'Could not decline', data.message || 'Please try again.', true);
      setRows((l) => l.map((x) => (x.id === row.id ? { ...x, status: 'Declined' } : x)));
      setDeclineFor(null);
      notify('Request declined', row.email);
    } catch {
      notify('No connection', 'Check your network and try again.', true);
    } finally {
      setBusyId(null);
    }
  }

  // Approve or decline a change request from the Profile module. Approving applies it (role, rights or name/email).
  async function answer(req, decision) {
    setReqBusy(req.id);
    try {
      const res = await fetch(`/api/requests/${req.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return notify(data.title || 'Could not save', data.message || 'Please try again.', true);
      setReqs((l) => l.filter((x) => x.id !== req.id));
      if (data.user) upsert(data.user); // new role, name or email shows in the table right away
      setDeclineReq(null);
      notify(decision === 'approve' ? 'Request approved' : 'Request declined', `${req.userName}: ${requestTitle(req)}`);
    } catch {
      notify('No connection', 'Check your network and try again.', true);
    } finally {
      setReqBusy(null);
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

      {isSuper && (
        <div className={styles.tw}>
          <h3>Pending requests ({pending.length})</h3>
          {pending.length === 0 ? (
            <p className={styles.empty}>No pending requests.</p>
          ) : (
            <table>
              <thead>
                <tr><th>First name</th><th>Last name</th><th>Email</th><th>Role</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {pending.map((u) => (
                  <tr key={u.id}>
                    <td><b>{u.firstName || '—'}</b></td>
                    <td><b>{u.lastName || '—'}</b></td>
                    <td>{u.email}</td>
                    <td><span className={`${styles.rb} ${styles[u.role]}`}>{ROLE_LABEL[u.role].toUpperCase()}</span></td>
                    <td className={styles.ac}>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.sm} ${styles.pri}`}
                        disabled={busyId === u.id}
                        onClick={() => approve(u)}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.sm} ${styles.danger}`}
                        disabled={busyId === u.id}
                        onClick={() => setDeclineFor(u)}
                      >
                        Decline
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {isSuper && (
        <div className={styles.tw}>
          <h3>Change requests ({reqs.length})</h3>
          {reqs.length === 0 ? (
            <p className={styles.empty}>No change requests.</p>
          ) : (
            <table>
              <thead>
                <tr><th>From</th><th>Request</th><th>Reason</th><th>Sent</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {reqs.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <b>{r.userName}</b>{' '}
                      <span className={`${styles.rb} ${styles[r.userRole]}`}>{ROLE_LABEL[r.userRole].toUpperCase()}</span>
                      <div className={styles.sub}>{r.userEmail}</div>
                    </td>
                    <td>
                      <b>{requestTitle(r)}</b>
                      {requestDetails(r).map((d) => (
                        <div key={d} className={styles.sub}>{d}</div>
                      ))}
                    </td>
                    <td>{r.reason}</td>
                    <td suppressHydrationWarning>{when(r.createdAt)}</td>
                    <td className={styles.ac}>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.sm} ${styles.pri}`}
                        disabled={reqBusy === r.id}
                        onClick={() => answer(r, 'approve')}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.sm} ${styles.danger}`}
                        disabled={reqBusy === r.id}
                        onClick={() => setDeclineReq(r)}
                      >
                        Decline
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

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
                  <td><span className={`${styles.pill} ${u.blocked || u.status === 'Declined' ? styles.x : ''}`}>{u.status}</span></td>
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
                        {isSuper && u.role === 'user' && u.status === 'Active' && (
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.sm}`}
                            disabled={busyId === u.id}
                            onClick={() => makeAdmin(u)}
                          >
                            Make Admin
                          </button>
                        )}
                        {u.role === 'user' && (
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.sm}`}
                            onClick={() => setRightsFor(u)}
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

      {rightsFor && (
        <RightsDialog
          key={rightsFor.id}
          userId={rightsFor.id}
          onClose={() => setRightsFor(null)}
          onSaved={(m) => {
            setRightsFor(null);
            notify(m.title, m.detail); // "Rights saved" / "<name> will see the change on next sign-in."
          }}
        />
      )}

      {declineReq && (
        <div className={styles.overlay} onClick={() => reqBusy !== declineReq.id && setDeclineReq(null)}>
          <div className={styles.md} role="alertdialog" aria-modal="true" aria-labelledby="dr-title" onClick={(e) => e.stopPropagation()}>
            <h3 id="dr-title">Decline this request?</h3>
            <p className={styles.sub}>
              <b>{declineReq.userName}</b> asked for <b>{requestTitle(declineReq)}</b>. Nothing will change on their account.
            </p>
            <div className={styles.row}>
              <button type="button" className={styles.btn} onClick={() => setDeclineReq(null)} disabled={reqBusy === declineReq.id}>
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.dangerSolid}`}
                onClick={() => answer(declineReq, 'decline')}
                disabled={reqBusy === declineReq.id}
              >
                {reqBusy === declineReq.id ? 'Declining...' : 'Decline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {declineFor && (
        <div className={styles.overlay} onClick={() => busyId !== declineFor.id && setDeclineFor(null)}>
          <div className={styles.md} role="alertdialog" aria-modal="true" aria-labelledby="dc-title" onClick={(e) => e.stopPropagation()}>
            <h3 id="dc-title">Decline this request?</h3>
            <p className={styles.sub}>
              <b>{fullName(declineFor)}</b> ({declineFor.email}) will not be able to sign in, and the request will leave Pending requests.
            </p>
            <div className={styles.row}>
              <button type="button" className={styles.btn} onClick={() => setDeclineFor(null)} disabled={busyId === declineFor.id}>
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.dangerSolid}`}
                onClick={() => decline(declineFor)}
                disabled={busyId === declineFor.id}
              >
                {busyId === declineFor.id ? 'Declining...' : 'Decline'}
              </button>
            </div>
          </div>
        </div>
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