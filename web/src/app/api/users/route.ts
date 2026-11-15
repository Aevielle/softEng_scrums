import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin"; // <-- adjust export name if different
import { requireSuperadminApi } from "@/lib/auth/superadmin";
import { STATUS } from "@/lib/users/approval";

// GET /api/users?status=pending  -> list of users (never returns password_hash)
// NOTE: if S1-DEV-05 already defines GET here, merge the `status` filter into it.
export async function GET(req: Request) {
  const guard = await requireSuperadminApi();
  if (guard.error) return guard.error;

  const status = new URL(req.url).searchParams.get("status");
  let query = supabaseAdmin
    .from("app_user")
    .select("user_id, first_name, last_name, email, role_id, account_status, is_blocked, created_at")
    .order("created_at", { ascending: true });

  if (status === STATUS.PENDING || status === STATUS.APPROVED) {
    query = query.eq("account_status", status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data });
}
