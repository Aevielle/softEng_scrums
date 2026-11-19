import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth/session';

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ redirect: '/' });
  } catch (err) {
    console.error('[logout] unexpected error:', err);
    return NextResponse.json(
      { code: 'SERVER', message: 'Could not log out. Please try again.' },
      { status: 500 }
    );
  }
}