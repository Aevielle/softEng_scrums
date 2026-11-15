import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin"; // <-- adjust export name if different
import { requireSuperadminApi } from "@/lib/auth/superadmin";
import { ROLE_ID, STATUS, LAST_SUPERADMIN_MESSAGE, isLastSuperadminError } from "@/lib/users/approval";
// import { sendApprovedEmail } from "@/lib/mailer"; // already exists per README notes

type Body =
  | { action: "approve" }
  | { action: "set_role"; role_id: number }
  | { action: "block" }
  | { action: "unblock" };

// PATCH /api/users/:id   body: { action: "approve" | "set_role" | "block" | "unblock", role_id? }
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireSuperadminApi();
  if (guard.error) return guard.error;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  let patch: Record<string, unknown>;
  switch (body.action) {
    case "approve":
      patch = { account_status: STATUS.APPROVED };
      break;
    case "set_role":
      if (![ROLE_ID.SUPERADMIN, ROLE_ID.ADMIN, ROLE_ID.USER].includes(body.role_id as 1 | 2 | 3)) {
        return NextResponse.json({ error: "Invalid role." }, { status: 400 });
      }
      patch = { role_id: body.role_id };
      break;
    case "block":
      patch = { is_blocked: true };
      break;
    case "unblock":
      patch = { is_blocked: false };
      break;
    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("app_user")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", id)
    .select("user_id, first_name, email, role_id, account_status, is_blocked")
    .single();

  if (error) {
    // The DB trigger is the source of truth for the last-superadmin rule.
    if (isLastSuperadminError(error)) {
      return NextResponse.json({ error: LAST_SUPERADMIN_MESSAGE, code: "LAST_SUPERADMIN" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // if (body.action === "approve") await sendApprovedEmail(data.email, data.first_name).catch(() => {});
  return NextResponse.json({ user: data });
}

// DELETE /api/users/:id  (same last-superadmin protection via trigger)
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireSuperadminApi();
  if (guard.error) return guard.error;

  const { id } = await ctx.params;
  const { error } = await supabaseAdmin.from("app_user").delete().eq("user_id", id);
  if (error) {
    if (isLastSuperadminError(error)) {
      return NextResponse.json({ error: LAST_SUPERADMIN_MESSAGE, code: "LAST_SUPERADMIN" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
