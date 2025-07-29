module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/test/**/*',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapper: {
    '^lwc$': '<rootDir>/src/test/mocks/lwc.ts',
    '^vscode$': '<rootDir>/src/test/mocks/vscode.ts',
    '^child_process$': '<rootDir>/src/test/mocks/child_process.ts',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],
}; 