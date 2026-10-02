/**
 * Fails if an em dash appears anywhere in the repository.
 *
 * Tabea uses commas, periods, colons, parentheses and standard hyphens
 * instead, in every language and in every kind of file, including comments,
 * seed data and documentation.
 *
 *   npm run check:no-em-dash
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const EM_DASH = String.fromCharCode(0x2014);

/**
 * The original brief is excluded: its only occurrence is the character itself,
 * quoted in the sentence that forbids it. Everything Tabea produces is checked.
 */
const SKIP_FILES = new Set(["Idea.md"]);

const SKIP_DIRECTORIES = new Set([
  "node_modules",
  ".next",
  ".git",
  ".vercel",
  "coverage",
  "dist",
]);

const TEXT_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".css",
  ".md",
  ".json",
  ".svg",
  ".sql",
  ".webmanifest",
  ".example",
  ".yml",
  ".yaml",
];

function collect(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory)) {
    if (SKIP_DIRECTORIES.has(entry) || SKIP_FILES.has(entry)) continue;

    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collect(full));
      continue;
    }

    if (TEXT_EXTENSIONS.some((extension) => entry.endsWith(extension))) {
      files.push(full);
    }
  }

  return files;
}

const offenders: string[] = [];

for (const file of collect(ROOT)) {
  const source = readFileSync(file, "utf8");
  if (!source.includes(EM_DASH)) continue;

  source.split("\n").forEach((line, index) => {
    if (line.includes(EM_DASH)) {
      offenders.push(`${relative(ROOT, file)}:${index + 1}: ${line.trim()}`);
    }
  });
}

if (offenders.length > 0) {
  console.error(`Found ${offenders.length} em dash occurrences:`);
  for (const offender of offenders) console.error(`  ${offender}`);
  process.exit(1);
}

console.log("No em dash found anywhere in the repository.");
