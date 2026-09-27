import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

// Лише шлях, команда чи шаблон — ніколи вміст файлу.
const brief = (tool, args = {}) => {
  if (tool === "apply_patch") {
    const files = [...String(args.patchText ?? "").matchAll(/^\*\*\* (?:Add File|Update File|Delete File|Move to): (.+)$/gm)];
    return { files: files.map((m) => m[1].trim()) };
  }
  const out = {};
  for (const key of ["filePath", "command", "pattern", "url", "name", "path", "file_path"]) {
    if (typeof args[key] === "string") {
      out[key] = args[key].slice(0, 200);
    }
  }
  return out;
};

export const plugin = {
  name: "agent-log",
  events: {
    "tool.execute.after": async ({ tool, args, result, context }) => {
      try {
        const logDir = path.join(process.cwd(), ".agent-log");
        mkdirSync(logDir, { recursive: true });
        const entry = {
          ts: new Date().toISOString(),
          tool: tool || "unknown",
          input: brief(tool, args),
          result: result?.error ? "error" : "ok",
          session: context?.sessionId || "opencode-session",
          source: "opencode"
        };
        appendFileSync(path.join(logDir, "opencode.jsonl"), JSON.stringify(entry) + "\n", "utf8");
      } catch (err) {
        console.error("Agent log error:", err);
      }
    }
  }
};

export default plugin;
