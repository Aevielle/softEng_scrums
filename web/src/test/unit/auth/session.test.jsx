import { SignJWT, jwtVerify } from "jose";

const mockSet = jest.fn();
const mockGet = jest.fn();
const mockDelete = jest.fn();

jest.mock("next/headers", () => ({
  cookies: async () => ({ set: mockSet, get: mockGet, delete: mockDelete }),
}));

const { createSession, getSession, destroySession, COOKIE } = require("@/lib/auth/session");

const secretKey = () => new TextEncoder().encode(process.env.SESSION_SECRET);
const user = { sub: "18", role: "User", mustChange: false };

beforeEach(() => {
  jest.clearAllMocks();
});

test("SESSION_SECRET is set for tests", () => {
  expect(process.env.SESSION_SECRET).toBeTruthy();
});

describe("createSession", () => {
  test("sets a signed, httpOnly cookie with the user's id and role", async () => {
    await createSession(user, false);

    expect(mockSet).toHaveBeenCalledTimes(1);
    const [name, token, options] = mockSet.mock.calls[0];

    expect(name).toBe(COOKIE);
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");

    const { payload } = await jwtVerify(token, secretKey());
    expect(payload.sub).toBe("18");
    expect(payload.role).toBe("User");
    expect(payload.mustChange).toBe(false);
  });

  test("remember = false gives a browser-session cookie (no maxAge)", async () => {
    await createSession(user, false);
    expect(mockSet.mock.calls[0][2].maxAge).toBeUndefined();
  });

  test("remember = true gives a 30-day cookie", async () => {
    await createSession(user, true);
    expect(mockSet.mock.calls[0][2].maxAge).toBe(60 * 60 * 24 * 30);
  });
});

describe("getSession", () => {
  test("returns null when there is no cookie", async () => {
    mockGet.mockReturnValue(undefined);
    expect(await getSession()).toBeNull();
  });

  test("returns null for a garbage token", async () => {
    mockGet.mockReturnValue({ value: "not-a-real-token" });
    expect(await getSession()).toBeNull();
  });

  test("returns null for a token signed with a different secret", async () => {
    const forged = await new SignJWT({ ...user, role: "Superadmin" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("some-other-secret-value"));

    mockGet.mockReturnValue({ value: forged });
    expect(await getSession()).toBeNull();
  });

  test("returns null for an expired token", async () => {
    const expired = await new SignJWT({ ...user })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(secretKey());

    mockGet.mockReturnValue({ value: expired });
    expect(await getSession()).toBeNull();
  });

  test("returns the same session that createSession signed", async () => {
    await createSession(user, false);
    const token = mockSet.mock.calls[0][1];

    mockGet.mockReturnValue({ value: token });
    const session = await getSession();

    expect(session.sub).toBe("18");
    expect(session.role).toBe("User");
    expect(session.mustChange).toBe(false);
  });
});

describe("destroySession", () => {
  test("deletes the session cookie", async () => {
    await destroySession();
    expect(mockDelete).toHaveBeenCalledWith(COOKIE);
  });
});