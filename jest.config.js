/** @type {import('jest').Config} */
const config = {
  rootDir: '.',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.spec.json',
      },
    ],
  },
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: 'coverage',
  testMatch: ['**/__tests__/**/*.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup-tests.js'],
};

module.exports = config;
