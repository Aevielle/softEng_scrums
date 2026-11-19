import { supabaseAdmin } from "@/lib/supabase/admin";
const users = require("@/test/test-users.json");

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/app/dashboard/LogoutButton", () => () => null);

const { getSession } = require("@/lib/auth/session");
const Dashboard = require("@/app/dashboard/page").default;

jest.setTimeout(20000);

const seededUsers = ["regularUser", "admin", "superadmin"];
const collectedText = (node) => {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(collectedText).join("");
  if (node && node.props) return collectedText(node.props.children);
  return "";
};

let databaseUsers;

beforeAll(async () => {
  databaseUsers = {};

  for (const key of seededUsers) {
    const seeded = users[key];
    const { data, error } = await supabaseAdmin
      .from("app_user")
      .select("user_id, first_name, email")
      .ilike("email", seeded.email)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error(`Seeded user was not found: ${seeded.email}`);
    databaseUsers[key] = data;
  }
});

beforeEach(() => jest.clearAllMocks());

test.each([
  ["regularUser", "user"],
  ["admin", "admin"],
  ["superadmin", "superadmin"],
])("renders the dashboard for the seeded %s", async (key, role) => {
  const seeded = databaseUsers[key];
  getSession.mockResolvedValue({
    sub: String(seeded.user_id),
    role,
    mustChange: false,
  });

  const page = await Dashboard({ searchParams: Promise.resolve({}) });
  const text = collectedText(page);

  expect(page.type).toBe("div");
  expect(text).toContain(`Welcome back, ${seeded.first_name}!`);
});
