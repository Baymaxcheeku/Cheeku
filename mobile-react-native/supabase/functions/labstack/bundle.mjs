// Joins the labstack Edge Functions into ONE file each, for the Supabase
// dashboard editor (Edge Functions > Deploy a new function > Via Editor),
// which takes a single file. Same code, local imports removed, `export`
// dropped. A test (src/lib/partner/partner.test.ts) fails if the paste files
// fall behind the source.
//
// Regenerate:  node supabase/functions/labstack/bundle.mjs   (from mobile-react-native)

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(resolve(here, p), "utf8");

function strip(src) {
  return src
    .replace(/^import[\s\S]*?from\s+"\.{1,2}\/[^"]*";\n/gm, "")
    .replace(/^export (?=(async |const |function |class |type ))/gm, "")
    .replace(/^\/\/ COPY of src\/lib\/partner\/validate\.ts.*\n/m, "");
}

const head = (name, files, flags) =>
  `// ${name}, as ONE file for the Supabase dashboard editor (Edge Functions >\n` +
  `// Deploy a new function > Via Editor, name it "${name}"${flags}).\n` +
  `// Generated from ${files.join(" + ")}. Don't edit here: change the source and\n` +
  `// run  node supabase/functions/labstack/bundle.mjs\n\n`;

export function build() {
  return {
    "0045-labstack-function-paste.ts":
      head("labstack", ["labstack/validate.ts", "labstack/partner.ts", "labstack/index.ts"], "") +
      [strip(read("validate.ts")), strip(read("partner.ts")), strip(read("index.ts"))].join("\n"),
    "0045-labstack-webhook-function-paste.ts":
      head("labstack-webhook", ["labstack/partner.ts", "labstack-webhook/index.ts"], ", and turn OFF \"Enforce JWT verification\"") +
      [strip(read("partner.ts")), strip(read("../labstack-webhook/index.ts"))].join("\n"),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const [name, text] of Object.entries(build())) {
    writeFileSync(resolve(here, "../../manual", name), text);
    console.log("wrote supabase/manual/" + name);
  }
}
