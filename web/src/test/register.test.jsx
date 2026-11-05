import {PASSWORD_RULES_MESSAGE} from "@/lib/auth/password";
function mockNextRequest(bodyData){
    return {
        json: async() => bodyData,
    };
}
const {POST} = require("../app/api/register/route");
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

  test("Returns 409 when email already exists", async() =>{
    const mockRequest = mockNextRequest({
      firstName:"Chesca",
      lastName:"Ramirez",
      email:"chesca@hope.erp", 
      password: "@ValidPass1",
    });
    const response = await POST(mockRequest);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toBe("This email is already registered. Please sign in instead.");
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

// Registers a real account
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
})