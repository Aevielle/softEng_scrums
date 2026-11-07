/** @jest-environment node */
import { SignJWT } from "jose";
import { NextRequest } from "next/server";

const { proxy } = require("../proxy"); // confirm path: src/proxy.ts or src/middleware

const secretKey = () => new TextEncoder().encode(process.env.SESSION_SECRET);

const sign = (payload, key = secretKey()) =>
  new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(key);

const makeReq = (path, token) =>
  new NextRequest(`http://localhost:3000${path}`, {
    headers: token ? { cookie: `session=${token}` } : {},
  });

const redirectPath = (res) =>
  res.headers.get("location") && new URL(res.headers.get("location")).pathname;

const user = { sub: "18", role: "User", mustChange: false };

test("SESSION_SECRET is set for tests", () => {
  expect(process.env.SESSION_SECRET).toBeTruthy();
});

describe("logged out", () => {
  test.each(["/dashboard", "/dashboard/anything", "/set-password"])(
    "%s redirects to /login",
    async (path) => {
      const res = await proxy(makeReq(path));
      expect(res.status).toBe(307);
      expect(redirectPath(res)).toBe("/login");
    }
  );

  test("/login is reachable", async () => {
    const res = await proxy(makeReq("/login"));
    expect(res.headers.get("location")).toBeNull();
  });

  test("a garbage cookie counts as logged out", async () => {
    const res = await proxy(makeReq("/dashboard", "not-a-real-token"));
    expect(redirectPath(res)).toBe("/login");
  });

  test("a token signed with another secret counts as logged out", async () => {
    const forged = await sign(
      { ...user, role: "Superadmin" },
      new TextEncoder().encode("some-other-secret-value")
    );
    const res = await proxy(makeReq("/dashboard", forged));
    expect(redirectPath(res)).toBe("/login");
  });
});

describe("signed in", () => {
  test("/dashboard passes through with no-store caching", async () => {
    const res = await proxy(makeReq("/dashboard", await sign(user)));
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  test("/login redirects to /dashboard", async () => {
    const res = await proxy(makeReq("/login", await sign(user)));
    expect(redirectPath(res)).toBe("/dashboard");
  });

  test("/set-password is reachable", async () => {
    const res = await proxy(makeReq("/set-password", await sign(user)));
    expect(res.headers.get("location")).toBeNull();
  });
});

describe("first login (mustChange)", () => {
  const first = { ...user, mustChange: true };

  test("/dashboard redirects to /set-password", async () => {
    const res = await proxy(makeReq("/dashboard", await sign(first)));
    expect(redirectPath(res)).toBe("/set-password");
  });

  test("/login redirects to /set-password", async () => {
    const res = await proxy(makeReq("/login", await sign(first)));
    expect(redirectPath(res)).toBe("/set-password");
  });

  test("/set-password is reachable", async () => {
    const res = await proxy(makeReq("/set-password", await sign(first)));
    expect(res.headers.get("location")).toBeNull();
  });
});