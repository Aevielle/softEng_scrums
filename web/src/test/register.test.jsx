function mockNextRequest(bodyData){
    return {
        json: async() => bodyData,
    };
}
const { describe } = require("node:test");
const {POST} = require("../app/api/register/route");
test("Prevents user registering when one or more fields are empty",async () =>{
   
    const mockRequest = mockNextRequest({});
    const response = await POST(mockRequest);
    const body = await response.json();

    console.log(response.status);
    console.log(body.message);

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
  ])('returns 400 for %s', async (_label, email) => {
    const mockRequest = mockNextRequest({email, password: "@ValidPass1"});
    const response = await POST(mockRequest);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe("Please enter a valid email address.");
  })