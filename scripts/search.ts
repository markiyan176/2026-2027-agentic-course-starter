/**
 * CLI-скрипт гібридного пошуку з поясненням рангів (крок 05).
 *
 *   npx tsx scripts/search.ts "<запит>"
 *   npx tsx scripts/search.ts "<запит>" --explain
 */
import { cosineSimilarity } from 'ai';

import { bm25From, DEPTH, hybridSearch } from '../src/rag/search';
import { searchBm25 } from '../src/rag/bm25';
import { renderCitation, toCitation } from '../src/rag/cite';
import { geminiEmbedder, ollamaEmbedder } from '../src/rag/embed';
import { loadIndex } from '../src/rag/store';

const args = process.argv.slice(2);
const explain = args.includes('--explain');
const query = args.filter((a) => a !== '--explain' && !a.startsWith('--provider'))[0] ?? 'код помилки E-418';
const embedder =
  args.includes('--provider') && args[args.indexOf('--provider') + 1] === 'google'
    ? geminiEmbedder(768)
    : ollamaEmbedder();

const index = loadIndex('data/index.json', embedder);
const words = bm25From(index);

if (explain) {
  const qv = await embedder.embedQuery(query);
  const vecRanked = index.chunks
    .map((c) => ({ id: c.id, score: cosineSimilarity(qv, c.vector) }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, DEPTH);
  const bm25Ranked = searchBm25(words, query, DEPTH);
  const fused = await hybridSearch(index, words, embedder, query, 5);

  console.log(`Запит: "${query}"\n`);
  console.log('вектор (cosine, топ-5)       слова (BM25, топ-5)          RRF (k=60, топ-5)');
  for (let i = 0; i < 5; i++) {
    const v = vecRanked[i];
    const w = bm25Ranked[i];
    const f = fused[i];
    const vCol = v ? `${String(i + 1).padStart(2)}  ${v.id}  ${v.score.toFixed(4)}` : '—'.padEnd(25);
    const wCol = w ? `${String(i + 1).padStart(2)}  ${w.id}  ${w.score.toFixed(2).padStart(5)}` : '   (порожньо / немає)   ';
    const fCol = f
      ? `${String(i + 1).padStart(2)}  ${f.chunk.id}  ${f.rrf.toFixed(5)} (vec=${f.rankVector ?? '—'}, bm25=${f.rankWords ?? '—'})`
      : '—';
    console.log(`${vCol.padEnd(28)} ${wCol.padEnd(28)} ${fCol}`);
  }
} else {
  const hits = await hybridSearch(index, words, embedder, query, 5);
  for (const h of hits) {
    const cite = toCitation(h.chunk, h.chunk.text.slice(0, 140).replace(/\n+/g, ' '));
    console.log(`${renderCitation(cite)}  [rrf=${h.rrf.toFixed(5)}, cos=${h.cosine.toFixed(4)}, vec=${h.rankVector ?? '—'}, bm25=${h.rankWords ?? '—'}]`);
    console.log(`  «${cite.quote}…»\n`);
  }
}
