import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Structural guards.
 *
 * The first one catches a mistake that is easy to make and expensive to find:
 * a client component importing, however indirectly, a module that reaches the
 * database or the session. Next would fail the build, but only once that page
 * is compiled, so this check reports it in one second instead.
 */

const ROOT = resolve(import.meta.dirname, "..");
const SRC = join(ROOT, "src");

function walkFiles(directory: string, extensions: string[]): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
      found.push(...walkFiles(full, extensions));
    } else if (extensions.some((extension) => entry.endsWith(extension))) {
      found.push(full);
    }
  }
  return found;
}

const sourceFiles = walkFiles(SRC, [".ts", ".tsx"]);
const contents = new Map(sourceFiles.map((file) => [file, readFileSync(file, "utf8")]));

function isClientModule(source: string): boolean {
  return /^\s*["']use client["']/m.test(source.split("\n").slice(0, 3).join("\n"));
}

function isServerOnlyModule(source: string): boolean {
  return /^import ["']server-only["'];?$/m.test(source);
}

/** Resolves an import specifier to a file inside src, or null if it leaves the project. */
function resolveImport(fromFile: string, specifier: string): string | null {
  let base: string;

  if (specifier.startsWith("@/")) {
    base = join(SRC, specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    base = resolve(dirname(fromFile), specifier);
  } else {
    return null;
  }

  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ];

  for (const candidate of candidates) {
    if (contents.has(candidate)) return candidate;
  }
  return null;
}

/**
 * Import specifiers that survive compilation. A type only import is erased
 * before the bundler sees it, so a client component may name a type from a
 * server module without pulling any of its code across the boundary.
 */
function importsOf(source: string): string[] {
  const specifiers: string[] = [];

  const pattern =
    /(?:^|\n)\s*(?:import|export)(?!\s+type\s)([^;\n]*?)from\s+["']([^"']+)["']/g;

  for (const match of source.matchAll(pattern)) {
    const clause = match[1] ?? "";

    // A braced clause whose every name is an inline type is erased as well.
    if (clause.includes("{")) {
      const names = clause
        .replace(/[{}]/g, "")
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part !== "");

      if (names.length > 0 && names.every((name) => name.startsWith("type "))) continue;
    }

    if (match[2]) specifiers.push(match[2]);
  }

  for (const match of source.matchAll(/(?:^|\n)\s*import\s+["']([^"']+)["']/g)) {
    if (match[1]) specifiers.push(match[1]);
  }

  return specifiers;
}

/** Follows imports from a client module until it finds a server-only module. */
function findServerOnlyPath(entry: string): string[] | null {
  const seen = new Set<string>();
  const queue: { file: string; path: string[] }[] = [{ file: entry, path: [entry] }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (seen.has(current.file)) continue;
    seen.add(current.file);

    const source = contents.get(current.file);
    if (!source) continue;

    if (current.file !== entry && isServerOnlyModule(source)) return current.path;

    // A "use server" module is an action boundary, not a client import, so the
    // walk stops there rather than reporting what the action itself reaches.
    if (current.file !== entry && /^\s*["']use server["']/m.test(source)) continue;

    for (const specifier of importsOf(source)) {
      const resolved = resolveImport(current.file, specifier);
      if (resolved) queue.push({ file: resolved, path: [...current.path, resolved] });
    }
  }

  return null;
}

describe("client and server boundary", () => {
  const clientModules = sourceFiles.filter((file) => isClientModule(contents.get(file)!));

  it("finds the client components to check", () => {
    expect(clientModules.length).toBeGreaterThan(5);
  });

  it("keeps every client component clear of server only modules", () => {
    const offenders: string[] = [];

    for (const file of clientModules) {
      const path = findServerOnlyPath(file);
      if (path) {
        offenders.push(path.map((step) => relative(ROOT, step)).join("\n    -> "));
      }
    }

    expect(offenders, `client components reaching server only code:\n${offenders.join("\n\n")}`)
      .toEqual([]);
  });
});

describe("writing rule", () => {
  /**
   * The project uses no em dashes anywhere, in any language, including comments,
   * seed data and documentation. This is the check that keeps it true.
   */
  // Built at runtime so this check does not report its own source line.
  const EM_DASH = String.fromCharCode(0x2014);

  const projectFiles = [
    ...walkFiles(SRC, [".ts", ".tsx", ".css"]),
    ...walkFiles(join(ROOT, "tests"), [".ts"]),
    ...walkFiles(join(ROOT, "scripts"), [".ts"]),
    ...walkFiles(join(ROOT, "public"), [".svg", ".webmanifest"]),
    ...["README.md", "DEPLOYMENT.md", ".env.example", "package.json", "next.config.ts"]
      .map((name) => join(ROOT, name))
      .filter((file) => {
        try {
          statSync(file);
          return true;
        } catch {
          return false;
        }
      }),
  ];

  it("uses no em dash anywhere in the project", () => {
    const offenders: string[] = [];

    for (const file of projectFiles) {
      const source = readFileSync(file, "utf8");
      if (!source.includes(EM_DASH)) continue;

      source.split("\n").forEach((line, index) => {
        if (line.includes(EM_DASH)) {
          offenders.push(`${relative(ROOT, file)}:${index + 1}: ${line.trim()}`);
        }
      });
    }

    expect(offenders, `em dash found:\n${offenders.join("\n")}`).toEqual([]);
  });
});
