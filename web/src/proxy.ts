import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('session')?.value;
  let session: any = null;
  if (token) {
    try {
      session = (await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET))).payload;
    } catch {}
  }

  // Logged out -> Sign In
  if (!session && (pathname.startsWith('/dashboard') || pathname === '/set-password')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  // First login -> must set password before anything else
  if (session?.mustChange && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/set-password', req.url));
  }
  // Already signed in -> skip the login page
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL(session.mustChange ? '/set-password' : '/dashboard', req.url));
  }

  const res = NextResponse.next();
  res.headers.set('Cache-Control', 'no-store'); // back button can't show the page after logout
  return res;
}

export const config = { matcher: ['/dashboard/:path*', '/set-password', '/login'] };