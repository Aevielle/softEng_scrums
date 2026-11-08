import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const store = await cookies();

    // Same name and path the cookie was created with in createSession
    store.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return NextResponse.json({ redirect: '/' });
  } catch (err) {
    console.error('[logout] unexpected error:', err);
    return NextResponse.json(
      { code: 'SERVER', message: 'Could not log out. Please try again.' },
      { status: 500 }
    );
  }
}