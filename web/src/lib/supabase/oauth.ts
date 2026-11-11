import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Used only to prove identity through Google or GitHub
export async function createOAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) throw new Error('Supabase URL or publishable key is missing in .env.local');

  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* ignored when called from a read-only context */
        }
      },
    },
  });
}