import {bind} from '@mk3008/serene';

// Local, explicitly reviewed Serene 0.4 composition exception. No string constructor,
// arbitrary name, prefix/suffix, SQL fragment, or promotion to Serene ordinary.
// The caller authors a complete SELECT; this guard is NOT a SQL grammar validator.
export function materializeSource(statement, parameters = {}) {
  const body = bind(statement, parameters, 'indexed'); // verifies original Sql identity
  // Conservative subset: even semicolons inside literals/comments are unsupported.
  if (body.sourceText.includes(';')) throw new Error('TEMP source must have no semicolon');
  return {
    text: 'CREATE TEMPORARY TABLE pg_temp.velvet_source_snapshot ON COMMIT DROP AS\n' + body.text + '\n',
    values: body.values,
  };
}
