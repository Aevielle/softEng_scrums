'use client';

import { useEffect, useRef, useState } from 'react';
import { DESCRIPTION_MAX, UNITS, validateProductInput } from '@/lib/products/validate';
import styles from './products.module.css';

// Add / Edit Product form (S2-DEV-05). Only Description and Unit are typed in.
// The code, Status and Stamp are made by the server, so the code field here is display-only.
// The same validateProductInput runs here (instant message) and on the server (the real check).

/**
 * @param {{
 *   mode: 'add' | 'edit',
 *   product?: { prodcode: string, description: string | null, unit: string | null },
 *   onClose: () => void,
 *   onSaved: (product: object, mode: 'add' | 'edit') => void,
 * }} props
 */
export default function ProductFormDialog({ mode, product, onClose, onSaved }) {
  const isEdit = mode === 'edit';
  const ref = useRef(null);
  const descRef = useRef(null);
  const unitRef = useRef(null);

  const [description, setDescription] = useState(product?.description ?? '');
  const [unit, setUnit] = useState(product?.unit ?? '');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // <dialog> gives us the dark backdrop, focus trap and Esc key for free.
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const close = () => {
    if (!saving) onClose();
  };

  async function submit(e) {
    e.preventDefault();
    if (saving) return;

    const check = validateProductInput({ description, unit });
    if (!check.ok) {
      setErrors(check.errors);
      setFormError('');
      (check.errors.description ? descRef : unitRef).current?.focus();
      return; // nothing is sent
    }

    setErrors({});
    setFormError('');
    setSaving(true);
    try {
      const res = await fetch(isEdit ? `/api/products/${encodeURIComponent(product.prodcode)}` : '/api/products', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(check.values),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (data?.errors) setErrors(data.errors);
        setFormError(
          res.status === 401
            ? 'Your session has ended. Sign in again, then retry. Nothing was saved.'
            : data?.message || 'Could not save the product. Nothing was saved.'
        );
        return;
      }
      onSaved(data.product, mode);
    } catch {
      setFormError('Could not reach the server. Nothing was saved. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  const clear = (field) => setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  const title = isEdit ? 'Edit product' : 'Add product';

  return (
    <dialog
      ref={ref}
      className={styles.dlg}
      aria-labelledby="product-form-title"
      onCancel={(e) => {
        e.preventDefault(); // Esc: close ourselves so we can refuse while saving
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close(); // click on the backdrop
      }}
    >
      <form className={styles.dlgBody} onSubmit={submit} noValidate>
        <h3 id="product-form-title" className={styles.dlgTitle}>{title}</h3>
        <p className={styles.dlgSub}>Code, Status and Stamp are filled in by the system.</p>

        {formError && (
          <p className={styles.banner} role="alert">
            {formError}
          </p>
        )}

        <div className={styles.field}>
          <label htmlFor="pf-code">Code</label>
          <input
            id="pf-code"
            value={isEdit ? product.prodcode : 'Assigned when you save'}
            disabled
            readOnly
            aria-describedby="pf-code-note"
          />
          <p id="pf-code-note" className={styles.note}>Numbered automatically. It cannot be edited.</p>
        </div>

        <div className={styles.field}>
          <label htmlFor="pf-desc">Description</label>
          <input
            id="pf-desc"
            ref={descRef}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              clear('description');
            }}
            className={errors.description ? styles.invalid : ''}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? 'pf-desc-err' : undefined}
            autoComplete="off"
          />
          {errors.description && (
            <p id="pf-desc-err" className={styles.fieldErr}>{errors.description}</p>
          )}
          <p className={styles.note}>
            {description.replace(/\s+/g, ' ').trim().length} / {DESCRIPTION_MAX}
          </p>
        </div>

        <div className={styles.field}>
          <label htmlFor="pf-unit">Unit</label>
          <select
            id="pf-unit"
            ref={unitRef}
            value={unit}
            onChange={(e) => {
              setUnit(e.target.value);
              clear('unit');
            }}
            className={errors.unit ? styles.invalid : ''}
            aria-invalid={Boolean(errors.unit)}
            aria-describedby={errors.unit ? 'pf-unit-err' : undefined}
          >
            <option value="">Choose a unit…</option>
            {UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          {errors.unit && <p id="pf-unit-err" className={styles.fieldErr}>{errors.unit}</p>}
        </div>

        <div className={styles.dlgActions}>
          <button type="button" className={styles.btn} onClick={close} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className={`${styles.btn} ${styles.pri}`} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save product'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
