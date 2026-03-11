module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  env: {
    node: true,
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/naming-convention': 'warn',
    '@typescript-eslint/semi': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    'curly': 'warn',
    'eqeqeq': 'warn',
    'no-throw-literal': 'warn',
    'semi': 'off',
  },
  ignorePatterns: ['out', 'dist', '**/*.d.ts', '.eslintrc.js'],
  overrides: [
    {
      files: ['media/**/*.js'],
      env: {
        browser: true,
        node: false,
      },
      globals: {
        acquireVsCodeApi: 'readonly',
      },
      rules: {
        '@typescript-eslint/naming-convention': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
  ],
};
