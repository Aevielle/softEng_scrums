import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createSession } from '@/lib/auth/session';
import { createOAuthClient } from '@/lib/supabase/oauth';
import { siteOrigin } from '@/lib/auth/origin';
import { decide } from '@/lib/auth/oauthDecision';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = siteOrigin(req);
  const intent = url.searchParams.get('intent') === 'reset' ? 'reset' : 'signin';
  const back = (code: string) => NextResponse.redirect(`${origin}/login?oauth=${code}`);

  if (url.searchParams.get('error')) return back('cancelled');

  const code = url.searchParams.get('code');
  if (!code) return back('failed');

  try {
    const supabase = await createOAuthClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      console.error('[oauth] code exchange failed:', error?.message);
      return back('failed');
    }

    const u = data.user;
    const email = u.email?.trim().toLowerCase();
    const verified = !!u.email_confirmed_at || u.user_metadata?.email_verified === true;

    // Supabase only proved who this is; the app's own cookie is the session
    await supabase.auth.signOut({ scope: 'local' });

    if (!email || !verified) return back('unverified');

    const { data: user, error: lookupError } = await supabaseAdmin
      .from('app_user')
      .select('user_id, first_name, email, is_blocked, account_status, must_change_password, role:role_id(role_name)')
      .eq('email', email)
      .maybeSingle();

    if (lookupError) {
      console.error('[oauth] user lookup failed:', lookupError.message, lookupError.code);
      return back('failed');
    }

    const outcome = decide(intent, user);

    if (outcome.kind === 'notfound') return back('notfound');
    if (outcome.kind === 'blocked') return back('blocked');
    if (outcome.kind === 'pending') return back('pending');

    if (outcome.kind === 'create') {
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      const full = String(meta.full_name ?? meta.name ?? '').trim();
      const parts = full.split(/\s+/).filter(Boolean);
      const first = String(meta.given_name ?? parts[0] ?? '').trim() || email.split('@')[0];
      const last = String(meta.family_name ?? parts.slice(1).join(' ')).trim() || '-';

      const { data: role, error: roleError } = await supabaseAdmin
        .from('role')
        .select('role_id')
        .ilike('role_name', 'user')
        .maybeSingle();

      if (roleError || !role) {
        console.error('[oauth] default role lookup failed:', roleError?.message, roleError?.code);
        return back('failed');
      }

      const { error: insertError } = await supabaseAdmin.from('app_user').insert({
        first_name: first,
        last_name: last,
        email,
        password_hash: 'OAUTH_NO_PASSWORD', // not a bcrypt hash, so no password can ever match it
        role_id: role.role_id,
        account_status: 'pending',
        is_blocked: false,
      });

      if (insertError && insertError.code !== '23505') {
        console.error('[oauth] account creation failed:', insertError.message, insertError.code);
        return back('failed');
      }
      return back('created');
    }

    // outcome.kind === 'session'
    const roleObj = Array.isArray(user!.role) ? user!.role[0] : user!.role;

    await createSession(
      { sub: String(user!.user_id), role: roleObj?.role_name ?? 'User', mustChange: outcome.mustChange },
      false
    );

    return NextResponse.redirect(`${origin}${outcome.redirect}`);
  } catch (err) {
    console.error('[oauth] callback crashed:', err);
    return back('failed');
  }
}