# Coding Standards

## File Naming

| Type | Convention | Example |
|------|-----------|---------|
| Rust crates | kebab-case | `my-crate` |
| TypeScript packages | kebab-case | `my-package` |
| Component files | PascalCase | `Button.tsx`, `BaseLayout.astro` |
| Utility files | camelCase | `useTheme.ts` |
| Page files | kebab-case | `about.astro` |
| CSS files | kebab-case | `global.css` |
| Config files | kebab-case | `tsconfig.json` |

## Rust Standards

- `#![forbid(unsafe_code)]` on all library crates
- `#![deny(missing_docs)]` on all library crates
- Use `thiserror` for error types
- No `unwrap()` in library code
- Prefer `Result<T, E>` over `Option<T>` for fallible operations
- MSRV: 1.85

## TypeScript Standards

- Strict TypeScript mode
- Biome for formatting and linting
- No `any` types
- Prefer `const` over `let`
- Use explicit return types for public functions

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: resolve bug in X
docs: update documentation
refactor: restructure code without changing behavior
test: add missing tests
chore: maintenance tasks
```

## Documentation

- Every public Rust item must have `///` doc comments
- README must include: badges, quick start, features, architecture, contributing, license
- CONTRIBUTING.md must include: code of conduct, development setup, PR process, style guide
