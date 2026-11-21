// Joins cheeku-chat into ONE file for the Supabase dashboard editor
// (Edge Functions > cheeku-chat > Code). Same code, local imports removed.
// Regenerate:  node supabase/functions/cheeku-chat/bundle.mjs   (from mobile-react-native)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(resolve(here, p), "utf8").replace(/^import[\s\S]*?from\s+"\.\/[^"]*";\n/gm, "");
const files = ["prompt.ts", "gemini.ts", "read.ts", "index.ts"];
const head =
  "// cheeku-chat, as ONE file for the Supabase dashboard editor (Edge Functions >\n" +
  "// cheeku-chat > Code, or Deploy a new function > Via Editor, named cheeku-chat).\n" +
  "// Same code as supabase/functions/cheeku-chat/" + files.join(" + ") + ",\n" +
  "// joined so it can be pasted in one go. Regenerate with\n" +
  "//   node supabase/functions/cheeku-chat/bundle.mjs\n" +
  '// Keep "Verify JWT" ON.\n\n';
const out = head + files.map((f) => `// ===== ${f} =====\n${read(f).trimEnd()}\n`).join("\n");
writeFileSync(resolve(here, "../../manual/cheeku-chat-function-paste.ts"), out);
console.log("wrote supabase/manual/cheeku-chat-function-paste.ts");
