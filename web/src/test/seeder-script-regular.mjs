import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";

const users = JSON.parse(readFileSync(new URL("./test-users.json",import.meta.url), "utf8"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL; // copy the exact names from lib/supabase/admin
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) throw new Error("Missing Supabase env vars. Run with .env.test loaded.");
if (process.env.ALLOW_SEED !== "true") {
  throw new Error("Refusing to seed. Set ALLOW_SEED=true in .env.test, test DB only.");
}

const supabase = createClient(url, key);

const { data: roles, error: rolesErr } = await supabase
  .from("role")
  .select("role_id, role_name");
if (rolesErr) throw new Error(`Role lookup failed: ${rolesErr.message}`);

function roleIdFor(roleName) {
  const expected = roleName.toLowerCase();
  const role = roles.find(({ role_name }) => role_name.toLowerCase() === expected);
  if (!role) throw new Error(`Role "${roleName}" was not found in the role table.`);
  return role.role_id;
}

for (const u of Object.values(users)) {
  const email = u.email.toLowerCase(); // the login route lowercases input

  // No user_id, created_at or updated_at: the database generates them
  const row = {
    first_name: u.firstName,
    last_name: u.lastName,
    email,
    password_hash: await bcrypt.hash(u.password, 12),
    role_id: roleIdFor(u.role),
    account_status: "active", // confirm this is the value for an approved account
    is_blocked: u.is_blocked,
  };

  const { data: matches, error: lookupErr } = await supabase
    .from("app_user")
    .select("user_id")
    .ilike("email", email)
    .order("user_id", { ascending: true });
  if (lookupErr) throw new Error(`Lookup failed: ${lookupErr.message}`);

  const existing = matches?.[0];
  const duplicateIds = (matches ?? []).slice(1).map(({ user_id }) => user_id);

  if (duplicateIds.length > 0) {
    const { error: deleteErr } = await supabase
      .from("app_user")
      .delete()
      .in("user_id", duplicateIds);
    if (deleteErr) throw new Error(`Duplicate cleanup failed for ${email}: ${deleteErr.message}`);
    console.log(`${u.label} (${email})`, `deleted ${duplicateIds.length} duplicate account(s)`);
  }

  const { error } = existing
    ? await supabase.from("app_user").update(row).eq("user_id", existing.user_id)
    : await supabase.from("app_user").insert(row);
  if (error) throw new Error(`Seed failed for ${email}: ${error.message}`);

  console.log(`${u.label} (${email})`, existing ? "reset" : "created");
}