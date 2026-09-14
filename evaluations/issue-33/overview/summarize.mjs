import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { assignments, source, render, linesFor } from './read.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const regionCache = new Map();
function regions(variant, name) {
  const key = variant + ':' + name;
  if (regionCache.has(key)) return regionCache.get(key);
  const text = source(variant, name), sf = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);
  const map = linesFor(variant, name).map(() => ({ unit: 'module-scaffolding', subregion: '' }));
  for (const node of sf.statements) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) continue;
    const unit = node.name?.text ?? node.declarationList?.declarations[0]?.name?.getText(sf) ?? 'other';
    const start = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line;
    const end = sf.getLineAndCharacterOfPosition(node.end).line;
    for (let i = start; i <= end; i++) map[i] = { unit, subregion: '' };
    if (unit === 'executeRowTransfer') {
      const body = node.getText(sf), offset = node.getStart(sf);
      for (const [label, begin, finish] of [
        ['immutable-red', '      if (active && immutable) {', '      if (row && (!mutable || !active)) {'],
        ['black-insert', '      if (row && (!mutable || !active)) {', '    } else skipped++;'],
      ]) {
        const a = body.indexOf(begin), b = body.indexOf(finish, a + 1);
        assert(a >= 0 && b > a);
        const first = sf.getLineAndCharacterOfPosition(offset + a).line;
        const last = sf.getLineAndCharacterOfPosition(offset + b).line;
        for (let i = first; i < last; i++) map[i] = { unit, subregion: label };
      }
    }
  }
  regionCache.set(key, map);
  return map;
}
const rowDetails = new Set(['executeRowTransfer', 'executeMutableDestination', 'retireRowActive', 'storedArguments', 'keyText', 'hash', 'projection']);
const isLocal = name => ['boundary.ts', 'main.ts', 'row-work.ts'].includes(name);
const results = [];
for (const [run, variant] of Object.entries(assignments)) {
  const records = fs.readFileSync(path.join(here, 'runs', run + '.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  const seen = new Set(), allFiles = new Set(), stages = {};
  let lastFile, allHops = 0, lastStage = -1;
  for (const record of records) {
    const index = ['overview', 'target', 'broad'].indexOf(record.stage);
    assert(index >= lastStage && index >= 0, 'Stages must remain ordered');
    lastStage = index;
    const { output, ...replayed } = render(variant, record.command, record.args);
    assert.deepEqual(replayed, { exposures: record.exposures, outputBytes: record.outputBytes, outputSha256: record.outputSha256 }, 'Replay source/output mismatch');
  }
  for (const stage of ['overview', 'target', 'broad']) {
    const rows = records.filter(r => r.stage === stage);
    assert(rows.length > 0);
    const unique = new Set(), files = new Set(), irrelevant = new Set();
    let hops = 0, lines = 0;
    for (const row of rows) for (const e of row.exposures) {
      const id = `${e.path}:${e.line}`;
      if (lastFile !== undefined && lastFile !== e.path) { hops++; allHops++; }
      lastFile = e.path; files.add(e.path); allFiles.add(e.path); unique.add(id); lines++;
      const r = regions(variant, e.path)[e.line - 1];
      if (isLocal(e.path) && ((stage === 'overview' && rowDetails.has(r.unit)) || (stage === 'target' && ['immutable-red', 'black-insert'].includes(r.subregion)))) irrelevant.add(id);
    }
    stages[stage] = {
      commands: rows.length, displayedSourceLines: lines, uniqueSourceLines: unique.size,
      newlyExposedSourceLines: [...unique].filter(x => !seen.has(x)).length,
      outputBytes: rows.reduce((n, r) => n + r.outputBytes, 0), files: [...files],
      fileTransitions: hops, clearlyUnrelatedLocalDetailUniqueLines: irrelevant.size,
    };
    for (const id of unique) seen.add(id);
    stages[stage].cumulativeUniqueSourceLines = seen.size;
  }
  const coverage = {};
  for (const name of variant === 'baseline' ? ['boundary.ts'] : ['boundary.ts', 'main.ts', 'row-work.ts']) {
    regions(variant, name).forEach((r, i) => {
      if (r.unit === 'module-scaffolding') return;
      coverage[r.unit] ??= { availableLines: 0, exposedLines: 0 };
      coverage[r.unit].availableLines++;
      if (seen.has(`${name}:${i + 1}`)) coverage[r.unit].exposedLines++;
    });
  }
  results.push({ run, variant, stages, totalUniqueSourceLines: seen.size, totalFileTransitions: allHops, allFiles: [...allFiles], cumulativeLocalDeclarationCoverage: coverage });
}
console.log(JSON.stringify({ baseline: '0086480a3c528d1d2a52d49056d90616234f5a38', results,
  limits: [
    'Counts are metered emitted source/output, not elapsed time, model tokens or proof of comprehension.',
    'Sequential tasks carry earlier knowledge; newly exposed and cumulative lines separate this from rereading.',
    'Unrelated is deliberately narrow: row details in overview; immutable-Red and Black-insert regions in target. It is not all unnecessary reasoning.',
    'File transitions count source-output path changes, including within searches; they are not runtime calls.',
    'Compare correctness and disclosed coverage before interpreting line counts; raw final answers remain necessary.'
  ] }, null, 2));
