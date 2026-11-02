const {register} = require("../app/api/register/route");

test("Prevents user registering when one or more fields are empty",async () =>{
    const response = await POST();
    const body = await response.json();

    console.log(response.status);
    console.log(body);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
});