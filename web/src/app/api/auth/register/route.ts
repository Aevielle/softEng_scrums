import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { validatePassword } from "@/lib/auth/password";
import { sendRegistrationEmail } from "@/lib/auth/mailer";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// "pending" = needs Admin approval, "active" = can sign in immediately
const ACCOUNT_STATUS: "pending" | "active" = "pending";

const reply = (ok: boolean, message: string, status: number, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ ok, message, ...extra }, { status });

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
      return reply(false, "Please fill out the forms.", 400);
    }
    if (!EMAIL_RE.test(email)) {
      return reply(false, "Enter valid email address.", 400);
    }
    const passwordError = validatePassword(password);
    if (passwordError) return reply(false, passwordError, 400);

    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("app_user")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();

    if (lookupError) {
      console.error("[register] email lookup failed:", lookupError.message, lookupError.code);
      return reply(false, "Unable to verify your email. Please try again.", 500);
    }
    if (existing) {
      return reply(false, "That email is already registered.", 409);
    }

    // Case-insensitive match on the default role
    const { data: role, error: roleError } = await supabaseAdmin
      .from("role")
      .select("role_id")
      .ilike("role_name", "user")
      .maybeSingle();

    if (roleError || !role) {
      console.error("[register] role lookup failed:", roleError?.message, roleError?.code);
      return reply(false, 'Default role "user" was not found in the role table.', 500);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const { error: insertError } = await supabaseAdmin.from("app_user").insert({
      first_name: firstName,
      last_name: lastName,
      email,
      password_hash: passwordHash,
      role_id: role.role_id,
      account_status: ACCOUNT_STATUS,
      is_blocked: false,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return reply(false, "That email is already registered.", 409);
      }
      console.error("[register] insert failed:", insertError.message, insertError.code, insertError.details);
      return reply(false, "Registration failed. Please try again.", 500);
    }

    // Confirmation email. The account already exists, so a mail failure must
    // not turn a successful registration into an error: report it via emailSent.
    let emailSent = false;
    try {
      await sendRegistrationEmail(email, firstName, ACCOUNT_STATUS === "pending");
      emailSent = true;
    } catch (mailError) {
      console.error("[register] confirmation email failed:", mailError);
    }

    return reply(
      true,
      ACCOUNT_STATUS === "pending"
        ? "Registration successful! Your account is waiting for Admin approval."
        : "Registration successful!",
      201,
      { emailSent }
    );
  } catch (err) {
    console.error("[register] unexpected error:", err);
    return reply(false, "Server error. Please try again.", 500);
  }
}