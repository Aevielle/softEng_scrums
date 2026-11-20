import {
  RIGHTS_LAYOUT,
  MODULE_ID_TO_KEY,
} from "@/lib/auth/rights-layout";

describe("rights catalogue layout", () => {
  test("covers modules 1 through 5", () => {
    expect(RIGHTS_LAYOUT.map((module) => module.moduleId))
      .toEqual([1, 2, 3, 4, 5]);
  });

  test.each([
    [1, "customers"],
    [2, "products"],
    [3, "hr"],
    [4, "sales"],
    [5, "reports"],
  ])("maps module %i to %s", (moduleId, key) => {
    expect(MODULE_ID_TO_KEY[moduleId]).toBe(key);
  });

  test("contains the complete catalogue right list", () => {
    const rights = RIGHTS_LAYOUT.flatMap((module) => module.order);
    expect(rights).toHaveLength(36);
    expect(new Set(rights).size).toBe(36);
  });

  test("Customer rights are Add, Edit, and Delete", () => {
    expect(RIGHTS_LAYOUT.find((module) => module.moduleId === 1)?.order)
      .toEqual([3, 2, 1]);
  });

  test("Product rights include all catalogue Add/Edit/Delete and price rights", () => {
    expect(RIGHTS_LAYOUT.find((module) => module.moduleId === 2)?.order)
      .toEqual([9, 8, 7, 6, 5, 4]);
  });

  test("Sales rights include sale and sale-detail rights", () => {
    expect(RIGHTS_LAYOUT.find((module) => module.moduleId === 4)?.order)
      .toHaveLength(7);
  });

  test("Reports rights include all seven report rights", () => {
    expect(RIGHTS_LAYOUT.find((module) => module.moduleId === 5)?.order)
      .toHaveLength(7);
  });
});
