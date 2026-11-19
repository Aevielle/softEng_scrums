jest.mock("@/lib/auth/permissions", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn((url) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

const { getCurrentUser } = require("@/lib/auth/permissions");
const { authorizeApi, requirePageAccess } = require("@/lib/auth/guard");

const user = {
  id: 18,
  firstName: "Test",
  email: "test@example.com",
  role: "user",
  roleLabel: "User",
  mustChange: false,
  allowed: new Set(["customers"]),
};

beforeEach(() => {
  jest.clearAllMocks();
  getCurrentUser.mockResolvedValue(user);
});

describe("requirePageAccess", () => {
  test("redirects unauthenticated users to the home page", async () => {
    getCurrentUser.mockResolvedValue(null);

    await expect(requirePageAccess()).rejects.toThrow("REDIRECT:/");
  });

  test("redirects users who must change their password", async () => {
    getCurrentUser.mockResolvedValue({ ...user, mustChange: true });

    await expect(requirePageAccess()).rejects.toThrow("REDIRECT:/set-password");
  });

  test("redirects users without module access", async () => {
    await expect(requirePageAccess("products")).rejects.toThrow(
      "REDIRECT:/dashboard?denied=products"
    );
  });

  test("returns an authorized user", async () => {
    await expect(requirePageAccess("customers")).resolves.toEqual(user);
  });
});

describe("authorizeApi", () => {
  test("returns 401 for unauthenticated users", async () => {
    getCurrentUser.mockResolvedValue(null);

    const result = await authorizeApi();

    expect(result.ok).toBe(false);
    expect(result.response.status).toBe(401);
  });

  test("returns 403 when a user must change their password", async () => {
    getCurrentUser.mockResolvedValue({ ...user, mustChange: true });

    const result = await authorizeApi();

    expect(result.ok).toBe(false);
    expect(result.response.status).toBe(403);
  });

  test("returns 403 when a user lacks module access", async () => {
    const result = await authorizeApi("products");

    expect(result.ok).toBe(false);
    expect(result.response.status).toBe(403);
  });

  test("returns the authorized user", async () => {
    const result = await authorizeApi("customers");

    expect(result).toEqual({ ok: true, user });
  });
});

