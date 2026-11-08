import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { validatePassword } from "@/lib/auth/password";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// "pending" = needs Superadmin approval, "active" = can sign in immediately
const ACCOUNT_STATUS = "pending";

const reply = (ok: boolean, message: string, status: number) =>
  NextResponse.json({ ok, message }, { status });

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return reply(false, "Invalid request. Please check your details and try again.", 400);
    }

    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    // 1. Required fields
    if (!firstName || !lastName || !email || !password) {
      return reply(false, "Please fill in all required fields.", 400);
    }

    // 2. Email format
    if (!EMAIL_RE.test(email)) {
      return reply(false, "Please enter a valid email address.", 400);
    }

    // 3. Password strength (shared rules in lib/auth/password.ts)
    const passwordError = validatePassword(password);
    if (passwordError) return reply(false, passwordError, 400);

    // 4. Existing account (emails are stored lowercase, so eq is enough;
    //    ilike would treat "_" and "%" in an email as wildcards)
    const { data: existingUser, error: lookupError } = await supabaseAdmin
      .from("app_user")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();

    if (lookupError) {
      console.error("[register] email lookup failed:", lookupError.message, lookupError.code);
      return reply(false, "Unable to verify your email. Please try again.", 500);
    }

    if (existingUser) {
      return reply(false, "This email is already registered. Please sign in instead.", 409);
    }

    // 5. Default role (case-insensitive match on "user")
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from("role")
      .select("role_id")
      .ilike("role_name", "user")
      .maybeSingle();

    if (roleError || !userRole) {
      console.error("[register] role lookup failed:", roleError?.message, roleError?.code);
      return reply(false, "The default User role is not configured.", 500);
    }

    // 6. Hash before it reaches the database
    const passwordHash = await bcrypt.hash(password, 12);

    // 7. Create the account (never insert the raw password)
    const { error: insertError } = await supabaseAdmin.from("app_user").insert({
      first_name: firstName,
      last_name: lastName,
      email,
      password_hash: passwordHash,
      role_id: userRole.role_id,
      account_status: ACCOUNT_STATUS,
      is_blocked: false,
    });

    if (insertError) {
      // The unique index also covers concurrent registrations
      if (insertError.code === "23505") {
        return reply(false, "This email is already registered. Please sign in instead.", 409);
      }

      console.error("[register] insert failed:", insertError.message, insertError.code, insertError.details);
      return reply(false, "Unable to create your account. Please try again.", 500);
    }

    // 8. No session here: the user signs in afterwards
    return reply(
      true,
      ACCOUNT_STATUS === "pending"
        ? "Registration successful! Your account is waiting for Superadmin approval."
        : "Registration successful!",
      201
    );
  } catch (err) {
    console.error("[register] unexpected error:", err);
    return reply(false, "Server error. Please try again.", 500);
  }
}