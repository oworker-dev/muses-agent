import { readFileSync } from "node:fs";
import { inspectProductionConfiguration } from "../lib/production-config.ts";
import { assertBuiltEveWorkflowWorld } from "./production-preview-topology.mjs";

const diagnostics = [...inspectProductionConfiguration(process.env)];
try {
  const manifest = JSON.parse(readFileSync(
    new URL("../.output/.eve/compile/compiled-agent-manifest.json", import.meta.url),
    "utf8",
  ));
  assertBuiltEveWorkflowWorld(manifest);
} catch (cause) {
  diagnostics.push({
    code: "compiled-workflow-world",
    level: "error",
    message: cause instanceof Error ? cause.message : "The compiled Eve Workflow World could not be verified.",
  });
}
const errors = diagnostics.filter((diagnostic) => diagnostic.level === "error");
const warnings = diagnostics.filter((diagnostic) => diagnostic.level === "warning");

console.log(`open-agent production doctor ${errors.length === 0 ? "pass" : "fail"}.`);

if (warnings.length > 0) {
  console.log("\nWarnings:");
  for (const warning of warnings) console.log(`- [${warning.code}] ${warning.message}`);
}

if (errors.length > 0) {
  console.log("\nErrors:");
  for (const error of errors) console.log(`- [${error.code}] ${error.message}`);
  process.exitCode = 1;
}
