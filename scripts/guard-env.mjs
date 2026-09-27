import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// .env, .env.local, .env.production, .env.development.local…, але не .env.example і не process.env.X
const SECRET_FILE = /(^|[^A-Za-z0-9_$])\.env(\.(local|development|production|test)(\.local)?)?([^.A-Za-z0-9_]|$)/im;
const REASON = 'Політика курсу: файли .env читає і змінює людина, не агент.';
const source = process.argv[2] ?? 'unknown';

let event = {};
try {
  event = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  event = {};
}

// Підтримка форматів різних інструментів
const tool = event.tool_name ?? event.toolName ?? event.tool ?? 'unknown';
let args = event.tool_input ?? event.toolArgs ?? event.input ?? {};

if (typeof args === 'string') {
  try {
    args = JSON.parse(args);
  } catch {
    args = { command: args };
  }
}

// Перевіряємо шляхи й команди, а не вміст файлів
const targets = [];
if (tool === 'apply_patch') {
  const patch = Array.isArray(args.command) ? args.command.join('\n') : String(args.command ?? '');
  for (const m of patch.matchAll(/^\*\*\* (?:Add File|Update File|Delete File|Move to): (.+)$/gm)) {
    targets.push(['files', m[1].trim()]);
  }
} else {
  for (const key of ['file_path', 'filePath', 'path', 'command', 'targetFile', 'TargetFile', 'CommandLine']) {
    const value = Array.isArray(args[key]) ? args[key].join(' ') : args[key];
    if (typeof value === 'string') targets.push([key, value]);
  }
}

const hit = targets.find(([, value]) => SECRET_FILE.test(value));
if (hit) {
  const [key, value] = hit;
  const projectDir = process.env.CLAUDE_PROJECT_DIR ?? event.cwd ?? process.cwd();
  const dir = join(projectDir, '.agent-log');
  mkdirSync(dir, { recursive: true });

  const row = {
    ts: new Date().toISOString(),
    tool,
    input: { [key]: value.replace(/=\S+/g, '=***').slice(0, 200) },
    result: 'denied',
    session: event.session_id ?? event.sessionId ?? event.session ?? 'unknown',
    source,
  };

  appendFileSync(join(dir, `${source}.jsonl`), `${JSON.stringify(row)}\n`);

  if (event.toolName !== undefined) {
    process.stdout.write(JSON.stringify({ permissionDecision: 'deny', permissionDecisionReason: REASON }));
  }
  process.stderr.write(`${REASON}\n`);
  process.exit(2);
}

process.exit(0);
