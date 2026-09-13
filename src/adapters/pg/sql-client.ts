import { bind } from '@mk3008/serene';
import type {
  AnyQuerySource,
  QueryParams,
  QueryRow,
  QueryExecutor,
} from '#features/_shared/query-executor.js';

/**
 * Adapt a node-postgres `pg`-style queryable (Client or Pool) into a typed query executor.
 *
 * Query sources own one reviewed Serene SQL literal. The application binds
 * values, invokes the native driver, owns its pool, and keeps transaction
 * policy at this boundary.
 *
 */
export function fromPg(queryable: {
  query(text: string, values: readonly unknown[]): Promise<{ rows: unknown[]; rowCount?: number | null }>;
}): QueryExecutor {
  return {
    async query<Query extends AnyQuerySource>(query: Query, params: QueryParams<Query>): Promise<QueryRow<Query>[]> {
      const prepared = bind(query.sql, { ...params }, 'indexed');
      const result = await queryable.query(prepared.text, prepared.values);
      return result.rows as QueryRow<Query>[];
    },
  };
}
