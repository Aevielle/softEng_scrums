jest.mock('../lib/auth/session',() =>({
    createSession: jest.fn(),
}));

const { createSession } = require("@/lib/auth/session");
const {POST} = require("../app/api/auth/login/route");
const users = require("./test-users.json");


function mockNextRequest(bodyData){
    return {
        json: async() => bodyData,
    };
}

test("Returns 400 when one or more fields are empty",async () =>{
    const mockRequest = mockNextRequest({});
    const response = await POST(mockRequest);
    const body = await response.json();

    console.log(response.status);
    console.log(body.message);

    expect(response.status).toBe(400);
    expect(body.message).toBe("Please fill out the forms.");
});

test("Returns 401 when email is unknown",async () =>{
    const mockRequest = mockNextRequest({
          firstName:"Test",
          lastName:"User",
          email:"user@domain.com", 
          password:"@ValidPass",
    });
    const response = await POST(mockRequest);
    const body = await response.json();

    console.log(response.status);
    console.log(body.message);

    expect(response.status).toBe(401);
    expect(body.message).toBe("Invalid email or password. Please check and try again.");
});

test("Returns 401 when password is wrong",async () =>{
    const mockRequest = mockNextRequest({
          firstName:"Regular",
          lastName:"User",
          email:"seed.user@domain.com", 
          password:"@ValidPass",
    });
    const response = await POST(mockRequest);
    const body = await response.json();

    console.log(response.status);
    console.log(body.message);

    expect(response.status).toBe(401);
    expect(body.message).toBe("Invalid email or password. Please check and try again.");
});

test("Returns 403 if user is blocked.", async () =>{
    const mockRequest = mockNextRequest({
          firstName:"Blocked",
          lastName:"User",
          email: "seed.blocked_user@example.com", 
          password:"@ValidPass1",
    });
    const response = await POST(mockRequest);
    const body = await response.json();

    console.log(response.status);
    console.log(body.message);

    expect(response.status).toBe(403);
    expect(body.message).toBe("Your account is blocked. Please contact your administrator.");
});

test("Returns 200 when login is successful", async() => {
    const mockRequest = mockNextRequest({
      firstName:"Regular",
      lastName:"User",
      email:"seed.user@example.com", 
      password:"@ValidPass1",
    });
    const response = await POST(mockRequest);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.redirect).toBe("/dashboard");
    expect(createSession).toHaveBeenCalledTimes(1);
    expect(createSession.mock.calls[0][0].role).toBe("User");
})

