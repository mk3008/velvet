import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import * as queries from '../../../dist/src/features/execute-transfer/queries.js';

const baseline = '4b895265d8262fafd7a95221a344a7de8c93841e';
const path = 'src/features/execute-transfer/boundary.ts';
const before = execFileSync('git', ['show', baseline + ':' + path], { encoding: 'utf8' });
const after = readFileSync(path, 'utf8');
function parse(source) {
  const file = ts.createSourceFile('comparison.ts', source, ts.ScriptTarget.Latest, true);
  assert.equal(file.parseDiagnostics.length, 0);
  return file;
}
function tokens(source) {
  const file = parse(source), result = [];
  function visit(node) {
    const children = node.getChildren(file);
    if (children.length) children.forEach(visit);
    else if (node.kind !== ts.SyntaxKind.EndOfFileToken) result.push(node.getText(file));
  }
  visit(file);
  return result;
}
const file = parse(after);
const helper = file.statements.find((s) => s.name?.text === 'retireRowActive');
assert(helper?.body);
assert.equal(helper.parameters.length, 3);
assert(!helper.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));
const body = helper.body.getText(file).slice(1, -1);
const oldBody = body.replaceAll('activeId', 'active.active_black_id').replaceAll('linkId', 'common.link');
const call = 'await retireRowActive(query, active.active_black_id, common.link);';
assert.equal(after.split(call).length - 1, 2);
const withoutHelper = after.slice(0, helper.getFullStart()) + after.slice(helper.end);
const inlined = withoutHelper.replaceAll(call, oldBody);
assert.deepEqual(tokens(inlined), tokens(before), 'entire boundary after inlining');
for (const unchanged of ['src/features/execute-transfer/queries.ts', 'db/runtime/execute-transfer-metadata.sql']) {
  assert.equal(readFileSync(unchanged, 'utf8'), execFileSync('git', ['show', baseline + ':' + unchanged], { encoding: 'utf8' }));
}
const module = { exports: {} };
// Export only in this in-memory test compilation; production helper stays private.
const js = ts.transpile('export ' + helper.getText(file), { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS });
new Function('queries', 'module', 'exports', js)(queries, module, module.exports);
const retire = module.exports.retireRowActive;
const traces = [];
for (const [context, active, link] of [['mutable-delete', '41', '2'], ['immutable-red', '87', '5']]) {
  for (const fault of ['none', 'zero', 'multiple', 'release', 'delete']) {
    const events = [];
    const originalError = new Error('injected ' + fault);
    const query = async (statement, params) => {
      const operation = statement === queries.releaseActiveReferencesSql ? 'release'
        : statement === queries.activeDeleteSql ? 'delete' : 'unexpected';
      assert.notEqual(operation, 'unexpected');
      assert.deepEqual(params, { active, link });
      events.push({ operation, params });
      if (fault === operation) throw originalError;
      if (operation === 'release') return [];
      return fault === 'zero' ? [] : fault === 'multiple' ? [{}, {}] : [{}];
    };
    let caught;
    try { await retire(query, active, link); } catch (error) { caught = error; }
    assert.deepEqual(events.map((e) => e.operation), fault === 'release' ? ['release'] : ['release', 'delete']);
    if (fault === 'none') assert.equal(caught, undefined);
    else if (fault === 'release' || fault === 'delete') assert.equal(caught, originalError);
    else {
      assert(caught instanceof Error);
      assert.equal(caught.message, 'Active Black retirement failed');
    }
    traces.push({ context, fault, events, outcome: caught ? caught.message : 'success' });
  }
}
console.log(JSON.stringify({
  baseline, candidate: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  sourceSha256: createHash('sha256').update(after).digest('hex'),
  evidence: { inlinedBoundaryTokensIdentical: true, sqlAndRoutineUnchanged: true, originalProtocolCopies: 2, candidateProtocolOwners: 1, candidateCalls: 2, helperInputs: 3, productionFilesAdded: 0, publicExportsAdded: 0 },
  cases: traces.length, traces,
  limits: ['Scripted query traces do not prove PostgreSQL FK, locking or rollback behavior.', 'Full Verify and deployment gates remain required.', 'No developer-time, AI-speed or production failure-rate gain measured.']
}, null, 2));
