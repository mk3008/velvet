import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import ts from 'typescript';
import { assertDestinationLinkMapping } from '../../../dist/src/features/execute-transfer/link-mapping.js';

// Run from repository root after pnpm build. The baseline is an immutable source
// oracle, not a maintained duplicate implementation or a production SQL source.
const baseline = '03b998ee3b768e2a03af763714627523243b3cc2';
const path = 'src/features/execute-transfer/boundary.ts';
const before = execFileSync('git', ['show', `${baseline}:${path}`], { encoding: 'utf8' });
const after = readFileSync(path, 'utf8');
const helper = readFileSync('src/features/execute-transfer/link-mapping.ts', 'utf8');
const start = before.indexOf('      const mapping = link.mapping_definition?.columns;');
const endMarker = "        throw new Error('Invalid Destination Link mapping');";
const end = before.indexOf(endMarker, start) + endMarker.length;
assert(start >= 0 && end > start);
const oldBlock = before.slice(start, end);
const parse = (source) => {
  const file = ts.createSourceFile('probe.ts', source, ts.ScriptTarget.Latest, true);
  assert.equal(file.parseDiagnostics.length, 0);
  return file;
};
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
const declaration = parse(helper).statements.find((s) => s.name?.text === 'assertDestinationLinkMapping');
assert(declaration?.body);
const helperBody = declaration.body.getText().slice(1, -1);
assert.deepEqual(tokens(oldBlock), tokens(helperBody));
const objectDeclaration = (text) => parse(text).statements.find((s) => s.name?.text === 'object').getText();
assert.deepEqual(tokens(objectDeclaration(before)), tokens(objectDeclaration(helper)));
const call = '      assertDestinationLinkMapping(link, keyColumns);';
assert.equal(after.split(call).length, 2);
const inlined = after
  .replace("import { assertDestinationLinkMapping } from './link-mapping.js';\n", '')
  .replace(call, oldBlock);
assert.deepEqual(tokens(before), tokens(inlined));
const oldValidator = new Function('isDeepStrictEqual', ts.transpile(`
  ${objectDeclaration(before)}
  return function(link, keyColumns) { ${oldBlock} };
`, { target: ts.ScriptTarget.ES2022 }))(isDeepStrictEqual);

function valid() {
  return {
    is_enabled: true, transfer_model: 'immutable', date_lower_bound_adjustments: null,
    generated_insert_transfer_sql_body: 'stored-insert',
    mapping_definition: { columns: { id: 'source_id', tenant: 'source_tenant', amount: 'amount' } },
    destination_columns: { columns: [{ name: 'id' }, { name: 'tenant' }, { name: 'amount' }] },
    destination_key_columns: ['tenant', 'id'],
    destination_key_mapping: {
      sourceKey: ['source_tenant', 'source_id'],
      destinationKey: [{ name: 'id', sourceColumn: 'source_id' }, { name: 'tenant', sourceColumn: 'source_tenant' }],
    },
  };
}
const columns = ['source_tenant', 'source_id'];
const cases = [{ name: 'valid composite', link: valid(), columns }];
for (const value of [undefined, null, [], {}, { columns: null }, { columns: [] }, { columns: {} }, { columns: { absent: 'amount' } }, { columns: { id: '' } }, { columns: { id: 7 } }, { columns: { id: null } }])
  cases.push({ name: `mapping ${cases.length}`, link: { ...valid(), mapping_definition: value }, columns });
for (const value of [undefined, null, {}, { columns: null }, { columns: {} }, { columns: [] }, { columns: [null] }])
  cases.push({ name: `allowed ${cases.length}`, link: { ...valid(), destination_columns: value }, columns });
for (const value of [undefined, null, {}, { sourceKey: columns }, { sourceKey: columns, destinationKey: [] }, { sourceKey: columns, destinationKey: {} }, { sourceKey: columns, destinationKey: [null] }, { sourceKey: columns, destinationKey: [{ name: 'id' }, { name: 'tenant' }] }, { ...valid().destination_key_mapping, sourceKey: [...columns].reverse() }])
  cases.push({ name: `keys ${cases.length}`, link: { ...valid(), destination_key_mapping: value }, columns });
for (const value of [undefined, null, [], ['id'], ['tenant', 'tenant'], ['id', 'tenant']])
  cases.push({ name: `destination columns ${cases.length}`, link: { ...valid(), destination_key_columns: value }, columns });
cases.push({ name: 'wrong mapped key source', link: { ...valid(), mapping_definition: { columns: { ...valid().mapping_definition.columns, id: 'other' } } }, columns });
cases.push({ name: 'valid single', link: { ...valid(), mapping_definition: { columns: { id: 'source_id' } }, destination_key_columns: ['id'], destination_key_mapping: { sourceKey: ['source_id'], destinationKey: [{ name: 'id', sourceColumn: 'source_id' }] } }, columns: ['source_id'] });
cases.push({ name: 'null-prototype mapping', link: { ...valid(), mapping_definition: { columns: Object.assign(Object.create(null), valid().mapping_definition.columns) } }, columns });
cases.push({ name: 'competing malformed fields', link: { ...valid(), mapping_definition: null, destination_columns: { columns: {} } }, columns });
cases.push({ name: 'empty mapping short-circuits malformed keys', link: { ...valid(), mapping_definition: { columns: {} }, destination_key_mapping: { destinationKey: [null] } }, columns });
function outcome(fn, link, keys) {
  try { fn(link, keys); return { accepted: true }; }
  catch (error) { return { accepted: false, type: error.constructor.name, name: error.name, message: error.message }; }
}
const fixtureResults = cases.map(({ name, link, columns: keys }) => {
  const snapshot = structuredClone({ link, keys });
  const first = outcome(oldValidator, link, keys);
  const second = outcome(assertDestinationLinkMapping, link, keys);
  assert.deepEqual(second, first, name);
  // structuredClone normalizes null prototypes; equality against a fresh clone
  // checks data mutation, and frozen ordinary fixtures below check writes.
  assert.deepEqual(structuredClone({ link, keys }), snapshot, `${name}: mutation`);
  return { fixtureName: name, ...second };
});
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
assertDestinationLinkMapping(freeze(valid()), freeze([...columns]));

// Load each actual coordinator with unchanged dependencies. Scripted queries
// expose validation placement, not PostgreSQL locking/rollback correctness.
async function loadCoordinator(source) {
  const dependencies = {};
  for (const statement of parse(source).statements.filter(ts.isImportDeclaration)) {
    const specifier = statement.moduleSpecifier.text;
    dependencies[specifier] = await import(specifier.startsWith('.')
      ? new URL(`../../../dist/src/features/execute-transfer/${specifier}`, import.meta.url).href
      : specifier);
  }
  const output = ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output)((name) => dependencies[name], module, module.exports);
  return module.exports.executeTransfer;
}
const oldCoordinator = await loadCoordinator(before);
const newCoordinator = await loadCoordinator(after);
const { bind } = await import('@mk3008/serene');
const queries = await import('../../../dist/src/features/execute-transfer/queries.js');
const settingText = bind(queries.settingSql, { id: '1' }, 'indexed').text;
const linksText = bind(queries.linksSql, { id: '1' }, 'indexed').text;
const definition = { settingId: '1', sourceSchema: 'public', sourceTable: 'source', sourceKeyDefinition: { keys: columns.map((column) => ({ column, type: 'text' })) }, resolveLogicalKey: (key) => key };
async function trace(execute, links, setPhase = false) {
  const events = [];
  const setting = { is_enabled: true, source_key_definition: definition.sourceKeyDefinition, set_phase_definition: setPhase ? {} : null };
  const client = { async query(text, values) {
    if (text === 'begin' || text === 'rollback') { events.push([text]); return { rows: [] }; }
    if (text === settingText) { events.push(['setting', values]); return { rows: [setting] }; }
    if (text === linksText) { events.push(['links', values]); return { rows: links }; }
    events.push(['post-validation query', text, values]);
    throw new Error('probe stops before Run creation');
  } };
  try { await execute(client, [definition], { settingId: '1' }); }
  catch (error) { events.push(['error', error.constructor.name, error.message]); }
  return events;
}
const invalid = { ...valid(), mapping_definition: null };
const dateInvalid = { ...invalid, transfer_model: 'mutable', date_lower_bound_adjustments: {} };
const sqlInvalid = { ...invalid, generated_insert_transfer_sql_body: ' ' };
const traceCases = [
  ['valid legacy', [valid()], false, 'probe stops before Run creation'],
  ['mapping legacy', [invalid], false, 'Invalid Destination Link mapping'],
  ['date precedes mapping', [dateInvalid], false, 'Mutable destinations cannot require posting-date lower-bound control'],
  ['SQL precedes mapping', [sqlInvalid], false, 'Destination Link has no stored Black Insert SQL'],
  ['set skips legacy SQL', [sqlInvalid], true, 'Invalid Destination Link mapping'],
  ['set profile follows mapping', [valid()], true, null],
  ['first Link wins', [invalid, dateInvalid], false, 'Invalid Destination Link mapping'],
  ['second Link reached', [valid(), dateInvalid], false, 'Mutable destinations cannot require posting-date lower-bound control'],
  ['disabled Link ignored', [{ ...invalid, is_enabled: false }, valid()], false, 'probe stops before Run creation'],
];
const traces = [];
for (const [name, links, mode, expected] of traceCases) {
  const first = await trace(oldCoordinator, links, mode);
  const second = await trace(newCoordinator, links, mode);
  assert.deepEqual(second, first, name);
  if (expected) assert.equal(second.at(-1)[2], expected, name);
  else assert.equal(second.at(-1)[1], 'ZodError');
  assert.equal(second.at(-2)[0], 'rollback');
  traces.push({ name, events: second });
}
const imports = (text) => parse(text).statements.filter(ts.isImportDeclaration).map((s) => s.moduleSpecifier.text);
console.log(JSON.stringify({
  baseline, candidate: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  candidateSource: 'working tree; hashes identify measured files',
  sourceHashes: Object.fromEntries([[path, after], ['src/features/execute-transfer/link-mapping.ts', helper]].map(([p, text]) => [p, ts.sys.createHash(text)])),
  equivalence: { validatorTokens: true, objectPredicateTokens: true, entireCoordinatorAfterInliningTokens: true, noInputMutation: true },
  fixtureCount: fixtureResults.length, fixtures: fixtureResults, traceCount: traces.length, traces,
  dependencies: { baselineDirectImports: imports(before), validatorDirectImports: imports(helper), validatorParameters: declaration.parameters.map((p) => p.name.getText()) },
  limits: ['Trace client is not PostgreSQL.', 'Baseline oracle may preserve existing defects; expected-outcome tests and full DB gates remain required.', 'No timing, fault-rate, production diagnostic-context or AI-speed gain measured.'],
}, null, 2));
