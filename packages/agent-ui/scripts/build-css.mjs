import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import tailwind from "@tailwindcss/postcss";
import postcss from "postcss";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const inputPath = new URL("../src/styles.css", import.meta.url);
const outputPath = new URL("../dist/styles.css", import.meta.url);
const source = await readFile(inputPath, "utf8");
const result = await postcss([tailwind()]).process(source, {
  from: fileURLToPath(inputPath),
  to: fileURLToPath(outputPath),
});

await mkdir(new URL("../dist/", import.meta.url), { recursive: true });
await writeFile(outputPath, result.css);
if (result.map) await writeFile(`${fileURLToPath(outputPath)}.map`, result.map.toString());

process.stdout.write(`Built Agent UI CSS from ${packageRoot}.\n`);
