import fs from 'node:fs';
import assert from 'node:assert/strict';
const results = [];
for (const run of ['n1', 'n2', 'n3', 'n4']) {
  const records = fs.readFileSync(`evaluations/issue-33/runs/${run}.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
  assert(records.length > 0);
  const phases = {};
  const seen = new Set();
  for (const phase of ['outline', 'locator']) {
    const rows = records.filter(r => r.phase === phase);
    const unique = new Set(rows.flatMap(r => r.sourceLines));
    phases[phase] = {
      readerCalls: rows.length,
      sourceLinesDisplayed: rows.reduce((n, r) => n + r.sourceLines.length, 0),
      uniqueSourceLines: unique.size,
      newlyExposedSourceLines: [...unique].filter(n => !seen.has(n)).length,
      indexAndSourceLinesDisplayed: rows.reduce((n, r) => n + r.displayedLines, 0),
    };
    for (const line of unique) seen.add(line);
  }
  results.push({ run, variant: ['n1', 'n3'].includes(run) ? 'baseline' : 'candidate', phases, totalUniqueSourceLines: seen.size });
}
console.log(JSON.stringify({ results, limits: 'Source exposure is not elapsed time, tokens or comprehension. See full answers and manual factual scoring in README. Source reads were procedurally restricted; not OS isolated.' }, null, 2));
