import { supabaseAdmin } from "@/lib/supabase/admin";
const bcrypt = require("bcryptjs");

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
  createSession: jest.fn(),
}));

const { getSession, createSession } = require("@/lib/auth/session");
const { POST } = require("../app/api/auth/set-password/route"); // confirm path

jest.setTimeout(20000);

const email = `it.setpw.${Date.now()}@example.com`;
const oldPassword = "@OldValidPass1";
const newPassword = "@NewValidPass1";
let userId;
let oldHash;

const req = (body) => ({ json: async () => body });
const readHash = async () =>
  (await supabaseAdmin.from("app_user").select("password_hash").eq("user_id", userId).single()).data.password_hash;

beforeAll(async () => {
  oldHash = await bcrypt.hash(oldPassword, 10);
  const { data, error } = await supabaseAdmin
    .from("app_user")
    .insert({
      first_name: "Temp", last_name: "SetPw", email,
      password_hash: oldHash, role_id: 3,
      account_status: "active", is_blocked: false,
    })
    .select("user_id")
    .single();
  if (error) throw new Error(error.message);
  userId = data.user_id;
});

afterAll(async () => {
  await supabaseAdmin.from("app_user").delete().eq("user_id", userId);
});

beforeEach(() => {
  jest.clearAllMocks();
  getSession.mockResolvedValue({ sub: String(userId), role: "User", mustChange: true });
});

test("Weak password is rejected and the stored hash is unchanged", async () => {
  const res = await POST(req({ password: "abc", confirm: "abc" }));
  expect(res.status).toBe(400);
  expect(await readHash()).toBe(oldHash);
});

test("Valid password replaces the stored hash", async () => {
  const res = await POST(req({ password: newPassword, confirm: newPassword }));
  const body = await res.json();

  expect(res.status).toBe(200);
  expect(body.redirect).toBe("/dashboard");

  const hash = await readHash();
  expect(hash).not.toBe(oldHash);
  expect(await bcrypt.compare(newPassword, hash)).toBe(true);
  expect(await bcrypt.compare(oldPassword, hash)).toBe(false); // old password no longer works
  expect(createSession).toHaveBeenCalledWith(expect.objectContaining({ mustChange: false }));
});