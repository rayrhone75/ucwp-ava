import fs from 'fs';
import path from 'path';

interface Chunk {
  content: string;
  source: string;
  heading: string;
  terms: Map<string, number>; // TF vector
}

let chunks: Chunk[] = [];
let idfMap: Map<string, number> = new Map();
let loaded = false;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function computeTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  // Normalize by max frequency
  const maxFreq = Math.max(...tf.values(), 1);
  for (const [term, count] of tf) {
    tf.set(term, count / maxFreq);
  }
  return tf;
}

function computeIDF(allChunks: Chunk[]): Map<string, number> {
  const docCount = allChunks.length;
  const df = new Map<string, number>();

  for (const chunk of allChunks) {
    const seen = new Set<string>();
    for (const term of chunk.terms.keys()) {
      if (!seen.has(term)) {
        df.set(term, (df.get(term) || 0) + 1);
        seen.add(term);
      }
    }
  }

  const idf = new Map<string, number>();
  for (const [term, count] of df) {
    idf.set(term, Math.log(docCount / count));
  }
  return idf;
}

function cosineSimilarity(
  queryTerms: Map<string, number>,
  chunkTerms: Map<string, number>,
  idf: Map<string, number>
): number {
  let dotProduct = 0;
  let queryMag = 0;
  let chunkMag = 0;

  const allTerms = new Set([...queryTerms.keys(), ...chunkTerms.keys()]);

  for (const term of allTerms) {
    const idfVal = idf.get(term) || 0;
    const qVal = (queryTerms.get(term) || 0) * idfVal;
    const cVal = (chunkTerms.get(term) || 0) * idfVal;

    dotProduct += qVal * cVal;
    queryMag += qVal * qVal;
    chunkMag += cVal * cVal;
  }

  const magnitude = Math.sqrt(queryMag) * Math.sqrt(chunkMag);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

function parseMarkdownToChunks(content: string, filename: string): Chunk[] {
  const source = filename.replace('.md', '').replace(/-/g, ' ');
  const sections = content.split(/^## /m);
  const result: Chunk[] = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed || trimmed.length < 20) continue;

    const lines = trimmed.split('\n');
    const heading = lines[0].replace(/^#+\s*/, '').trim();
    const body = lines.slice(1).join('\n').trim();

    if (body.length < 10) continue;

    const tokens = tokenize(body);
    result.push({
      content: body,
      source,
      heading,
      terms: computeTF(tokens),
    });
  }

  return result;
}

export function loadKnowledgeBase(): void {
  if (loaded) return;

  const knowledgeDir = path.join(process.cwd(), 'data', 'knowledge');

  if (!fs.existsSync(knowledgeDir)) {
    loaded = true;
    return;
  }

  const files = fs.readdirSync(knowledgeDir).filter((f) => f.endsWith('.md'));

  for (const file of files) {
    const content = fs.readFileSync(path.join(knowledgeDir, file), 'utf-8');
    chunks.push(...parseMarkdownToChunks(content, file));
  }

  idfMap = computeIDF(chunks);
  loaded = true;
}

export function retrieveContext(query: string, topK = 4): { content: string; source: string; heading: string }[] {
  loadKnowledgeBase();

  if (chunks.length === 0) return [];

  const queryTokens = tokenize(query);
  const queryTF = computeTF(queryTokens);

  const scored = chunks.map((chunk) => ({
    chunk,
    score: cosineSimilarity(queryTF, chunk.terms, idfMap),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored
    .slice(0, topK)
    .filter((s) => s.score > 0.05)
    .map((s) => ({
      content: s.chunk.content,
      source: s.chunk.source,
      heading: s.chunk.heading,
    }));
}
