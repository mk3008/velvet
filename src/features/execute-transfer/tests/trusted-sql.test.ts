import { expect, test } from 'vitest';
import { bind, externalSql, materializeTemp, review, type Sql } from '@mk3008/serene';
import { bindStoredSql } from '../trusted-sql.js';
import { bindReviewed, materializeReviewed } from '../set-phase/config.js';

test('binds repeated names in SQL order without embedding values', () => {
  expect(
    bindStoredSql('select :a::text, :b, :a', { b: null, a: "'; drop table x;--" }),
  ).toMatchObject({
    text: 'select $1::text, $2, $1',
    names: ['a', 'b'],
    values: ["'; drop table x;--", null],
  });
});
test('leaves quoted text, comments, casts and dollar bodies intact', () => {
  const text = `select ':skip', "x:skip", $$:skip$$, $tag$:skip$tag$, :value::jsonb /* :skip /* nested */ */ -- :skip\n`;
  expect(bindStoredSql(text, { value: {} }).text).toBe(text.replace(':value', '$1'));
});
test('handles escaped E strings and doubled quote escaping', () => {
  const text = String.raw`select E'quote\':skip', 'a'':skip', :value`;
  expect(bindStoredSql(text, { value: 1 }).values).toEqual([1]);
});
test.each([
  'select :missing',
  'select $1',
  "select 'unfinished",
  'select /* unfinished',
  'select $q$unfinished',
])('rejects invalid binding source %s', (text) => {
  expect(() => bindStoredSql(text, {})).toThrow();
});
test('rejects inherited and undefined values', () => {
  expect(() => bindStoredSql('select :x', Object.create({ x: 1 }))).toThrow();
  expect(() => bindStoredSql('select :x', { x: undefined })).toThrow();
});

test('keeps shared context values optional without invoking unused getters', () => {
  const params = { value: 1, unused: undefined };
  Object.defineProperty(params, 'unusedGetter', {
    get: () => {
      throw new Error('not used');
    },
  });
  expect(bindStoredSql('select :value, :value', params)).toMatchObject({
    text: 'select $1, $1',
    names: ['value'],
    values: [1],
  });
  expect(bindStoredSql('select 1', params).values).toEqual([]);
});

test('rejects a required getter without invoking it', () => {
  let invoked = false;
  const params = Object.defineProperty({}, 'value', {
    get: () => {
      invoked = true;
      return 1;
    },
  });
  expect(() => bindStoredSql('select :value', params)).toThrow('Missing parameter');
  expect(invoked).toBe(false);
});

test('binding results retain external provenance and cannot enter source-backed APIs', () => {
  const statement = externalSql('select :value');
  const bound = bindStoredSql(statement.sourceText, { value: 'bound data' });
  for (const value of [statement, bound]) {
    expect(review(value)).toEqual({ level: 'review-required', code: 'EXTERNAL_SQL' });
    // Deliberate runtime misuse: neither an external statement nor a bound value is Sql.
    expect(() => bind(value as unknown as Sql)).toThrow();
    expect(() => materializeTemp(value as unknown as Sql, 'snapshot')).toThrow();
  }
});

test('external identity does not bypass the reviewed-master boundary', () => {
  const external = externalSql('select 1');
  for (const value of [external, { text: 'select 1', sha256: '0'.repeat(64) }]) {
    const forged = value as Parameters<typeof bindReviewed>[0];
    expect(() => bindReviewed(forged, {})).toThrow('Expected validated database-master SQL');
    expect(() => materializeReviewed('source', forged, {})).toThrow(
      'Expected validated database-master SQL',
    );
  }
});
