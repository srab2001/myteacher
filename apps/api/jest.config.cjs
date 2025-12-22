/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/index.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  clearMocks: true,
  injectGlobals: true,
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.\\./)+lib/db(\\.js)?$': '<rootDir>/src/__mocks__/lib/db.ts',
    '^@prisma/client$': '<rootDir>/src/__mocks__/lib/db.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^(.*)/prisma/generated/client/index\\.js$': '<rootDir>/src/__mocks__/lib/db.ts',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      isolatedModules: true,
    }],
  },
};
