jest.mock("@/lib/auth/guard", () => ({ requirePageAccess: jest.fn() }));
jest.mock("next/navigation", () => ({
  redirect: jest.fn((url) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
jest.mock("@/app/dashboard/LogoutButton", () => () => null);

const { requirePageAccess } = require("@/lib/auth/guard");
const Dashboard = require("@/app/dashboard/page").default;

const user = (role) => ({
  id: 18,
  firstName: "Test",
  email: "test@example.com",
  role,
  roleLabel: role === "superadmin" ? "Superadmin" : role === "admin" ? "Admin" : "User",
  mustChange: false,
  allowed: new Set(["customers"]),
});

beforeEach(() => jest.clearAllMocks());

test("Renders the dashboard after page access is authorized", async () => {
  requirePageAccess.mockResolvedValue(user("user"));

  const page = await Dashboard({ searchParams: Promise.resolve({}) });

  expect(requirePageAccess).toHaveBeenCalledWith();
  expect(page.type).toBe("div");
});

test.each(["user", "admin", "superadmin"])(
  "passes the authorized %s user into the dashboard",
  async (role) => {
    requirePageAccess.mockResolvedValue(user(role));

    await Dashboard({ searchParams: Promise.resolve({}) });

    expect(requirePageAccess).toHaveBeenCalledWith();
  }
);

test("propagates page-access redirects", async () => {
  requirePageAccess.mockRejectedValue(new Error("REDIRECT:/set-password"));

  await expect(
    Dashboard({ searchParams: Promise.resolve({}) })
  ).rejects.toThrow("REDIRECT:/set-password");
});