/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  resolver: 'react-native-worklets/jest/resolver.js',
  setupFiles: ['<rootDir>/packages/app/jest/setup.js'],
  roots: ['<rootDir>/packages', '<rootDir>/plugins'],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  moduleNameMapper: {
    '\\.css$': '<rootDir>/packages/app/jest/style-mock.js',
    '^@/assets/(.*)$': '<rootDir>/packages/app/assets/$1',
    '^@/(.*)$': '<rootDir>/packages/app/src/$1',
  },
};
