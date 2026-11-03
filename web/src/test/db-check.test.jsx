const {GET} = require("../app/api/db-check/route");

test("Supabase connection is successful",async () =>{
    const response = await GET();
    const body = await response.json();

    console.log(response.status);
    console.log(body);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
});