jest.mock("@/lib/auth/session", () => ({ getSession: jest.fn() }));
jest.mock("next/navigation", () => ({
  redirect: jest.fn((url) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
jest.mock("../app/dashboard/LogoutButton", () => () => null); // confirm path

const { getSession } = require("@/lib/auth/session");
const Dashboard = require("../app/dashboard/page").default; // confirm path

// Dashboard() returns <Suspense><DashboardContent /></Suspense>
const runContent = () => {
  const content = Dashboard().props.children;
  return content.type();
};

beforeEach(() => jest.clearAllMocks());

test("Redirects to /login when logged out", async () => {
  getSession.mockResolvedValue(null);
  await expect(runContent()).rejects.toThrow("REDIRECT:/login");
});

test("Redirects to /set-password when mustChange is true", async () => {
  getSession.mockResolvedValue({ sub: "18", role: "User", mustChange: true });
  await expect(runContent()).rejects.toThrow("REDIRECT:/set-password");
});

test.each([
  ["User", 3],
  ["Admin", 2],
  ["Superadmin", 1],
])("Renders the dashboard for role %s", async (role) => {
  getSession.mockResolvedValue({ sub: "18", role, mustChange: false });
  const page = await runContent();

  const [heading, paragraph] = page.props.children;
  expect(heading.props.children).toBe("Welcome to Hope, Inc. ERP");
  expect(paragraph.props.children).toEqual(["Signed in as role: ", role]);
});