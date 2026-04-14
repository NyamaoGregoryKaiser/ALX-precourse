```javascript
module.exports = {
    testEnvironment: 'node',
    testMatch: [
        '**/tests/**/*.test.js', // Match all test files in the tests directory
    ],
    coverageDirectory: 'coverage',
    collectCoverage: true,
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/app.js', // Exclude app.js as it's mainly config and middleware setup
        '!src/server.js', // Entry point
        '!src/routes/*.js', // Routes are integration tested via API tests
        '!src/db/migrations/*.js', // Migrations are schema definitions, not functional code
        '!src/db/seeds/*.js', // Seeds are data, not functional code
        '!src/config/*.js', // Config files don't need coverage
        '!src/utils/*.js', // Utility classes are generally simple, if complex add specific tests
        '!src/middleware/*.js', // Middleware tested via API tests
    ],
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/tests/',
    ],
    setupFilesAfterEnv: [], // e.g., ['<rootDir>/tests/setup.js'] for global setup
    globalTeardown: '<rootDir>/tests/globalTeardown.js', // Optional: for closing resources like DB
    verbose: true,
};
```