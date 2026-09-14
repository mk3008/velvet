// Research-only source reader. Every source exposure is logged; not a product API.
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const [run, phase, action, ...args] = process.argv.slice(2);
if (!/^n[1-4]$/.test(run ?? '') || !['outline', 'locator'].includes(phase))
  throw new Error('Usage: inspect.mjs n1..n4 outline|locator list|read|search|full [name/pattern]');
const dir = path.dirname(new URL(import.meta.url).pathname);
const variant = ['n1', 'n3'].includes(run) ? 'baseline' : 'candidate';
const source = fs.readFileSync(path.join(dir, 'fixtures', `${variant}.ts.txt`), 'utf8');
const lines = source.split('\n');
const ast = ts.createSourceFile('sample.ts', source, ts.ScriptTarget.Latest, true);
const functions = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name);
let selected = [];
let output;
if (action === 'list') {
  output = functions.map(n => `${n.name.text} (function)`).join('\n');
} else if (action === 'read') {
  const fn = functions.find(n => n.name.text === args[0]);
  if (!fn) throw new Error('Unknown function');
  const start = ast.getLineAndCharacterOfPosition(fn.getStart(ast)).line;
  const end = ast.getLineAndCharacterOfPosition(fn.end).line;
  selected = Array.from({ length: end - start + 1 }, (_, i) => start + i);
} else if (action === 'search') {
  const re = new RegExp(args.join(' '), 'i');
  selected = lines.flatMap((line, i) => re.test(line) ? [i] : []);
} else if (action === 'full') selected = lines.map((_, i) => i);
else throw new Error('Unknown action');
output ??= selected.map(i => `${i + 1}: ${lines[i]}`).join('\n');
fs.mkdirSync(path.join(dir, 'runs'), { recursive: true });
fs.appendFileSync(path.join(dir, 'runs', `${run}.jsonl`), JSON.stringify({
  phase, action, args, sourceLines: selected.map(i => i + 1),
  displayedLines: output ? output.split('\n').length : 0,
}) + '\n');
console.log(output);
