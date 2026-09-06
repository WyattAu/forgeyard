#!/usr/bin/env node

import { Command } from "commander";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name("forgeyard")
  .description("CLI tool for scaffolding and managing forgeyard templates")
  .version("0.1.0");

const TEMPLATES = ["rust", "astro-solidjs", "starlight", "ts-package"];

// ---------------------------------------------------------------------------
// `forgeyard init` - Scaffold a new project, born-compliant with gates
// ---------------------------------------------------------------------------
program
  .command("init <template> [dir]")
  .description(
    "Scaffold a new project from a template (born-compliant with the engineering-standards gate matrix)",
  )
  .option(
    "--tier <tier>",
    "Standards tier for rust scaffolds: a | b | c (default c)",
  )
  .option("--description <description>", "One-line project description")
  .action(
    (
      template: string,
      dir: string | undefined,
      opts: { tier?: string; description?: string },
    ) => {
      const rootDir = path.join(__dirname, "..", "..");
      const templateDir = path.join(rootDir, template);

      if (!fs.existsSync(templateDir)) {
        console.error(`Template "${template}" not found.`);
        console.error(`Available templates: ${TEMPLATES.join(", ")}`);
        process.exit(1);
      }

      const tier = (opts.tier ?? "c").toLowerCase();
      if (!["a", "b", "c"].includes(tier)) {
        console.error(`Invalid tier "${tier}" — use a, b, or c.`);
        process.exit(1);
      }

      const targetDir = dir ? path.resolve(dir) : process.cwd();
      if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
        console.error(`Target directory not empty: ${targetDir}`);
        process.exit(1);
      }

      fs.mkdirSync(targetDir, { recursive: true });
      console.log(`Scaffolding ${template} -> ${targetDir}`);
      copyTemplateFiles(templateDir, targetDir, {
        description: opts.description,
      });

      if (template === "rust" && tier !== "c") {
        const ciPath = path.join(targetDir, ".github", "workflows", "ci.yml");
          const ci = fs
            .readFileSync(ciPath, "utf-8")
            .replace(/^(\s*tier: )c\b/m, `$1${tier}`);
        fs.writeFileSync(ciPath, ci);
        console.log(`  Standards tier: ${tier}`);
      }

      fs.writeFileSync(path.join(targetDir, ".forgeyard-template"), template);

      const rel = path.relative(process.cwd(), targetDir) || ".";
      console.log(`
Next steps:
  cd ${rel}
  git init && git add -A && git commit -m "feat: initial scaffold"
  git remote add origin git@github.com:WyattAu/${path.basename(targetDir)}.git
  git push -u origin main

Gates run automatically on push — see engineering-standards:
  https://github.com/WyattAu/engineering-standards#the-gate-matrix`);

      if (template === "rust") {
        // The gate matrix runs `cargo check --locked`, which requires a
        // committed Cargo.lock — generate it now, best-effort.
        const lock = spawnSync("cargo", ["generate-lockfile"], {
          cwd: targetDir,
          stdio: "ignore",
        });
        if (lock.error || lock.status !== 0) {
          console.log(
            "\nNOTE: cargo not found — run `cargo generate-lockfile` in the project before the first push (CI checks `--locked`).",
          );
        } else {
          console.log("  Cargo.lock: generated (commit it — CI checks --locked)");
        }
        console.log(
          "\nRust crates: release via engineering-standards scripts/release.sh — see FIRST-RELEASE.md.",
        );
      }
    },
  );

// ---------------------------------------------------------------------------
// `forgeyard list` - List available templates
// ---------------------------------------------------------------------------
program
  .command("list")
  .description("List available templates")
  .action(() => {
    const templatesDir = path.join(__dirname, "..", "..", "templates");
    if (!fs.existsSync(templatesDir)) {
      console.error("Templates directory not found:", templatesDir);
      process.exit(1);
    }
    const templates = fs
      .readdirSync(templatesDir)
      .filter((f) => fs.statSync(path.join(templatesDir, f)).isDirectory());

    if (templates.length === 0) {
      console.log("No templates found.");
      return;
    }

    console.log("Available templates:");
    for (const t of templates) {
      console.log(`  ${t}`);
    }
  });

// ---------------------------------------------------------------------------
// `forgeyard add` - Parent command for adding things to a project
// ---------------------------------------------------------------------------
const addCmd = program
  .command("add")
  .description("Add templates or components to an existing project");

// ---------------------------------------------------------------------------
// `forgeyard add template <template>` - Add a template to an existing project
// ---------------------------------------------------------------------------
addCmd
  .command("template <template>")
  .description("Add a template to an existing project")
  .action((template: string) => {
    const templatesDir = path.join(__dirname, "..", "..", "templates");
    const templateDir = path.join(templatesDir, template);

    if (!fs.existsSync(templateDir)) {
      console.error(`Template "${template}" not found.`);
      console.error("Run `forgeyard list` to see available templates.");
      process.exit(1);
    }

    const targetDir = process.cwd();
    console.log(`Adding template: ${template}`);
    console.log(`Target directory: ${targetDir}`);

    copyTemplateFiles(templateDir, targetDir, {});

    // Write marker file so upgrade can detect the template later
    const markerPath = path.join(targetDir, ".forgeyard-template");
    fs.writeFileSync(markerPath, template);

    console.log("Done.");
  });

// ---------------------------------------------------------------------------
// `forgeyard add component <name>` - Add a pediment component to the project
// ---------------------------------------------------------------------------
addCmd
  .command("component <name>")
  .description("Add a pediment component to the current project")
  .action((name: string) => {
    const targetDir = process.cwd();
    const pkgPath = path.join(targetDir, "package.json");

    if (!fs.existsSync(pkgPath)) {
      console.error("No package.json found. Are you in a project directory?");
      process.exit(1);
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (!deps["@pediment/components"]) {
      console.error(
        "This project does not appear to use @pediment/components.",
      );
      console.error(
        'Make sure your package.json includes "@pediment/components" as a dependency.',
      );
      process.exit(1);
    }

    const templatesDir = path.join(__dirname, "..", "..", "templates", "pediment-components");
    const templateName = `${name.charAt(0).toUpperCase() + name.slice(1)}.tsx.template`;
    const templatePath = path.join(templatesDir, templateName);

    if (!fs.existsSync(templatePath)) {
      console.error(`Component template "${name}" not found.`);
      console.error(`Available templates in pediment-components:`);
      if (fs.existsSync(templatesDir)) {
        const available = fs
          .readdirSync(templatesDir)
          .filter((f) => f.endsWith(".tsx.template"))
          .map((f) => f.replace(".tsx.template", "").toLowerCase());
        for (const t of available) {
          console.log(`  ${t}`);
        }
      }
      process.exit(1);
    }

    const componentName =
      name.charAt(0).toUpperCase() + name.slice(1);
    const destDir = path.join(targetDir, "src", "components");
    const destPath = path.join(destDir, `${componentName}.tsx`);

    if (fs.existsSync(destPath)) {
      console.error(`Component ${componentName}.tsx already exists.`);
      process.exit(1);
    }

    let content = fs.readFileSync(templatePath, "utf-8");
    content = content.replace(/\{\{ComponentName\}\}/g, componentName);

    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(destPath, content);
    console.log(`Added: src/components/${componentName}.tsx`);

    // Update barrel file
    const barrelPath = path.join(targetDir, "src", "components", "index.ts");
    if (fs.existsSync(barrelPath)) {
      let barrel = fs.readFileSync(barrelPath, "utf-8");
      const exportLine = `export { ${componentName} } from "./${componentName}";\n`;
      if (!barrel.includes(exportLine.trim())) {
        barrel = barrel.trimEnd() + "\n" + exportLine;
        fs.writeFileSync(barrelPath, barrel);
        console.log(`Updated: src/components/index.ts`);
      }
    } else {
      const barrelContent = `export { ${componentName} } from "./${componentName}";\n`;
      fs.writeFileSync(barrelPath, barrelContent);
      console.log(`Created: src/components/index.ts`);
    }

    console.log(`Done. Component "${componentName}" added to your project.`);
  });

// ---------------------------------------------------------------------------
// `forgeyard upgrade` - Upgrade template files to latest version
// ---------------------------------------------------------------------------
program
  .command("upgrade")
  .description("Upgrade template files to latest version")
  .option("--dry-run", "Show what would change without modifying files")
  .action((opts: { dryRun?: boolean }) => {
    const templatesDir = path.join(__dirname, "..", "..", "templates");
    if (!fs.existsSync(templatesDir)) {
      console.error("Templates directory not found:", templatesDir);
      process.exit(1);
    }

    const targetDir = process.cwd();
    const templateName = detectCurrentTemplate(targetDir, templatesDir);

    if (!templateName) {
      console.error(
        "Could not detect which template is used in the current directory.",
      );
      console.error(
        "Make sure you are inside a project scaffolded with forgeyard.",
      );
      process.exit(1);
    }

    const templateDir = path.join(templatesDir, templateName);
    console.log(`Detected template: ${templateName}`);

    const diffs = collectDiffs(templateDir, targetDir);

    if (diffs.length === 0) {
      console.log("Everything is up to date. Nothing to upgrade.");
      return;
    }

    console.log("\nFiles that would be affected:\n");
    for (const d of diffs) {
      const symbol = d.status === "missing" ? "+" : "~";
      console.log(`  [${symbol}] ${d.relativePath}`);
    }

    if (opts.dryRun) {
      console.log("\nDry run - no files were modified.");
      return;
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question("\nProceed with upgrade? [y/N] ", (answer) => {
      rl.close();
      if (answer.toLowerCase() !== "y") {
        console.log("Upgrade cancelled.");
        return;
      }
      applyUpgrades(templateDir, targetDir, diffs);
      console.log("Upgrade complete.");
    });
  });

// ===========================================================================
// Helper functions
// ===========================================================================

interface DiffEntry {
  relativePath: string;
  status: "missing" | "changed";
  fullPath: string;
  templatePath: string;
}

interface CopyOpts {
  description?: string;
}

/**
 * Replace template variables in file content.
 * {{project_name}} — verbatim project directory name.
 * {{ProjectName}} — PascalCase, hyphens/underscores stripped.
 * {{crate_name}} — Rust crate identifier (hyphens/underscores -> underscores).
 * {{description}} — one-line description (or a TODO default).
 */
function substitute(
  content: string,
  projectName: string,
  opts: CopyOpts = {},
): string {
  let out = content.replace(/\{\{project_name\}\}/g, projectName);
  out = out.replace(
    /\{\{ProjectName\}\}/g,
    projectName
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(""),
  );
  out = out.replace(/\{\{crate_name\}\}/g, projectName.replace(/[-_]/g, "_"));
  out = out.replace(
    /\{\{description\}\}/g,
    opts.description ?? `TODO: describe ${projectName}`,
  );
  return out;
}

/**
 * Recursively copy template files into the target directory.
 * Files that already exist in the target are skipped.
 */
function copyTemplateFiles(
  templateDir: string,
  targetDir: string,
  opts: CopyOpts,
  projectName: string = path.basename(targetDir),
): void {
  const entries = fs.readdirSync(templateDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(templateDir, entry.name);
    const destName = entry.name.endsWith(".template")
      ? entry.name.slice(0, -".template".length)
      : entry.name;
    const destPath = path.join(targetDir, destName);

    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      copyTemplateFiles(srcPath, destPath, opts, projectName);
      continue;
    }

    if (fs.existsSync(destPath)) {
      console.log(`  Skipping (exists): ${path.relative(targetDir, destPath)}`);
      continue;
    }

    const content = substitute(fs.readFileSync(srcPath, "utf-8"), projectName, opts);

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, content);
    console.log(`  Added: ${path.relative(targetDir, destPath)}`);
  }
}

/**
 * Detect the template used by an existing project by scanning for a
 * `.forgeyard-template` marker file. If not present, fall back to
 * heuristic matching.
 */
function detectCurrentTemplate(
  targetDir: string,
  templatesDir: string,
): string | null {
  const markerPath = path.join(targetDir, ".forgeyard-template");
  if (fs.existsSync(markerPath)) {
    return fs.readFileSync(markerPath, "utf-8").trim();
  }

  // Heuristic: try to match key files from each template
  const templates = fs
    .readdirSync(templatesDir)
    .filter((f) => fs.statSync(path.join(templatesDir, f)).isDirectory());

  for (const t of templates) {
    const signatureFile = getSignatureFile(t);
    if (signatureFile) {
      if (fs.existsSync(path.join(targetDir, signatureFile))) {
        return t;
      }
      // Also check .template variant
      if (fs.existsSync(path.join(targetDir, signatureFile + ".template"))) {
        return t;
      }
    }
  }

  return null;
}

function getSignatureFile(templateName: string): string | null {
  const signatures: Record<string, string> = {
    rust: "Cargo.toml",
    "astro-solidjs": "astro.config.ts",
    starlight: "astro.config.ts",
    "ts-package": "tsconfig.json",
  };
  return signatures[templateName] ?? null;
}

/**
 * Compare template files against the target directory and collect
 * the list of files that differ or are missing.
 */
function collectDiffs(templateDir: string, targetDir: string): DiffEntry[] {
  const diffs: DiffEntry[] = [];

  function walk(tplDir: string, tgtDir: string, rel: string): void {
    const entries = fs.readdirSync(tplDir, { withFileTypes: true });
    for (const entry of entries) {
      // Skip hidden files and directories (e.g. .github, .forgeyard-template)
      if (entry.name.startsWith(".")) continue;

      const relPath = path.join(rel, entry.name);
      const tplPath = path.join(tplDir, entry.name);
      const tgtPath = path.join(tgtDir, entry.name);

      if (entry.isDirectory()) {
        walk(tplPath, tgtPath, relPath);
        continue;
      }

      if (!fs.existsSync(tgtPath)) {
        diffs.push({
          relativePath: relPath,
          status: "missing",
          fullPath: tgtPath,
          templatePath: tplPath,
        });
        continue;
      }

      const tplContent = fs.readFileSync(tplPath, "utf-8");
      const tgtContent = fs.readFileSync(tgtPath, "utf-8");
      if (tplContent !== tgtContent) {
        diffs.push({
          relativePath: relPath,
          status: "changed",
          fullPath: tgtPath,
          templatePath: tplPath,
        });
      }
    }
  }

  walk(templateDir, targetDir, "");
  return diffs;
}

/**
 * Apply upgrades by overwriting files from the template into the target.
 */
function applyUpgrades(
  templateDir: string,
  targetDir: string,
  diffs: DiffEntry[],
): void {
  for (const d of diffs) {
    fs.mkdirSync(path.dirname(d.fullPath), { recursive: true });
    const content = substitute(
      fs.readFileSync(d.templatePath, "utf-8"),
      path.basename(targetDir),
    );
    fs.writeFileSync(d.fullPath, content);
    console.log(`  Updated: ${d.relativePath}`);
  }
}

program.parse();
