import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";

const { regularUser } = JSON.parse(readFileSync("./test-users.json", "utf8"));

const url = process.env.SUPABASE_URL; // copy the exact names from lib/supabase/admin
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) throw new Error("Missing Supabase env vars. Run with .env.test loaded.");
if (process.env.ALLOW_SEED !== "true") {
  throw new Error("Refusing to seed. Set ALLOW_SEED=true in .env.test, test DB only.");
}

const supabase = createClient(url, key);

const EMAIL = regularUser.email.toLowerCase(); // the login route lowercases input
const PASSWORD = regularUser.password;

const { data: role, error: roleErr } = await supabase
  .from("role").select("role_id").eq("role_name", "User").maybeSingle();
if (roleErr || !role) throw new Error("User role not found");

// No user_id: the database generates it
const row = {
  first_name: regularUser.firstName,
  last_name: regularUser.lastName,
  email: EMAIL,
  password_hash: await bcrypt.hash(PASSWORD, 12),
  role_id: role.role_id,
  account_status: "active", // confirm this is the value for an approved account
  is_blocked: false,
  must_change_password: false,
};

const { data: existing, error: lookupErr } = await supabase
  .from("app_user").select("user_id").ilike("email", EMAIL).maybeSingle();
if (lookupErr) throw new Error(`Lookup failed: ${lookupErr.message}`);

const { error } = existing
  ? await supabase.from("app_user").update(row).eq("user_id", existing.user_id)
  : await supabase.from("app_user").insert(row);

if (error) throw new Error(`Seed failed: ${error.message}`);
console.log(`${regularUser.label} (${EMAIL})`, existing ? "reset" : "created");