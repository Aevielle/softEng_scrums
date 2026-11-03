function mockNextRequest(bodyData){
    return {
        json: async() => bodyData,
    };
}

test("Prevents user registering when one or more fields are empty",async () =>{
    const {POST} = require("../app/api/register/route");
    const mockRequest = mockNextRequest({});
    const response = await POST(mockRequest);
    const body = await response.json();

    console.log(response.status);
    console.log(body);

    expect(response.status).toBe(400);
    expect(body.message).toBe("Please fill in all required fields.");
});