import type { Sql } from '@mk3008/serene';

export interface QuerySource<Params extends object = Record<string, unknown>, Row = unknown> {
  readonly __transferContract?: {
    readonly params: (value: Params) => Params;
    readonly row: (value: Row) => Row;
  };
  id: string;
  path: string;
  sql: Sql;
  metadata?: Record<string, unknown>;
}

export type AnyQuerySource = QuerySource<any, any>;
export type QueryParams<Query> = Query extends QuerySource<infer Params, infer _Row> ? Params : never;
export type QueryRow<Query> = Query extends QuerySource<infer _Params, infer Row> ? Row : never;

export interface QueryExecutor<Query extends AnyQuerySource = AnyQuerySource> {
  query(query: Query, params: QueryParams<Query>): Promise<QueryRow<Query>[]>;
  transaction?<T>(operation: (executor: QueryExecutor) => Promise<T>): Promise<T>;
}
