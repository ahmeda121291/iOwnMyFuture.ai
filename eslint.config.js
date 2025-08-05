import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'build', '*.d.ts'] },
  {
    extends: [
      js.configs.recommended, 
      ...tseslint.configs.recommended,
      ...tseslint.configs.strict
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // Strict TypeScript rules - ban 'any' type
      '@typescript-eslint/no-explicit-any': 'error',

      // Consistent naming conventions
      '@typescript-eslint/naming-convention': [
        'error',
        // Variables and functions should be camelCase
        {
          selector: 'variable',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'forbid',
        },
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
        },
        // Types and interfaces should be PascalCase
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        // Properties should be camelCase
        {
          selector: 'property',
          format: ['camelCase', 'PascalCase', 'snake_case'], // Allow snake_case for API responses
          leadingUnderscore: 'allow',
        },
        // Methods should be camelCase
        {
          selector: 'method',
          format: ['camelCase'],
        },
        // Enum members should be UPPER_CASE
        {
          selector: 'enumMember',
          format: ['UPPER_CASE', 'PascalCase'],
        },
        // Class members should be camelCase
        {
          selector: 'classMethod',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'classProperty',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
        // Parameters should be camelCase
        {
          selector: 'parameter',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
      ],

      // Code quality rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        { 
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // React specific rules
      'react-hooks/exhaustive-deps': 'error',
      
      // General code quality
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
    },
  },
  // Test files have more relaxed rules
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/tests/**/*'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  }
);
