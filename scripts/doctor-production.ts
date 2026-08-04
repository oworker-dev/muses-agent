import { inspectProductionConfiguration } from "../lib/production-config.ts";

const diagnostics = inspectProductionConfiguration(process.env);
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
