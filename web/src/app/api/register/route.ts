import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { validatePassword } from "@/lib/auth/password";
import { sendRegistrationEmail } from "@/lib/auth/mailer";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// "pending" = needs approval inside the app, "active" = can sign in immediately
const ACCOUNT_STATUS = "pending";

const MAIL_TIMEOUT_MS = 8000;

const reply = (
  ok: boolean,
  message: string,
  status: number,
  extra: Record<string, unknown> = {}
) => NextResponse.json({ ok, message, ...extra }, { status });

// A slow mail server must never hang sign-up
async function withTimeout(task: Promise<void>, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Email timed out")), ms);
  });
  try {
    await Promise.race([task, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

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

    if (!firstName || !lastName || !email || !password) {
      return reply(false, "Please fill in all required fields.", 400);
    }
    if (!EMAIL_RE.test(email)) {
      return reply(false, "Please enter a valid email address.", 400);
    }

    const passwordError = validatePassword(password);
    if (passwordError) return reply(false, passwordError, 400);

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

    const { data: userRole, error: roleError } = await supabaseAdmin
      .from("role")
      .select("role_id")
      .ilike("role_name", "user")
      .maybeSingle();

    if (roleError || !userRole) {
      console.error("[register] role lookup failed:", roleError?.message, roleError?.code);
      return reply(false, "The default User role is not configured.", 500);
    }

    const passwordHash = await bcrypt.hash(password, 12);

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
      if (insertError.code === "23505") {
        return reply(false, "This email is already registered. Please sign in instead.", 409);
      }
      console.error("[register] insert failed:", insertError.message, insertError.code, insertError.details);
      return reply(false, "Unable to create your account. Please try again.", 500);
    }

    // The account exists now. A mail problem must not undo it,
    // so it is reported through "emailSent" instead of an error.
    let emailSent = false;
    try {
      await withTimeout(
        sendRegistrationEmail(email, firstName, ACCOUNT_STATUS === "pending"),
        MAIL_TIMEOUT_MS
      );
      emailSent = true;
    } catch (err) {
      console.error("[register] confirmation email failed:", err);
    }

    return reply(
      true,
      ACCOUNT_STATUS === "pending"
        ? "Registration successful! Your account is waiting for approval."
        : "Registration successful!",
      201,
      { emailSent }
    );
  } catch (err) {
    console.error("[register] unexpected error:", err);
    return reply(false, "Server error. Please try again.", 500);
  }
}