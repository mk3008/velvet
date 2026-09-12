/** Named-marker lowering for developer-owned stored SQL (an explicit Serene exception).
 * This is lexical binding, not SQL validation or an approval mechanism.
 */
export function bindStoredSql(text: string, params: Readonly<Record<string, unknown>>) {
  const names: string[] = [];
  const positions = new Map<string, number>();
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const start = i;
    const c = text[i];
    if (c === "'" || c === '"') {
      const quote = c;
      // PostgreSQL E'...' allows backslash escapes; ordinary strings do not.
      const escaped =
        quote === "'" && /[eE]/.test(text[i - 1] ?? '') && !/[\w$]/.test(text[i - 2] ?? '');
      i++;
      let closed = false;
      while (i < text.length) {
        if (escaped && text[i] === '\\') {
          i += 2;
          continue;
        }
        if (text[i++] === quote) {
          if (text[i] === quote) {
            i++;
            continue;
          }
          closed = true;
          break;
        }
      }
      if (!closed) throw new Error('Unterminated SQL quote');
    } else if (text.startsWith('--', i)) {
      const end = text.indexOf('\n', i);
      i = end < 0 ? text.length : end + 1;
    } else if (text.startsWith('/*', i)) {
      let depth = 1;
      i += 2;
      while (i < text.length && depth) {
        if (text.startsWith('/*', i)) {
          depth++;
          i += 2;
        } else if (text.startsWith('*/', i)) {
          depth--;
          i += 2;
        } else i++;
      }
      if (depth) throw new Error('Unterminated SQL comment');
    } else if (c === '$') {
      const tag = text.slice(i).match(/^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/)?.[0];
      if (tag && !/[\w$]/.test(text[i - 1] ?? '')) {
        const end = text.indexOf(tag, i + tag.length);
        if (end < 0) throw new Error('Unterminated dollar quote');
        i = end + tag.length;
      } else {
        if (/^\$\d+/.test(text.slice(i))) throw new Error('Stored SQL must use named parameters');
        i++;
      }
    } else if (c === ':' && text[i - 1] !== ':' && text[i + 1] !== ':') {
      const name = text.slice(i + 1).match(/^[A-Za-z_][A-Za-z_0-9]*/)?.[0];
      if (!name) {
        i++;
      } else {
        const descriptor = Object.getOwnPropertyDescriptor(params, name);
        if (!descriptor || !('value' in descriptor) || descriptor.value === undefined)
          throw new Error(`Missing parameter: ${name}`);
        if (!positions.has(name)) {
          names.push(name);
          positions.set(name, names.length);
        }
        chunks.push('$' + positions.get(name));
        i += name.length + 1;
        continue;
      }
    } else {
      i++;
    }
    chunks.push(text.slice(start, i));
  }
  return { names, text: chunks.join(''), values: names.map((name) => params[name]) };
}
