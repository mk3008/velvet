// Research reader: ordinary file/range/search operations, with replayable exposure logs.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
export const baseline = '0086480a3c528d1d2a52d49056d90616234f5a38';
const dir = path.dirname(fileURLToPath(import.meta.url));
const prefix = 'src/features/execute-transfer/';
export const assignments = { r1: 'baseline', r2: 'candidate', r3: 'baseline', r4: 'candidate' };
const cache = new Map();
const fileLists = new Map();
export function available(variant) {
  if (fileLists.has(variant)) return fileLists.get(variant);
  const common = execFileSync('git', ['ls-tree', '-r', '--name-only', baseline, prefix], { encoding: 'utf8' }).trim().split('\n').map(p => p.slice(prefix.length));
  const fixtures = fs.readdirSync(path.join(dir, 'fixtures', variant)).filter(p => p.endsWith('.ts.txt')).map(p => p.slice(0, -4));
  const result = [...new Set([...common, ...fixtures])].sort();
  fileLists.set(variant, result);
  return result;
}
export function source(variant, name) {
  if (!available(variant).includes(name)) throw new Error('Unknown sample path');
  const key = variant + ':' + name;
  if (!cache.has(key)) {
    const fixture = path.join(dir, 'fixtures', variant, name + '.txt');
    const value = fs.existsSync(fixture) ? fs.readFileSync(fixture, 'utf8') : execFileSync('git', ['show', `${baseline}:${prefix}${name}`], { encoding: 'utf8' });
    cache.set(key, value);
  }
  return cache.get(key);
}
export function linesFor(variant, name) {
  const s = source(variant, name).split('\n');
  if (s.at(-1) === '') s.pop();
  return s;
}
export function render(variant, command, args) {
  let exposures = [], output;
  if (command === 'files') output = available(variant).join('\n');
  else if (command === 'info') output = `${args[0]}: ${linesFor(variant, args[0]).length} lines`;
  else if (command === 'file' || command === 'read') {
    const lines = linesFor(variant, args[0]);
    const start = command === 'file' ? 1 : Number(args[1]);
    const count = command === 'file' ? lines.length : Number(args[2]);
    if (!Number.isSafeInteger(start) || start < 1 || !Number.isSafeInteger(count) || count < 1) throw new Error('Positive integer start/count required');
    for (let i = start - 1; i < Math.min(lines.length, start - 1 + count); i++) exposures.push({ path: args[0], line: i + 1 });
  } else if (command === 'search') {
    const names = args[0] === '*' ? available(variant) : [args[0]];
    const expression = new RegExp(args[1], 'i');
    const context = args[2] === undefined ? 2 : Number(args[2]);
    if (!Number.isSafeInteger(context) || context < 0) throw new Error('Nonnegative integer context required');
    for (const name of names) {
      const lines = linesFor(variant, name), selected = new Set();
      lines.forEach((line, i) => { if (expression.test(line)) for (let j = Math.max(0, i - context); j <= Math.min(lines.length - 1, i + context); j++) selected.add(j); });
      exposures.push(...[...selected].sort((a, b) => a - b).map(i => ({ path: name, line: i + 1 })));
    }
  } else throw new Error('Commands: files, info PATH, file PATH, read PATH START COUNT, search PATH REGEX [CONTEXT]');
  output ??= exposures.map(e => `${e.path}:${e.line}: ${linesFor(variant, e.path)[e.line - 1]}`).join('\n');
  return { exposures, outputBytes: Buffer.byteLength(output + '\n'), outputSha256: createHash('sha256').update(output + '\n').digest('hex'), output };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [run, stage, command, ...args] = process.argv.slice(2);
  if (!assignments[run] || !['overview', 'target', 'broad'].includes(stage)) throw new Error('Valid RUN and STAGE required');
  const { output, ...measurement } = render(assignments[run], command, args);
  fs.mkdirSync(path.join(dir, 'runs'), { recursive: true });
  fs.appendFileSync(path.join(dir, 'runs', `${run}.jsonl`), JSON.stringify({ stage, command, args, ...measurement }) + '\n');
  process.stdout.write(output + '\n');
}
