#!/usr/bin/env node

import { Command } from "commander";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name("forgeyard")
  .description("CLI tool for scaffolding and managing forgeyard templates")
  .version("0.1.0");

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
// `forgeyard add <template>` - Add a template to an existing project
// ---------------------------------------------------------------------------
program
  .command("add <template>")
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

    copyTemplateFiles(templateDir, targetDir, template);

    // Write marker file so upgrade can detect the template later
    const markerPath = path.join(targetDir, ".forgeyard-template");
    fs.writeFileSync(markerPath, template);

    console.log("Done.");
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

/**
 * Recursively copy template files into the target directory.
 * Files that already exist in the target are skipped.
 */
function copyTemplateFiles(
  templateDir: string,
  targetDir: string,
  templateName: string,
): void {
  const entries = fs.readdirSync(templateDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(templateDir, entry.name);
    const destPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      copyTemplateFiles(srcPath, destPath, templateName);
      continue;
    }

    if (fs.existsSync(destPath)) {
      console.log(`  Skipping (exists): ${path.relative(targetDir, destPath)}`);
      continue;
    }

    let content = fs.readFileSync(srcPath, "utf-8");
    const projectName = path.basename(targetDir);

    // Replace template variables
    content = content.replace(/\{\{project_name\}\}/g, projectName);
    content = content.replace(
      /\{\{ProjectName\}\}/g,
      projectName
        .split(/[-_]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(""),
    );

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
    let content = fs.readFileSync(d.templatePath, "utf-8");
    const projectName = path.basename(targetDir);

    content = content.replace(/\{\{project_name\}\}/g, projectName);
    content = content.replace(
      /\{\{ProjectName\}\}/g,
      projectName
        .split(/[-_]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(""),
    );

    fs.writeFileSync(d.fullPath, content);
    console.log(`  Updated: ${d.relativePath}`);
  }
}

program.parse();
