// Reproduce lexical ownership and exact moved-work/recovery checks; not a productivity benchmark.
import ts from 'typescript';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const baseline = 'b3190e3d341ee21478161f2b8b31f96826c503b1';
const path = 'src/features/execute-transfer/boundary.ts';
const before = execFileSync('git', ['show', `${baseline}:${path}`], { encoding: 'utf8' });
const after = process.argv[2]
  ? execFileSync('git', ['show', `${process.argv[2]}:${path}`], { encoding: 'utf8' })
  : readFileSync(path, 'utf8');
function parse(text) {
  return ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}
function fn(source, name) {
  const result = source.statements.find(
    (n) => ts.isFunctionDeclaration(n) && n.name?.text === name,
  );
  assert.ok(result, name);
  return result;
}
function tokens(text) {
  // Let the parser rescan template tails; a standalone scanner cannot disambiguate them.
  const source = parse(text.startsWith('catch') ? 'try {} ' + text : text);
  assert.equal(source.parseDiagnostics.length, 0);
  const result = [];
  function visit(node) {
    const children = node.getChildren(source);
    if (!children.length && node.kind !== ts.SyntaxKind.EndOfFileToken) {
      result.push([node.kind, node.getText(source)]);
    } else children.forEach(visit);
  }
  visit(source);
  return result;
}

const oldSource = parse(before),
  newSource = parse(after);
const oldRun = fn(oldSource, 'executeTransfer'),
  newRun = fn(newSource, 'executeTransfer');
const newWork = fn(newSource, 'executeRowTransfer');
const oldTry = oldRun.body.statements.find(ts.isTryStatement);
const newTry = newRun.body.statements.find(ts.isTryStatement);
assert.deepEqual(
  tokens(oldTry.catchClause.getText(oldSource)),
  tokens(newTry.catchClause.getText(newSource)),
  'recovery must be unchanged',
);
const oldStatements = [...oldTry.tryBlock.statements];
const pendingIndex = oldStatements.findIndex((n) =>
  n.getText(oldSource).startsWith('const pending ='),
);
const legacyBlock = oldStatements[pendingIndex + 2];
assert.ok(ts.isBlock(legacyBlock));
// Old source had an extra lexical block and a finish/commit/return tail.
const oldWork = [
  ...oldStatements.slice(pendingIndex, pendingIndex + 2),
  ...legacyBlock.statements.slice(0, -3),
]
  .map((n) => n.getText(oldSource))
  .join('\n')
  .replaceAll('input.maxDirtyKeys', 'maxDirtyKeys')
  .replaceAll('input.settingId', 'settingId');
const movedWork = newWork.body.statements
  .slice(0, -1)
  .map((n) => n.getText(newSource))
  .join('\n');
assert.deepEqual(
  tokens(oldWork),
  tokens(movedWork),
  'ordered work must be token-identical except explicit input aliases',
);
assert.equal(newWork.body.statements.at(-1).getText(newSource), 'return { inserted, skipped };');
const markers = {
  P1: 'if (runPersisted && discarded)',
  P2: "throw new Error('Mutable destination key does not match Active Black')",
  P3: 'executeSetPhase(',
  P4: 'queries.retireMetadataSql',
};
function observations(source, text) {
  return Object.entries(markers).map(([probe, marker]) => {
    const hits = [...text.matchAll(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))];
    return {
      probe,
      locations: hits.map((hit) => {
        const owner = source.statements.find(
          (n) =>
            ts.isFunctionDeclaration(n) && n.getStart(source) <= hit.index && n.end > hit.index,
        );
        assert.ok(owner, marker);
        const start = source.getLineAndCharacterOfPosition(owner.getStart(source)).line + 1;
        const end = source.getLineAndCharacterOfPosition(owner.end).line + 1;
        return {
          owner: owner.name.text,
          line: source.getLineAndCharacterOfPosition(hit.index).line + 1,
          functionStart: start,
          functionEnd: end,
          lexicalSpan: end - start + 1,
        };
      }),
    };
  });
}
const finalizers = (text) => (text.match(/await query\(queries\.finishSql/g) ?? []).length;
assert.equal(finalizers(before), 2);
assert.equal(finalizers(after), 1);
assert.ok(!/client\.query\(['"](?:begin|commit|rollback)/.test(newWork.getText(newSource)));
console.log(
  JSON.stringify(
    {
      baseline,
      candidate: process.argv[2] ?? 'working-tree',
      candidateBlob: execFileSync('git', ['hash-object', '--stdin'], {
        input: after,
        encoding: 'utf8',
      }).trim(),
      assertions: [
        'ordered work tokens preserved',
        'recovery tokens preserved',
        'work helper owns no transaction control',
        'success finalizers 2 -> 1',
      ],
      before: observations(oldSource, before),
      after: observations(newSource, after),
      caveat:
        'Lexical span is not actual reading effort; edit-file count and cross-cutting SQL ownership do not improve automatically.',
    },
    null,
    2,
  ),
);
