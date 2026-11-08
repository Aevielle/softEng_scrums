const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

const customConfig = {
  setupFiles: ["<rootDir>/jest.setup.js"],       // or setupFilesAfterEach, whichever you had
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testEnvironment: "node",                        // if your old config had it
};

module.exports = async () => {
  const config = await createJestConfig(customConfig)();
  config.transformIgnorePatterns = [
    "/node_modules/(?!(jose)/)",
    "^.+\\.module\\.(css|sass|scss)$",
  ];
  return config;
};