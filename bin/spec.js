#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cli = resolve(__dirname, "../dist/cli.js");
const command = process.argv[2];

// Commands that don't need tsx (no TS imports)
const noTsxCommands = ["init", "help", "--help"];
const needsTsx = !noTsxCommands.includes(command);

try {
  const nodeArgs = needsTsx ? ["--import", "tsx", cli, ...process.argv.slice(2)] : [cli, ...process.argv.slice(2)];
  execFileSync("node", nodeArgs, {
    stdio: "inherit",
    cwd: process.cwd(),
  });
} catch (err) {
  process.exit(err.status ?? 1);
}
