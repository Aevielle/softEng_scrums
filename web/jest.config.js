const nextJest = require("next/jest");
const createJestConfig = nextJest({dir:"./"});

module.exports = createJestConfig({testEnvironment:"node",
                setupFilesAfterEnv:["<rootDir>/jest.setup.js"],
});