// Collects every piece of interface text passed to t("...") or msg("...") under
// src/ and writes the list to src/i18n/keys.json. With --check it also reports,
// per language, the keys that have no translation yet and exits 1 if any exist.
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const src = path.join(root, "src");
const LANGS = ["es", "fr", "de", "pt", "it", "nl", "sv", "da", "no", "ar"];

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return files(p);
    return /\.tsx?$/.test(e.name) ? [p] : [];
  });
}

const keys = new Set();
const dynamic = [];

function collect(arg, file, sf) {
  if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) keys.add(arg.text);
  else if (ts.isConditionalExpression(arg)) {
    collect(arg.whenTrue, file, sf);
    collect(arg.whenFalse, file, sf);
  } else if (ts.isParenthesizedExpression(arg)) collect(arg.expression, file, sf);
  else {
    // A variable: fine when its values were marked with msg() where they are defined.
    const { line } = sf.getLineAndCharacterOfPosition(arg.getStart(sf));
    dynamic.push(`${path.relative(root, file)}:${line + 1}  ${arg.getText(sf).slice(0, 60)}`);
  }
}

for (const file of files(src)) {
  const sf = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && (node.expression.text === "t" || node.expression.text === "msg") && node.arguments.length) {
      collect(node.arguments[0], file, sf);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

const list = [...keys].sort((a, b) => a.localeCompare(b, "en"));
fs.writeFileSync(path.join(src, "i18n", "keys.json"), JSON.stringify(list, null, 2) + "\n");
console.log(`${list.length} texts`);

if (process.argv.includes("--dynamic")) console.log(dynamic.join("\n"));

if (process.argv.includes("--check")) {
  let missing = 0;
  for (const lang of LANGS) {
    const dict = JSON.parse(fs.readFileSync(path.join(src, "i18n", `${lang}.json`), "utf8"));
    const gone = list.filter((k) => !dict[k]);
    const extra = Object.keys(dict).filter((k) => !keys.has(k));
    missing += gone.length;
    console.log(`${lang}: ${gone.length} missing, ${extra.length} unused`);
    if (process.argv.includes("--list")) for (const k of gone.slice(0, 40)) console.log("   " + JSON.stringify(k));
  }
  if (missing) process.exit(1);
}
