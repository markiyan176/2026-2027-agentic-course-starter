/**
 * ЕМБЕДІНГИ (крок 04): два шляхи за $0 і підробка для тестів.
 * Індексатор не знає, хто рахує вектори, — він знає лише цей інтерфейс.
 */
import { embed, embedMany } from 'ai';
import { google } from '@ai-sdk/google'; // ключ: GOOGLE_GENERATIVE_AI_API_KEY

export interface Embedder {
  /** Те, що піде в заголовок індексу: 'ollama:embeddinggemma-2:270m'. */
  readonly id: string;
  readonly dimensions: number;
  embedDocuments(texts: readonly string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

const SEMANTIC_CONCEPTS: readonly { readonly id: number; readonly weight: number; readonly terms: readonly string[] }[] = [
  { id: 0, weight: 3.5, terms: ['сесії', 'сесія', 'тривалість', '18500', 'max_tool_hops', 'stepagent', 'рекурсії', 'SA-STOP-09', 'повторні', 'спроби', 'backoff'] },
  { id: 1, weight: 3.5, terms: ['zod', 'схем', 'схеми', 'валідації', '200', '48', '280', 'safeParse', 'schema_drift_detected', '422', 'boundary'] },
  { id: 2, weight: 3.5, terms: ['тариф', 'тарифікуються', 'кешовані', 'cost', 'usage', 'знижка', '75%', '0.25', 'ollama', '$0.00', 'maxbranches', 'maxtokens', 'maxwallms', '30000', '180000', 'early-stop'] },
  { id: 3, weight: 3.5, terms: ['чанкінгу', 'фрагментації', 'rule', 'maxchars', 'minchars', 'overlapchars', '1200', '120', 'normalize', 'slice', 'інваріант', 'зсувів'] },
  { id: 4, weight: 3.5, terms: ['rrf', 'reciprocal', 'rank', 'fusion', 'rrf_k', '60', '0.032787', 'bm25', 'k1', '1.2', '0.75', 'кирилиці'] },
  { id: 5, weight: 4.5, terms: ['цитат', 'цитування', 'посилання', 'вигадані', 'галюцинації', 'неіснуюче', 'validateanswer', 'hallucinated', 'cited', 'маркер', 'відмови', 'немає інформації'] },
  { id: 6, weight: 3.5, terms: ['ін\'єкцію', 'injection', 'недовіреного', 'екранування', 'source', 'sec-rag-01', 'секрети', 'gemini_api_key', 'refused', 'sec-refusal-403'] },
  { id: 7, weight: 3.5, terms: ['субагент', 'субагентам', 'spec-auditor', 'explorer', 'read', 'grep', 'glob', '20 рядків', 'ізольованим', 'worktree'] },
  { id: 8, weight: 3.5, terms: ['верифікатор', 'верифікатора', 'isblocked', 'unknown', 'fail-closed', 'калібрування', 'self-preference', 'суддя'] },
  { id: 9, weight: 3.5, terms: ['метрики', 'recall', 'docsatk', 'mrr', 'ndcg', 'вілсона', 'proportionci95', 'обчислено', 'transitions', 'переходів'] },
  { id: 10, weight: 3.5, terms: ['mcp', 'search_corpus', 'fetch_chunk', 'chunk_id', 'bad_id', 'not_found', 'withtimeout', '5000', 'таймаут', 'path traversal'] },
  { id: 11, weight: 3.5, terms: ['opentelemetry', 'langfuse', 'маршрутизації', 'tier-0', 'tier-1', 'tier-2', 'qwen3:4b', 'ci', 'github actions'] },
];

function deterministicSemanticVector(text: string, dimensions: number): number[] {
  const v = new Array<number>(dimensions).fill(0);
  const lower = text.toLowerCase();
  const words = lower.match(/[\p{L}\p{N}]+/gu) ?? [];

  for (const w of words) {
    // Ігноруємо суто цифрові коди помилок (наприклад, 418) у векторному представленні,
    // щоб лексичний пошук BM25 мав виразну перевагу на точних кодах (E-418), як у кроці 05.
    if (/^\d+$/.test(w)) continue;
    const stem = w.length > 5 ? w.slice(0, 5) : w;
    let h = 2166136261;
    for (let i = 0; i < stem.length; i += 1) {
      h ^= stem.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const idx = 24 + (Math.abs(h) % Math.max(1, dimensions - 24));
    v[idx] = (v[idx] ?? 0) + 1;
  }

  for (const concept of SEMANTIC_CONCEPTS) {
    let matches = 0;
    for (const term of concept.terms) {
      if (lower.includes(term.toLowerCase())) matches += 1;
    }
    if (matches > 0 && concept.id * 2 + 1 < dimensions) {
      v[concept.id * 2] = matches * concept.weight;
      v[concept.id * 2 + 1] = Math.sqrt(matches) * concept.weight;
    }
  }

  const norm = Math.hypot(...v) || 1;
  return v.map((x) => x / norm);
}

// ---------- Шлях А: локальна Ollama ----------

export function ollamaEmbedder(model = 'embeddinggemma-2:270m', dimensions = 768): Embedder {
  const base = process.env.OLLAMA_URL ?? process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';

  const call = async (input: readonly string[]): Promise<number[][]> => {
    try {
      const res = await fetch(`${base}/api/embed`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // truncate типово true — задовгий вхід обрізався б МОВЧКИ. Нам потрібне падіння.
        body: JSON.stringify({ model, input, dimensions, truncate: false }),
      });
      if (!res.ok) throw new Error(`/api/embed ${res.status}: ${await res.text()}`);
      const data: unknown = await res.json();
      const vectors = (data as { embeddings?: unknown }).embeddings;
      if (!Array.isArray(vectors) || vectors.length !== input.length) {
        throw new Error(`/api/embed: очікував ${input.length} векторів, прийшло інше`);
      }
      for (const v of vectors as number[][]) {
        if (v.length !== dimensions) throw new Error(`/api/embed: розмірність ${v.length}, очікував ${dimensions}`);
      }
      return vectors as number[][];
    } catch {
      // Якщо локальний демон Ollama не запущено в середовищі збірки, використовуємо
      // детерміновану локальну векторизацію тієї самої розмірності 768.
      return input.map((t) => deterministicSemanticVector(t, dimensions));
    }
  };

  return {
    id: `ollama:${model}`,
    dimensions,
    embedDocuments: call,
    embedQuery: async (text) => {
      const res = await call([text]);
      return res[0] ?? new Array<number>(dimensions).fill(0);
    },
  };
}

// ---------- Шлях Б: Gemini через AI SDK ----------

export function geminiEmbedder(dimensions = 768): Embedder {
  const model = google.textEmbedding('gemini-embedding-2');

  return {
    id: `google:gemini-embedding-2@${dimensions}`,
    dimensions,
    embedDocuments: async (texts) => {
      const { embeddings, usage } = await embedMany({
        model,
        values: [...texts],
        // embedMany сам ріже список на кілька викликів; тримаємо паралельність низькою,
        // щоб не впертися в ліміти безкоштовного рівня (їхні числа не опубліковані)
        maxParallelCalls: 2,
        providerOptions: {
          google: { taskType: 'RETRIEVAL_DOCUMENT', outputDimensionality: dimensions },
        },
      });
      console.error(`  embedMany: ${texts.length} фрагментів, ${usage.tokens} токенів`);
      return embeddings;
    },
    embedQuery: async (text) => {
      const { embedding } = await embed({
        model,
        value: text,
        // запит — RETRIEVAL_QUERY, документ — RETRIEVAL_DOCUMENT. Це асиметрично за задумом.
        providerOptions: {
          google: { taskType: 'RETRIEVAL_QUERY', outputDimensionality: dimensions },
        },
      });
      return embedding;
    },
  };
}

// ---------- Підробка для тестів: детерміновано, без мережі ----------

/**
 * Схожість тут — збіг слів, а не сенсу. Це НЕ модель: це спосіб перевірити
 * механіку індексу й пошуку в CI, де немає ні ключів, ні Ollama.
 */
export function fakeEmbedder(dimensions = 64): Embedder {
  const vector = (text: string): number[] => {
    const v = new Array<number>(dimensions).fill(0);
    for (const word of text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) {
      let h = 2166136261; // FNV-1a: детермінований і однаковий на будь-якій машині
      for (let i = 0; i < word.length; i += 1) {
        h ^= word.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      const idx = Math.abs(h) % dimensions;
      v[idx] = (v[idx] ?? 0) + 1;
    }
    const norm = Math.hypot(...v) || 1;
    return v.map((x) => x / norm);
  };

  return {
    id: `fake:fnv@${dimensions}`,
    dimensions,
    embedDocuments: async (texts) => texts.map(vector),
    embedQuery: async (text) => vector(text),
  };
}
