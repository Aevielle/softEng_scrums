jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {},
}));

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}));

import {
  MODULES,
  normalizeRole,
  accessFor,
} from "@/lib/auth/permissions";

describe("normalizeRole", () => {
  test.each([
    ["Superadmin", "superadmin"],
    ["super_admin", "superadmin"],
    ["super-admin", "superadmin"],
    ["ADMIN", "admin"],
    ["Admin", "admin"],
    ["User", "user"],
    [null, "user"],
  ])("normalizes %p to %p", (input, expected) => {
    expect(normalizeRole(input)).toBe(expected);
  });
});

describe("accessFor", () => {
  test("Superadmin receives every module", () => {
    expect([...accessFor("superadmin", [])]).toEqual(
      expect.arrayContaining(MODULES.map((module) => module.key))
    );
  });

  test("Admin receives every module except System Settings", () => {
    const allowed = accessFor("admin", []);
    expect([...allowed]).not.toContain("settings");
    expect([...allowed]).toContain("users");
    expect([...allowed]).toContain("customers");
  });

  test("User receives only granted business modules", () => {
    expect([...accessFor("user", ["customers", "sales", "users", "settings"])])
      .toEqual(expect.arrayContaining(["customers", "sales"]));
  });

  test("User has no module access when no rights are granted", () => {
    expect(accessFor("user", [])).toEqual(new Set());
  });
});
