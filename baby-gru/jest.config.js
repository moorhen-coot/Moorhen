module.exports = {
    // "globalSetup":  "<rootDir>/tests/setup.js",
    globalTeardown: "<rootDir>/tests/teardown.js",
    projects: [
        {
            displayName: "api-utils",
            testMatch: ["<rootDir>/tests/__tests__/*.test.js"],
            transform: {
                "^.+/public/MoorhenAssets/wasm/CootWorker\\.js$": "<rootDir>/tests/__mocks__/cootWorkerTransformer.cjs",
                "^.+\\.(ts|tsx)?$": "babel-jest",
                "^.+\\.(js|jsx)$": "babel-jest",
            },
            transformIgnorePatterns: ["node_modules/(?!(uuid|node-fetch)/)"],
        },
        {
            displayName: "react-components",
            testMatch: ["<rootDir>/tests/__tests__/*.test.jsx"],
            testEnvironment: "jsdom",
            preset: "ts-jest",
            transform: {
                "^.+/public/MoorhenAssets/wasm/CootWorker\\.js$": "<rootDir>/tests/__mocks__/cootWorkerTransformer.cjs",
                "^.+\\.(ts|tsx)?$": "ts-jest",
                "^.+\\.(js|jsx)$": "babel-jest",
            },
            transformIgnorePatterns: ["node_modules/(?!(uuid)/)"],
            moduleNameMapper: {
                "\\.(css|less|scss)$": "<rootDir>/tests/__mocks__/mockStyle.js",
                "\\.(svg)$": "<rootDir>/tests/__mocks__/mockSvg.js",
                mockService: "<rootDir>/tests/__mocks__",
                "@/(.*)": "<rootDir>/src/$1"
            },
        },
    ],
};
