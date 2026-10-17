#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { computeRights } from "./rights-lib.mjs";
const m = computeRights();
if (process.argv.includes("--write")) {
  writeFileSync("catalogue/rights-manifest.json", JSON.stringify(m, null, 2) + "\n");
  console.log("wrote catalogue/rights-manifest.json");
} else console.log(JSON.stringify(m, null, 2));
