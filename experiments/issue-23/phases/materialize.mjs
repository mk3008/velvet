import {bind, materializeTemp} from '@mk3008/serene';

// Code-authored Sql only. DB-master reviewed SQL keeps its product boundary.
export function materializeSource(statement, parameters = {}) {
  return bind(materializeTemp(statement, 'velvet_source_snapshot'), parameters, 'indexed');
}
