jest.mock('../lib/auth/session',() =>({
    createSession: jest.fn(),
}));

function mockNextRequest(bodyData){
    return {
        json: async() => bodyData,
    };
}

test("Prevents user login when one or more fields are empty",async () =>{
    const {POST} = require("../app/api/auth/login/route");
    const mockRequest = mockNextRequest({});
    const response = await POST(mockRequest);
    const body = await response.json();

    console.log(response.status);
    console.log(body.message);

    expect(response.status).toBe(400);
    expect(body.message).toBe("Please fill out the forms.");
});