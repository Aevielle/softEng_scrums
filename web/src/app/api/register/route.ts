import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { validatePassword } from "@/lib/auth/password";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const firstName =
      typeof body.firstName === "string"
        ? body.firstName.trim()
        : "";

    const lastName =
      typeof body.lastName === "string"
        ? body.lastName.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    // 1. Required fields
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { message: "Please fill in all required fields." },
        { status: 400 }
      );
    }

    // 2. Email format
    if (!emailPattern.test(email)) {
      return NextResponse.json(
        { message: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // 3. Password strength (shared rules)
    const passwordError = validatePassword(password);

    if (passwordError) {
      return NextResponse.json(
        { message: passwordError },
        { status: 400 }
      );
    }

    // 4. Check for an existing account
    const { data: existingUser, error: lookupError } =
      await supabaseAdmin
        .from("app_user")
        .select("user_id")
        .ilike("email", email)
        .limit(1)
        .maybeSingle();

    if (lookupError) {
      console.error("Email lookup failed:", lookupError.code);

      return NextResponse.json(
        { message: "Unable to verify your email. Please try again." },
        { status: 500 }
      );
    }

    if (existingUser) {
      return NextResponse.json(
        {
          message:
            "This email is already registered. Please sign in instead.",
        },
        { status: 409 }
      );
    }

    // 5. Find the ordinary User role.
    // Adjust role_name if your actual role column differs.
    const { data: userRole, error: roleError } =
      await supabaseAdmin
        .from("role")
        .select("role_id")
        .eq("role_name", "User")
        .maybeSingle();

    if (roleError || !userRole) {
      console.error("User role lookup failed:", roleError?.code);

      return NextResponse.json(
        { message: "The default User role is not configured." },
        { status: 500 }
      );
    }

    // 6. Hash the password before it reaches the database.
    const passwordHash = await bcrypt.hash(password, 12);

    // 7. Create the account. Never insert the raw password.
    const { error: insertError } = await supabaseAdmin
      .from("app_user")
      .insert({
        first_name: firstName,
        last_name: lastName,
        email,
        password_hash: passwordHash,
        role_id: userRole.role_id,
        account_status: "pending",
        is_blocked: false,
      });

    if (insertError) {
      // Unique index also handles concurrent registrations.
      if (insertError.code === "23505") {
        return NextResponse.json(
          {
            message:
              "This email is already registered. Please sign in instead.",
          },
          { status: 409 }
        );
      }

      console.error("Account creation failed:", {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
      });

      return NextResponse.json(
        { message: "Unable to create your account. Please try again." },
        { status: 500 }
      );
    }

    // 8. Do not create a login session here.
    return NextResponse.json(
      {
        message:
          "Registration successful! Your account is waiting for Superadmin approval.",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { message: "Invalid request. Please check your details and try again." },
      { status: 400 }
    );
  }
}