# ESLint & Pre-Commit Hook Configuration

This document describes the strict ESLint configuration and pre-commit hooks implemented in this project.

## 🚨 Strict Rules Enforced

### TypeScript Strictness
- **`@typescript-eslint/no-explicit-any`**: **ERROR** - Bans all usage of `any` type
- **`@typescript-eslint/no-unused-vars`**: **ERROR** - Prevents unused variables (prefix with `_` to allow)
- **`@typescript-eslint/consistent-type-imports`**: **ERROR** - Enforces `import type` for type-only imports

### Naming Conventions
All code must follow these naming patterns:
- **Variables & Functions**: `camelCase`, `PascalCase`, `UPPER_CASE`
- **Types & Interfaces**: `PascalCase`
- **Properties**: `camelCase`, `PascalCase`, `snake_case` (for API responses)
- **Methods**: `camelCase`
- **Enum Members**: `UPPER_CASE`, `PascalCase`
- **Parameters**: `camelCase`

### Code Quality Rules
- **`curly`**: **ERROR** - All if/for/while statements must use braces
- **`prefer-const`**: **ERROR** - Use `const` when variable is never reassigned
- **`no-var`**: **ERROR** - Use `let`/`const` instead of `var`
- **`eqeqeq`**: **ERROR** - Always use `===` and `!==`
- **`no-console`**: **WARNING** - Avoid console.log (allows console.warn/error)

### React Specific
- **`react-hooks/exhaustive-deps`**: **ERROR** - Enforce correct dependency arrays
- **`react-refresh/only-export-components`**: **WARNING** - Fast refresh compatibility

## 🔧 Pre-Commit Hooks (Husky + lint-staged)

Every commit automatically runs:

1. **ESLint with auto-fix** (`eslint --fix`)
2. **TypeScript compilation check** (`tsc --noEmit`)
3. **Prettier formatting** (`prettier --write`)

### What Happens on Commit:
- ✅ **Auto-fixable issues** are corrected automatically
- ❌ **Non-fixable errors** block the commit
- 🔄 **Files are reverted** if errors can't be fixed
- 📝 **Detailed error messages** show what needs fixing

## 📋 Available Scripts

```bash
# Run linter
npm run lint

# Run linter with auto-fix
npm run lint:fix

# Run TypeScript check
npm run typecheck

# Run pre-commit checks manually
npm run pre-commit
```

## 🎯 Test Files

Test files have relaxed rules:
- `@typescript-eslint/no-explicit-any`: **WARNING** instead of error
- `@typescript-eslint/explicit-function-return-type`: **OFF**

## 🚫 Common Errors & Fixes

### ❌ `any` Type Usage
```typescript
// Bad
const data: any = response;

// Good
interface ResponseData {
  id: string;
  name: string;
}
const data: ResponseData = response;
```

### ❌ Missing Braces
```typescript
// Bad
if (condition) return;

// Good
if (condition) {
  return;
}
```

### ❌ Wrong Naming Convention
```typescript
// Bad
const API_ENDPOINT = "url";  // Should be camelCase for variables
interface userProfile {}     // Should be PascalCase

// Good
const apiEndpoint = "url";
interface UserProfile {}
```

### ❌ Unused Variables
```typescript
// Bad
const unused = getData();

// Good
const _unused = getData();  // Prefix with _ to allow
// Or remove if not needed
```

## 🔒 Benefits

1. **Consistent Code Style** across the entire codebase
2. **Type Safety** with banned `any` usage
3. **Automatic Code Quality** enforcement
4. **No Broken Commits** - all code is validated before commit
5. **Team Productivity** - fewer review comments on style/quality

## 🛠️ Configuration Files

- **ESLint Config**: `eslint.config.js`
- **Husky Hooks**: `.husky/pre-commit`
- **Lint-staged**: `package.json` → `lint-staged` section
- **Scripts**: `package.json` → `scripts` section