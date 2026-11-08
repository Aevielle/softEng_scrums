import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/roles';

// Admin-only page. Users are redirected to the dashboard; signed-out visitors to login.
export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!isAdmin(session.role)) redirect('/dashboard?denied=1');

  return (
    <main>
      <h1>Admin</h1>
      <p>Signed in as {session.role}.</p>
    </main>
  );
}