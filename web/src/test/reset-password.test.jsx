const mockTokenResult = jest.fn();
const mockTokenUpdate = jest.fn();
const mockTokenEq = jest.fn();
const mockTokenGt = jest.fn();
const mockUserUpdate = jest.fn();

jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (table) => {
      if (table === "password_reset_tokens") {
        const q = {};
        q.update = (row) => { mockTokenUpdate(row); return q; };
        q.eq = (col, val) => { mockTokenEq(col, val); return q; };
        q.gt = (col, val) => { mockTokenGt(col, val); return q; };
        q.select = () => q;
        q.maybeSingle = () => mockTokenResult();
        return q;
      }
      return { update: (row) => ({ eq: (col, val) => mockUserUpdate(row, col, val) }) };
    },
  },
}));

const { hashToken } = require("@/lib/auth/reset");
const { PASSWORD_RULES_MESSAGE } = require("@/lib/auth/password");
const { POST } = require("../app/api/auth/reset-password/route");

const req = (body) => ({ json: async () => body });
const INVALID = "This reset link is invalid, expired, or already used.";
const good = { token: "raw-token-123", password: "@NewValidPass1", confirm: "@NewValidPass1" };

beforeEach(() => {
  jest.clearAllMocks();
  mockTokenResult.mockResolvedValue({ data: { user_id: 18 }, error: null });
  mockUserUpdate.mockResolvedValue({ error: null });
});

test("Valid link: updates the password and uses up the token", async () => {
  const res = await POST(req(good));
  expect(res.status).toBe(200);
  expect((await res.json()).ok).toBe(true);

  // the query only matches an unused, unexpired token, looked up by hash
  expect(mockTokenUpdate).toHaveBeenCalledWith({ is_used: true });
  expect(mockTokenEq).toHaveBeenCalledWith("token_hash", hashToken(good.token));
  expect(mockTokenEq).toHaveBeenCalledWith("is_used", false);
  expect(mockTokenGt).toHaveBeenCalledWith("expires_at", expect.any(String));

  const [row, col, val] = mockUserUpdate.mock.calls[0];
  expect(row.password_hash).not.toBe(good.password);
  expect(row.must_change_password).toBe(false);
  expect([col, val]).toEqual(["user_id", 18]);
});

test.each([
  ["expired", null],
  ["already used", null],
  ["unknown", null],
])("Returns 400 INVALID_LINK for %s token", async () => {
  mockTokenResult.mockResolvedValue({ data: null, error: null }); // no row matched
  const res = await POST(req(good));
  const body = await res.json();

  expect(res.status).toBe(400);
  expect(body.code).toBe("INVALID_LINK");
  expect(body.message).toBe(INVALID);
  expect(mockUserUpdate).not.toHaveBeenCalled();
});

test.each([
  ["missing", undefined],
  ["not a string", 12345],
])("Returns 400 when the token is %s", async (_l, token) => {
  const res = await POST(req({ ...good, token }));
  expect(res.status).toBe(400);
  expect((await res.json()).code).toBe("INVALID_LINK");
  expect(mockTokenUpdate).not.toHaveBeenCalled();
});

test("Weak password is rejected without using up the token", async () => {
  const res = await POST(req({ ...good, password: "abc", confirm: "abc" }));
  const body = await res.json();
  expect(res.status).toBe(400);
  expect(body.code).toBe("WEAK");
  expect(body.message).toBe(PASSWORD_RULES_MESSAGE);
  expect(mockTokenUpdate).not.toHaveBeenCalled();
});

test("Mismatched confirm is rejected without using up the token", async () => {
  const res = await POST(req({ ...good, confirm: "@Different1!" }));
  const body = await res.json();
  expect(res.status).toBe(400);
  expect(body.code).toBe("MISMATCH");
  expect(mockTokenUpdate).not.toHaveBeenCalled();
});

test("Returns 500 when the password update fails", async () => {
  mockUserUpdate.mockResolvedValue({ error: { message: "boom" } });
  const res = await POST(req(good));
  expect(res.status).toBe(500);
  expect((await res.json()).code).toBe("SERVER");
});

test.each([
  ["empty", ""],
  ["missing", undefined],
  ["too short", "Ab1!"],
  ["no lowercase", "ABCDEF1!"],
  ["no uppercase", "abcdef1!"],
  ["no digit", "Abcdefg!"],
  ["no special character", "Abcdefg1"],
])("Rejects password: %s, without using up the token", async (_label, password) => {
  const res = await POST(req({ ...good, password, confirm: password }));
  const body = await res.json();

  expect(res.status).toBe(400);
  expect(body.code).toBe("WEAK");
  expect(body.message).toBe(PASSWORD_RULES_MESSAGE);
  expect(mockTokenUpdate).not.toHaveBeenCalled();
});

test("Missing confirm is rejected as a mismatch", async () => {
  const res = await POST(req({ token: good.token, password: good.password }));
  expect(res.status).toBe(400);
  expect((await res.json()).code).toBe("MISMATCH");
});