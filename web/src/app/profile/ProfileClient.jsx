'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '../dashboard/Icon';
import { validateUserInput } from '@/lib/users/validation';
import {
  REASON_MAX,
  STATUS_LABEL,
  canRequestAccess,
  editsProfileDirectly,
  requestDetails,
  requestTitle,
  requestableRoles,
} from '@/lib/requests/rules';
import styles from './profile.module.css';

// Same look as the dashboard bell: "YYYY-MM-DD h:mm PM", in the viewer's own time zone.
const when = (iso) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('sv-SE')} ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
};

export default function ProfileClient({ me, role, roleLabel, initialRequests, accessOptions, demo }) {
  const router = useRouter();
  const [saved, setSaved] = useState(me); // what is stored now (changes after a Superadmin saves)
  const [requests, setRequests] = useState(initialRequests);
  const [toasts, setToasts] = useState([]);
  const nextToast = useRef(0);

  const direct = editsProfileDirectly(role);
  const roles = requestableRoles(role);
  const askAccess = canRequestAccess(role);
  const cards = (roles.length ? 1 : 0) + (askAccess ? 1 : 0);

  // Several toasts can stack (for example "Empty Field" while "Request sent" is still showing).
  function notify(title, message, err = false) {
    const id = ++nextToast.current;
    setToasts((l) => [...l, { id, title, message, err }]);
    setTimeout(() => setToasts((l) => l.filter((t) => t.id !== id)), 5000);
  }

  // One helper for every send: shows the server's own title/message when it refuses.
  async function call(url, method, body) {
    if (demo) {
      notify('Demo account', 'This account has no user record, so nothing can be saved here.', true);
      return null;
    }
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        notify(data.title || 'Not allowed', data.message || 'Please try again.', true);
        return { error: data };
      }
      return { data };
    } catch {
      notify('No connection', 'Check your network and try again.', true);
      return null;
    }
  }

  const sent = (request) => {
    setRequests((l) => [request, ...l]);
    notify('Request sent', 'A Superadmin will review it.');
  };

  return (
    <>
      <div className={styles.top}>
        <section className={`${styles.card} ${styles.id}`} aria-label="Account">
          <div className={styles.avatar}>
            <Icon name="user" size={46} />
            <button
              type="button"
              className={styles.cam}
              aria-label="Change photo"
              onClick={() => notify('Photo', 'Profile photos are not available yet.', true)}
            >
              <Icon name="camera" size={14} />
            </button>
          </div>
          <h2>{`${saved.firstName} ${saved.lastName}`.trim() || saved.email}</h2>
          <span className={`${styles.roleBadge} ${styles[role]}`}>{roleLabel}</span>
          <small>{saved.email}</small>
        </section>

        <EditProfile
          key={`${saved.firstName}|${saved.lastName}|${saved.email}`}
          saved={saved}
          direct={direct}
          demo={demo}
          notify={notify}
          call={call}
          onSaved={(p) => {
            setSaved(p);
            router.refresh(); // the top bar and sidebar show the new name
          }}
          onSent={sent}
        />
      </div>

      <div className={`${styles.bottom} ${styles[`c${cards + 1}`]}`}>
        {roles.length > 0 && <RoleRequest roles={roles} notify={notify} call={call} onSent={sent} />}
        {askAccess && <AccessRequest options={accessOptions} notify={notify} call={call} onSent={sent} />}

        <section className={`${styles.card} ${styles.list}`} aria-label="My requests">
          <h3>My requests</h3>
          {requests.length === 0 ? (
            <p className={styles.empty}>No requests yet.</p>
          ) : (
            <ul>
              {requests.map((r) => {
                const details = requestDetails(r);
                return (
                  <li key={r.id}>
                    <div>
                      <b>{requestTitle(r)}</b>
                      {details.map((d) => (
                        <small key={d}>{d}</small>
                      ))}
                      <small suppressHydrationWarning>on {when(r.createdAt)}</small>
                    </div>
                    <span className={`${styles.pill} ${styles[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className={styles.toasts} aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`${styles.toast} ${t.err ? styles.err : ''}`} role="status">
            {t.err && <i className={styles.tIcon}>!</i>}
            <div>
              <b>{t.title}</b>
              <span>{t.message}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function EditProfile({ saved, direct, demo, notify, call, onSaved, onSent }) {
  const [f, setF] = useState({ ...saved, reason: '' });
  const [bad, setBad] = useState([]);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => {
    setF((s) => ({ ...s, [k]: e.target.value }));
    setBad((b) => b.filter((x) => x !== k));
  };

  async function submit(e) {
    e.preventDefault();
    const v = validateUserInput(f);
    if (!v.ok) {
      setBad(v.error.fields);
      return notify(v.error.title, v.error.message, true);
    }
    if (!direct) {
      if (!f.reason.trim()) {
        setBad(['reason']);
        return notify('Empty Field', 'Please fill in the Reason.', true);
      }
      const same =
        v.value.firstName === saved.firstName && v.value.lastName === saved.lastName && v.value.email === saved.email.toLowerCase();
      if (same) return notify('Nothing to change', 'Change your name or email first.', true);
    }

    setBusy(true);
    const out = direct
      ? await call('/api/profile', 'PATCH', v.value)
      : await call('/api/requests', 'POST', { kind: 'profile', ...v.value, reason: f.reason });
    setBusy(false);
    if (!out) return;
    if (out.error) return setBad(out.error.fields || []);

    if (direct) {
      notify('Profile saved', 'Your name and email were updated.');
      onSaved(out.data.profile);
    } else {
      setF((s) => ({ ...s, reason: '' }));
      onSent(out.data.request);
    }
  }

  return (
    <form className={styles.card} onSubmit={submit} noValidate aria-label="Edit profile">
      <h3>Edit profile</h3>
      <div className={styles.two}>
        <div>
          <label htmlFor="pf-first">First name</label>
          <input id="pf-first" className={bad.includes('firstName') ? styles.bad : ''} value={f.firstName} onChange={set('firstName')} />
        </div>
        <div>
          <label htmlFor="pf-last">Last name</label>
          <input id="pf-last" className={bad.includes('lastName') ? styles.bad : ''} value={f.lastName} onChange={set('lastName')} />
        </div>
      </div>

      <label htmlFor="pf-email">Email</label>
      <input id="pf-email" type="email" className={bad.includes('email') ? styles.bad : ''} value={f.email} onChange={set('email')} />

      {!direct && (
        <>
          <label htmlFor="pf-reason">Reason for the change</label>
          <input
            id="pf-reason"
            className={bad.includes('reason') ? styles.bad : ''}
            placeholder="Required to send a request"
            maxLength={REASON_MAX}
            value={f.reason}
            onChange={set('reason')}
          />
          <p className={styles.hint}>Name and email changes are reviewed by a Superadmin.</p>
        </>
      )}

      <button type="submit" className={`${styles.btn} ${styles.pri}`} disabled={busy || demo}>
        {busy ? 'Sending...' : direct ? 'Save profile' : 'Send change request'}
      </button>
    </form>
  );
}

function RoleRequest({ roles, notify, call, onSent }) {
  const [role, setRole] = useState(roles[0]);
  const [reason, setReason] = useState('');
  const [bad, setBad] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!reason.trim()) {
      setBad(true);
      return notify('Empty Field', 'Please fill in the Reason.', true);
    }
    setBusy(true);
    const out = await call('/api/requests', 'POST', { kind: 'role', role, reason });
    setBusy(false);
    if (out?.data) {
      setReason('');
      onSent(out.data.request);
    }
  }

  return (
    <form className={styles.card} onSubmit={submit} noValidate aria-label="Request a role change">
      <h3>Request a role change</h3>
      <label htmlFor="rc-role">New role</label>
      <select id="rc-role" value={role} onChange={(e) => setRole(e.target.value)}>
        {roles.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      <label htmlFor="rc-reason">Reason</label>
      <input
        id="rc-reason"
        className={bad ? styles.bad : ''}
        placeholder="Why do you need this role?"
        maxLength={REASON_MAX}
        value={reason}
        onChange={(e) => {
          setReason(e.target.value);
          setBad(false);
        }}
      />
      <button type="submit" className={`${styles.btn} ${styles.pri}`} disabled={busy}>
        {busy ? 'Sending...' : 'Send request'}
      </button>
    </form>
  );
}

function AccessRequest({ options, notify, call, onSent }) {
  const first = options[0] ? `m:${options[0].moduleId}` : '';
  const [access, setAccess] = useState(first);
  const [reason, setReason] = useState('');
  const [bad, setBad] = useState(false);
  const [busy, setBusy] = useState(false);

  // Keep the selection valid if the list of options changes.
  useEffect(() => {
    if (!options.some((o) => `m:${o.moduleId}` === access || o.rights.some((r) => `r:${r.rightId}` === access))) setAccess(first);
  }, [options, access, first]);

  async function submit(e) {
    e.preventDefault();
    if (!reason.trim()) {
      setBad(true);
      return notify('Empty Field', 'Please fill in the Reason.', true);
    }
    setBusy(true);
    const out = await call('/api/requests', 'POST', { kind: 'access', access, reason });
    setBusy(false);
    if (out?.data) {
      setReason('');
      onSent(out.data.request);
    }
  }

  return (
    <form className={styles.card} onSubmit={submit} noValidate aria-label="Request access">
      <h3>Request access</h3>
      {options.length === 0 ? (
        <p className={styles.empty}>You already have every right.</p>
      ) : (
        <>
          <label htmlFor="ra-what">What do you need?</label>
          <select id="ra-what" value={access} onChange={(e) => setAccess(e.target.value)}>
            {options.map((m) => (
              <optgroup key={m.moduleId} label={m.title}>
                <option value={`m:${m.moduleId}`}>Whole module</option>
                {m.rights.map((r) => (
                  <option key={r.rightId} value={`r:${r.rightId}`}>{r.name}</option>
                ))}
              </optgroup>
            ))}
          </select>

          <label htmlFor="ra-reason">Reason</label>
          <input
            id="ra-reason"
            className={bad ? styles.bad : ''}
            placeholder="Why do you need this?"
            maxLength={REASON_MAX}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setBad(false);
            }}
          />
          <button type="submit" className={`${styles.btn} ${styles.pri}`} disabled={busy}>
            {busy ? 'Sending...' : 'Send request'}
          </button>
        </>
      )}
    </form>
  );
}
