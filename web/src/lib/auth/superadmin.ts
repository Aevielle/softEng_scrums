import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin"; // adjust to your real export
import { ROLE_ID, STATUS } from "@/lib/users/approval"; // adjust to your real export

export async function requireSuperadminApi() {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Not signed in." }, { status: 401 }), me: null };
  }

  const { data: me } = await supabaseAdmin
    .from("app_user")
    .select("user_id, role_id, account_status, is_blocked")
    .eq("user_id", session.sub)
    .single();

  const isActiveSuperadmin =
    me && me.role_id === ROLE_ID.SUPERADMIN && me.account_status === STATUS.APPROVED && !me.is_blocked;

  if (!isActiveSuperadmin) {
    return { error: NextResponse.json({ error: "Only a Superadmin can do this." }, { status: 403 }), me: null };
  }
  return { error: null, me };
}