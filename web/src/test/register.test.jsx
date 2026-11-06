import {PASSWORD_RULES_MESSAGE} from "@/lib/auth/password";

const mockUserLookup = jest.fn();
const mockInsert = jest.fn();

jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (table) =>
      table === "app_user"
        ? {
            select: () => ({
              ilike: () => ({
                limit: () => ({ maybeSingle: () => mockUserLookup() }),
              }),
            }),
            insert: (row) => mockInsert(row),
          }
        : {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role_id: 1 }, error: null }),
              }),
            }),
          },
  },
}));

const { POST } = require("../app/api/register/route");

function mockNextRequest(bodyData){
    return {
        json: async() => bodyData,
    };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUserLookup.mockResolvedValue({data: null, error: null});
  mockInsert.mockResolvedValue({error: null});
});

test("Returns 400 when one or more fields are empty",async () =>{
    const mockRequest = mockNextRequest({});
    const response = await POST(mockRequest);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe("Please fill in all required fields.");
});

  test.each([
    ["missing @", 'userdomain.com'],
    ["missing local part", '@domain.com'],
    ["missing domain",'user@'],
    ["no TLD",'user@domain'],
    ["contains space",'user @domain.com'],
    ["double @",'user@@domain.com'],
    ["dot-only domain",'user@.com']
  ])('Returns 400 when %s', async (_label, email) => {
    const mockRequest = mockNextRequest({
      firstName:"Test",
      lastName:"User",
      email, 
      password: "@ValidPass1",
    });
    const response = await POST(mockRequest);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe("Please enter a valid email address.");
  });

  // Mock Test
  test("Returns 409 when email already exists", async() =>{
    mockUserLookup.mockResolvedValue({data: {user_id: 1}, error: null});

    const mockRequest = mockNextRequest({
      firstName:"Test",
      lastName:"User",
      email:"taken@domain.com", 
      password: "@ValidPass1",
    });
    const response = await POST(mockRequest);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toBe("This email is already registered. Please sign in instead.");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  test.each([
  ["too short", "Ab1!"],
  ["no lowercase", "ABCDEF1!"],
  ["no uppercase", "abcdef1!"],
  ["no digit", "Abcdefg!"],
  ["no special character", "Abcdefg1"],
])('Returns 400 for password with %s', async(_label, password) =>{
  const mockRequest = mockNextRequest({
      firstName:"Test",
      lastName:"User",
      email:"user@domain.com", 
      password,
    });
    const response = await POST(mockRequest);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe(PASSWORD_RULES_MESSAGE);
})

// Mock Test
test("Succesful register", async() =>{
  const mockRequest = mockNextRequest({
      firstName:"Test",
      lastName:"User",
      email:"user@domain.com", 
      password:"@ValidPass1",
    });
    const response = await POST(mockRequest);
    const body = await response.json();

    console.log(response.status, body.message);

    expect(response.status).toBe(201);
    expect(body.message).toBe("Registration successful! Your account is waiting for Superadmin approval.");
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert.mock.calls[0][0].password_hash).not.toBe("@ValidPass1");
});