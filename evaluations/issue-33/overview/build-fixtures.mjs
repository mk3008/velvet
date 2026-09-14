// Research-only relocation. Run from any cwd; does not change production sources.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const revision = '0086480a3c528d1d2a52d49056d90616234f5a38';
const source = execFileSync(
  'git',
  ['show', `${revision}:src/features/execute-transfer/boundary.ts`],
  { cwd: root, encoding: 'utf8' },
);
const sf = ts.createSourceFile('boundary.ts', source, ts.ScriptTarget.Latest, true);
const declarations = sf.statements.filter((s) => !ts.isImportDeclaration(s));
const name = (s) => s.name?.text ?? s.declarationList?.declarations[0]?.name.text;
const main = declarations.find((s) => name(s) === 'executeTransfer');
if (!main) throw new Error('Missing frozen executeTransfer');
const details = declarations
  .filter((s) => s !== main)
  .map((s) => {
    const text = s.getFullText(sf).trim();
    return ['Row', 'object', 'executeRowTransfer'].includes(name(s))
      ? text.replace(/^(\/\*\*[\s\S]*?\*\/\s*)?/, '$1export ')
      : text;
  })
  .join('\n\n');
const mainImports = `import { bind, type Sql } from '@mk3008/serene';
import { isDeepStrictEqual } from 'node:util';
import * as queries from './queries.js';
import { assertDestinationLinkMapping } from './link-mapping.js';
import { loadSetPhase } from './set-phase/config.js';
import { executeSetPhase } from './set-phase/execute.js';
import { object, executeRowTransfer, TransferExecutionError } from './row-work.js';
import type { Row, TransferExecutionClient, TransferExecutionDefinition } from './row-work.js';`;
const detailImports = `import { createHash } from 'node:crypto';
import type { Sql } from '@mk3008/serene';
import { isDeepStrictEqual } from 'node:util';
import { bindStoredSql } from './trusted-sql.js';
import * as queries from './queries.js';`;
const outputs = {
  'baseline/boundary.ts.txt': source,
  'candidate/main.ts.txt': `${mainImports}\n\n${main.getFullText(sf).trim()}\n`,
  'candidate/row-work.ts.txt': `${detailImports}\n\n${details}\n`,
  'candidate/boundary.ts.txt': `export { executeTransfer } from './main.js';
export { TransferExecutionError } from './row-work.js';
export type { TransferExecutionClient, TransferExecutionDefinition } from './row-work.js';
`,
};
for (const [name, contents] of Object.entries(outputs)) {
  const path = resolve(here, 'fixtures', name);
  await mkdir(dirname(path), { recursive: true });
  if (process.argv.includes('--check')) {
    if ((await readFile(path, 'utf8')) !== contents) throw new Error(`Fixture drift: ${name}`);
  } else await writeFile(path, contents);
}
console.log(
  `${process.argv.includes('--check') ? 'Checked' : 'Generated'} ${Object.keys(outputs).length} fixtures from ${revision}`,
);
