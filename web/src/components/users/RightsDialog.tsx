'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import styles from './RightsDialog.module.css';

type RightItem = { rightId: number; name: string; description: string };
type ModuleGroup = { moduleId: number; title: string; rights: RightItem[] };
type Payload = {
  user: { id: number; firstName: string; email: string };
  modules: ModuleGroup[];
  granted: number[];
};

export type RightsSaved = { title: string; detail: string };

type Props = {
  /** app_user.user_id of the User being edited (the row's Rights button). */
  userId: number;
  onClose: () => void;
  /** Called after a successful save, e.g. show the toast "Rights saved / Kim will see the change on next sign-in." */
  onSaved: (message: RightsSaved) => void;
};

export default function RightsDialog({ userId, onClose, onSaved }: Props) {
  const titleId = useId();
  const [data, setData] = useState<Payload | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [moduleOn, setModuleOn] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load every right (grouped by module) and what this user has now.
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/users/${userId}/rights`, { signal: ctrl.signal, cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json) throw new Error(json?.message ?? 'Could not load rights.');
        const payload = json as Payload;
        const have = new Set(payload.granted);
        setData(payload);
        setSelected(have);
        // A module starts ticked when the user already holds at least one right in it.
        setModuleOn(
          Object.fromEntries(payload.modules.map((m) => [m.moduleId, m.rights.some((r) => have.has(r.rightId))]))
        );
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setError((e as Error).message || 'Could not load rights.');
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [userId]);

  const close = useCallback(() => {
    if (!saving) onClose();
  }, [saving, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const setMany = (ids: number[], checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });

  // Module checkbox: ON enables the boxes under it; OFF clears them (those rights get removed on save).
  const toggleModule = (m: ModuleGroup, on: boolean) => {
    setModuleOn((p) => ({ ...p, [m.moduleId]: on }));
    if (!on) setMany(m.rights.map((r) => r.rightId), false);
  };
  // All: switch the module on and tick everything.  None: untick everything and switch the module off.
  const selectAll = (m: ModuleGroup) => {
    setModuleOn((p) => ({ ...p, [m.moduleId]: true }));
    setMany(m.rights.map((r) => r.rightId), true);
  };
  const selectNone = (m: ModuleGroup) => toggleModule(m, false);

  const save = async () => {
    if (!data || saving) return;
    setSaving(true);
    setError(null);
    try {
      // Only rights inside a ticked module can be sent (the others were cleared above).
      const allowed = new Set(
        data.modules.filter((m) => moduleOn[m.moduleId]).flatMap((m) => m.rights.map((r) => r.rightId))
      );
      const rights = [...selected].filter((id) => allowed.has(id));

      const res = await fetch(`/api/users/${userId}/rights`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rights }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.message ?? 'Could not save rights.');
      onSaved({ title: json.title, detail: json.detail });
    } catch (e) {
      setError((e as Error).message || 'Could not save rights.');
      setSaving(false);
    }
  };

  return (
    <div className={styles.backdrop}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button type="button" className={styles.x} aria-label="Close" onClick={close}>
          ×
        </button>

        <h2 id={titleId} className={styles.title}>
          Rights{data ? ` — ${data.user.firstName || data.user.email}` : ''}
        </h2>
        {data && (
          <p className={styles.sub}>
            {data.user.email}. Tick a module to switch it on, then choose what this person may do.
          </p>
        )}

        <div className={styles.body}>
          {loading && <p className={styles.note}>Loading rights…</p>}

          {data?.modules.map((m) => {
            const on = !!moduleOn[m.moduleId];
            return (
              <section key={m.moduleId} className={styles.module}>
                <div className={styles.moduleHead}>
                  <label className={styles.moduleLabel}>
                    <input type="checkbox" checked={on} onChange={(e) => toggleModule(m, e.target.checked)} />
                    <span>{m.title}</span>
                  </label>
                  <div className={styles.quick}>
                    <button type="button" className={styles.chip} onClick={() => selectAll(m)}>
                      All
                    </button>
                    <button type="button" className={styles.chip} onClick={() => selectNone(m)}>
                      None
                    </button>
                  </div>
                </div>

                <div className={styles.grid}>
                  {m.rights.map((r) => (
                    <label key={r.rightId} className={`${styles.right} ${on ? '' : styles.off}`} title={r.description}>
                      <input
                        type="checkbox"
                        disabled={!on}
                        checked={selected.has(r.rightId)}
                        onChange={(e) => setMany([r.rightId], e.target.checked)}
                      />
                      <span>{r.name}</span>
                    </label>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <div className={styles.footer}>
          <button type="button" className={styles.cancel} onClick={close} disabled={saving}>
            Cancel
          </button>
          <button type="button" className={styles.save} onClick={save} disabled={!data || saving}>
            {saving ? 'Saving…' : 'Save Rights'}
          </button>
        </div>
      </div>
    </div>
  );
}