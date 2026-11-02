import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import LogoutButton from './LogoutButton';

async function DashboardContent() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.mustChange) redirect('/set-password');

  return (
    <main style={{ padding: 32 }}>
      <h1>Welcome to Hope, Inc. ERP</h1>
      <p>Signed in as role: {session.role}</p>
      <LogoutButton />
    </main>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<main style={{ padding: 32 }}>Loading…</main>}>
      <DashboardContent />
    </Suspense>
  );
}