import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "../../../../lib/supabase/admin";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export async function POST(request) {
  try {
    const body = await request.json();
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ ok: false, message: "Please fill out the forms." }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, message: "Enter valid email address." }, { status: 400 });
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return NextResponse.json({ ok: false, message: "Use 8+ characters with letters and numbers." }, { status: 400 });
    }

    // Already registered?
    const { data: existing } = await supabaseAdmin
      .from("app_user")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: false, message: "That email is already registered." }, { status: 409 });
    }

    // Default role = "user" (matches role_name in any capitalization)
    const { data: role } = await supabaseAdmin
      .from("role")
      .select("role_id")
      .ilike("role_name", "user")
      .maybeSingle();

    if (!role) {
      return NextResponse.json(
        { ok: false, message: 'Default role "user" was not found in the role table.' },
        { status: 500 }
      );
    }

    const password_hash = await bcrypt.hash(password, 12);

    const { error } = await supabaseAdmin.from("app_user").insert({
      first_name: firstName,
      last_name: lastName,
      email,
      password_hash,
      role_id: role.role_id,
      account_status: "active", // active immediately
      is_blocked: false,
    });

    if (error) {
      console.error("register insert error:", error);
      return NextResponse.json({ ok: false, message: "Registration failed. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Registration successful!" });
  } catch (err) {
    console.error("register error:", err);
    return NextResponse.json({ ok: false, message: "Server error. Please try again." }, { status: 500 });
  }
}