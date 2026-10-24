// Checks the .sublime-snippet files against the templates they are written for.
//
//   node scripts/check-snippets.mjs <atsresume.cls> <readable-classic package folder>
//
// The class comes from https://ctan.org/pkg/atsresume, the package folder (the
// one with typst.toml and lib.typ) from the Typst Universe. The point is that
// every command, environment, function and named argument a snippet inserts
// exists in the template with that exact name, and that every LaTeX command
// gets as many {} arguments as the class defines.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [clsPath, typstDir] = process.argv.slice(2);
if (!clsPath || !typstDir) {
  console.error("usage: node scripts/check-snippets.mjs <atsresume.cls> <readable-classic folder>");
  process.exit(2);
}

const problems = new Set();
const fail = (where, message) => problems.add(`${where}: ${message}`);

// One folder per template. Each has its own trigger prefix so the snippets are
// easy to find and don't collide with other packages, and its own scope: the
// built-in LaTeX syntax, and the Typst syntax from Package Control.
const folders = {
  atsresume: { prefix: "ats-", scope: "text.tex.latex", language: "latex" },
  "readable-classic": { prefix: "rc-", scope: "text.typst", language: "typst" },
};

// ---------------------------------------------------------------- snippet syntax

// Walks a snippet body and returns the plain text a user gets when accepting
// every default. Throws on a stray $ or an unclosed placeholder, which Sublime
// Text would otherwise insert as literal text.
function expand(body) {
  let i = 0;
  function readUntilClose() {
    let out = "";
    while (i < body.length) {
      const ch = body[i];
      if (ch === "\\" && "$}\\".includes(body[i + 1])) { out += body[i + 1]; i += 2; continue; }
      if (ch === "}") { i++; return out; }
      if (ch === "$") { out += readDollar(); continue; }
      out += ch; i++;
    }
    throw new Error("unclosed placeholder");
  }
  function readDollar() {
    const rest = body.slice(i);
    let m;
    if ((m = /^\$\d+/.exec(rest))) { i += m[0].length; return ""; }
    if ((m = /^\$\{\d+\}/.exec(rest))) { i += m[0].length; return ""; }
    if (/^\$\{\d+\|/.test(rest)) throw new Error("Sublime Text has no ${1|a,b|} choices");
    if ((m = /^\$\{\d+:/.exec(rest))) { i += m[0].length; return readUntilClose(); }
    throw new Error(`unescaped $ at "${rest.slice(0, 12)}"`);
  }
  let out = "";
  while (i < body.length) {
    const ch = body[i];
    if (ch === "\\" && "$}\\".includes(body[i + 1])) { out += body[i + 1]; i += 2; continue; }
    if (ch === "$") { out += readDollar(); continue; }
    out += ch; i++;
  }
  return out;
}

// ---------------------------------------------------------------- the LaTeX class

const cls = readFileSync(clsPath, "utf8");
const className = /\\ProvidesClass\{([^}]+)\}/.exec(cls)?.[1];
const classOptions = new Set([...cls.matchAll(/\\DeclareOption\{([^}]+)\}/g)].map((m) => m[1]));
// Every command the class defines, with how many arguments it takes:
// \newcommand\experience[4]{...}. A command defined as \@ifstar\a\b, like
// \section, takes the arguments of \b. Internal names contain @, which a
// resume can't type, so they never match a command in a snippet.
const classCommands = new Map();
const starredCommands = [];
for (const m of cls.matchAll(
  /\\(?:re)?newcommand\{?\\([A-Za-z@]+)\}?(?:\[(\d)\])?(?:\{\\@ifstar\\[A-Za-z@]+\\([A-Za-z@]+)\})?/g,
)) {
  classCommands.set(m[1], m[2] ? Number(m[2]) : 0);
  if (m[3]) starredCommands.push([m[1], m[3]]);
}
for (const [command, target] of starredCommands) classCommands.set(command, classCommands.get(target));
const classEnvironments = new Set(
  [...cls.matchAll(/\\(?:re)?newenvironment\{([^}]+)\}/g)].map((m) => m[1]).concat("document"),
);
const classPackages = new Set(
  [...cls.matchAll(/\\RequirePackage(?:\[[^\]]*\])?\{([^}]+)\}/g)].flatMap((m) => m[1].split(",")),
);
// Commands from the LaTeX kernel or from packages the class loads itself
const kernelCommands = new Map([["documentclass", 1], ["begin", 1], ["end", 1], ["item", 0]]);
const packageCommands = new Map([["geometry", ["geometry", 1]]]);

function countBraceGroups(text, from) {
  let count = 0;
  let i = from;
  while (text[i] === "{") {
    let depth = 0;
    for (; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}" && --depth === 0) { i++; break; }
    }
    count++;
  }
  return count;
}

function checkLatex(where, text) {
  for (const m of text.matchAll(/\\([A-Za-z]+)(\[[^\]]*\])?/g)) {
    const [, command, optional] = m;
    const after = m.index + m[0].length;
    let expectedArgs;
    if (classCommands.has(command)) expectedArgs = classCommands.get(command);
    else if (kernelCommands.has(command)) expectedArgs = kernelCommands.get(command);
    else if (packageCommands.has(command)) {
      const [pkg, args] = packageCommands.get(command);
      if (!classPackages.has(pkg)) fail(where, `\\${command} needs ${pkg}, which the class doesn't load`);
      expectedArgs = args;
    } else {
      fail(where, `\\${command} is not defined by ${className}`);
      continue;
    }
    const args = countBraceGroups(text, after);
    if (args !== expectedArgs) fail(where, `\\${command} takes ${expectedArgs} argument(s), got ${args}`);

    if (command === "documentclass") {
      const name = /^\{([^}]*)\}/.exec(text.slice(after))?.[1];
      if (name !== className) fail(where, `class is "${name}", expected "${className}"`);
      for (const option of optional ? optional.slice(1, -1).split(",") : []) {
        if (!classOptions.has(option.trim())) fail(where, `class option "${option}" is not declared`);
      }
    }
    if (command === "begin" || command === "end") {
      const env = /^\{([^}]*)\}/.exec(text.slice(after))?.[1];
      if (!classEnvironments.has(env)) fail(where, `environment "${env}" is not defined by the class`);
    }
  }
}

// ---------------------------------------------------------------- the Typst package

const toml = readFileSync(join(typstDir, "typst.toml"), "utf8");
const packageName = /^name\s*=\s*"([^"]+)"/m.exec(toml)?.[1];
const packageVersion = /^version\s*=\s*"([^"]+)"/m.exec(toml)?.[1];
const entrypoint = /^entrypoint\s*=\s*"([^"]+)"/m.exec(toml)?.[1];
const lib = readFileSync(join(typstDir, entrypoint), "utf8");

// The parameters of every public function: #let name(a: 1, b, ..rest) = ...
// Names starting with _ are private to the package.
const typstFunctions = new Map();
for (const m of lib.matchAll(/^#let ([a-z][\w-]*)\(/gm)) {
  const params = splitTopLevel(argumentList(lib, m.index + m[0].length - 1))
    .map((p) => p.trim().replace(/^\.\./, "").split(":")[0].trim())
    .filter(Boolean);
  typstFunctions.set(m[1], new Set(params));
}

// The text between the ( at `open` and its matching ), skipping strings
function argumentList(text, open) {
  let depth = 0;
  let inString = false;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "(") depth++;
    else if (ch === ")" && --depth === 0) return text.slice(open + 1, i);
  }
  throw new Error("unbalanced parentheses");
}

// Splits on commas that aren't inside brackets or strings
function splitTopLevel(text) {
  const parts = [];
  let depth = 0;
  let inString = false;
  let current = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") { current += ch + text[++i]; continue; }
      if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) depth--;
    else if (ch === "," && depth === 0) { parts.push(current); current = ""; continue; }
    current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

// Named arguments at the top level of an argument list: `key: value`
const namedArguments = (argumentText) =>
  splitTopLevel(argumentText)
    .map((part) => /^\s*([a-z][\w-]*)\s*:/.exec(part)?.[1])
    .filter(Boolean);

function checkTypst(where, text) {
  for (const m of text.matchAll(/#import "@preview\/([^:]+):([^"]+)"/g)) {
    if (m[1] !== packageName) fail(where, `imports "${m[1]}", expected "${packageName}"`);
    if (m[2] !== packageVersion) fail(where, `imports version ${m[2]}, the package is ${packageVersion}`);
  }
  // Calls: #name(...) and name.with(...)
  let calls = 0;
  for (const m of text.matchAll(/(?:#([a-z][\w-]*)|\b([a-z][\w-]*)\.with)\(/g)) {
    calls++;
    const name = m[1] ?? m[2];
    if (name === "import" || name === "show") continue;
    const params = typstFunctions.get(name);
    if (!params) { fail(where, `${name}() is not defined in ${entrypoint}`); continue; }
    let argumentText;
    try {
      argumentText = argumentList(text, m.index + m[0].length - 1);
    } catch (error) {
      fail(where, `${name}(): ${error.message}`);
      continue;
    }
    for (const key of namedArguments(argumentText)) {
      if (!params.has(key)) fail(where, `${name}() has no argument "${key}"`);
    }
  }
  // Fragments that go inside a call, like `paper: "a4",`: each key must be an
  // argument of some function in the package
  if (calls === 0) {
    const allParams = new Set([...typstFunctions.values()].flatMap((p) => [...p]));
    for (const key of namedArguments(text)) {
      if (!allParams.has(key)) fail(where, `"${key}" is not an argument of any function in ${entrypoint}`);
    }
  }
}

// ---------------------------------------------------------------- run

// The files are written in one fixed layout, so a pattern is enough to read
// them. Anything else (a missing tag, a stray & in the description) fails.
const snippetPattern = new RegExp(
  "^<snippet>\\s*<content><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></content>\\s*" +
    "<tabTrigger>([^<&]+)</tabTrigger>\\s*<scope>([^<&]+)</scope>\\s*" +
    "<description>((?:[^<&]|&(?:amp|lt|gt);)+)</description>\\s*</snippet>\\s*$",
);
const seenTriggers = new Map();
let total = 0;

for (const [folder, expected] of Object.entries(folders)) {
  for (const file of readdirSync(join(root, folder)).filter((name) => name.endsWith(".sublime-snippet"))) {
    total++;
    const where = `${folder}/${file}`;
    const match = snippetPattern.exec(readFileSync(join(root, folder, file), "utf8"));
    if (!match) { fail(where, "not in the expected <snippet> layout"); continue; }
    const [, content, trigger, scope] = match;
    if (`${trigger}.sublime-snippet` !== file) fail(where, `file name doesn't match the trigger ${trigger}`);
    if (!trigger.startsWith(expected.prefix)) fail(where, `trigger should start with ${expected.prefix}`);
    if (seenTriggers.has(trigger)) fail(where, `trigger ${trigger} is also used by ${seenTriggers.get(trigger)}`);
    seenTriggers.set(trigger, where);
    if (scope !== expected.scope) fail(where, `scope is ${scope}, expected ${expected.scope}`);
    let text;
    try {
      text = expand(content);
    } catch (error) {
      fail(where, error.message);
      continue;
    }
    if (expected.language === "latex") checkLatex(where, text);
    else checkTypst(where, text);
  }
}

if (problems.size) {
  console.error([...problems].join("\n"));
  console.error(`\n${problems.size} problem(s) in ${total} snippets`);
  process.exit(1);
}
console.log(`${total} snippets OK (${[...seenTriggers.keys()].join(", ")})`);
