#!/usr/bin/env node
/** Fails (exit 1) if restricted media paths or binaries are tracked, in public/, or in any build output. */
import { scanAll } from "./restricted-media.mjs";
const problems = scanAll();
if (problems.length) {
  console.error(
    `Restricted media guard failed (${problems.length}):\n${problems.slice(0, 40).join("\n")}`,
  );
  process.exit(1);
}
console.log("Restricted media guard: clean (tracked files, public/ and build output).");
