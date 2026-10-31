# Forgeyard

> Standardized repository templates with CI/CD for Rust, Astro+SolidJS, Starlight, and TypeScript projects.

[![License](https://img.shields.io/badge/license-MIT%2FApache--2.0-blue)](LICENSE-MIT)

## Templates

| Template | Purpose | Stack |
|----------|---------|-------|
| `rust/` | Rust crate with CI, testing, benchmarks | Rust + cargo + GitHub Actions |
| `astro-solidjs/` | Astro + SolidJS frontend with Cloudflare | Astro + SolidJS + Tailwind v4 |
| `starlight/` | Starlight documentation site | Astro + Starlight |
| `ts-package/` | TypeScript package with testing | TypeScript + Vitest |

## Usage

### Scaffolding a new project

```bash
# Preferred: the CLI
cd forgeyard/cli && npm run build
node dist/index.js init rust my-new-project          # --tier a|b|c (default c)
node dist/index.js init astro-solidjs my-docs-site

# Or the scaffolding script
./scripts/scaffold.sh rust my-new-project
```

Every scaffold is **born-compliant** with the
[WyattAu engineering standards](https://github.com/WyattAu/engineering-standards):
the first `git push` triggers the shared gate matrix (rust-kit.yml /
node-ci.yml) and passes; no repo-local CI to wire, no retrofitting. Release
automation for Rust crates is documented in `rust/FIRST-RELEASE.md`.

### What's included

Each template includes:
- Standardized directory structure
- CI/CD pipeline (GitHub Actions)
- Linting and formatting (Biome for TS, clippy for Rust)
- Testing setup (vitest for TS, cargo test for Rust)
- README template with badges
- CONTRIBUTING.md with guidelines
- LICENSE-MIT and LICENSE-APACHE
- EditorConfig for consistent formatting

## Coding Standards

See [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md) for:
- File naming conventions
- Code style guidelines
- Documentation requirements
- Testing requirements

## License

Licensed under MIT OR Apache-2.0.
