import { NextResponse } from 'next/server';
import { createOAuthClient } from '@/lib/supabase/oauth';
import { siteOrigin } from '@/lib/auth/origin';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = siteOrigin(req);
  const provider = url.searchParams.get('provider');
  const intent = url.searchParams.get('intent') === 'reset' ? 'reset' : 'signin';

  const failed = () => NextResponse.redirect(`${origin}/login?oauth=failed`);

  if (provider !== 'google' && provider !== 'github') return failed();

  try {
    const supabase = await createOAuthClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${origin}/auth/callback?intent=${intent}` },
    });

    if (error || !data.url) {
      console.error('[oauth] start failed:', error?.message);
      return failed();
    }
    return NextResponse.redirect(data.url);
  } catch (err) {
    console.error('[oauth] start crashed:', err);
    return failed();
  }
}