import { supabaseAdmin } from "@/lib/supabase/admin";
const { POST } = require("../app/api/register/route");

const email = `it.register.${Date.now()}@example.com`;

afterAll(async () => {
  await supabaseAdmin.from("app_user").delete().eq("email", email);
});

// API to Database
test("Registers a real account as pending", async () => {
  const response = await POST({
    json: async () => ({ firstName: "Test", lastName: "User", email, password: "@ValidPass1" }),
  });
  const body = await response.json();

  expect(response.status).toBe(201);

  const { data } = await supabaseAdmin
    .from("app_user").select("account_status, role_id").eq("email", email).maybeSingle();
  expect(data.account_status).toBe("pending");
  expect(data.role_id).toBe(3);
});