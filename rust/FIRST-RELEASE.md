# First release

Releases are automated by the kit release script. Policy: engineering-standards
README §1 — no publish without a green gate matrix, a `CHANGELOG.md` entry for
the version, and a git tag `v<version>` matching `Cargo.toml`.

1. Confirm the gate matrix is green on `main` (CI badge in the README).
2. Add a `## [x.y.z]` entry to `CHANGELOG.md` (Keep a Changelog format).
3. From a checkout of
   [WyattAu/engineering-standards](https://github.com/WyattAu/engineering-standards):

   ```bash
   scripts/release.sh /path/to/<crate-dir> x.y.z --dry-run   # rehearsal
   scripts/release.sh /path/to/<crate-dir> x.y.z             # bump → gates →
   # semver-checks → tag v<x.y.z> → publish → registry verify
   ```

The script refuses a dirty tree, a missing changelog entry, or failing gates.
Semver: pre-1.0 breaking = minor bump. MSRV floor is 1.85.
