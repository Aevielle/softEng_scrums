import { NextResponse } from "next/server";

jest.mock("@/lib/auth/guard", () => ({
  authorizeApi: jest.fn(),
}));
jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {},
}));
jest.mock("@/lib/auth/permissions", () => ({
  normalizeRole: jest.fn(),
}));
jest.mock("@/lib/auth/rights-layout", () => ({
  RIGHTS_LAYOUT: [],
}));
jest.mock("@/lib/auth/save-rights", () => ({
  RightsError: class RightsError extends Error {},
  saveRightsFromApp: jest.fn(),
}));

import { authorizeApi } from "@/lib/auth/guard";
import { PUT } from "@/app/api/users/[id]/rights/route";

beforeEach(() => {
  jest.resetAllMocks();
});

it("returns 401 when a User or demo request is unauthenticated", async () => {
  const denied = NextResponse.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  authorizeApi.mockResolvedValue({ ok: false, response: denied });

  const res = await PUT(new Request("http://localhost/api/users/1/rights", {
    method: "PUT",
    body: JSON.stringify({ rights: [] }),
  }), { params: Promise.resolve({ id: "1" }) });

  expect(res.status).toBe(401);
  expect(authorizeApi).toHaveBeenCalledWith("users");
});

it("rejects demo sessions before saving rights", async () => {
  authorizeApi.mockResolvedValue({
    ok: true,
    user: { id: null, role: "superadmin" },
  });

  const res = await PUT(new Request("http://localhost/api/users/1/rights", {
    method: "PUT",
    body: JSON.stringify({ rights: [] }),
  }), { params: Promise.resolve({ id: "1" }) });

  expect(res.status).toBe(403);
  expect(await res.json()).toEqual(expect.objectContaining({ code: "NO_ACTOR" }));
});

it("rejects a plain User acting as rights editor", async () => {
  authorizeApi.mockResolvedValue({
    ok: true,
    user: { id: 1, role: "user" },
  });

  const res = await PUT(new Request("http://localhost/api/users/1/rights", {
    method: "PUT",
    body: JSON.stringify({ rights: [] }),
  }), { params: Promise.resolve({ id: "1" }) });

  expect(res.status).toBe(403);
  expect(await res.json()).toEqual(expect.objectContaining({ code: "FORBIDDEN" }));
});
