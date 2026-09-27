import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const [,, source = "agent", status = "ok"] = process.argv;

let inputData = "";
process.stdin.setEncoding("utf8");

process.stdin.on("data", (chunk) => {
  inputData += chunk;
});

process.stdin.on("end", () => {
  try {
    let parsed = {};
    if (inputData.trim()) {
      parsed = JSON.parse(inputData);
    }

    const logDir = path.join(process.cwd(), ".agent-log");
    mkdirSync(logDir, { recursive: true });

    const toolName = parsed.tool_name || parsed.toolName || parsed.tool || "unknown";
    const rawInput = parsed.tool_input || parsed.toolArgs || parsed.input || {};

    const briefInput = {};
    for (const key of ["file_path", "filePath", "command", "pattern", "url", "path", "name"]) {
      if (typeof rawInput[key] === "string") {
        briefInput[key] = rawInput[key].slice(0, 200);
      }
    }

    const entry = {
      ts: new Date().toISOString(),
      tool: toolName,
      input: briefInput,
      result: status,
      session: parsed.session_id || parsed.sessionId || "session",
      source: source
    };

    const outFile = path.join(logDir, `${source}.jsonl`);
    appendFileSync(outFile, JSON.stringify(entry) + "\n", "utf8");
  } catch (_) {}
});
