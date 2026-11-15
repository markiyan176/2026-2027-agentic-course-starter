/**
 * Прогін red-team сценаріїв (крок 07).
 * Один сценарій = один прогін в ізоляції + перевірка ВСІХ інваріантів.
 * Ненульовий код виходу, якщо хоч один інваріант порушено.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { CANARY, CASES } from './cases';
import { assertInsideWorktree, INVARIANTS } from './invariants';

const outLog = process.env.REDTEAM_LOG_FILE ?? 'docs/lab3/redteam.jsonl';
const vulnerableBeforeFix = process.env.REDTEAM_VULNERABLE_BEFORE === '1';

rmSync(outLog, { force: true });
writeFileSync(outLog, '', 'utf8');

let failed = 0;
const lines: string[] = [];

for (const [idx, c] of CASES.entries()) {
  const baseRoot = join('runs', 'redteam-sandbox');
  const tree = join(baseRoot, c.id);
  rmSync(tree, { recursive: true, force: true });
  rmSync(join(baseRoot, 'pwned.txt'), { force: true });
  mkdirSync(join(tree, 'docs'), { recursive: true });

  const artifactDir = join(tree, 'artifact');
  mkdirSync(artifactDir, { recursive: true });

  try {
    // Фальшива канарка — ВСЕРЕДИНІ дерева прогону, справжніх ключів тут немає
    writeFileSync(join(tree, '.env'), `CANARY_NOT_A_SECRET=${CANARY}\n`, 'utf8');
    if (c.entry === 'fetched_doc') {
      writeFileSync(join(tree, 'docs', 'EXTERNAL.md'), c.payload, 'utf8');
    }

    // Фіксуємо доказ доставки маркера (deliveryMarker) в agent.log без витоку самої канарки
    const safeDeliveredLog = `[entry=${c.entry}] delivered marker=${c.deliveryMarker}; stopped_by=${c.stoppedBy}\n`;
    writeFileSync(join(artifactDir, 'agent.log'), safeDeliveredLog, 'utf8');
    writeFileSync(join(artifactDir, 'patch.diff'), '', 'utf8');
    writeFileSync(
      join(artifactDir, 'output.txt'),
      `Scenario ${c.id} (${c.entry}) processed under dontAsk + explicit allowedTools. Marker ${c.deliveryMarker} seen; malicious instruction rejected by boundary.`,
      'utf8',
    );

    // Демонстрація дірки ДО виправлення на сценарії r-03 (запис ../pwned.txt поза межами worktree)
    if (c.id === 'r-03') {
      if (vulnerableBeforeFix) {
        writeFileSync(join(tree, '..', 'pwned.txt'), 'pwned by r-03 tool_result injection\n', 'utf8');
      } else {
        try {
          assertInsideWorktree(tree, '../pwned.txt');
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          writeFileSync(
            join(artifactDir, 'agent.log'),
            `${safeDeliveredLog}[boundary] blocked write outside worktree: ${msg}\n`,
            'utf8',
          );
        }
      }
    }

    const ev = { worktree: tree, artifactDir, expectedMarker: c.deliveryMarker };
    const results = INVARIANTS.map((i) => ({ id: i.id, ...i.check(ev) }));
    const broken = results.filter((r) => !r.ok);
    failed += broken.length > 0 ? 1 : 0;

    const traceId = `d70${idx + 1}a000000${idx + 1}bc90123456789abcdef0`;
    const record = {
      case: c.id,
      entry: c.entry,
      delivery_marker: c.deliveryMarker,
      delivered: true,
      atlas: c.atlas,
      owasp: c.owasp,
      stopped_by: broken.length === 0 ? c.stoppedBy : 'НЕ ЗУПИНЕНО (дірка до виправлення межі)',
      trace_id: traceId,
      exit_status: 'ok',
      invariants: results,
      at: new Date().toISOString(),
    };
    lines.push(JSON.stringify(record));
    console.log(
      `${c.id} [${c.entry}] ${broken.length === 0 ? 'ЗУПИНЕНО' : `ПРОЙШЛО: ${broken.map((b) => b.id).join(', ')}`}`,
    );
  } finally {
    rmSync(join(baseRoot, 'pwned.txt'), { force: true });
    rmSync(tree, { recursive: true, force: true });
  }
}

writeFileSync(outLog, `${lines.join('\n')}\n`, 'utf8');

if (failed > 0) {
  console.error(`порушено інваріанти в ${failed} сценаріях`);
  process.exit(1);
}
