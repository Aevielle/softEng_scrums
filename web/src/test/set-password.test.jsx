const mockUpdate = jest.fn();
jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: () => ({ update: (row) => ({ eq: (col, val) => mockUpdate(row, col, val) }) }),
  },
}));
jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
  createSession: jest.fn(),
}));

const { getSession, createSession } = require("@/lib/auth/session");
const { PASSWORD_RULES_MESSAGE } = require("@/lib/auth/password");
const { POST } = require("../app/api/auth/set-password/route"); // confirm path

const req = (body) => ({ json: async () => body });
const session = { sub: "18", role: "User", mustChange: true };
const good = { password: "@NewValidPass1", confirm: "@NewValidPass1" };

beforeEach(() => {
  jest.clearAllMocks();
  getSession.mockResolvedValue(session);
  mockUpdate.mockResolvedValue({ error: null });
});

test("Returns 401 when not signed in", async () => {
  getSession.mockResolvedValue(null);
  const res = await POST(req(good));
  expect(res.status).toBe(401);
  expect(mockUpdate).not.toHaveBeenCalled();
});

test.each([
  ["empty", ""],
  ["missing", undefined],
  ["too short", "Ab1!"],
  ["no lowercase", "ABCDEF1!"],
  ["no uppercase", "abcdef1!"],
  ["no digit", "Abcdefg!"],
  ["no special character", "Abcdefg1"],
])("Returns 400 for password: %s", async (_label, password) => {
  const res = await POST(req({ password, confirm: password }));
  const body = await res.json();

  expect(res.status).toBe(400);
  expect(body.message).toBe(PASSWORD_RULES_MESSAGE);
  expect(mockUpdate).not.toHaveBeenCalled();
});

test("Returns 200, stores a hash for the signed-in user and clears mustChange", async () => {
  const res = await POST(req(good));
  const body = await res.json();

  expect(res.status).toBe(200);
  expect(body.redirect).toBe("/dashboard");

  const [row, col, val] = mockUpdate.mock.calls[0];
  expect(row.password_hash).not.toBe(good.password);
  expect(row.must_change_password).toBe(false);
  expect([col, val]).toEqual(["user_id", 18]);
  expect(createSession).toHaveBeenCalledWith({ ...session, mustChange: false });
});

test("Returns 500 and keeps the session when the update fails", async () => {
  mockUpdate.mockResolvedValue({ error: { message: "boom" } });
  const res = await POST(req(good));
  expect(res.status).toBe(500);
  expect(createSession).not.toHaveBeenCalled();
});

// Known bug: the route reads `confirm` but never compares it
test.failing("Rejects when confirm does not match password", async () => {
  const res = await POST(req({ password: "@NewValidPass1", confirm: "@Different1!" }));
  expect(res.status).toBe(400);
});