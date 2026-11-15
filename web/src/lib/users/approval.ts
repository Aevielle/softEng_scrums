export const ROLE_ID = { SUPERADMIN: 1, ADMIN: 2, USER: 3 } as const;
export const STATUS = { PENDING: "pending", APPROVED: "approved" } as const;

export const LAST_SUPERADMIN_MESSAGE =
  "This is the last remaining Superadmin. It cannot be removed, blocked, or demoted. Make another user a Superadmin first.";

export type SignInCheck = { ok: true } | { ok: false; status: number; message: string };

export function checkCanSignIn(user: { account_status: string; is_blocked?: boolean | null }): SignInCheck {
  if (user.account_status !== STATUS.APPROVED) {
    return { ok: false, status: 403, message: "Your account is waiting for approval by a Superadmin. You can sign in once it is approved." };
  }
  if (user.is_blocked) {
    return { ok: false, status: 403, message: "Your account has been blocked. Please contact an administrator." };
  }
  return { ok: true };
}

export function isLastSuperadminError(err: { message?: string } | null | undefined) {
  return !!err?.message && err.message.includes("LAST_SUPERADMIN");
}