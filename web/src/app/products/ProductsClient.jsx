'use client';

// UPDATED 2026-11-21 (v3): stat cards on top, filters left / Add right, no second title, overlay Delete dialog.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { countByStatus, filterProducts, formatPrice } from '@/lib/products/filter';
import ProductFormDialog from './ProductFormDialog';
import PriceHistoryDialog from './PriceHistoryDialog';
import styles from './products.module.css';

const TABS = ['Active', 'Inactive', 'All'];

// Same dialog as Delete customer (overlay + pop-in animation): says plainly that the row is only marked Inactive, not erased.
function DeleteDialog({ product, isAdmin, busy, error, onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onCancel(); // refuse while the delete is saving
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  return (
    <div className={styles.overlay} onClick={() => !busy && onCancel()}>
      <div
        className={styles.md}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="del-product-title"
        aria-describedby="del-product-text"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="del-product-title">Delete product {product.prodcode}?</h3>
        <p id="del-product-text" className={styles.sub}>
          <b>{product.description || product.prodcode}</b>{' '}
          {isAdmin
            ? 'will be marked Inactive, not erased. It will show shaded in the list, and you can restore it later.'
            : 'will be removed from the list. Sales that use it are not affected.'}
        </p>

        {error && (
          <p className={styles.banner} role="alert">
            {error}
          </p>
        )}

        <div className={styles.row}>
          <button type="button" className={styles.btn} onClick={onCancel} disabled={busy}>
            {error ? 'Close' : 'Cancel'}
          </button>
          {!error && (
            <button type="button" className={`${styles.btn} ${styles.pri} ${styles.dangerFill}`} onClick={onConfirm} disabled={busy} autoFocus>
              {busy ? 'Deleting...' : 'Delete product'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const byCode = (a, b) => a.prodcode.localeCompare(b.prodcode, 'en', { numeric: true });

export default function ProductsClient({ initial, isAdmin, perm }) {
  const [tab, setTab] = useState('All'); // Figure 11 opens on All; only Admins can change it
  const [q, setQ] = useState('');

  // The list lives in state so a saved product appears at once, without reloading the page.
  const [items, setItems] = useState(initial);
  useEffect(() => setItems(initial), [initial]);

  const [dialog, setDialog] = useState(null); // null | { mode: 'add' } | { mode: 'edit', product }
  const [priceFor, setPriceFor] = useState(null); // the product whose Price History dialog is open
  const [notice, setNotice] = useState(null); // { title, text, error? }
  const [confirming, setConfirming] = useState(null); // the product whose Delete dialog is open
  const [dialogError, setDialogError] = useState(''); // a refused delete is explained inside the dialog
  const [busy, setBusy] = useState(null); // prodcode with a delete / restore in flight
  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), notice.error ? 9000 : 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const counts = useMemo(() => countByStatus(items), [items]);

  // A User's rows are already Active-only from the server, so the status filter is skipped for them.
  const rows = useMemo(
    () => filterProducts(items, { q, status: isAdmin ? tab : 'All' }),
    [items, q, tab, isAdmin]
  );

  // Every row has a Prices button, so the Actions column is always there.
  const cols = 5 + (isAdmin ? 2 : 0);

  // The server answers with the saved row (new Stamp, current price), so we just put it in the list.
  function handleSaved(product, mode) {
    setItems((prev) => {
      const exists = prev.some((r) => r.prodcode === product.prodcode);
      const next = exists ? prev.map((r) => (r.prodcode === product.prodcode ? product : r)) : [...prev, product];
      return next.sort(byCode);
    });
    setDialog(null);
    setNotice({
      title: mode === 'edit' ? 'Updated' : 'Added',
      text: `Product ${product.prodcode} ${mode === 'edit' ? 'updated' : 'added'}.`,
    });
  }

  // S2-DEV-06: Delete and Restore. The server answers with the saved row (Stamp and Status already changed).
  // The server decides everything; this only shows the result. A User's answer has no status, so that row just leaves.
  async function act(kind, product) {
    if (busy) return;
    setBusy(product.prodcode);
    setDialogError('');
    const verb = kind === 'delete' ? 'deleted' : 'restored';
    try {
      const url = `/api/products/${encodeURIComponent(product.prodcode)}`;
      const res =
        kind === 'delete'
          ? await fetch(url, { method: 'DELETE' })
          : await fetch(`${url}/restore`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: '{}',
            });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          res.status === 401
            ? `Your session has ended. Sign in again, then retry. Nothing was ${verb}.`
            : data?.message || `Could not ${kind} the product (server error ${res.status}). Nothing was ${verb}.`;
        // A refused delete (e.g. the product is on an active sale line) stays in the dialog so the reason is read.
        if (kind === 'delete') setDialogError(msg);
        else setNotice({ title: 'Could not restore', text: msg, error: true });
        return;
      }
      const saved = data.product;
      setItems((prev) =>
        saved.status === undefined
          ? prev.filter((r) => r.prodcode !== saved.prodcode) // a User no longer sees it
          : prev.map((r) => (r.prodcode === saved.prodcode ? saved : r))
      );
      setConfirming(null);
      setNotice(
        kind === 'delete'
          ? {
              title: 'Deleted',
              text: isAdmin
                ? `Product ${saved.prodcode} moved to Inactive. An Admin can restore it.`
                : `Product ${saved.prodcode} deleted.`,
            }
          : { title: 'Restored', text: `Product ${saved.prodcode} is active again.` }
      );
    } catch {
      const msg = `Could not reach the server. Nothing was ${verb}. Check your connection and try again.`;
      if (kind === 'delete') setDialogError(msg);
      else setNotice({ title: 'Could not restore', text: msg, error: true });
    } finally {
      setBusy(null);
    }
  }

  // The Price History dialog reports the price now in force, so the Current Price column updates without a reload.
  const handleCurrentPrice = useCallback((prodcode, price) => {
    setItems((prev) => prev.map((r) => (r.prodcode === prodcode && r.price !== price ? { ...r, price } : r)));
  }, []);

  return (
    <>
      {isAdmin && (
        <section className={styles.cards} aria-label="Product totals">
          {[
            ['Total records', counts.All, styles.cTotal],
            ['Active', counts.Active, styles.cActive],
            ['Inactive', counts.Inactive, styles.cInactive],
          ].map(([label, n, tone]) => (
            <div key={label} className={`${styles.sc} ${tone}`}>
              <span>{label}</span>
              <strong>{n}</strong>
            </div>
          ))}
        </section>
      )}

      <div className={styles.bar}>
        <div className={styles.filters}>
          {isAdmin && (
            <div className={styles.tabs} role="tablist" aria-label="Filter by status">
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
          )}

          <input
            type="search"
            className={styles.search}
            placeholder="Search products..."
            aria-label="Search products"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {perm.add && (
          <button
            type="button"
            className={`${styles.btn} ${styles.pri}`}
            onClick={() => setDialog({ mode: 'add' })}
          >
            + Add Product
          </button>
        )}
      </div>

      <div className={styles.tw}>
        <table>
          <thead>
            <tr>
              <th>Prod Code</th>
              <th>Description</th>
              <th>Unit</th>
              <th>Current Price</th>
              {isAdmin && <th>Status</th>}
              {isAdmin && <th>Stamp</th>}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const deleted = isAdmin && r.status === 'Inactive';
              const working = busy === r.prodcode;
              return (
                <tr key={r.prodcode} className={deleted ? styles.deleted : ''}>
                  <td><b>{r.prodcode}</b></td>
                  <td>{r.description || '—'}</td>
                  <td>{r.unit || '—'}</td>
                  <td>{formatPrice(r.price)}</td>
                  {isAdmin && (
                    <td>
                      <span className={`${styles.pill} ${deleted ? styles.x : ''}`}>{r.status}</span>
                    </td>
                  )}
                  {isAdmin && <td className={styles.stamp}>{r.stamp || '—'}</td>}
                  <td className={styles.ac}>
                    {deleted ? (
                      // Restore is for Admin / Superadmin only; only they ever see an Inactive row.
                      isAdmin && (
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.sm}`}
                          onClick={() => act('restore', r)}
                          disabled={busy !== null}
                        >
                          {working ? 'Restoring…' : 'Restore'}
                        </button>
                      )
                    ) : (
                      <>
                        <button type="button" className={`${styles.btn} ${styles.sm}`} onClick={() => setPriceFor(r)}>
                          Prices
                        </button>
                        {perm.edit && (
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.sm}`}
                            onClick={() => setDialog({ mode: 'edit', product: r })}
                          >
                            Edit
                          </button>
                        )}
                        {perm.del && (
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.sm} ${styles.danger}`}
                            onClick={() => {
                              setConfirming(r);
                              setDialogError('');
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={cols} className={styles.empty}>
                  {q.trim() ? 'No products match your search.' : 'No products yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className={styles.count} role="status" aria-live="polite">
        Showing {rows.length} of {items.length}
      </p>

      {notice && (
        <div className={`${styles.toast} ${notice.error ? styles.toastErr : ''}`} role={notice.error ? 'alert' : 'status'}>
          <b className={styles.toastTitle}>{notice.title}</b>
          <span className={styles.toastText}>{notice.text}</span>
        </div>
      )}

      {confirming && (
        <DeleteDialog
          key={confirming.prodcode}
          product={confirming}
          isAdmin={isAdmin}
          busy={busy === confirming.prodcode}
          error={dialogError}
          onConfirm={() => act('delete', confirming)}
          onCancel={() => setConfirming(null)}
        />
      )}

      {priceFor && (
        <PriceHistoryDialog
          key={priceFor.prodcode}
          product={priceFor}
          isAdmin={isAdmin}
          perm={perm}
          onClose={() => setPriceFor(null)}
          onCurrentPrice={handleCurrentPrice}
        />
      )}

      {dialog && (
        <ProductFormDialog
          // a fresh form every time it opens, so Add never shows the last Edit's text
          key={dialog.mode === 'edit' ? dialog.product.prodcode : 'add'}
          mode={dialog.mode}
          product={dialog.product}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}