import { supabaseAdmin } from "@/lib/supabase/admin";
const { hashToken } = require("@/lib/auth/reset");
const { POST } = require("../app/api/auth/reset-password/route");
const users = require("./test-users.json");

jest.setTimeout(20000);
const hashes = [];
let userId;

beforeAll(async () => {
  const { data } = await supabaseAdmin.from("app_user").select("user_id")
    .eq("email", users.regularUser.email.toLowerCase()).maybeSingle();
  userId = data.user_id;
});

afterAll(async () => {
  await supabaseAdmin.from("password_reset_tokens").delete().in("token_hash", hashes);
});

async function makeToken(overrides) {
  const raw = `it-${Date.now()}-${Math.random()}`;
  const token_hash = hashToken(raw);
  hashes.push(token_hash);
  const { error } = await supabaseAdmin.from("password_reset_tokens").insert({
    token_hash, user_id: userId, is_used: false,
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
    ...overrides,
  });
  if (error) throw new Error(error.message); // other required columns would show up here
  return raw;
}

const body = (token) => ({ json: async () => ({ token, password: "@NewValidPass1", confirm: "@NewValidPass1" }) });

test("Expired link is rejected", async () => {
  const token = await makeToken({ expires_at: new Date(Date.now() - 60_000).toISOString() });
  const res = await POST(body(token));
  expect(res.status).toBe(400);
  expect((await res.json()).code).toBe("INVALID_LINK");
});

test("Already-used link is rejected", async () => {
  const token = await makeToken({ is_used: true });
  const res = await POST(body(token));
  expect(res.status).toBe(400);
  expect((await res.json()).code).toBe("INVALID_LINK");
});