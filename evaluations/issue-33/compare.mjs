import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import ts from 'typescript';
import * as serene from '@mk3008/serene';

// Run from repository root. Fixtures are inert trial sources, not runtime modules.
const baseline = '9f554991ab3068756c6b05a483082ad3cda925ef';
const path = 'src/features/execute-transfer/boundary.ts';
const before = readFileSync('evaluations/issue-33/fixtures/baseline.ts.txt', 'utf8');
const after = readFileSync('evaluations/issue-33/fixtures/candidate.ts.txt', 'utf8');
assert.equal(readFileSync(path, 'utf8'), after, 'shipped runtime equals evaluated candidate');
assert.equal(before, execFileSync('git', ['show', `${baseline}:${path}`], { encoding: 'utf8' }));
function parse(source) {
  const file = ts.createSourceFile('probe.ts', source, ts.ScriptTarget.Latest, true);
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
const source = parse(after);
const helper = source.statements.find((s) => s.name?.text === 'executeMutableDestination');
assert(helper?.body);
assert.deepEqual(helper.parameters.map((p) => p.name.getText(source)), ['client', 'link', 'row', 'mapped', 'active']);
assert.equal(helper.type.getText(source), 'Promise<void>');
assert(!helper.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));
const call = 'await executeMutableDestination(client, link, row, mapped, active);';
assert.equal(after.split(call).length - 1, 1);
const oldStart = before.indexOf("        const operation = row ? 'Black Update'");
const oldEnd = before.indexOf('        if (!row) {', oldStart);
assert(oldStart >= 0 && oldEnd > oldStart);
const oldBody = before.slice(oldStart, oldEnd);
const body = helper.body.getText(source).slice(1, -1);
assert.deepEqual(tokens(body), tokens(oldBody), 'extracted body tokens, including literal SQL and messages');
const inlined = (after.slice(0, helper.getFullStart()) + after.slice(helper.end)).replace(call, body);
assert.deepEqual(tokens(inlined), tokens(before), 'entire boundary reconstructed, including guards, Work and retirement');
for (const unchanged of ['src/features/execute-transfer/queries.ts', 'src/features/execute-transfer/trusted-sql.ts', 'db/runtime/execute-transfer-metadata.sql']) {
  assert.equal(readFileSync(unchanged, 'utf8'), execFileSync('git', ['show', `${baseline}:${unchanged}`], { encoding: 'utf8' }));
}
function compile(text, dependencies = {}) {
  const module = { exports: {} };
  const js = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  new Function(...Object.keys(dependencies), 'module', 'exports', js)(...Object.values(dependencies), module, module.exports);
  return module.exports;
}
const binder = compile(readFileSync('src/features/execute-transfer/trusted-sql.ts', 'utf8'), {
  require: (name) => { assert.equal(name, '@mk3008/serene'); return serene; },
}).bindStoredSql;
const support = ['keyText', 'projection'].map((name) => source.statements.find((s) => s.name?.text === name).getText(source)).join('\n');
const original = compile(`${support}\nexport async function original(client, link, row, mapped, active) {${oldBody}}`, { bindStoredSql: binder, isDeepStrictEqual }).original;
const candidate = compile(`${support}\nexport ${helper.getText(source)}`, { bindStoredSql: binder, isDeepStrictEqual }).executeMutableDestination;
const traces = [];
for (const kind of ['update', 'delete']) {
  const op = kind === 'update' ? 'Black Update' : 'Physical Delete';
  for (const fault of ['none', 'empty-sql', 'collision', 'missing-active-bind', 'missing-value', 'zero-rows', 'multiple-rows', 'zero-count', 'missing-count', 'missing-rows', 'wrong-key', 'missing-key', 'null-key', 'query-throw', ...(kind === 'update' ? ['unused-mapping'] : [])]) {
    const outcomes = [];
    for (const execute of [original, candidate]) {
      const events = [];
      const marker = new Error('injected query error');
      const statement = kind === 'update'
        ? 'UPDATE destination SET value = :value WHERE key = :velvet_active_destination_key RETURNING id'
        : 'DELETE FROM destination WHERE key = :velvet_active_destination_key RETURNING id';
      const link = {
        destination_key_columns: ['id'],
        generated_update_transfer_sql_body: statement,
        generated_delete_transfer_sql_body: statement,
      };
      const selected = kind === 'update' ? 'generated_update_transfer_sql_body' : 'generated_delete_transfer_sql_body';
      if (fault === 'empty-sql') link[selected] = '  ';
      if (fault === 'missing-active-bind') link[selected] = 'SELECT :value';
      if (fault === 'missing-value') link[selected] += ' /* bind */ :absent';
      const mapped = { value: 'new' };
      if (fault === 'collision') mapped.velvet_active_destination_key = 'collision';
      if (fault === 'unused-mapping') mapped.extra = 'unconsumed';
      const response = { rows: [{ id: 41 }], rowCount: 1 };
      if (fault === 'zero-rows') response.rows = [];
      if (fault === 'multiple-rows') response.rows = [{ id: 41 }, { id: 41 }];
      if (fault === 'zero-count') response.rowCount = 0;
      if (fault === 'missing-count') delete response.rowCount;
      if (fault === 'missing-rows') delete response.rows;
      if (fault === 'wrong-key') response.rows = [{ id: 42 }];
      if (fault === 'missing-key') response.rows = [{}];
      if (fault === 'null-key') response.rows = [{ id: null }];
      const client = { query: async (text, values) => {
        events.push({ text, values });
        if (fault === 'query-throw') throw marker;
        return response;
      } };
      let caught;
      try { await execute(client, link, kind === 'update' ? { value: 'new' } : undefined, mapped, { destination_key_json: { id: 41 } }); }
      catch (error) { caught = error; }
      const preQuery = ['empty-sql', 'collision', 'missing-active-bind', 'missing-value', 'unused-mapping'].includes(fault);
      assert.equal(events.length, preQuery ? 0 : 1, `${kind}/${fault} query count`);
      if (fault === 'none') assert.equal(caught, undefined);
      else if (fault === 'query-throw') assert.equal(caught, marker, 'preserves thrown object');
      else {
        const expected = {
          'empty-sql': `Destination Link has no stored ${op} SQL`,
          collision: 'Mapping collides with reserved destination key parameter',
          'missing-active-bind': `${op} SQL must bind the Active Black destination key`,
          'missing-value': 'Missing parameter: absent',
          'unused-mapping': 'Stored Update SQL does not consume mapping',
          'wrong-key': `${op} destination key does not match Active Black`,
          'missing-key': 'Missing key column: id',
          'null-key': 'Missing key column: id',
        }[fault] ?? `${op} must return exactly one destination row`;
        assert.equal(caught?.message, expected, `${kind}/${fault} exact error`);
      }
      if (events.length) {
        assert.equal(events[0].text, kind === 'update'
          ? 'UPDATE destination SET value = $1 WHERE key = $2 RETURNING id'
          : 'DELETE FROM destination WHERE key = $1 RETURNING id');
        assert.deepEqual(events[0].values, kind === 'update' ? ['new', '{"id":41}'] : ['{"id":41}']);
      }
      outcomes.push({ events, outcome: caught?.message ?? 'success' });
    }
    assert.deepEqual(outcomes[1], outcomes[0], `${kind}/${fault} before/after`);
    traces.push({ kind, fault, ...outcomes[0] });
  }
}
console.log(JSON.stringify({
  baseline,
  sourceSha256: { baseline: createHash('sha256').update(before).digest('hex'), candidate: createHash('sha256').update(after).digest('hex') },
  evidence: { fixtureMatchesBaseline: true, runtimeMatchesCandidate: true, reconstructedBoundaryTokensIdentical: true, extractedBodyTokensIdentical: true, sqlAndBinderUnchanged: true, helperInputs: 5, helperCalls: 1, publicExportsAdded: 0, productionFilesAdded: 0 },
  cases: traces.length, executions: traces.length * 2, traces,
  limits: [
    'Source parity preserves existing caller guard, Work and retirement order; it does not establish baseline correctness.',
    'Scripted DML responses exercise real binding and receipt checks, not PostgreSQL execution, rollback, FK or locking semantics.',
    'Runtime adoption still requires full Verify and PostgreSQL CI; no speed, developer-time or failure-rate improvement measured.'
  ],
}, null, 2));
