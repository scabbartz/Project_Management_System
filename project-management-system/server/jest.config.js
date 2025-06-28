module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
  transform: {
    '^.+\\.(ts|tsx)?$': ['ts-jest', {
      // ts-jest configuration options if needed, e.g.,
      // tsconfig: 'tsconfig.test.json', // if you have a specific tsconfig for tests
      // isolatedModules: true, // Can speed up transpilation
    }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1', // Corrected: removed trailing slash if $1 is the capture group
  },
  // setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'], // If you need setup files
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  // Coverage thresholds can be demanding for initial stubs, so commenting out for now
  // coverageThreshold: {
  //   global: {
  //     branches: 70,
  //     functions: 70,
  //     lines: 70,
  //     statements: 70,
  //   },
  // },
};
