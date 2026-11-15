// S1-DEV-06: sign-in gate. Statuses match what createUser stores ('active') and what Register stores ('pending').
export const STATUS = { PENDING: 'pending', ACTIVE: 'active' } as const;

export type SignInCheck = { ok: true } | { ok: false; status: number; message: string };

/** Call in the login route AFTER the password is verified. Pending/blocked users must not get a session. */
export function checkCanSignIn(user: { account_status: string | null; is_blocked?: boolean | null }): SignInCheck {
  if (user.is_blocked) {
    return { ok: false, status: 403, message: 'Your account has been blocked. Please contact an administrator.' };
  }
  if ((user.account_status ?? 'active') !== STATUS.ACTIVE) {
    return {
      ok: false,
      status: 403,
      message: 'Your account is waiting for approval by a Superadmin. You can sign in once it is approved.',
    };
  }
  return { ok: true };
}
