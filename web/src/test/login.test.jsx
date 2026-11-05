jest.mock('../lib/auth/session',() =>({
    createSession: jest.fn(),
}));

function mockNextRequest(bodyData){
    return {
        json: async() => bodyData,
    };
}

test("Returns 400 when one or more fields are empty",async () =>{
    const {POST} = require("../app/api/auth/login/route");
    const mockRequest = mockNextRequest({});
    const response = await POST(mockRequest);
    const body = await response.json();

    console.log(response.status);
    console.log(body.message);

    expect(response.status).toBe(400);
    expect(body.message).toBe("Please fill out the forms.");
});

test("Returns 401 when email is unknown",async () =>{
    const {POST} = require("../app/api/auth/login/route");
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
    const {POST} = require("../app/api/auth/login/route");
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

test("Returns 403 if user is blocked.", async () =>{
    const mockRequest = mockNextRequest({
          firstName:"Blocked",
          lastName:"User",
          email:"blocked_user@domain.com", 
          password:"@ValidPass1",
    });
    const response = await POST(mockRequest);
    const body = await response.json();

    console.log(response.status);
    console.log(body.message);

    expect(response.status).toBe(403);
    expect(body.message).toBe("Your account is blocked. Please contact your administrator.");
});

test("Returns 200 when login is successful")

