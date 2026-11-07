jest.mock("@/lib/auth/session", () => ({
    destroySession: jest.fn(),
}));

const {destroySession} = require("@/lib/auth/session");
const {POST} = require("../app/api/auth/login/route");


//Mock Test
test("Returns 200 and clears the session on logout", async () => {
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(destroySession).toHaveBeenCalledTimes(1);
});

//Actual (Unit Test Only)