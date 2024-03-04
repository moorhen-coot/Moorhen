module.exports = {
    // "globalSetup":  "<rootDir>/tests/setup.js",
    globalTeardown: "<rootDir>/tests/teardown.js",
    projects: [
        {
            displayName: 'api',
            testMatch: ["<rootDir>/tests/__tests__/*.test.js"]
        },
        {
            displayName: 'jsx',
            testMatch: ['<rootDir>/tests/__tests__/*.test.jsx'],
            testEnvironment: "jsdom",
            preset: 'ts-jest',
            transform: {
                '^.+\\.(ts|tsx)?$': 'ts-jest',
                '^.+\\.(js|jsx)$': 'babel-jest'
            },
        }
    ],
  }