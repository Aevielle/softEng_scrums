import { Suspense } from 'react';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { hashToken } from '@/lib/auth/reset';
import styles from '../login/login.module.css';
import ResetForm from './ResetForm';

async function Content({ searchParams }) {
  const { token } = await searchParams;

  let valid = false;
  if (typeof token === 'string' && token) {
    const { data } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('id')
      .eq('token_hash', hashToken(token))
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    valid = !!data;
  }

  if (!valid) {
    return (
      <main className={styles.wrap}>
        <div className={styles.card}>
          <h1>Link not valid</h1>
          <p className={styles.sub}>
            This reset link is invalid, expired, or already used.
          </p>
          <Link href="/forgot-password" className={styles.submit}
            style={{ textAlign: 'center', textDecoration: 'none' }}>
            Request a new link
          </Link>
          <p className={styles.foot}><Link href="/login">Return to sign in →</Link></p>
        </div>
      </main>
    );
  }
  return <ResetForm token={token} />;
}

export default function ResetPasswordPage({ searchParams }) {
  return (
    <Suspense fallback={<main className={styles.wrap}>Loading…</main>}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}