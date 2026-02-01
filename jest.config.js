/** @type {import('jest').Config} */
const tsJestTransform = ['ts-jest', {
  tsconfig: 'tsconfig.json'
}];

module.exports = {
  testEnvironment: 'node',
  // Ignore generated output directories to avoid haste module collisions
  modulePathIgnorePatterns: [
    '<rootDir>/output/',
    '<rootDir>/output2/',
    '<rootDir>/output3/',
    '<rootDir>/output4/',
    '<rootDir>/output_py/',
    '<rootDir>/output_py2/',
    '<rootDir>/output_final/',
    '<rootDir>/generated/',
    '<rootDir>/.test-output/',
    '<rootDir>/.test-output-e2e/',
    '<rootDir>/my-app/',
    '<rootDir>/my-crm/',
    '<rootDir>/target/',
    '<rootDir>/examples/target/',
    '<rootDir>/studio/projects/'
  ],
  moduleNameMapper: {
    '^@dsl/(.*)$': '<rootDir>/dsl/$1',
    '^@core/(.*)$': '<rootDir>/core/$1',
    '^@modules/(.*)$': '<rootDir>/modules/$1',
    '^@api/(.*)$': '<rootDir>/api/$1'
  },
  verbose: true,
  
  // E2E tests configuration
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      testEnvironment: 'node',
      transform: {
        '^.+\\.tsx?$': tsJestTransform
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
    },
    {
      displayName: 'integration',
      preset: 'ts-jest',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      testEnvironment: 'node',
      transform: {
        '^.+\\.tsx?$': tsJestTransform
      },
      setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.ts']
    },
    {
      displayName: 'e2e',
      preset: 'ts-jest',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.ts'],
      testEnvironment: 'node',
      transform: {
        '^.+\\.tsx?$': tsJestTransform
      },
      setupFilesAfterEnv: ['<rootDir>/tests/e2e/setup.ts']
    }
  ]
};
