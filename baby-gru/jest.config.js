module.exports = {
    // "globalSetup":  "<rootDir>/tests/setup.js",
    globalTeardown: "<rootDir>/tests/teardown.js",
    projects: [
        {
            displayName: "api-utils",
            testMatch: ["<rootDir>/tests/__tests__/*.test.js"],
            transformIgnorePatterns: ["node_modules/(?!(uuid|node-fetch)/)"],
        },
        {
            displayName: "react-components",
            testMatch: ["<rootDir>/tests/__tests__/*.test.jsx"],
            testEnvironment: "jsdom",
            preset: "ts-jest",
            transform: {
                "^.+\\.(ts|tsx)?$": "ts-jest",
                "^.+\\.(js|jsx)$": "babel-jest",
            },
            transformIgnorePatterns: ["node_modules/(?!(uuid)/)"],
            moduleNameMapper: {
                "\\.(css|less|scss)$": "<rootDir>/tests/__mocks__/mockStyle.js",
                mockService: "<rootDir>/tests/__mocks__",
            },
        },
    ],
};
