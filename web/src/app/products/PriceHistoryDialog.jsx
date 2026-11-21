'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatPrice } from '@/lib/products/filter';
import { byEffdateDesc, countPrices, filterPrices, validatePriceInput } from '@/lib/products/prices';
import styles from './products.module.css';

// Price History dialog (S2-DEV-07), Figures 12 and 13.
// Admin / Superadmin: status tabs + Status and Stamp columns (Figure 12).
// User: Effective Date, Unit Price, Actions only (Figure 13); the server never sends them status or stamp.
// The buttons only decide what is DRAWN. Every save goes to /api/products/[code]/prices..., which checks
// the matching right (Add / Edit / Delete Price) again on the server.

const TABS = ['Active', 'Inactive', 'All'];

/**
 * @param {{
 *   product: { prodcode: string, description: string | null, unit: string | null },
 *   isAdmin: boolean,
 *   perm: { addPrice: boolean, editPrice: boolean, delPrice: boolean },
 *   onClose: () => void,
 *   onCurrentPrice: (prodcode: string, price: number | null) => void,
 * }} props
 */
export default function PriceHistoryDialog({ product, isAdmin, perm, onClose, onCurrentPrice }) {
  const ref = useRef(null);
  const base = `/api/products/${encodeURIComponent(product.prodcode)}/prices`;

  const [prices, setPrices] = useState([]);
  const [current, setCurrent] = useState(undefined); // price in force today; undefined = still loading, null = none yet
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState('Active'); // Figure 12 opens on Active
  const [form, setForm] = useState(null); // null | { mode: 'add' } | { mode: 'edit', price }
  const [confirming, setConfirming] = useState(null); // effdate of the row waiting for "Delete?" confirmation
  const [busy, setBusy] = useState(false); // a delete is in flight
  const [notice, setNotice] = useState('');
  const [rowError, setRowError] = useState('');

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal(); // dark backdrop, focus trap and Esc for free
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(base, { signal: ctrl.signal, cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setLoadError(
            res.status === 401 ? 'Your session has ended. Sign in again.' : data?.message || 'Could not load the prices.'
          );
        } else {
          setPrices(data.prices);
          setCurrent(data.currentPrice);
          onCurrentPrice(product.prodcode, data.currentPrice);
        }
      } catch (e) {
        if (e?.name !== 'AbortError') setLoadError('Could not reach the server. Check your connection and try again.');
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const counts = useMemo(() => countPrices(prices), [prices]);
  // A User's rows are already Active-only from the server, so the tab filter is skipped for them.
  const rows = useMemo(() => (isAdmin ? filterPrices(prices, tab) : prices), [prices, tab, isAdmin]);
  const cols = isAdmin ? 5 : 3;

  const close = () => {
    if (!busy) onClose();
  };

  /** Put the row the server answered with into the list (replacing the one it was before, if any). */
  function applySaved(result, replaceEffdate) {
    setPrices((prev) => {
      const without = prev.filter((r) => r.effdate !== replaceEffdate && r.effdate !== result.price.effdate);
      // A User never sees an Inactive row, so a deleted price just leaves their list.
      const gone = !isAdmin && result.price.status === 'Inactive';
      return (gone ? without : [...without, result.price]).sort(byEffdateDesc);
    });
    setCurrent(result.currentPrice);
    onCurrentPrice(product.prodcode, result.currentPrice);
  }

  function handleFormSaved(result, mode, oldEffdate) {
    applySaved(result, oldEffdate);
    setForm(null);
    setNotice(mode === 'edit' ? 'Price updated.' : 'Price added.');
  }

  async function remove(price) {
    if (busy) return;
    setBusy(true);
    setRowError('');
    try {
      const res = await fetch(`${base}/${encodeURIComponent(price.effdate)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setRowError(
          res.status === 401
            ? 'Your session has ended. Sign in again, then retry. Nothing was deleted.'
            : data?.message || 'Could not delete the price. Nothing was deleted.'
        );
        return;
      }
      applySaved(data, price.effdate);
      setConfirming(null);
      setNotice(isAdmin ? 'Price deleted. It now shows under Inactive.' : 'Price deleted.');
    } catch {
      setRowError('Could not reach the server. Nothing was deleted. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={ref}
      className={`${styles.dlg} ${styles.dlgWide}`}
      aria-labelledby="price-title"
      onCancel={(e) => {
        e.preventDefault(); // Esc: close ourselves so we can refuse while a delete is saving
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close(); // click on the backdrop
      }}
    >
      <div className={styles.dlgBody}>
        <div className={styles.dlgHead}>
          <div>
            <h3 id="price-title" className={styles.dlgTitle}>Price History — {product.prodcode}</h3>
            <p className={styles.dlgSub}>
              {product.description || '—'} · Unit: {product.unit || '—'}
            </p>
            {current !== undefined && (
              <p className={styles.dlgSub}>
                Current price: <b>{formatPrice(current)}</b>
              </p>
            )}
          </div>
          <button type="button" className={styles.closeX} onClick={close} aria-label="Close price history">
            ×
          </button>
        </div>

        <div className={styles.priceBar}>
          {isAdmin ? (
            <div className={styles.tabs} role="tablist" aria-label="Filter prices by status">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  className={tab === t ? styles.on : ''}
                  onClick={() => setTab(t)}
                >
                  {t} ({counts[t]})
                </button>
              ))}
            </div>
          ) : (
            <span />
          )}
          {perm.addPrice && !form && (
            <button
              type="button"
              className={`${styles.btn} ${styles.pri} ${styles.sm}`}
              onClick={() => {
                setForm({ mode: 'add' });
                setConfirming(null);
                setRowError('');
              }}
            >
              + Add Price
            </button>
          )}
        </div>

        {form && (
          <PriceForm
            key={form.mode === 'edit' ? form.price.effdate : 'add'}
            mode={form.mode}
            price={form.price}
            base={base}
            onCancel={() => setForm(null)}
            onSaved={handleFormSaved}
          />
        )}

        {rowError && (
          <p className={styles.banner} role="alert">
            {rowError}
          </p>
        )}

        <div className={`${styles.tw} ${styles.priceTable}`}>
          <table>
            <thead>
              <tr>
                <th>Effective Date</th>
                <th>Unit Price</th>
                {isAdmin && <th>Status</th>}
                {isAdmin && <th>Stamp</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const inactive = isAdmin && r.status === 'Inactive';
                const asking = confirming === r.effdate;
                return (
                  <tr key={r.effdate} className={inactive ? styles.deleted : ''}>
                    <td>{r.effdate}</td>
                    <td><b>{formatPrice(r.unitprice)}</b></td>
                    {isAdmin && (
                      <td>
                        <span className={`${styles.pill} ${inactive ? styles.x : ''}`}>{r.status}</span>
                      </td>
                    )}
                    {isAdmin && <td className={styles.stamp}>{r.stamp || '—'}</td>}
                    <td className={styles.ac}>
                      {inactive ? (
                        <span className={styles.stamp}>—</span>
                      ) : asking ? (
                        <>
                          <span className={styles.ask}>Delete this price?</span>
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.sm} ${styles.danger}`}
                            onClick={() => remove(r)}
                            disabled={busy}
                          >
                            {busy ? 'Deleting…' : 'Yes, delete'}
                          </button>
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.sm}`}
                            onClick={() => setConfirming(null)}
                            disabled={busy}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          {perm.editPrice && (
                            <button
                              type="button"
                              className={`${styles.btn} ${styles.sm}`}
                              onClick={() => {
                                setForm({ mode: 'edit', price: r });
                                setConfirming(null);
                                setRowError('');
                              }}
                            >
                              Edit
                            </button>
                          )}
                          {perm.delPrice && (
                            <button
                              type="button"
                              className={`${styles.btn} ${styles.sm} ${styles.danger}`}
                              onClick={() => {
                                setConfirming(r.effdate);
                                setForm(null);
                                setRowError('');
                              }}
                            >
                              Delete
                            </button>
                          )}
                          {!perm.editPrice && !perm.delPrice && <span className={styles.stamp}>—</span>}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={cols} className={styles.empty}>
                    {loading
                      ? 'Loading prices…'
                      : loadError
                        ? loadError
                        : isAdmin && tab !== 'All' && prices.length > 0
                          ? `No ${tab.toLowerCase()} prices.`
                          : 'No prices yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className={styles.note} role="status" aria-live="polite">
          {notice || 'The newest price on or before a date is the one that applies. Older prices are kept for past sales.'}
        </p>
      </div>
    </dialog>
  );
}

/** Add / Edit one price. Inline, so the history stays visible while you type. */
function PriceForm({ mode, price, base, onCancel, onSaved }) {
  const isEdit = mode === 'edit';
  const dateRef = useRef(null);
  const priceRef = useRef(null);
  const [effdate, setEffdate] = useState(price?.effdate ?? '');
  const [unitprice, setUnitprice] = useState(price ? String(price.unitprice) : '');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => dateRef.current?.focus(), []);

  async function submit(e) {
    e.preventDefault();
    if (saving) return;

    const check = validatePriceInput({ effdate, unitprice });
    if (!check.ok) {
      setErrors(check.errors);
      setFormError('');
      (check.errors.effdate ? dateRef : priceRef).current?.focus();
      return; // nothing is sent
    }

    setErrors({});
    setFormError('');
    setSaving(true);
    try {
      const res = await fetch(isEdit ? `${base}/${encodeURIComponent(price.effdate)}` : base, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(check.values),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (data?.errors) {
          setErrors(data.errors);
          if (data.errors.effdate) dateRef.current?.focus();
        }
        setFormError(
          res.status === 401
            ? 'Your session has ended. Sign in again, then retry. Nothing was saved.'
            : data?.errors?.effdate
              ? '' // the message is already shown under the date field
              : data?.message || 'Could not save the price. Nothing was saved.'
        );
        return;
      }
      onSaved(data, mode, price?.effdate);
    } catch {
      setFormError('Could not reach the server. Nothing was saved. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  const clear = (field) => setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  return (
    <form className={styles.priceForm} onSubmit={submit} noValidate aria-label={isEdit ? 'Edit price' : 'Add price'}>
      <h4 className={styles.formTitle}>{isEdit ? 'Edit price' : 'Add price'}</h4>

      {formError && (
        <p className={styles.banner} role="alert">
          {formError}
        </p>
      )}

      <div className={styles.formRow}>
        <div className={styles.field}>
          <label htmlFor="ph-date">Effective date</label>
          <input
            id="ph-date"
            ref={dateRef}
            type="date"
            value={effdate}
            onChange={(e) => {
              setEffdate(e.target.value);
              clear('effdate');
            }}
            className={errors.effdate ? styles.invalid : ''}
            aria-invalid={Boolean(errors.effdate)}
            aria-describedby={errors.effdate ? 'ph-date-err' : undefined}
          />
          {errors.effdate && <p id="ph-date-err" className={styles.fieldErr}>{errors.effdate}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="ph-price">Unit price (USD)</label>
          <input
            id="ph-price"
            ref={priceRef}
            inputMode="decimal"
            placeholder="0.00"
            value={unitprice}
            onChange={(e) => {
              setUnitprice(e.target.value);
              clear('unitprice');
            }}
            className={errors.unitprice ? styles.invalid : ''}
            aria-invalid={Boolean(errors.unitprice)}
            aria-describedby={errors.unitprice ? 'ph-price-err' : undefined}
            autoComplete="off"
          />
          {errors.unitprice && <p id="ph-price-err" className={styles.fieldErr}>{errors.unitprice}</p>}
        </div>
      </div>

      <p className={styles.note}>Status and Stamp are filled in by the system.</p>

      <div className={styles.dlgActions}>
        <button type="button" className={`${styles.btn} ${styles.sm}`} onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className={`${styles.btn} ${styles.pri} ${styles.sm}`} disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save price'}
        </button>
      </div>
    </form>
  );
}