import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[a-zA-Z0-9]{30,}\b/,
  /\bgithub_pat_[a-zA-Z0-9_]{50,}\b/,
  /\bnsec1[023456789acdefghjklmnpqrstuvwxyz]{50,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
];
const bad = [];
for (const path of files) {
  if (/(^|\/)package-lock\.json$/.test(path)) continue;
  const data = readFileSync(path, "utf8");
  if (patterns.some((p) => p.test(data))) bad.push(path);
}
if (bad.length) {
  console.error("Potential secrets found in: " + bad.join(", "));
  process.exitCode = 1;
} else
  console.log(
    `Secret-pattern check passed for ${files.length} tracked files. This check does not replace provider secret scanning.`,
  );
