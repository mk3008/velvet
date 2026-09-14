// Exact declaration parity and module-surface check; optional whole-project typecheck.
import assert from 'node:assert/strict';
import { readFile, readdir, mkdir, cp, writeFile, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const revision = '0086480a3c528d1d2a52d49056d90616234f5a38';
const frozen = execFileSync(
  'git',
  ['show', `${revision}:src/features/execute-transfer/boundary.ts`],
  { cwd: root, encoding: 'utf8' },
);
const read = (path) => readFile(resolve(here, 'fixtures', path), 'utf8');
const parse = (name, text) => ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);
const getName = (s) => s.name?.text ?? s.declarationList?.declarations[0]?.name.text;
const declarations = (sf) =>
  sf.statements.filter((s) => !ts.isImportDeclaration(s) && !ts.isExportDeclaration(s));
// Strip only the added export modifier; retain signatures, bodies, comments, SQL and spacing.
const declarationText = (s, sf) => s.getText(sf).replace(/^export /, '');
const sha = (text) => createHash('sha256').update(text).digest('hex');
const baseline = await read('baseline/boundary.ts.txt');
assert.equal(baseline, frozen, 'Baseline must be byte-identical to frozen production boundary');
// These are the complete local dependency closure of both fixture variants.
// Pin unchanged shared modules too, including the existing type-only return edge.
const sharedModules = [
  'queries.ts',
  'trusted-sql.ts',
  'link-mapping.ts',
  'set-phase/config.ts',
  'set-phase/execute.ts',
  'set-phase/queries.ts',
];
for (const name of sharedModules) {
  const path = `src/features/execute-transfer/${name}`;
  assert.equal(
    await readFile(resolve(root, path), 'utf8'),
    execFileSync('git', ['show', `${revision}:${path}`], { cwd: root, encoding: 'utf8' }),
    `Shared module drift: ${name}`,
  );
}
const files = {};
for (const filename of (await readdir(resolve(here, 'fixtures/candidate'))).sort()) {
  assert.ok(filename.endsWith('.ts.txt'));
  files[filename.replace(/\.txt$/, '')] = parse(filename, await read(`candidate/${filename}`));
}
assert.deepEqual(Object.keys(files), ['boundary.ts', 'main.ts', 'row-work.ts']);
const baselineSf = parse('boundary.ts', baseline);
const original = declarations(baselineSf);
const moved = Object.values(files).flatMap((sf) => declarations(sf).map((node) => ({ node, sf })));
assert.equal(moved.length, original.length, 'No added or duplicated declaration');
const matches = original.map((node) => {
  const name = getName(node);
  const candidates = moved.filter((d) => getName(d.node) === name);
  assert.equal(candidates.length, 1, `Exactly one declaration: ${name}`);
  const candidate = candidates[0];
  assert.equal(
    declarationText(candidate.node, candidate.sf),
    declarationText(node, baselineSf),
    `Declaration drift: ${name}`,
  );
  return {
    name,
    candidate: candidate.sf.fileName.replace(/\.txt$/, ''),
    sha256: sha(declarationText(node, baselineSf)),
  };
});
assert.deepEqual(declarations(files['main.ts']).map(getName), ['executeTransfer']);
assert.equal(declarations(files['boundary.ts']).length, 0);

function edges(sf) {
  return sf.statements
    .filter((s) => ts.isImportDeclaration(s) || ts.isExportDeclaration(s))
    .map((s) => {
      const clause = s.importClause;
      const named = clause?.namedBindings ?? s.exportClause;
      const elements = named && 'elements' in named ? named.elements : [];
      const typeOnly = !!(s.isTypeOnly || clause?.isTypeOnly);
      return {
        to: s.moduleSpecifier.text,
        kind: ts.isImportDeclaration(s) ? 'import' : 'reexport',
        typeOnly,
        names: elements.map((e) => ({ name: e.name.text, typeOnly: typeOnly || !!e.isTypeOnly })),
      };
    });
}
const expectedImports = {
  'main.ts': [
    "import { bind, type Sql } from '@mk3008/serene';",
    "import { isDeepStrictEqual } from 'node:util';",
    "import * as queries from './queries.js';",
    "import { assertDestinationLinkMapping } from './link-mapping.js';",
    "import { loadSetPhase } from './set-phase/config.js';",
    "import { executeSetPhase } from './set-phase/execute.js';",
    "import { object, executeRowTransfer, TransferExecutionError } from './row-work.js';",
    "import type { Row, TransferExecutionClient, TransferExecutionDefinition } from './row-work.js';",
  ],
  'row-work.ts': [
    "import { createHash } from 'node:crypto';",
    "import type { Sql } from '@mk3008/serene';",
    "import { isDeepStrictEqual } from 'node:util';",
    "import { bindStoredSql } from './trusted-sql.js';",
    "import * as queries from './queries.js';",
  ],
  'boundary.ts': [
    "export { executeTransfer } from './main.js';",
    "export { TransferExecutionError } from './row-work.js';",
    "export type { TransferExecutionClient, TransferExecutionDefinition } from './row-work.js';",
  ],
};
for (const [name, sf] of Object.entries(files)) {
  assert.deepEqual(
    sf.statements
      .filter((s) => ts.isImportDeclaration(s) || ts.isExportDeclaration(s))
      .map((s) => s.getText(sf)),
    expectedImports[name],
    `Module edge drift: ${name}`,
  );
}
const rowExports = declarations(files['row-work.ts'])
  .filter((s) => s.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword))
  .map(getName);
assert.deepEqual(rowExports, [
  'Row',
  'TransferExecutionClient',
  'TransferExecutionDefinition',
  'TransferExecutionError',
  'object',
  'executeRowTransfer',
]);
const sourceEqual =
  (await readFile(resolve(root, 'src/features/execute-transfer/boundary.ts'), 'utf8')) === frozen;
assert.ok(sourceEqual, 'Production baseline changed; explicitly rebase this research before reuse');
let typecheck = 'not requested (use --typecheck)';
if (process.argv.includes('--typecheck')) {
  // Temp copy preserves the package root and node_modules lookup; only fixture modules differ.
  const scratch = resolve(root, 'tmp/issue-33-overview-typecheck');
  await rm(scratch, { recursive: true, force: true });
  await mkdir(scratch, { recursive: true });
  await cp(resolve(root, 'src'), resolve(scratch, 'src'), { recursive: true });
  await cp(resolve(root, 'tests'), resolve(scratch, 'tests'), { recursive: true });
  for (const [name, sf] of Object.entries(files))
    await writeFile(resolve(scratch, 'src/features/execute-transfer', name), sf.text);
  const config = JSON.parse(await readFile(resolve(root, 'tsconfig.json'), 'utf8'));
  await writeFile(resolve(scratch, 'tsconfig.json'), `${JSON.stringify(config, null, 2)}\n`);
  execFileSync(
    process.execPath,
    [
      resolve(root, 'node_modules/typescript/bin/tsc'),
      '--noEmit',
      '-p',
      resolve(scratch, 'tsconfig.json'),
    ],
    { cwd: root, stdio: 'pipe' },
  );
  typecheck =
    'passed: temporary whole src/tests under original compiler settings; not runtime/DB verification';
}
console.log(
  JSON.stringify(
    {
      revision,
      baselineSha256: sha(baseline),
      declarations: matches,
      baselineEdges: edges(baselineSf),
      candidateEdges: Object.fromEntries(
        Object.entries(files).map(([name, sf]) => [name, edges(sf)]),
      ),
      candidateFileSizes: Object.fromEntries(
        Object.entries(files).map(([name, sf]) => [
          name,
          { bytes: Buffer.byteLength(sf.text), lines: sf.text.trimEnd().split('\n').length },
        ]),
      ),
      baselineLines: baseline.trimEnd().split('\n').length,
      cost: {
        addedProductionFilesIfAdopted: ['main.ts', 'row-work.ts'],
        changedExistingFileIfAdopted: 'boundary.ts becomes compatibility facade',
        addedInternalExports: { runtime: ['object', 'executeRowTransfer'], typeOnly: ['Row'] },
        existingPublicExports: [
          'executeTransfer',
          'TransferExecutionError',
          'TransferExecutionClient',
          'TransferExecutionDefinition',
        ],
        publicExportChange: 'none through boundary.ts or unchanged src/index.ts',
        addedFunctionCalls: 0,
        rowTransferInputs: [
          'client',
          'query',
          'definition',
          'setting',
          'links',
          'keyColumns',
          'args',
          'runId',
          'settingId',
          'maxDirtyKeys',
          'routine',
        ],
        duplicatedDeclarations: 0,
        runtimeCycle: false,
        typeInclusiveCycle:
          'existing boundary -> set-phase/execute -> boundary becomes boundary -> main -> set-phase/execute -> boundary; row-work has no back-edge',
      },
      typecheck,
      limitations:
        'Exact relocation evidence does not prove baseline semantics, runtime module initialization or PostgreSQL behavior; fresh DB regression would gate any production adoption.',
    },
    null,
    2,
  ),
);
