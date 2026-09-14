import { bindExternal, externalSql } from '@mk3008/serene';

/** Bind developer-owned stored SQL without granting Serene source provenance.
 * Velvet retains its fail-closed authoring checks and permits extra context values.
 * Serene owns marker lowering and value-array construction; neither approves SQL.
 */
export function bindStoredSql(text: string, params: Readonly<Record<string, unknown>>) {
  const values: Record<string, unknown> = Object.create(null);
  let i = 0;
  while (i < text.length) {
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
        values[name] = descriptor.value;
        i += name.length + 1;
        continue;
      }
    } else {
      i++;
    }
  }
  return bindExternal(externalSql(text), values, 'indexed');
}
